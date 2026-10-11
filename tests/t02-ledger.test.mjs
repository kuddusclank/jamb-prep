import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { recordRequestInLedger, getLedgerStatus } from '../scripts/ledger.mjs';

function fixture(t) {
  const dir = mkdtempSync(join(tmpdir(), 't02-ledger-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const path = join(dir, 'ledger.json');
  writeFileSync(path, JSON.stringify({ hardBudgetCap: 900, maxConcurrencyCap: 5,
    requests: [], totalCumulativeCount: 0, remainingBudget: 900 }));
  return path;
}

test('ledger reserves exact budget and rejects invalid counts and duplicates', t => {
  const path = fixture(t);
  for (const count of [-1, 0, 1.5, NaN, '1']) {
    assert.throws(() => recordRequestInLedger('invalid', 'test', count, path));
  }
  recordRequestInLedger('first', 'test', 899, path);
  assert.throws(() => recordRequestInLedger('first', 'test', 1, path));
  assert.throws(() => recordRequestInLedger('over', 'test', 2, path));
  recordRequestInLedger('last', 'test', 1, path);
  assert.equal(getLedgerStatus(path).remainingBudget, 0);
});

test('corrupt accounting and competing lock fail closed without changing ledger', t => {
  const path = fixture(t);
  writeFileSync(`${path}.lock`, 'held');
  const before = readFileSync(path, 'utf8');
  assert.throws(() => recordRequestInLedger('locked', 'test', 1, path));
  assert.equal(readFileSync(path, 'utf8'), before);
  rmSync(`${path}.lock`);
  const corrupt = JSON.parse(before);
  corrupt.totalCumulativeCount = 1;
  writeFileSync(path, JSON.stringify(corrupt));
  assert.throws(() => recordRequestInLedger('corrupt', 'test', 1, path));
});

test('T02 runner import and default command do not fetch or reserve requests', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = () => { throw new Error('Unexpected network request'); };
  const before = getLedgerStatus().totalCumulativeCount;
  try {
    const { main } = await import('../scripts/run-t02-benchmark.mjs');
    await main([]);
    assert.equal(getLedgerStatus().totalCumulativeCount, before);
  } finally { globalThis.fetch = original; }
});


test('probe import/default invocation does not reserve or fetch', async () => {
  const before = getLedgerStatus().totalCumulativeCount;
  const { main } = await import('../scripts/run-db-probe.mjs');
  await main([]);
  assert.equal(getLedgerStatus().totalCumulativeCount, before);
});

test('probe bounds body wait, cancels stalled stream and retains reservation', async t => {
  const path = fixture(t);
  const { runProbe } = await import('../scripts/run-db-probe.mjs');
  let canceled = false;
  const result = await runProbe({ spikeSecret: 'test-only', token: 'test-only', ledgerPath: path, timeoutMs: 20,
    fetchImpl: async () => new Response(new ReadableStream({ cancel() { canceled = true; } })) });
  assert.equal(result.failure, 'CLIENT_TIMEOUT');
  assert.equal(canceled, true);
  assert.equal(getLedgerStatus(path).totalCumulativeCount, 1);
});


test('benchmark cleanup refuses unexpected tables or a tampered manifest', async () => {
  const { createBenchmarkManifest, assertBenchmarkInventory } = await import('../scripts/benchmark-fixture.mjs');
  const manifest = createBenchmarkManifest('jambprep_benchmark_1234abcd', 'test', 'foreign');
  assert.doesNotThrow(() => assertBenchmarkInventory(manifest, ['attempts']));
  assert.throws(() => assertBenchmarkInventory(manifest, ['application_records']));
  assert.throws(() => assertBenchmarkInventory({ ...manifest, expectedTables: ['attempts'] }, ['attempts']));
});

test('concurrency checks import and default invocation do not fetch or reserve requests', async () => {
  const before = getLedgerStatus().totalCumulativeCount;
  const { main } = await import('../scripts/run-concurrency-checks.mjs');
  await main([]);
  assert.equal(getLedgerStatus().totalCumulativeCount, before);
});

test('commit harness commits synthetic operations before surfacing the rollback sentinel', async () => {
  const {commitSyntheticSql,withDeadline} = await import('../scripts/run-concurrency-checks.mjs');
  let committed=false;
  const sql=Object.assign(()=>{}, {begin:async(_mode,action)=>{await action({});committed=true;}});
  const harness=commitSyntheticSql(sql);
  await assert.rejects(harness.begin('isolation level serializable',async()=>{
    throw new Error('INTENTIONAL_SPIKE_ROLLBACK');
  }),/INTENTIONAL_SPIKE_ROLLBACK/);
  assert.equal(committed,true);
  committed=false;
  await assert.rejects(harness.begin('isolation level serializable',async()=>{
    throw new Error('business-validation-failed');
  }),/business-validation-failed/);
  assert.equal(committed,false);
  await assert.rejects(withDeadline(new Promise(()=>{}),5),/CONCURRENCY_BARRIER_TIMEOUT/);
});
