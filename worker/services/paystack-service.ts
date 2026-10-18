import { ApiError } from '../api/errors';
import type { RequestDbContext } from '../api/db-context';
import { getCheckoutPricing,settleVerifiedPaymentAtomic } from './subscription-service';
import { matchesPayment } from './payment-security';
import { readBoundedStream } from '../auth';
import { computeRequestHash } from '../api/idempotency';

export interface PaymentEnv { PAYSTACK_SECRET_KEY?:string; PUBLIC_APP_ORIGIN?:string; PAYSTACK_PLAN_CODE?:string; }
export async function paystackRequest(env:PaymentEnv,path:string,body:unknown|undefined,fetchImpl:typeof fetch=fetch) {
  const secret=env.PAYSTACK_SECRET_KEY?.trim();
  if(!secret||!/^sk_(test|live)_/.test(secret)) throw new ApiError({status:503,code:'SERVICE_CONFIG_UNAVAILABLE',message:'Payments are temporarily unavailable.'});
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),10000);
  try {
    const response=await fetchImpl(`https://api.paystack.co${path}`,{method:body===undefined?'GET':'POST',headers:{Authorization:`Bearer ${secret}`,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),redirect:'manual',signal:controller.signal});
    const bytes=await readBoundedStream(response.body,65536,controller.signal);
    const data=JSON.parse(new TextDecoder().decode(bytes));
    if(!response.ok||data.status!==true) throw new ApiError({status:503,code:'SERVICE_UNAVAILABLE',message:'Payment provider could not confirm this operation. Please retry.'});
    return data.data as Record<string,unknown>;
  } catch(error) { if(error instanceof ApiError)throw error;throw new ApiError({status:503,code:'SERVICE_UNAVAILABLE',message:'Payment provider is temporarily unavailable. No payment has been confirmed.'}); }
  finally{clearTimeout(timer);}
}
export function validateCheckoutUrl(value:unknown):string {
  try {const url=new URL(String(value));if(url.protocol==='https:'&&url.hostname==='checkout.paystack.com'&&!url.username&&!url.password)return url.href;}catch{}
  throw new ApiError({status:503,code:'SERVICE_UNAVAILABLE',message:'Payment provider returned an invalid checkout link.'});
}
export async function initializeCheckout(db:RequestDbContext,env:PaymentEnv,userId:string,email:string,key:string,now:Date,fetchImpl:typeof fetch=fetch) {
  const hash=await computeRequestHash('payments.checkout','{}');

  // If there is an existing pending checkout, inspect its live provider state
  const pendingRows = await db.sql<Array<{reference:string;status:string;authorization_url:string|null}>>`
    SELECT c.reference, c.status, c.authorization_url 
    FROM payment_checkout_requests c 
    JOIN payment_transactions p ON p.reference = c.reference 
    WHERE c.user_id = ${userId}::uuid AND p.status = 'pending' AND c.status IN ('initializing','ready','unknown') 
    ORDER BY c.created_at DESC LIMIT 1
  `;

  if (pendingRows[0]) {
    const existing = pendingRows[0];
    if (existing.status === 'ready' && existing.authorization_url) {
      try {
        const payment = await paystackRequest(env, `/transaction/verify/${encodeURIComponent(existing.reference)}`, undefined, fetchImpl);
        if (payment.status === 'success') {
          return { reference: existing.reference, confirmationUrl: `/checkout/verify/?reference=${encodeURIComponent(existing.reference)}` };
        }
        if (['pending', 'ongoing', 'processing'].includes(String(payment.status))) {
          return { reference: existing.reference, authorizationUrl: validateCheckoutUrl(existing.authorization_url) };
        }
        // Provider reported abandoned or failed: mark previous transaction failed so a fresh checkout can initialize
        await db.sql`UPDATE payment_transactions SET status = 'failed' WHERE reference = ${existing.reference} AND user_id = ${userId}::uuid AND status = 'pending'`;
      } catch {
        // If provider cannot confirm or errors, unblock by failing stale pending transaction
        await db.sql`UPDATE payment_transactions SET status = 'failed' WHERE reference = ${existing.reference} AND user_id = ${userId}::uuid AND status = 'pending'`;
      }
    } else {
      await db.sql`UPDATE payment_transactions SET status = 'failed' WHERE reference = ${existing.reference} AND user_id = ${userId}::uuid AND status = 'pending'`;
    }
  }

  const prepared=await db.runSerializableTransaction(async(tx)=>{
    await tx`SELECT id FROM profiles WHERE id=${userId}::uuid FOR UPDATE`;
    const existing=await tx<Array<{reference:string;status:string;authorization_url:string|null;request_hash:string;payment_status:string}>>`SELECT c.reference,c.status,c.authorization_url,c.request_hash,p.status AS payment_status FROM payment_checkout_requests c JOIN payment_transactions p ON p.reference=c.reference WHERE c.user_id=${userId}::uuid AND c.idempotency_key=${key} FOR UPDATE OF c`;
    if(existing[0]?.payment_status==='failed')throw new ApiError({status:409,code:'PAYMENT_FAILED',message:'The previous checkout failed. Start a new checkout.'});
    if(existing[0]) {if(existing[0].request_hash!==hash)throw new ApiError({status:422,code:'IDEMPOTENCY_KEY_PAYLOAD_MISMATCH',message:'This checkout key belongs to a different request.'});return {...existing[0],created:false};}
    const other=await tx<Array<{reference:string;status:string;authorization_url:string|null}>>`SELECT c.reference,c.status,c.authorization_url FROM payment_checkout_requests c JOIN payment_transactions p ON p.reference=c.reference WHERE c.user_id=${userId}::uuid AND p.status='pending' AND c.status IN ('initializing','ready','unknown') ORDER BY c.created_at DESC LIMIT 1`;
    if(other[0])return {...other[0],created:false};
    const pricing=await getCheckoutPricing(tx,userId,email,now);
    if(pricing.isAlreadyPremium)throw new ApiError({status:409,code:'CONFLICT',message:'You already have Premium access.'});
    if(!email)throw new ApiError({status:409,code:'CONFLICT',message:'Your authenticated account needs an email address for checkout.'});
    const reference=`JAMB-${crypto.randomUUID()}`;
    const payload=JSON.stringify({userEmail:email,rewardId:pricing.rewardId,hasDiscount:pricing.hasDiscount});
    await tx`INSERT INTO payment_transactions (user_id,reference,amount_kobo,status,channel,paystack_payload) VALUES (${userId}::uuid,${reference},${pricing.finalAmountKobo},'pending','paystack',${payload}::text::jsonb)`;
    await tx`INSERT INTO payment_checkout_requests (user_id,idempotency_key,request_hash,reference,status,created_at) VALUES (${userId}::uuid,${key},${hash},${reference},'initializing',${now.toISOString()}::timestamptz)`;
    return {reference,status:'initializing',authorization_url:null,created:true,amount:pricing.finalAmountKobo,rewardId:pricing.rewardId};
  });
  if(!prepared.created) {
    const confirmationUrl=`/checkout/verify/?reference=${encodeURIComponent(prepared.reference)}`;
    if ('payment_status' in prepared && prepared.payment_status==='success') return {reference:prepared.reference,confirmationUrl};
    if(prepared.status==='ready'&&prepared.authorization_url) {
      return {reference:prepared.reference,authorizationUrl:validateCheckoutUrl(prepared.authorization_url)};
    }
    return {reference:prepared.reference,confirmationUrl};
  }
  try {
    const origin=env.PUBLIC_APP_ORIGIN??'https://jambprep.lecterniq.com';
    const url=new URL(origin);if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/')throw new Error('Invalid callback origin');
    const initPayload:Record<string,unknown>={email,amount:String(prepared.amount),currency:'NGN',reference:prepared.reference,callback_url:`${url.origin}/checkout/verify/`,metadata:{userId,rewardId:prepared.rewardId}};
    const result=await paystackRequest(env,'/transaction/initialize',initPayload,fetchImpl);
    if(result.reference!==prepared.reference)throw new Error('Provider reference mismatch');
    const authorizationUrl=validateCheckoutUrl(result.authorization_url);
    await db.sql`UPDATE payment_checkout_requests SET status='ready',authorization_url=${authorizationUrl} WHERE user_id=${userId}::uuid AND reference=${prepared.reference} AND status='initializing'`;
    return {reference:prepared.reference,authorizationUrl};
  } catch(error) {
    await db.sql`UPDATE payment_checkout_requests SET status='unknown' WHERE user_id=${userId}::uuid AND reference=${prepared.reference} AND status='initializing'`;
    throw error;
  }
}
export async function verifyOwnedPayment(db:RequestDbContext,env:PaymentEnv,userId:string,reference:string,now:Date,fetchImpl:typeof fetch=fetch) {
  if(!/^[A-Za-z0-9_.=-]{1,120}$/.test(reference))throw new ApiError({status:422,code:'VALIDATION_FAILED',message:'Invalid payment reference.'});
  const rows=await db.sql<Array<{reference:string;amount_kobo:number;user_id:string;status:string}>>`SELECT reference,amount_kobo,user_id,status FROM payment_transactions WHERE reference=${reference} AND user_id=${userId}::uuid LIMIT 1`;
  const payment=rows[0];if(!payment)throw new ApiError({status:404,code:'NOT_FOUND',message:'Your payment reference was not found.'});
  const result=await paystackRequest(env,`/transaction/verify/${encodeURIComponent(reference)}`,undefined,fetchImpl);
  if(['failed','abandoned'].includes(String(result.status))) {
    await db.sql`UPDATE payment_transactions SET status='failed' WHERE reference=${reference} AND user_id=${userId}::uuid AND status='pending'`;
    throw new ApiError({status:409,code:'PAYMENT_FAILED',message:'Paystack confirms this payment was cancelled or abandoned. Return to checkout to try again.'});
  }
  if(!matchesPayment(result,reference,payment.amount_kobo,userId))throw new ApiError({status:409,code:'CONFLICT',message:'This payment has not been confirmed with the expected amount and currency.'});
  const auth=result.authorization as {authorization_code?:string;channel?:string;reusable?:boolean}|undefined;const customer=result.customer as {customer_code?:string}|undefined;
  const sub=result.subscription as {subscription_code?:string;email_token?:string}|undefined;
  const settled=await settleVerifiedPaymentAtomic(db,{reference,expectedUserId:userId,now,paystackMeta:{authorizationCode:auth?.authorization_code,customerCode:customer?.customer_code,subscriptionCode:sub?.subscription_code,emailToken:sub?.email_token}});
  let renewalStatus=sub?.subscription_code?'ready':'unavailable';
  const isCardReusable = (auth?.channel === 'card' || !auth?.channel) && auth?.reusable === true;
  if(!sub?.subscription_code && isCardReusable && auth?.authorization_code && customer?.customer_code) {
    try {renewalStatus=await configureVerifiedRenewal(db,env,userId,reference,auth.authorization_code,customer.customer_code,now,fetchImpl);}
    catch {renewalStatus='needs-reconciliation';}
  }
  return {success:true,reference,expiresAt:settled.expiresAt,alreadyProcessed:settled.alreadyProcessed,renewalStatus,message:renewalStatus==='ready'?'Payment confirmed. Premium and monthly renewal are active.':'Payment confirmed. Premium is active for 30 days.'};
}
export async function cancelOwnedSubscription(db:RequestDbContext,env:PaymentEnv,userId:string,now:Date,fetchImpl:typeof fetch=fetch) {
  const rows=await db.sql<Array<{paystack_subscription_code:string|null;paystack_email_token:string|null;expires_at:string;auto_renew:boolean}>>`SELECT paystack_subscription_code,paystack_email_token,expires_at,auto_renew FROM subscription_entitlements WHERE user_id=${userId}::uuid LIMIT 1`;
  const pending=await db.sql`SELECT reference FROM payment_renewal_requests WHERE user_id=${userId}::uuid AND status IN ('initializing','unknown') LIMIT 1`;
  if(pending.length)throw new ApiError({status:409,code:'CONFLICT',message:'Renewal setup needs provider reconciliation before cancellation can be confirmed.'});
  const subscription=rows[0];if(!subscription)throw new ApiError({status:409,code:'CONFLICT',message:'No subscription was found.'});
  if(subscription.auto_renew&&subscription.paystack_subscription_code){
    if(!subscription.paystack_email_token)throw new ApiError({status:503,code:'SERVICE_UNAVAILABLE',message:'Subscription cancellation requires provider reconciliation.'});
    await paystackRequest(env,'/subscription/disable',{code:subscription.paystack_subscription_code,token:subscription.paystack_email_token},fetchImpl);
  }
  const updated=await db.sql`UPDATE subscription_entitlements SET auto_renew=FALSE,cancelled_at=COALESCE(cancelled_at,${now.toISOString()}::timestamptz),updated_at=${now.toISOString()}::timestamptz WHERE user_id=${userId}::uuid AND paystack_subscription_code IS NOT DISTINCT FROM ${subscription.paystack_subscription_code} RETURNING user_id`;
  if(!updated.length)throw new ApiError({status:409,code:'CONFLICT',message:'Your subscription changed. Reload before retrying cancellation.'});
  return {success:true,cancelled:true,autoRenew:false,expiresAt:new Date(subscription.expires_at).toISOString(),message:'Auto-renewal is disabled. Your paid access remains until its expiry.'};
}

/** The discounted first charge is separate from the standard monthly renewal plan. */
export async function configureVerifiedRenewal(db:RequestDbContext,env:PaymentEnv & {PAYSTACK_PLAN_CODE?:string},userId:string,reference:string,authorizationCode:string|undefined,customerCode:string|undefined,now:Date,fetchImpl:typeof fetch=fetch) {
  if(!env.PAYSTACK_PLAN_CODE || !authorizationCode || !customerCode) return 'unavailable';
  const plan=await paystackRequest(env,`/plan/${encodeURIComponent(env.PAYSTACK_PLAN_CODE)}`,undefined,fetchImpl);
  if(Number(plan.amount)!==100000||plan.currency!=='NGN'||plan.interval!=='monthly') throw new ApiError({status:503,code:'SERVICE_CONFIG_UNAVAILABLE',message:'The monthly renewal plan needs reconciliation.'});
  const prepared=await db.runSerializableTransaction(async tx=>{
    await tx`SELECT id FROM profiles WHERE id=${userId}::uuid FOR UPDATE`;
    const payment=await tx`SELECT id FROM payment_transactions WHERE reference=${reference} AND user_id=${userId}::uuid AND status='success'`;
    if(!payment.length)throw new ApiError({status:409,code:'CONFLICT',message:'Confirm your payment before setting up renewal.'});
    const entitlement=await tx<Array<{expires_at:string;paystack_subscription_code:string|null;auto_renew:boolean;cancelled_at:string|null}>>`SELECT expires_at,paystack_subscription_code,auto_renew,cancelled_at FROM subscription_entitlements WHERE user_id=${userId}::uuid FOR UPDATE`;
    if(entitlement[0]?.cancelled_at)return {created:false,status:'disabled',expires_at:entitlement[0].expires_at};
    if(entitlement[0]?.paystack_subscription_code) return {created:false,status:entitlement[0].auto_renew?'ready':'disabled',expires_at:entitlement[0].expires_at};
    const rows=await tx<Array<{status:string}>>`SELECT status FROM payment_renewal_requests WHERE user_id=${userId}::uuid AND status IN ('initializing','ready','unknown') LIMIT 1 FOR UPDATE`;
    if(rows[0])return {created:false,status:rows[0].status,expires_at:entitlement[0]?.expires_at};
    if(!entitlement[0])throw new ApiError({status:409,code:'CONFLICT',message:'Payment entitlement needs reconciliation.'});
    await tx`INSERT INTO payment_renewal_requests (reference,user_id,status,plan_code,customer_code,authorization_code) VALUES (${reference},${userId}::uuid,'initializing',${env.PAYSTACK_PLAN_CODE!},${customerCode},${authorizationCode})`;
    return {created:true,status:'initializing',expires_at:entitlement[0].expires_at};
  });
  if(!prepared.created)return prepared.status;
  try {
    let result:Record<string,unknown>;
    try {
      result=await paystackRequest(env,'/subscription',{customer:customerCode,plan:env.PAYSTACK_PLAN_CODE,authorization:authorizationCode,start_date:new Date(prepared.expires_at).toISOString()},fetchImpl);
    } catch(postErr) {
      const subs=await paystackRequest(env,'/subscription?perPage=50',undefined,fetchImpl);
      const list=Array.isArray(subs)?subs:[];
      const match=list.find((s:any)=>s&&s.status==='active'&&(s.customer?.customer_code===customerCode||s.customer_code===customerCode)&&(s.plan?.plan_code===env.PAYSTACK_PLAN_CODE||!s.plan?.plan_code)) as Record<string,unknown>|undefined;
      if(!match)throw postErr;
      result=match;
    }
    if(typeof result.subscription_code!=='string'||typeof result.email_token!=='string'||!result.subscription_code.startsWith('SUB_'))throw new Error('Invalid subscription confirmation');
    await db.runSerializableTransaction(async tx=>{
      await tx`UPDATE subscription_entitlements SET paystack_subscription_code=${result.subscription_code as string},paystack_email_token=${result.email_token as string},auto_renew=TRUE,cancelled_at=NULL,updated_at=${now.toISOString()}::timestamptz WHERE user_id=${userId}::uuid AND paystack_subscription_code IS NULL`;
      await tx`UPDATE payment_renewal_requests SET status='ready',subscription_code=${result.subscription_code as string} WHERE reference=${reference} AND user_id=${userId}::uuid AND status='initializing'`;
    });
    return 'ready';
  } catch(error) {
    await db.sql`UPDATE payment_renewal_requests SET status='unknown' WHERE reference=${reference} AND user_id=${userId}::uuid AND status='initializing'`;
    throw error;
  }
}
