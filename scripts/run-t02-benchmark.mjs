import { readFileSync, existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { recordRequestInLedger } from './ledger.mjs';
import { runBenchmark, saveRunManifest } from './run-cpu-spike.mjs';

export async function main(args = process.argv.slice(2)) {
  if (args.length !== 1 || args[0] !== '--run') {
    console.log('No requests sent. Use --run with SPIKE_SECRET, SPIKE_TOKEN_FILE, SPIKE_TEST_SUBJECT_ID, SPIKE_PREVIEW_ORIGIN, SPIKE_TAIL_FILE and SPIKE_MANIFEST_FILE.');
    return;
  }
  const { SPIKE_SECRET: spikeSecret, SPIKE_TOKEN_FILE: tokenFile, SPIKE_TEST_SUBJECT_ID: testSubjectId,
    SPIKE_PREVIEW_ORIGIN: targetUrl, SPIKE_TAIL_FILE: tailLogPath, SPIKE_MANIFEST_FILE: manifestPath,
    SPIKE_FIXTURE_MANIFEST_FILE: fixtureManifestPath } = process.env;
  if (![spikeSecret, tokenFile, testSubjectId, targetUrl, tailLogPath, manifestPath].every(Boolean)) {
    throw new Error('Missing explicit private benchmark inputs');
  }
  if (existsSync(manifestPath)) throw new Error('Manifest already exists; choose a new private path');
  const token = readFileSync(tokenFile, 'utf8').trim();
  if (!token) throw new Error('Empty token file');

  let benchmarkSchema;
  let testAttemptId;
  let writeAttemptId;
  if (fixtureManifestPath && existsSync(fixtureManifestPath)) {
    const fixtureManifest = JSON.parse(readFileSync(fixtureManifestPath, 'utf8'));
    benchmarkSchema = fixtureManifest.schemaName;
    testAttemptId = fixtureManifest.deterministicIds?.testAttemptId;
    writeAttemptId = fixtureManifest.deterministicIds?.writeAttemptId;
  }

  recordRequestInLedger(`t02-matrix-${randomUUID()}`, 'Six-scenario matrix; concurrency 1; reservation before network', 6);
  const summary = await runBenchmark({
    targetUrl,
    allowedOrigins: [targetUrl],
    testSubjectId,
    spikeSecret,
    token,
    requests: 6,
    concurrency: 1,
    tailLogPath,
    timeoutMs: 25000,
    benchmarkSchema,
    testAttemptId,
    writeAttemptId,
  });
  saveRunManifest(manifestPath, summary);
  console.log(JSON.stringify({ runId: summary.runId, totalSent: summary.totalSent,
    totalCompleted: summary.totalCompleted, totalFailed: summary.totalFailed,
    evidenceComplete: summary.evidenceComplete, perScenario: summary.perScenario }, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(() => { console.error('T02 benchmark failed; inspect local inputs and reserved ledger.'); process.exitCode = 1; });
}
