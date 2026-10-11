import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import postgres from 'postgres';
import { recordRequestInLedger } from './ledger.mjs';
import { BENCHMARK_SCHEMA_PATTERN } from './benchmark-fixture.mjs';
import { createSpikeDbClient } from '../worker/db.ts';

export async function withDeadline(promise, milliseconds = 10000) {
  let timer;
  try {
    return await Promise.race([promise, new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('CONCURRENCY_BARRIER_TIMEOUT')), milliseconds);
    })]);
  } finally { clearTimeout(timer); }
}

/** Test-only adapter: run the REAL operation SQL, commit synthetic changes, then surface its sentinel. */
export function commitSyntheticSql(sql, beforeCommit) {
  return new Proxy(sql, { get(target, property) {
    if (property !== 'begin') return Reflect.get(target, property);
    return async (mode, action) => {
      let sentinel;
      await target.begin(mode, async tx => {
        try { await action(tx); }
        catch (error) {
          if (error?.message !== 'INTENTIONAL_SPIKE_ROLLBACK') throw error;
          sentinel = error;
          if (beforeCommit) await beforeCommit(tx);
        }
      });
      if (sentinel) throw sentinel;
    };
  }});
}

export async function runConcurrencyChecks(options = {}) {
  const url = options.directDatabaseUrl || process.env.BENCHMARK_DATABASE_URL;
  const fixturePath = options.fixtureManifestPath || process.env.SPIKE_FIXTURE_MANIFEST_FILE;
  const output = options.manifestPath || process.env.SPIKE_CONCURRENCY_MANIFEST_FILE;
  if (!url || !fixturePath || !output || existsSync(output)) throw new Error('Invalid private concurrency inputs');
  const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'));
  const schemaName = fixture.schemaName;
  if (!BENCHMARK_SCHEMA_PATTERN.test(schemaName)) throw new Error('Invalid benchmark schema');
  const {testSubjectId} = fixture.deterministicIds;
  const runId = randomUUID();
  // Includes controls, three connections, up to20 observer queries and bounded serialization retries.
  recordRequestInLedger(`t02-concurrency-${runId}`, 'Actual operation committed race checks; concurrency3; bounded controls/polling/retries', 72);
  const config = {max:1, idle_timeout:10, connect_timeout:5, connection:{statement_timeout:10000, lock_timeout:8000}};
  const sqlA = postgres(url, config);
  const sqlB = postgres(url, config);
  const observer = postgres(url, config);
  const results = [];
  let releaseWriter;
  const release = new Promise(resolve => {releaseWriter = resolve;});
  let markHeld;
  const held = new Promise(resolve => {markHeld = resolve;});
  try {
    const raceAttemptId = randomUUID();
    const serverReceivedAt = new Date().toISOString();
    const serverSubmittedAt = new Date().toISOString();
    // Setup dedicated attempt in benchmark schema
    await sqlA.begin(async (tx) => {
      await tx`
        INSERT INTO ${tx(schemaName)}.${tx('attempts')} (id, user_id, status, started_at, expires_at, is_completed)
        VALUES (${raceAttemptId}::uuid, ${testSubjectId}::uuid, 'in_progress', NOW() - INTERVAL '30 minutes', NOW() + INTERVAL '24 hours', false);
      `;
      // Link questions
      await tx`
        INSERT INTO ${tx(schemaName)}.${tx('attempt_questions')} (attempt_id, question_id, question_order)
        SELECT ${raceAttemptId}::uuid, q.id, row_number() OVER ()
        FROM ${tx(schemaName)}.${tx('questions')} q;
      `;
      // Seed 180 answers: 134 correct, but eng-q001 is WRONG (opt-b, rev 1).
      // When A updates eng-q001 to opt-a (rev 2), correct count becomes 135 (score 300).
      await tx`
        WITH q_ordered AS (
          SELECT id, correct_option_id, row_number() OVER (
            ORDER BY
              CASE
                WHEN subject = 'ENG' THEN 1
                WHEN subject = 'MTH' THEN 2
                WHEN subject = 'PHY' THEN 3
                WHEN subject = 'CHM' THEN 4
                ELSE 5
              END,
              id
          ) AS ord
          FROM ${tx(schemaName)}.${tx('questions')}
        )
        INSERT INTO ${tx(schemaName)}.${tx('attempt_answers')} (attempt_id, question_id, selected_option_id, revision, server_received_at)
        SELECT
          ${raceAttemptId}::uuid,
          q.id,
          CASE
            WHEN q.id = 'eng-q001' THEN q.id || '-opt-b' -- Wrong initially
            WHEN (q.ord % 4) != 0 THEN q.correct_option_id
            ELSE q.id || '-opt-b'
          END,
          1,
          NOW() - INTERVAL '15 minutes'
        FROM q_ordered q;
      `;
    });


    const pidA = (await sqlA`SELECT pg_backend_pid() AS pid`)[0].pid;
    const pidB = (await sqlB`SELECT pg_backend_pid() AS pid`)[0].pid;
    const env = {DATABASE_URL:url, SPIKE_TEST_SUBJECT_ID:testSubjectId};
    const writer = createSpikeDbClient(env, false, commitSyntheticSql(sqlA, async () => {
      markHeld(); await withDeadline(release);
    }));
    const finalizer = createSpikeDbClient(env, false, commitSyntheticSql(sqlB));
    const writerPromise = writer.upsertAnswerInRollback({benchmarkSchema:schemaName, attemptId:raceAttemptId,
      userId:testSubjectId,questionId:'eng-q001',selectedOptionId:'eng-q001-opt-a',revision:2,serverReceivedAt});
    writerPromise.catch(() => {});
    await withDeadline(held);
    const scorePromise = finalizer.scoreAttemptInRollback({benchmarkSchema:schemaName,
      attemptId:raceAttemptId,userId:testSubjectId,serverSubmittedAt});
    scorePromise.catch(() => {});
    let blocked = false;
    try {
      for (let i=0;i<20;i++) {
        const rows = await observer`SELECT ${pidA}::int = ANY(pg_blocking_pids(${pidB}::int)) AS blocked`;
        if (rows[0]?.blocked) {blocked=true; break;}
        await new Promise(resolve => setTimeout(resolve,25));
      }
      if (!blocked) throw new Error('FINALIZER_LOCK_WAIT_NOT_OBSERVED');
    } finally {releaseWriter();}
    const [write, score] = await withDeadline(Promise.all([writerPromise, scorePromise]));
    const state = (await sqlA`SELECT a.status,a.total_score,a.total_correct,r.total_score AS result_score,
      ans.revision,ans.selected_option_id FROM ${sqlA(schemaName)}.${sqlA('attempts')} a
      JOIN ${sqlA(schemaName)}.${sqlA('attempt_results')} r ON r.attempt_id=a.id
      JOIN ${sqlA(schemaName)}.${sqlA('attempt_answers')} ans ON ans.attempt_id=a.id AND ans.question_id='eng-q001'
      WHERE a.id=${raceAttemptId}::uuid`)[0];
    results.push({scenario:'observed-lock-wait-and-actual-committed-operations', blocked,
      passed:blocked && write.ackRevision===2 && score.totalScore===300 && score.totalCorrect===135
        && state?.status==='completed' && state.total_score===300 && state.result_score===300
        && state.total_correct===135 && state.revision===2 && state.selected_option_id==='eng-q001-opt-a',state});
    const plain = createSpikeDbClient(env,false,commitSyntheticSql(sqlA));
    async function expectFailure(name,action,expected) {
      let error;
      try {await action();} catch(e) {error=e.message;}
      results.push({scenario:name,passed:error===expected,error});
    }
    await expectFailure('actual-write-after-finalization',()=>plain.upsertAnswerInRollback({benchmarkSchema:schemaName,
      attemptId:raceAttemptId,userId:testSubjectId,questionId:'eng-q001',selectedOptionId:'eng-q001-opt-b',revision:3,
      serverReceivedAt:new Date().toISOString()}),'ATTEMPT_ALREADY_COMPLETED');
    await expectFailure('actual-stale-write',()=>plain.upsertAnswerInRollback({benchmarkSchema:schemaName,
      attemptId:fixture.deterministicIds.writeAttemptId,userId:testSubjectId,questionId:'eng-q001',
      selectedOptionId:'eng-q001-opt-a',revision:1,serverReceivedAt:new Date().toISOString()}),'STALE_REVISION_REJECTED');
    await expectFailure('actual-repeated-finalization',()=>plain.scoreAttemptInRollback({benchmarkSchema:schemaName,
      attemptId:raceAttemptId,userId:testSubjectId,serverSubmittedAt:new Date().toISOString()}),'ATTEMPT_ALREADY_COMPLETED');
    const count=(await sqlA`SELECT count(*)::int AS count FROM ${sqlA(schemaName)}.${sqlA('attempt_results')}
      WHERE attempt_id=${raceAttemptId}::uuid`)[0].count;
    results.push({scenario:'single-persisted-result',passed:count===1,count});
  } finally {
    releaseWriter();
    await Promise.allSettled([sqlA.end({timeout:5}),sqlB.end({timeout:5}),observer.end({timeout:5})]);
  }
  const summary={runId,benchmarkSchema:schemaName,testOnlyCommitAdapter:true,results,
    allPassed:results.every(r=>r.passed),totalScenarios:results.length};
  writeFileSync(output,JSON.stringify(summary,null,2)+'\n',{mode:0o600,flag:'wx'});
  return summary;
}

export async function main(args=process.argv.slice(2)) {
  if(args.length!==1 || args[0]!=='--run') {console.log('No requests sent. Use --run with private inputs and tsx loader.');return;}
  console.log(JSON.stringify(await runConcurrencyChecks()));
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  main().catch(()=>{console.error('Concurrency checks failed; inspect private manifest and clean fixtures.');process.exitCode=1;});
}
