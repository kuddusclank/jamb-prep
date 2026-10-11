import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { recordRequestInLedger } from './ledger.mjs';
import { readBoundedResponse } from './run-cpu-spike.mjs';

export async function runParityChecks(options = {}) {
  const {
    targetUrl,
    spikeSecret,
    token,
    manifestPath,
    benchmarkSchema,
    deterministicIds,
  } = options;

  if (!targetUrl || !spikeSecret || !token || !benchmarkSchema || !deterministicIds) {
    throw new Error('Missing required options for engine parity checks');
  }

  if (targetUrl !== 'https://jambprep-spike.abdulquddus-akanbi.workers.dev') throw new Error('Unreviewed parity target');

  const {
    testAttemptId,
    perfectAttemptId,
    zeroAttemptId,
    foreignAttemptId,
    expiredAttemptId,
    writeAttemptId,
    completedAttemptId,
  } = deterministicIds;

  const checks = [
    {
      name: 'zero-attempt-scoring-0pts',
      url: `${targetUrl}/api/spike/mock-score`,
      method: 'POST',
      body: JSON.stringify({ attemptId: zeroAttemptId }),
      expectedStatus: 200,
      validate: (json) => json.success === true && json.totalScore === 0 && json.totalCorrect === 0,
    },
    {
      name: 'perfect-attempt-scoring-400pts',
      url: `${targetUrl}/api/spike/mock-score`,
      method: 'POST',
      body: JSON.stringify({ attemptId: perfectAttemptId }),
      expectedStatus: 200,
      validate: (json) => json.success === true && json.totalScore === 400 && json.totalCorrect === 180,
    },
    {
      name: 'foreign-attempt-score-forbidden',
      url: `${targetUrl}/api/spike/mock-score`,
      method: 'POST',
      body: JSON.stringify({ attemptId: foreignAttemptId }),
      expectedStatus: 403,
      validate: (json) => json.error === 'ATTEMPT_NOT_FOUND_OR_FORBIDDEN',
    },
    {
      name: 'expired-attempt-scoring-zero-timely',
      url: `${targetUrl}/api/spike/mock-score`,
      method: 'POST',
      body: JSON.stringify({ attemptId: expiredAttemptId }),
      expectedStatus: 200,
      validate: (json) => json.success === true && json.totalAnsweredTimely === 0 && json.totalScore === 0,
    },
    {
      name: 'stale-revision-write-rejected',
      url: `${targetUrl}/api/spike/answer-write`,
      method: 'POST',
      body: JSON.stringify({
        attemptId: writeAttemptId,
        questionId: 'eng-q001',
        selectedOptionId: 'eng-q001-opt-a',
        revision: 1, // Pre-seeded answer already has revision 1; revision <= 1 must be rejected
      }),
      expectedStatus: 400,
      validate: (json) => json.error === 'STALE_REVISION_REJECTED',
    },
    {
      name: 'foreign-attempt-write-forbidden',
      url: `${targetUrl}/api/spike/answer-write`,
      method: 'POST',
      body: JSON.stringify({
        attemptId: foreignAttemptId,
        questionId: 'eng-q001',
        selectedOptionId: 'eng-q001-opt-a',
        revision: 2,
      }),
      expectedStatus: 403,
      validate: (json) => json.error === 'ATTEMPT_NOT_FOUND_OR_FORBIDDEN',
    },
    {
      name: 'completed-attempt-write-rejected',
      url: `${targetUrl}/api/spike/answer-write`,
      method: 'POST',
      body: JSON.stringify({
        attemptId: completedAttemptId,
        questionId: 'eng-q001',
        selectedOptionId: 'eng-q001-opt-a',
        revision: 2,
      }),
      expectedStatus: 400,
      validate: (json) => json.error === 'ATTEMPT_ALREADY_COMPLETED',
    },
  ];

  // Reserve 6 requests in cumulative ledger BEFORE any network call
  recordRequestInLedger(
    `t02-parity-${randomUUID()}`,
    'Real engine scoring parity (0/400) and security/deadline/stale checks; concurrency 1',
    checks.length
  );

  const results = [];
  const runId = randomUUID();

  for (let i = 0; i < checks.length; i++) {
    const c = checks[i];
    const reqId = `${runId}-parity-${i}-${c.name}`;
    const start = performance.now();

    const signal = AbortSignal.timeout(25000);
    const res = await fetch(c.url, {
      signal,
      redirect: 'error',
      method: c.method,
      headers: {
        'x-spike-secret': spikeSecret,
        Authorization: `Bearer ${token}`,
        'x-spike-benchmark-schema': benchmarkSchema,
        'x-spike-request-id': reqId,
        'Content-Type': 'application/json',
      },
      body: c.body,
    });

    const elapsedMs = performance.now() - start;
    let json = null;
    try {
      json = JSON.parse(new TextDecoder().decode(await readBoundedResponse(res, 8192, signal)));
    } catch {
      // Non-json response
    }

    const statusMatch = res.status === c.expectedStatus;
    const bodyValid = json ? c.validate(json) : false;
    const passed = statusMatch && bodyValid;

    results.push({
      name: c.name,
      requestId: reqId,
      status: res.status,
      expectedStatus: c.expectedStatus,
      passed,
      elapsedMs: Math.round(elapsedMs),
      response: json,
    });
  }

  const allPassed = results.every((r) => r.passed);
  const summary = {
    runId,
    timestamp: new Date().toISOString(),
    benchmarkSchema,
    allPassed,
    totalChecks: results.length,
    passedCount: results.filter((r) => r.passed).length,
    failedCount: results.filter((r) => !r.passed).length,
    results,
  };

  if (manifestPath) {
    writeFileSync(manifestPath, JSON.stringify(summary, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
  }

  return summary;
}

export async function main(args = process.argv.slice(2)) {
  if (args.length !== 1 || args[0] !== '--run') {
    console.log('No requests sent. Use --run with SPIKE_SECRET, SPIKE_TOKEN_FILE, SPIKE_PREVIEW_ORIGIN, SPIKE_FIXTURE_MANIFEST_FILE and SPIKE_PARITY_MANIFEST_FILE.');
    return;
  }

  const {
    SPIKE_SECRET: spikeSecret,
    SPIKE_TOKEN_FILE: tokenFile,
    SPIKE_PREVIEW_ORIGIN: targetUrl,
    SPIKE_FIXTURE_MANIFEST_FILE: fixtureManifestPath,
    SPIKE_PARITY_MANIFEST_FILE: parityManifestPath,
  } = process.env;

  if (![spikeSecret, tokenFile, targetUrl, fixtureManifestPath, parityManifestPath].every(Boolean)) {
    throw new Error('Missing explicit private inputs for parity runner');
  }

  if (existsSync(parityManifestPath)) {
    throw new Error('Parity manifest already exists; choose a new private path');
  }

  const token = readFileSync(tokenFile, 'utf8').trim();
  const fixtureManifest = JSON.parse(readFileSync(fixtureManifestPath, 'utf8'));

  const summary = await runParityChecks({
    targetUrl,
    spikeSecret,
    token,
    manifestPath: parityManifestPath,
    benchmarkSchema: fixtureManifest.schemaName,
    deterministicIds: fixtureManifest.deterministicIds,
  });

  console.log(JSON.stringify(summary, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error('Parity checks failed; inspect private inputs and reservation ledger.');
    process.exitCode = 1;
  });
}
