import test from 'node:test';
import assert from 'node:assert/strict';
import { allocatePractice, checkIssuedPractice, startFrozenMock, watDate } from '../worker/services/study-service.ts';
import { paystackRequest, validateCheckoutUrl, verifyOwnedPayment, initializeCheckout, cancelOwnedSubscription, configureVerifiedRenewal } from '../worker/services/paystack-service.ts';
import { computeRequestHash } from '../worker/api/idempotency.ts';
import { bulkQuestionImportSchema } from '../worker/api/contracts.ts';
import { LocalOutboxManager } from '../src/features/exam-engine/persistence/local-outbox.ts';
import { ExamEngine } from '../src/features/exam-engine/reactive/exam-engine.ts';
import { submitAndScoreExamAttemptAtomic } from '../worker/services/exam-foundation-service.ts';
const user='11111111-1111-4111-8111-111111111111', attempt='22222222-2222-4222-8222-222222222222', question='33333333-3333-4333-8333-333333333333', option='44444444-4444-4444-8444-444444444444';
const now=new Date('2026-10-11T09:00:00Z');
// Injected local adapters verify control flow and parameter contracts, not PostgreSQL syntax or locks.
function simulated(handler) { const calls=[]; const sql=async(strings,...args)=>{const text=strings.join('?');calls.push({text,args});return handler(text,args);};return {sql,calls,runSerializableTransaction:fn=>fn(sql),runCommittedTransaction:fn=>fn(sql)}; }
const safe={id:question,subjectCode:'ENG',stem:'Question?',options:[{id:option,label:'A',content:'Option'}]};
function practiceAdapter({used=0,count=5,premium=false,overlap=false,issued=true}={}) {return simulated(text=>{
 if(text.includes('FROM profiles'))return [{id:user}];
 if(text.includes('FROM subscription_entitlements'))return premium?[{expires_at:'2027-01-01',auto_renew:false}]:[];
 if(text.includes('FROM subjects s JOIN student_subjects'))return [{id:option}];
 if(text.includes("status='in_progress'") && text.includes("mode='practice'"))return [];
 if(text.includes('SELECT user_id FROM daily_practice_sessions') || (text.includes('SELECT id FROM attempts WHERE user_id=') && text.includes("mode='practice'")))return used?[{id:attempt,user_id:user}]:[];
 if(text.includes('SELECT t.id FROM topics'))return [{id:option}];
 if(text.includes('FROM study_question_pool'))return Array.from({length:count},()=>({id:question,subject_id:option,topic_id:question,snapshot:safe,correct_option_id:option,explanation:'Explanation'}));
 if(text.includes('INSERT INTO attempts'))return [{id:attempt}];
 if(text.includes('SELECT aq.snapshot'))return issued?[{snapshot:safe,correct_option_id:option,frozen_explanation:'Explanation',subject_id:option,topic_id:question}]:[];
 if(text.includes('SELECT a.id FROM attempts'))return overlap?[{id:attempt}]:[];
 if(text.includes('INSERT INTO attempt_answers'))return [{selected_option_id:option}];
 return [];
 });}
test('WAT allowance switches precisely at 23:00 UTC',()=>{assert.equal(watDate(new Date('2026-10-10T22:59:59Z')),'2026-10-10');assert.equal(watDate(new Date('2026-10-10T23:00:00Z')),'2026-10-11');});
test('practice issues the exact requested batch and claims one daily session without exposing keys',async()=>{const db=practiceAdapter({count:5});const result=await allocatePractice(db.sql,user,{subjectCode:'ENG',count:5},now);assert.equal(result.remaining,0);assert.equal(result.questions.length,5);assert.ok(db.calls.some(c=>c.text.includes('INSERT INTO daily_practice_sessions')));assert.equal(/correct_option_id|explanation/.test(JSON.stringify(result)),false);});
test('used free practice session rejects before question allocation or mutation',async()=>{const db=practiceAdapter({used:5});await assert.rejects(allocatePractice(db.sql,user,{subjectCode:'ENG',count:5},now),e=>e.status===403&&e.code==='FORBIDDEN_ENTITLEMENT_REQUIRED');assert.equal(db.calls.some(c=>c.text.includes('FROM study_question_pool')),false);});
test('undersized bank consumes no daily session',async()=>{const db=practiceAdapter({count:2});await assert.rejects(allocatePractice(db.sql,user,{subjectCode:'ENG',count:5},now),e=>e.status===409);assert.equal(db.calls.some(c=>c.text.includes('INSERT INTO daily_practice_sessions')),false);});
test('free students can select a canonical enrolled topic',async()=>{const db=practiceAdapter();const result=await allocatePractice(db.sql,user,{subjectCode:'ENG',topicSlug:'test-topic',count:5},now);assert.equal(result.questions.length,5);});
test('practice feedback requires an issued owned session and blocks active mock overlap',async()=>{for(const config of [{issued:false},{overlap:true}]){const db=practiceAdapter(config);await assert.rejects(checkIssuedPractice(db.sql,user,{sessionId:attempt,questionId:question,selectedOption:'A'},now),e=>[403,404].includes(e.status));assert.ok(!db.calls.some(c=>c.text.includes('INSERT INTO attempt_answers')));}});
test('mock without an approved yearly blueprint consumes no diagnostic',async()=>{const db=simulated(text=>{if(text.includes('FROM profiles'))return [{id:user}];if(text.includes('FROM student_subjects'))return [{id:option,code:'ENG',is_compulsory:true},...['MTH','PHY','CHM'].map(code=>({id:option,code,is_compulsory:false}))];if(text.includes('SELECT exam_year'))return [{exam_year:2026}];return [];});await assert.rejects(startFrozenMock(db.sql,user,{examConditions:true},now),e=>e.status===409&&/No diagnostic allowance/.test(e.message));assert.equal(db.calls.some(c=>c.text.includes('INSERT INTO attempts')),false);});
test('an active diagnostic resumes before paid/free usage checks',async()=>{const db=simulated(text=>text.includes('FROM profiles')?[{id:user}]:text.includes("status='in_progress'")?[{id:attempt}]:[]);assert.deepEqual(await startFrozenMock(db.sql,user,{examConditions:false},now),{attemptId:attempt,resumed:true});assert.equal(db.calls.length,2);});
test('completed exam submission replay performs no result/mastery/referral writes',async()=>{const db=simulated(()=>[{total_score:200,english_score:50,subject2_score:50,subject3_score:50,subject4_score:50,total_correct:90,total_answered:180,time_spent_seconds:500,created_at:now.toISOString()}]);const result=await submitAndScoreExamAttemptAtomic(db,{attemptId:attempt,userId:user});assert.equal(result.totalScore,200);assert.equal(db.calls.length,1);});
test('foreign payment ownership fails before provider request',async()=>{let fetched=0;const db=simulated(()=>[]);await assert.rejects(verifyOwnedPayment(db,{PAYSTACK_SECRET_KEY:'sk_test_local'},user,'JAMB-test',now,async()=>{fetched++;}),e=>e.status===404);assert.equal(fetched,0);});
test('unknown checkout retains durable reference and never initializes again',async()=>{let fetched=0;const requestHash=await computeRequestHash('payments.checkout','{}');const db=simulated(text=>text.includes('FROM profiles')?[{id:user}]:text.includes('FROM payment_checkout_requests c')?[{reference:'JAMB-existing',status:'unknown',request_hash:requestHash}]:[]);const recovered=await initializeCheckout(db,{PAYSTACK_SECRET_KEY:'sk_test_local'},user,'test@example.invalid','same-key',now,async()=>{fetched++;});assert.equal(recovered.confirmationUrl,'/checkout/verify/?reference=JAMB-existing');assert.equal(fetched,0);});
test('provider request uses secret only in Authorization, disables redirects and rejects failed/oversized JSON',async()=>{const env={PAYSTACK_SECRET_KEY:'sk_test_local'};await paystackRequest(env,'/transaction/verify/ref',undefined,async(url,options)=>{assert.equal(url,'https://api.paystack.co/transaction/verify/ref');assert.equal(options.redirect,'manual');assert.equal(options.headers.Authorization,'Bearer sk_test_local');return Response.json({status:true,data:{reference:'ref'}});});for(const response of [Response.json({status:false}),new Response('x'.repeat(65537)),new Response('{bad')])await assert.rejects(paystackRequest(env,'/transaction/verify/ref',undefined,async()=>response));});
test('checkout redirect rejects foreign origins, credentials and HTTP',()=>{assert.equal(validateCheckoutUrl('https://checkout.paystack.com/test'),'https://checkout.paystack.com/test');for(const url of ['https://evil.example','http://checkout.paystack.com','https://user@checkout.paystack.com'])assert.throws(()=>validateCheckoutUrl(url));});
test('provider cancellation failure leaves entitlement unchanged',async()=>{const db=simulated(text=>text.startsWith('SELECT')?[{paystack_subscription_code:'SUB_x',paystack_email_token:'token',auto_renew:true,expires_at:'2027-01-01'}]:[]);await assert.rejects(cancelOwnedSubscription(db,{PAYSTACK_SECRET_KEY:'sk_test_local'},user,now,async()=>Response.json({status:false})));assert.ok(!db.calls.some(c=>c.text.includes('UPDATE')));});
test('admin import rejects large batches and arbitrary media URLs',()=>{const item={subjectCode:'ENG',topicTitle:'Topic',stem:'Question?',options:{A:'A',B:'B',C:'C',D:'D'},correctOption:'A',explanation:'Explanation'};assert.equal(bulkQuestionImportSchema.safeParse([item]).success,true);assert.equal(bulkQuestionImportSchema.safeParse(Array(11).fill(item)).success,false);assert.equal(bulkQuestionImportSchema.safeParse([{...item,imageUrl:'https://evil.example/image.png'}]).success,false);});
test('older answer acknowledgement preserves the latest outbox revision; flush waits for both',async()=>{
 const savedScope=LocalOutboxManager.scope; const storage=new Map();
 globalThis.window=new EventTarget();globalThis.document=new EventTarget();globalThis.localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};Object.defineProperty(globalThis,'navigator',{value:{onLine:true},configurable:true});
 LocalOutboxManager.scope=()=>`local_${attempt}`;
 let release;let firstStarted;const started=new Promise(resolve=>firstStarted=resolve);const first=new Promise(resolve=>release=resolve);const seen=[];
 const engine=new ExamEngine(async(a,q,o,revision)=>{seen.push(revision);if(revision===1){firstStarted();await first;}return {success:true,revision};});
 try{LocalOutboxManager.seedRevisions(attempt,{});engine.initialize({attemptId:attempt,questions:[{...safe,subjectName:'English',position:1}],expiresAtTimestamp:Date.now()+60000});engine.dispatch({type:'ANSWER_SELECTED',payload:{questionId:question,optionId:option,label:'A'}});const drain=engine.flushOutbox();await started;engine.dispatch({type:'ANSWER_REVERSED',payload:{questionId:question}});assert.equal(LocalOutboxManager.getOutbox(attempt)[0].revision,2);release();await drain;assert.deepEqual(seen,[1,2]);assert.equal(LocalOutboxManager.getOutbox(attempt).length,0);assert.equal(engine.getCurrentState().answers[question],undefined);}
 finally{engine.destroy();LocalOutboxManager.scope=savedScope;delete globalThis.window;delete globalThis.document;delete globalThis.localStorage;}
});

test('renewal never reinitializes an ambiguous provider operation',async()=>{let providerCalls=0;const db=simulated(text=>{if(text.includes('FROM profiles'))return [{id:user}];if(text.includes("FROM payment_transactions"))return [{id:attempt}];if(text.includes('FROM subscription_entitlements'))return [{expires_at:'2026-11-11',paystack_subscription_code:null,auto_renew:false,cancelled_at:null}];if(text.includes('FROM payment_renewal_requests'))return [{status:'unknown'}];return [];});const status=await configureVerifiedRenewal(db,{PAYSTACK_SECRET_KEY:'sk_test_local',PAYSTACK_PLAN_CODE:'PLN_local'},user,'JAMB-local','AUTH_local','CUS_local',now,async(url)=>{providerCalls++;assert.ok(url.includes('/plan/'));return Response.json({status:true,data:{amount:100000,currency:'NGN',interval:'monthly'}});});assert.equal(status,'unknown');assert.equal(providerCalls,1);assert.ok(!db.calls.some(call=>call.text.includes('INSERT')));});
test('renewal refuses a plan that overrides the intended monthly price',async()=>{const db=simulated(()=>{throw new Error('No DB mutation expected');});await assert.rejects(configureVerifiedRenewal(db,{PAYSTACK_SECRET_KEY:'sk_test_local',PAYSTACK_PLAN_CODE:'PLN_local'},user,'JAMB-local','AUTH_local','CUS_local',now,async()=>Response.json({status:true,data:{amount:50000,currency:'NGN',interval:'monthly'}})),error=>error.status===503);});

test('provider fee-inclusive payments require the exact requested price and accounted fee difference',async()=>{
 const {matchesPayment}=await import('../worker/services/payment-security.ts');
 const payment={status:'success',reference:'JAMB-fees',amount:50762,requested_amount:50000,fees:762,currency:'NGN',metadata:{userId:user}};
 assert.equal(matchesPayment(payment,'JAMB-fees',50000,user),true);
 for(const change of [{requested_amount:49000},{fees:761},{amount:49999},{currency:'USD'},{metadata:{userId:'another-user'}},{requested_amount:undefined}])assert.equal(matchesPayment({...payment,...change},'JAMB-fees',50000,user),false);
 assert.equal(matchesPayment({...payment,amount:50000,fees:0},'JAMB-fees',50000,user),true);
});

test('completed provider checkout recovers to confirmation instead of reusing a consumed link',async()=>{
 const requestHash=await computeRequestHash('payments.checkout','{}');const db=simulated(text=>text.includes('FROM profiles')?[{id:user}]:text.includes('FROM payment_checkout_requests c')?[{reference:'JAMB-existing',status:'ready',authorization_url:'https://checkout.paystack.com/consumed',request_hash:requestHash,payment_status:'pending'}]:[]);
 const fetchImpl=async()=>new Response(JSON.stringify({status:true,data:{reference:'JAMB-existing',status:'success'}}),{status:200});
 const result=await initializeCheckout(db,{PAYSTACK_SECRET_KEY:'sk_test_local'},user,'test@example.invalid','same-key',now,fetchImpl);assert.equal(result.confirmationUrl,'/checkout/verify/?reference=JAMB-existing');assert.equal(result.authorizationUrl,undefined);
});

test('expired Pro entitlement transitions cleanly to Free tier with autoRenew false',async()=>{
 const {getUserSubscriptionStatus}=await import('../worker/services/subscription-service.ts');
 const expiredDb=simulated(()=>[{expires_at:'2026-10-10T00:00:00Z',plan_code:'MONTHLY_1000',auto_renew:true,cancelled_at:null}]);
 const status=await getUserSubscriptionStatus(expiredDb.sql,user,now);
 assert.equal(status.isPremium,false);
 assert.equal(status.daysRemaining,0);
 assert.equal(status.autoRenew,false);
});

test('checkout initialization allows any payment channel without hardcoded card or upfront plan',async()=>{
  let capturedPayload;
  const db=simulated(text=>{
    if(text.includes('FROM profiles'))return [{id:user}];
    if(text.includes('FROM subscription_entitlements'))return [];
    if(text.includes('SELECT (SELECT COUNT(*)'))return [{qualified_count:0,has_reward:false}];
    return [];
  });
  const fetchImpl=async(url,opts)=>{
    if(url.endsWith('/transaction/initialize')){
      capturedPayload=JSON.parse(opts.body);
      return new Response(JSON.stringify({status:true,data:{reference:capturedPayload.reference,authorization_url:'https://checkout.paystack.com/auth-any'}}),{status:200});
    }
    return new Response(JSON.stringify({status:true,data:{}}),{status:200});
  };
  const res=await initializeCheckout(db,{PAYSTACK_SECRET_KEY:'sk_test_local',PAYSTACK_PLAN_CODE:'PLN_monthly'},user,'student@example.invalid','key-1',now,fetchImpl);
  assert.equal(res.authorizationUrl,'https://checkout.paystack.com/auth-any');
  assert.equal(capturedPayload.channels,undefined);
  assert.equal(capturedPayload.plan,undefined);
  assert.equal(capturedPayload.amount,'100000');
});

test('card payment with reusable authorization activates subscription renewal',async()=>{
  let configuredRenewal=false;
  const db=simulated(text=>{
    if(text.includes('FROM payment_transactions'))return [{reference:'JAMB-card',amount_kobo:100000,user_id:user,status:'pending'}];
    if(text.includes('FROM profiles'))return [{id:user}];
    if(text.includes('FROM subscription_entitlements'))return [{expires_at:'2026-11-17T00:00:00Z',paystack_subscription_code:null,auto_renew:false,cancelled_at:null}];
    if(text.includes('FROM payment_renewal_requests'))return [];
    return [{id:user}];
  });
  const fetchImpl=async(url,opts)=>{
    if(url.includes('/transaction/verify/')){
      return new Response(JSON.stringify({
        status:true,
        data:{
          status:'success',
          reference:'JAMB-card',
          amount:100000,
          currency:'NGN',
          metadata:{userId:user},
          authorization:{authorization_code:'AUTH_card_123',channel:'card',reusable:true},
          customer:{customer_code:'CUS_123'}
        }
      }),{status:200});
    }
    if(url.includes('/plan/')){
      return new Response(JSON.stringify({status:true,data:{amount:100000,currency:'NGN',interval:'monthly'}}),{status:200});
    }
    if(url.endsWith('/subscription')&&opts.method==='POST'){
      configuredRenewal=true;
      const body=JSON.parse(opts.body);
      assert.equal(body.customer,'CUS_123');
      assert.equal(body.authorization,'AUTH_card_123');
      return new Response(JSON.stringify({status:true,data:{subscription_code:'SUB_card_123',email_token:'token_123'}}),{status:200});
    }
    return new Response(JSON.stringify({status:true,data:{}}),{status:200});
  };
  const verified=await verifyOwnedPayment(db,{PAYSTACK_SECRET_KEY:'sk_test_local',PAYSTACK_PLAN_CODE:'PLN_monthly'},user,'JAMB-card',now,fetchImpl);
  assert.equal(verified.success,true);
  assert.equal(verified.renewalStatus,'ready');
  assert.equal(configuredRenewal,true);
  assert.match(verified.message,/Premium and monthly renewal are active/);
});

test('non-card payment (bank transfer / ussd) activates 30-day premium without recurring renewal',async()=>{
  let renewalAttempted=false;
  const db=simulated(text=>{
    if(text.includes('FROM payment_transactions'))return [{reference:'JAMB-transfer',amount_kobo:100000,user_id:user,status:'pending'}];
    if(text.includes('FROM profiles'))return [{id:user}];
    if(text.includes('FROM subscription_entitlements'))return [{expires_at:'2026-11-17T00:00:00Z',paystack_subscription_code:null,auto_renew:false,cancelled_at:null}];
    return [{id:user}];
  });
  const fetchImpl=async(url)=>{
    if(url.includes('/subscription')||url.includes('/plan/')){
      renewalAttempted=true;
    }
    return new Response(JSON.stringify({
      status:true,
      data:{
        status:'success',
        reference:'JAMB-transfer',
        amount:100000,
        currency:'NGN',
        metadata:{userId:user},
        authorization:{channel:'bank_transfer',reusable:false},
        customer:{customer_code:'CUS_transfer'}
      }
    }),{status:200});
  };
  const verified=await verifyOwnedPayment(db,{PAYSTACK_SECRET_KEY:'sk_test_local',PAYSTACK_PLAN_CODE:'PLN_monthly'},user,'JAMB-transfer',now,fetchImpl);
  assert.equal(verified.success,true);
  assert.equal(verified.renewalStatus,'unavailable');
  assert.equal(renewalAttempted,false);
  assert.equal(verified.message,'Payment confirmed. Premium is active for 30 days.');
});

test('abandoned previous checkout is auto-failed and allows initializing a fresh checkout',async()=>{
  let markedFailed=false;
  let initializedNew=false;
  let pendingQueryCount=0;
  const db=simulated((text)=>{
    if(text.includes('WHERE c.user_id =') && text.includes("p.status = 'pending'")){
      pendingQueryCount++;
      return pendingQueryCount===1?[{reference:'JAMB-abandoned',status:'ready',authorization_url:'https://checkout.paystack.com/abandoned'}]:[];
    }
    if(text.includes('FROM profiles'))return [{id:user}];
    if(text.includes('FROM subscription_entitlements'))return [];
    if(text.includes('UPDATE payment_transactions SET status = \'failed\'')){
      markedFailed=true;
      return [];
    }
    return [];
  });
  const fetchImpl=async(url, opts)=>{
    if(url.includes('/transaction/verify/JAMB-abandoned')){
      return new Response(JSON.stringify({
        status:true,
        data:{status:'abandoned',reference:'JAMB-abandoned'}
      }),{status:200});
    }
    if(url.includes('/transaction/initialize')){
      initializedNew=true;
      const body=JSON.parse(opts.body);
      return new Response(JSON.stringify({
        status:true,
        data:{reference:body.reference,authorization_url:'https://checkout.paystack.com/fresh-new'}
      }),{status:200});
    }
    return new Response(JSON.stringify({status:true,data:{}}),{status:200});
  };
  const res=await initializeCheckout(db,{PAYSTACK_SECRET_KEY:'sk_test_local'},user,'student@example.invalid','fresh-key',now,fetchImpl);
  assert.equal(markedFailed,true);
  assert.equal(initializedNew,true);
  assert.equal(res.authorizationUrl,'https://checkout.paystack.com/fresh-new');
  assert.equal(res.confirmationUrl,undefined);
});



