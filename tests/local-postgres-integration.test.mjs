import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import postgres from 'postgres';
import {saveStudentOnboardingAtomic} from '../worker/services/onboarding-service.ts';
import {getStudentCoachInsights} from '../worker/services/coach-service.ts';
import {allocatePractice,checkIssuedPractice,startFrozenMock} from '../worker/services/study-service.ts';
import {getOwnedAttemptPayloadJson,upsertOwnedExamAnswerAtomic,submitAndScoreExamAttemptAtomic} from '../worker/services/exam-foundation-service.ts';
const enabled=process.env.RUN_LOCAL_POSTGRES==='1';
test('real PostgreSQL: bootstrap provisions a fresh profile before the idempotency foreign key and replays safely',{skip:!enabled,timeout:15000},async()=>{
 const {NATIVE_API_ROUTES}=await import('../worker/api/router.ts');
 const {runDatabaseTransaction}=await import('../worker/api/db-context.ts');
 const file=path.join(os.homedir(),'.codex/private-backups/jambprep/local-runtime.env');
 const url=fs.readFileSync(file,'utf8').trim().slice('DATABASE_URL='.length);assert.equal(new URL(url).hostname,'127.0.0.1');
 const sql=postgres(url,{max:1,prepare:false});const uid=crypto.randomUUID();const email=`local-signup-${uid}@example.invalid`;
 const db={sql,isHyperdrive:false,runSerializableTransaction:fn=>runDatabaseTransaction(()=>sql.begin('isolation level serializable',fn)),runCommittedTransaction:fn=>sql.begin(fn)};
 const route=NATIVE_API_ROUTES.find(r=>r.id==='auth.bootstrap');
 const invoke=()=>route.handler({request:new Request('http://localhost/api/v1/auth/bootstrap',{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':`signup-${uid}`},body:JSON.stringify({displayName:'Fresh signup fixture'})}),actor:{userId:uid,email},now:new Date(),getDb:()=>db});
 try {
  await sql`INSERT INTO auth.users(id,email) VALUES (${uid}::uuid,${email})`;
  await sql`DELETE FROM profiles WHERE id=${uid}::uuid`;
  assert.equal((await sql`SELECT id FROM profiles WHERE id=${uid}::uuid`).length,0);
  const result=await invoke();assert.equal(result.status,200);assert.ok(result.body.referralCode);
  const [profile]=await sql`SELECT role FROM profiles WHERE id=${uid}::uuid`;assert.equal(profile.role,'student');
  const replay=await invoke();assert.equal(replay.body.referralCode,result.body.referralCode);assert.equal(new Headers(replay.headers).get('Idempotent-Replayed'),'true');
  const [claim]=await sql`SELECT status FROM api_idempotency_keys WHERE user_id=${uid}::uuid`;assert.equal(claim.status,'completed');
 } finally {await sql`DELETE FROM auth.users WHERE id=${uid}::uuid`;await sql.end();}
});
test('real PostgreSQL 17: restore, metered practice, bank preflight, frozen answers and atomic scoring',{skip:!enabled},async()=>{
 const file=path.join(os.homedir(),'.codex/private-backups/jambprep/local-runtime.env');
 const url=fs.readFileSync(file,'utf8').trim().slice('DATABASE_URL='.length);
 assert.equal(new URL(url).hostname,'127.0.0.1');
 const sql=postgres(url,{max:1,prepare:false});const rollback=new Error('LOCAL_FIXTURE_ROLLBACK');
 try {await assert.rejects(sql.begin('isolation level serializable',async tx=>{
  const uid=crypto.randomUUID();await tx`INSERT INTO auth.users (id,email) VALUES (${uid}::uuid,${`local-${uid}@example.invalid`})`;
  await tx`INSERT INTO profiles (id,email,display_name,role) VALUES (${uid}::uuid,${`local-${uid}@example.invalid`},'Local SQL fixture','student') ON CONFLICT(id) DO NOTHING`;
  await tx`INSERT INTO student_subjects (user_id,subject_id) SELECT ${uid}::uuid,id FROM subjects WHERE code IN ('ENG','MTH','PHY','CHM')`;
  const now=new Date();const saved=await saveStudentOnboardingAtomic(tx,uid,{electives:['Mathematics','Physics','Chemistry'],targetScore:280},now);assert.equal(saved.saved,true);
  const prefs=await tx`SELECT target_score FROM student_preferences WHERE user_id=${uid}::uuid`;assert.equal(prefs[0].target_score,280);
  const issued=await allocatePractice(tx,uid,{subjectCode:'ENG',count:5},now);assert.equal(issued.questions.length,5);assert.equal(issued.remaining,10);
  assert.doesNotMatch(JSON.stringify(issued),/correct_option|is_correct|explanation/);
  const feedback=await checkIssuedPractice(tx,uid,{sessionId:issued.sessionId,questionId:issued.questions[0].id,selectedOption:'A'},now);assert.equal(typeof feedback.isCorrect,'boolean');
  await assert.rejects(startFrozenMock(tx,uid,{examConditions:false},now),/No diagnostic allowance/);
  const empty=await tx`SELECT count(*)::int AS n FROM attempts WHERE user_id=${uid}::uuid AND mode='mock'`;assert.equal(empty[0].n,0);
  // Isolated, rolled-back SQL fixtures exercise the complete-bank path. They never enter the app bank.
  for(const code of ['ENG','MTH','PHY','CHM']) {
   await tx`WITH template AS (SELECT q.* FROM questions q JOIN subjects s ON s.id=q.subject_id WHERE s.code=${code} AND q.status='published' AND (SELECT count(*) FROM question_options o WHERE o.question_id=q.id)=4 AND (SELECT count(*) FROM question_options o WHERE o.question_id=q.id AND o.is_correct)=1 LIMIT 1), clones AS (INSERT INTO questions SELECT (jsonb_populate_record(NULL::questions,to_jsonb(t)||jsonb_build_object('id',gen_random_uuid(),'stem','[LOCAL SQL FIXTURE]'))).* FROM template t CROSS JOIN generate_series(1,60) RETURNING id) INSERT INTO question_options SELECT (jsonb_populate_record(NULL::question_options,to_jsonb(o)||jsonb_build_object('id',gen_random_uuid(),'question_id',c.id))).* FROM clones c CROSS JOIN template t JOIN question_options o ON o.question_id=t.id`;
  }
  const started=await startFrozenMock(tx,uid,{examConditions:false},now);assert.equal(started.resumed,false);
  const payload=await getOwnedAttemptPayloadJson(tx,{attemptId:started.attemptId,userId:uid});
  const frozen=await tx`SELECT question_id,correct_option_id FROM attempt_questions WHERE attempt_id=${started.attemptId}::uuid ORDER BY position`;
  assert.equal(frozen.length,180);
  const db={sql:tx,runSerializableTransaction:fn=>fn(tx)};
  await upsertOwnedExamAnswerAtomic(db,{attemptId:started.attemptId,userId:uid,questionId:frozen[0].question_id,selectedOptionId:frozen[0].correct_option_id,revision:1});
  const result=await submitAndScoreExamAttemptAtomic(db,{attemptId:started.attemptId,userId:uid});assert.equal(result.totalCorrect,1);assert.equal(result.totalAnsweredTimely,1);const coach=await getStudentCoachInsights(tx,uid);assert.equal(coach.totalMocksCompleted,1);assert.equal(coach.latestScore,result.totalScore);
  const replay=await submitAndScoreExamAttemptAtomic(db,{attemptId:started.attemptId,userId:uid});assert.equal(replay.totalScore,result.totalScore);
  throw rollback;
 }),error=>error===rollback);}finally{await sql.end();}
});

test('real PostgreSQL: simultaneous preference updates retry whole rolled-back transactions without losing either save',{skip:!enabled,timeout:15000},async()=>{
 const {runDatabaseTransaction}=await import('../worker/api/db-context.ts');
 const file=path.join(os.homedir(),'.codex/private-backups/jambprep/local-runtime.env');
 const url=fs.readFileSync(file,'utf8').trim().slice('DATABASE_URL='.length);assert.equal(new URL(url).hostname,'127.0.0.1');
 const sql=postgres(url,{max:2,prepare:false,connection:{statement_timeout:3000,lock_timeout:2000}});
 const uid=crypto.randomUUID();let release;const ready=new Promise(resolve=>{release=resolve;});let arrivals=0;const counts=[0,0];
 try {
  await sql.begin(async tx=>{await tx`INSERT INTO auth.users(id,email) VALUES (${uid}::uuid,${`local-retry-${uid}@example.invalid`})`;await tx`INSERT INTO profiles(id,email,display_name,role) VALUES (${uid}::uuid,${`local-retry-${uid}@example.invalid`},'Local retry fixture','student') ON CONFLICT(id) DO NOTHING`;await tx`INSERT INTO student_preferences(user_id,target_score,exam_year) VALUES (${uid}::uuid,280,2026)`;});
  const results=await Promise.allSettled([0,1].map(i=>runDatabaseTransaction(()=>sql.begin('isolation level serializable',async tx=>{
   counts[i]++;const [row]=await tx`SELECT target_score FROM student_preferences WHERE user_id=${uid}::uuid`;
   if(counts[i]===1){if(++arrivals===2)release();await ready;}
   await tx`UPDATE student_preferences SET target_score=${row.target_score+1} WHERE user_id=${uid}::uuid`;return row.target_score+1;
  }))));
  assert.ok(results.every(r=>r.status==='fulfilled'));assert.ok(counts.some(n=>n>1));
  const [row]=await sql`SELECT target_score FROM student_preferences WHERE user_id=${uid}::uuid`;assert.equal(row.target_score,282);
 } finally {await sql`DELETE FROM auth.users WHERE id=${uid}::uuid`;await sql.end();}
});

 test('real PostgreSQL: two onboarded referrals earn one reward without any completed mock',{skip:!enabled,timeout:15000},async()=>{
 const file=path.join(os.homedir(),'.codex/private-backups/jambprep/local-runtime.env');const url=fs.readFileSync(file,'utf8').trim().slice('DATABASE_URL='.length);assert.equal(new URL(url).hostname,'127.0.0.1');const sql=postgres(url,{max:1,prepare:false});const rollback=new Error('REFERRAL_FIXTURE_ROLLBACK');
 try {await assert.rejects(sql.begin('isolation level serializable',async tx=>{
 const ids=[crypto.randomUUID(),crypto.randomUUID(),crypto.randomUUID()];
 for(const uid of ids){await tx`INSERT INTO auth.users(id,email) VALUES (${uid}::uuid,${`local-referral-${uid}@example.invalid`})`;await tx`INSERT INTO profiles(id,email,display_name,role) VALUES (${uid}::uuid,${`local-referral-${uid}@example.invalid`},'Referral fixture','student') ON CONFLICT(id) DO NOTHING`;}
 for(const uid of ids.slice(1)){await tx`INSERT INTO referrals(referrer_id,referred_user_id,status) VALUES (${ids[0]}::uuid,${uid}::uuid,'pending')`;await saveStudentOnboardingAtomic(tx,uid,{electives:['Mathematics','Physics','Chemistry'],targetScore:280},new Date());}
 const [qualified]=await tx`SELECT count(*)::int AS n FROM referrals WHERE referrer_id=${ids[0]}::uuid AND status='qualified'`;assert.equal(qualified.n,2);
 const [reward]=await tx`SELECT count(*)::int AS n FROM referral_rewards WHERE user_id=${ids[0]}::uuid`;assert.equal(reward.n,1);
 await saveStudentOnboardingAtomic(tx,ids[1],{electives:['Mathematics','Physics','Chemistry'],targetScore:290},new Date());
 const [replayed]=await tx`SELECT count(*)::int AS n FROM referral_rewards WHERE user_id=${ids[0]}::uuid`;assert.equal(replayed.n,1);throw rollback;
 }),error=>error===rollback);}finally{await sql.end();}
 });
