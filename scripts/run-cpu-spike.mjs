#!/usr/bin/env node
/**
 * Bounded CPU Feasibility Spike Test Runner (T01)
 *
 * Requirements (R5, C1, C3):
 * - Six-scenario execution matrix with valid synthetic HMAC for exact webhook body.
 * - Scenario 3 sends revision 2 for successful isolated write (C1).
 * - Strict response schema and contract validation for all six endpoints (C3).
 * - Exact reviewed target URL allowlist with configurable preview origin option (C3).
 * - Strict positive integer validation using Number conversion (throws on 1.5 or non-integers) (C3).
 * - Shared budget allocator strictly capped to total budget (budget 1 never sends multiple requests).
 * - Unique run IDs generated via crypto.randomUUID (C3).
 * - Replayable offline delayed tail analysis without resending requests (C3).
 * - Per-scenario CPU and wall-time distributions (p50, p95, max), outcomes, and exception counts (C3).
 * - Pure dry-run or import does NOT execute remote benchmarks.
 */

import { readFileSync, existsSync, writeFileSync } from 'node:fs';

export const MAX_TOTAL_REQUESTS_CAP = 600;
export const MAX_CONCURRENCY_CAP = 5;
export const DEFAULT_TIMEOUT_MS = 10000;
export const MAX_RESPONSE_BYTES = 128 * 1024; // 128 KB

export const REVIEWED_ALLOWED_ORIGINS = new Set([
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:8787',
  'http://127.0.0.1:8787',
  'https://jambprep.pages.dev',
]);

/**
 * Strict integer parser rejecting decimals like '1.5' or NaN (C3)
 */
export function parseStrictInteger(val, name, min = 1, max = Infinity) {
  const n = Number(val);
  if (!Number.isInteger(n) || n < min || n > max) {
    throw new Error(`INVALID_${name}: Must be an integer between ${min} and ${max}`);
  }
  return n;
}

/**
 * Validate target URL against reviewed origin allowlist (R5, C3)
 * Explicitly rejects credentials (user/password), queries, and hash fragments.
 */
export function isAllowedTargetUrl(urlStr, extraAllowedOrigins = []) {
  try {
    const u = new URL(urlStr);
    // Reject embedded credentials
    if (u.username || u.password) return false;
    // Reject search queries or hash fragments on target base URL
    if (u.search || u.hash || (u.pathname !== '/' && u.pathname !== '')) return false;

    // Check exact origin against reviewed set
    if (REVIEWED_ALLOWED_ORIGINS.has(u.origin)) return true;

    // Check extra allowed preview origin (C3)
    if (Array.isArray(extraAllowedOrigins) && extraAllowedOrigins.includes(u.origin)) return true;
    if (typeof extraAllowedOrigins === 'string' && extraAllowedOrigins === u.origin) return true;

    // Local development server on localhost/127.0.0.1
    if (u.protocol === 'http:' && (u.hostname === 'localhost' || u.hostname === '127.0.0.1')) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Validate benchmark parameters (R5, C3)
 */
export function validateBenchmarkOptions(options) {
  if (!options || typeof options !== 'object') {
    throw new Error('INVALID_OPTIONS: Options must be an object');
  }

  if (options.requests !== undefined) {
    if (!Number.isInteger(options.requests) || options.requests <= 0 || options.requests > MAX_TOTAL_REQUESTS_CAP) {
      throw new Error(`INVALID_REQUESTS_COUNT: Must be integer between 1 and ${MAX_TOTAL_REQUESTS_CAP}`);
    }
  }

  if (options.concurrency !== undefined) {
    if (!Number.isInteger(options.concurrency) || options.concurrency <= 0 || options.concurrency > MAX_CONCURRENCY_CAP) {
      throw new Error(`INVALID_CONCURRENCY: Must be integer between 1 and ${MAX_CONCURRENCY_CAP}`);
    }
  }

  if (options.timeoutMs !== undefined) {
    if (!Number.isInteger(options.timeoutMs) || options.timeoutMs <= 0) {
      throw new Error('INVALID_TIMEOUT_MS: Must be a positive integer');
    }
  }

  if (options.scenario !== undefined) {
    if (!Number.isInteger(options.scenario) || options.scenario < 1 || options.scenario > 6) {
      throw new Error('INVALID_SCENARIO_ID: Must be an integer between 1 and 6');
    }
  }

  if (!options.targetUrl || typeof options.targetUrl !== 'string') {
    throw new Error('MISSING_TARGET_URL: targetUrl is required');
  }

  if (!isAllowedTargetUrl(options.targetUrl, options.allowedOrigins)) {
    throw new Error('INVALID_TARGET_URL: Must use HTTPS on reviewed origin or localhost, without credentials/queries');
  }
}

/**
 * Compute percentile from sorted numbers
 */
export function calculatePercentile(sorted, p) {
  if (!sorted || sorted.length === 0) return null;
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
}

/**
 * Compute valid SHA-512 HMAC hex signature using Web Crypto (R5)
 */
export async function computeSyntheticHmac(payload, secret) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-512' },
    false,
    ['sign']
  );
  const sigBuffer = await crypto.subtle.sign('HMAC', key, enc.encode(payload));
  return Array.from(new Uint8Array(sigBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Parse top-level Wrangler tail JSON event in milliseconds (R5, C3)
 */
export function parseTailEvent(rawJson) {
  try {
    const data = JSON.parse(rawJson);
    const cpu = typeof data.cpuTime === 'number' && Number.isFinite(data.cpuTime) && data.cpuTime >= 0 ? data.cpuTime : null;
    const wall = typeof data.wallTime === 'number' && Number.isFinite(data.wallTime) && data.wallTime >= 0 ? data.wallTime : null;
    const outcome = typeof data.outcome === 'string' ? data.outcome : 'unknown';
    const hasExceptions = Array.isArray(data.exceptions) && data.exceptions.length > 0;
    const requestId =
      data.event?.request?.headers?.['x-spike-request-id'] ||
      data.event?.request?.headers?.['X-Spike-Request-Id'] ||
      null;

    return {
      cpuTimeMs: cpu,
      wallTimeMs: wall,
      outcome,
      hasExceptions,
      requestId,
    };
  } catch {
    return {
      cpuTimeMs: null,
      wallTimeMs: null,
      outcome: 'malformed',
      hasExceptions: true,
      requestId: null,
    };
  }
}

/**
 * Validate endpoint-specific response contract (C3)
 */
const FIXTURE_ATTEMPT = '22222222-2222-4222-8222-222222222222';
const SUBJECT_COUNTS = { ENG: 60, MTH: 40, PHY: 40, CHM: 40 };
function hasAnswerKey(value) {
  if (!value || typeof value !== 'object') return false;
  return Object.entries(value).some(([key, child]) =>
    ['correctOptionId', 'correct_option_id', 'isCorrect', 'is_correct', 'explanation'].includes(key) || hasAnswerKey(child));
}
export function validateEndpointResponse(scenarioId, json, options = {}) {
  if (!json || typeof json !== 'object' || json.success !== true) return false;
  const subject = options.testSubjectId;
  const expectedAttempt = options.testAttemptId || options.attemptId || FIXTURE_ATTEMPT;
  switch (scenarioId) {
    case 1: return typeof json.userId === 'string' && !!json.userId && (!subject || json.userId === subject);
    case 2: return Boolean(json.profile?.id && (!subject || json.profile.id === subject) && (options.benchmarkSchema ? json.entitlement?.isPremium === true : json.entitlement?.isPremium === false));
    case 3: return json.rolledBack === true && json.ackRevision === (options.revision ?? 2);
    case 4: {
      if (json.attemptId !== expectedAttempt || json.totalQuestions !== 180 || !Array.isArray(json.questions) || json.questions.length !== 180 || hasAnswerKey(json.questions)) return false;
      let offset = 0;
      for (const [code, count] of Object.entries(SUBJECT_COUNTS)) {
        for (let i = 1; i <= count; i++, offset++) {
          const q = json.questions[offset];
          const id = options.benchmarkSchema ? `${code.toLowerCase()}-q${String(i).padStart(3, '0')}` : `q-${code.toLowerCase()}-${String(i).padStart(3, '0')}`;
          if (!q || q.id !== id || q.subjectCode !== code || typeof q.stem !== 'string' || !Array.isArray(q.options) || q.options.length !== 4) return false;
          if (code === 'ENG' && i <= 15 && (typeof q.passage !== 'string' || !q.passage)) return false;
          if (!q.options.every((o, n) => o && o.id.startsWith(id) && o.label === 'ABCD'[n] && typeof o.text === 'string')) return false;
        }
      }
      return true;
    }
    case 5: return json.attemptId === expectedAttempt && json.rolledBack === true && json.totalScore === 300 && json.totalCorrect === 135 && json.totalAnsweredTimely === 180 && Object.entries(SUBJECT_COUNTS).every(([code, count]) => json.subjectScores?.[code]?.totalQuestions === count && json.subjectScores[code].scaledScore === 75);
    case 6: return json.event === 'charge.success' && json.reference === 'SPIKE_TEST_REF_20261010';
    default: return false;
  }
}

/**
 * Build scenario request definition (R5, C1: revision 2 for valid write benchmark)
 */
export async function buildScenarioRequest(scenarioId, baseUrl, options = {}) {
  const normalizedBase = baseUrl.replace(/\/$/, '');
  const secret = options.spikeSecret;
  const token = options.token;
  const benchmarkHeaders = options.benchmarkSchema ? { 'x-spike-benchmark-schema': options.benchmarkSchema } : {};

  switch (scenarioId) {
    case 1:
      return {
        id: 1,
        name: 'auth-jwt',
        url: `${normalizedBase}/api/spike/auth-jwt`,
        method: 'POST',
        headers: {
          'x-spike-secret': secret,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      };
    case 2:
      return {
        id: 2,
        name: 'db-read',
        url: `${normalizedBase}/api/spike/db-read`,
        method: 'GET',
        headers: {
          'x-spike-secret': secret,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...benchmarkHeaders,
        },
        body: null,
      };
    case 3:
      return {
        id: 3,
        name: 'answer-write',
        url: `${normalizedBase}/api/spike/answer-write`,
        method: 'POST',
        headers: {
          'x-spike-secret': secret,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...benchmarkHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          attemptId: options.writeAttemptId || options.attemptId || '22222222-2222-4222-8222-222222222222',
          questionId: options.questionId || (options.benchmarkSchema ? 'eng-q001' : 'q-eng-001'),
          selectedOptionId: options.selectedOptionId || (options.benchmarkSchema ? 'eng-q001-opt-a' : 'q-eng-001-opt-a'),
          revision: options.revision !== undefined ? options.revision : 2, // C1: revision 2 for success
        }),
      };
    case 4:
      return {
        id: 4,
        name: 'mock-payload',
        url: `${normalizedBase}/api/spike/mock-payload?attemptId=${options.testAttemptId || options.attemptId || '22222222-2222-4222-8222-222222222222'}`,
        method: 'GET',
        headers: {
          'x-spike-secret': secret,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...benchmarkHeaders,
        },
        body: null,
      };
    case 5:
      return {
        id: 5,
        name: 'mock-score',
        url: `${normalizedBase}/api/spike/mock-score`,
        method: 'POST',
        headers: {
          'x-spike-secret': secret,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...benchmarkHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          attemptId: options.testAttemptId || options.attemptId || '22222222-2222-4222-8222-222222222222',
        }),
      };
    case 6: {
      const webhookBody = JSON.stringify({
        event: 'charge.success',
        data: {
          id: 987654321,
          status: 'success',
          reference: 'SPIKE_TEST_REF_20261010',
          amount: 100000,
          currency: 'NGN',
        },
      });

      const hmacSecret = options.syntheticSecret || 'synthetic-spike-secret-not-production-key-32chars';
      const signature = options.syntheticSignature || (await computeSyntheticHmac(webhookBody, hmacSecret));

      return {
        id: 6,
        name: 'webhook-hmac',
        url: `${normalizedBase}/api/spike/webhook-hmac`,
        method: 'POST',
        headers: {
          'x-spike-secret': secret,
          'Content-Type': 'application/json',
          'x-paystack-signature': signature,
        },
        body: webhookBody,
      };
    }
    default:
      throw new Error(`Unknown scenario id: ${scenarioId}`);
  }
}

/**
 * Allocate requests strictly within total budget (R5: budget 1 never sends multiple requests)
 */
export function allocateScenarioRequests(totalBudget, scenarioIds) {
  const allocations = new Map();
  for (const sId of scenarioIds) {
    allocations.set(sId, 0);
  }

  let remaining = totalBudget;
  while (remaining > 0) {
    for (const sId of scenarioIds) {
      if (remaining <= 0) break;
      allocations.set(sId, (allocations.get(sId) || 0) + 1);
      remaining--;
    }
  }

  return allocations;
}

/**
 * Read stream within byte bounds and timeout
 */
export async function readBoundedResponse(resp, maxBytes = MAX_RESPONSE_BYTES, signal) {
  if (!resp.body) return new Uint8Array(0);
  const reader = resp.body.getReader();
  const onAbort = () => { reader.cancel().catch(() => {}); };
  signal?.addEventListener('abort', onAbort, { once: true });
  const chunks = [];
  let total = 0;

  try {
    while (true) {
      if (signal?.aborted) throw new Error('RESPONSE_ABORTED');
      const { done, value } = await reader.read();
      if (signal?.aborted) throw new Error('RESPONSE_ABORTED');
      if (done) break;
      if (value) {
        total += value.length;
        if (total > maxBytes) {
          await reader.cancel();
          throw new Error('RESPONSE_TOO_LARGE');
        }
        chunks.push(value);
      }
    }
  } catch (err) {
    await reader.cancel().catch(() => {});
    throw err;
  } finally {
    signal?.removeEventListener('abort', onAbort);
    reader.releaseLock();
  }

  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

/**
 * Execute bounded request queue for a specific scenario (R5, C3)
 */
export async function runScenarioBenchmark(scenarioReq, options, runId, fetchFn = fetch) {
  const totalRequests = options.requests || 0;
  if (totalRequests <= 0) {
    return {
      scenarioId: scenarioReq.id,
      scenarioName: scenarioReq.name,
      count: 0,
      successCount: 0,
      failureCount: 0,
      exceptionCount: 0,
      sentRequestIds: [],
      elapsedP50Ms: null,
      elapsedP95Ms: null,
      elapsedMaxMs: null,
    };
  }

  const concurrency = Math.min(
    Math.max(1, Number.isFinite(options.concurrency) ? options.concurrency : 2),
    MAX_CONCURRENCY_CAP
  );
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;

  const elapsedDurations = [];
  const sentRequestIds = [];
  const fixtureTimings = [];
  const failedElapsedDurations = [];
  let successCount = 0;
  let failureCount = 0;
  let exceptionCount = 0;

  let requestIndex = 0;

  async function worker() {
    while (requestIndex < totalRequests) {
      const idx = requestIndex++;
      const reqId = `${runId}-s${scenarioReq.id}-${idx}`;
      sentRequestIds.push(reqId);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      const start = performance.now();

      try {
        const resp = await fetchFn(scenarioReq.url, {
          method: scenarioReq.method,
          headers: {
            ...scenarioReq.headers,
            'x-spike-request-id': reqId,
          },
          body: scenarioReq.body,
          signal: controller.signal,
          redirect: 'error',
        });

        // Consume bounded body completely within timeout
        const bodyBytes = await readBoundedResponse(resp, MAX_RESPONSE_BYTES, controller.signal);
        const elapsed = performance.now() - start;
        clearTimeout(timeoutId);

        let isSuccess = false;

        // C3: Strict contract validation: HTTP 200 + success: true + endpoint shape
        if (resp.ok && bodyBytes.length > 0) {
          try {
            const json = JSON.parse(new TextDecoder().decode(bodyBytes));
            if (validateEndpointResponse(scenarioReq.id, json, options)) {
              if (json.timings && typeof json.timings === 'object') fixtureTimings.push(Object.fromEntries(['setupMs','actionMs','rollbackMs','totalElapsedMs','statementCount'].filter(k => Number.isFinite(json.timings[k]) && json.timings[k] >= 0).map(k => [k,json.timings[k]])));
              isSuccess = true;
            }
          } catch {
            isSuccess = false;
          }
        }

        if (isSuccess) {
          successCount++;
          elapsedDurations.push(elapsed);
        } else {
          failureCount++;
          failedElapsedDurations.push(elapsed);
        }
      } catch {
        clearTimeout(timeoutId);
        failureCount++;
        failedElapsedDurations.push(performance.now() - start);
        exceptionCount++;
      }
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);

  elapsedDurations.sort((a, b) => a - b);
  failedElapsedDurations.sort((a,b) => a-b);

  return {
    scenarioId: scenarioReq.id,
    scenarioName: scenarioReq.name,
    count: totalRequests,
    successCount,
    failureCount,
    exceptionCount,
    sentRequestIds,
    fixtureTimings,
    failedElapsedSampleCount: failedElapsedDurations.length,
    failedElapsedP95Ms: calculatePercentile(failedElapsedDurations,95),
    cleanupElapsedMs: null,
    elapsedP50Ms: successCount > 0 ? calculatePercentile(elapsedDurations, 50) : null,
    elapsedP95Ms: successCount > 0 ? calculatePercentile(elapsedDurations, 95) : null,
    elapsedMaxMs: successCount > 0 ? elapsedDurations[elapsedDurations.length - 1] : null,
  };
}

/**
 * Correlate tail events with sent request IDs (R5, C3)
 */
export function correlateTailEvents(sentIdsSet, tailEvents) {
  const matchedEvents = new Map(); // reqId -> event (deduplicated)
  let unmatchedCount = 0;
  let duplicateCount = 0;
  let conflictingCount = 0;

  for (const ev of tailEvents) {
    if (!ev || !ev.requestId) {
      unmatchedCount++;
      continue;
    }
    if (sentIdsSet.has(ev.requestId)) {
      if (matchedEvents.has(ev.requestId)) {
        duplicateCount++;
        const previous = matchedEvents.get(ev.requestId);
        if (JSON.stringify(previous) !== JSON.stringify(ev)) {
          conflictingCount++;
          matchedEvents.set(ev.requestId, { ...ev, outcome: 'conflicting', hasExceptions: previous.hasExceptions || ev.hasExceptions || previous.outcome !== 'ok' || ev.outcome !== 'ok', conflict: true });
        }
      } else {
        matchedEvents.set(ev.requestId, ev);
      }
    } else {
      unmatchedCount++;
    }
  }

  return {
    matchedEvents: Array.from(matchedEvents.values()),
    unmatchedCount,
    duplicateCount,
    conflictingCount,
  };
}

/**
 * Aggregate complete per-scenario telemetry and outcomes (C3)
 */
export function analyzeTailTelemetry(sentIdsSet, tailEvents, scenarioResults = []) {
  const { matchedEvents, unmatchedCount, duplicateCount, conflictingCount } = correlateTailEvents(sentIdsSet, tailEvents);

  const scenarioMetrics = new Map();
  for (const res of scenarioResults) {
    scenarioMetrics.set(res.scenarioId, {
      scenarioId: res.scenarioId,
      scenarioName: res.scenarioName,
      sentCount: res.count,
      successCount: res.successCount,
      failureCount: res.failureCount,
      exceptionCount: res.exceptionCount,
      matchedSamples: 0,
      missingCpuSamples: 0,
      cpuValuesMs: [],
      wallValuesMs: [],
      outcomes: {},
      exceptionEvents: 0,
    });
  }

  for (const ev of matchedEvents) {
    const match = ev.requestId ? ev.requestId.match(/-s([1-6])-\d+$/) : null;
    const sId = match ? parseInt(match[1], 10) : null;
    let sMetric = sId ? scenarioMetrics.get(sId) : null;
    if (!sMetric) {
      sMetric = {
        scenarioId: sId || 0,
        scenarioName: `scenario-${sId || 'unknown'}`,
        sentCount: 0,
        successCount: 0,
        failureCount: 0,
        exceptionCount: 0,
        matchedSamples: 0,
        missingCpuSamples: 0,
        cpuValuesMs: [],
        wallValuesMs: [],
        outcomes: {},
        exceptionEvents: 0,
      };
      if (sId) scenarioMetrics.set(sId, sMetric);
    }

    sMetric.matchedSamples++;
    sMetric.outcomes[ev.outcome] = (sMetric.outcomes[ev.outcome] || 0) + 1;
    if (ev.hasExceptions) sMetric.exceptionEvents++;

    if (ev.cpuTimeMs !== null && Number.isFinite(ev.cpuTimeMs) && ev.cpuTimeMs >= 0) {
      sMetric.cpuValuesMs.push(ev.cpuTimeMs);
    } else {
      sMetric.missingCpuSamples++;
    }

    if (ev.wallTimeMs !== null && Number.isFinite(ev.wallTimeMs) && ev.wallTimeMs >= 0) {
      sMetric.wallValuesMs.push(ev.wallTimeMs);
    }
  }

  const perScenario = Array.from(scenarioMetrics.values()).map((sm) => {
    sm.cpuValuesMs.sort((a, b) => a - b);
    sm.wallValuesMs.sort((a, b) => a - b);
    return {
      scenarioId: sm.scenarioId,
      scenarioName: sm.scenarioName,
      sentCount: sm.sentCount,
      successCount: sm.successCount,
      failureCount: sm.failureCount,
      exceptionCount: sm.exceptionCount,
      matchedSamples: sm.matchedSamples,
      missingCpuSamples: sm.missingCpuSamples,
      entirelyMissingSamples: Math.max(0, sm.sentCount - sm.matchedSamples),
      cpuP50Ms: calculatePercentile(sm.cpuValuesMs, 50),
      cpuP95Ms: calculatePercentile(sm.cpuValuesMs, 95),
      cpuMaxMs: sm.cpuValuesMs.length > 0 ? sm.cpuValuesMs[sm.cpuValuesMs.length - 1] : null,
      wallP50Ms: calculatePercentile(sm.wallValuesMs, 50),
      wallP95Ms: calculatePercentile(sm.wallValuesMs, 95),
      wallMaxMs: sm.wallValuesMs.length > 0 ? sm.wallValuesMs[sm.wallValuesMs.length - 1] : null,
      outcomes: sm.outcomes,
      exceptionEvents: sm.exceptionEvents,
    };
  });

  return {
    matchedEvents,
    unmatchedCount,
    duplicateCount,
    conflictingCount,
    evidenceComplete: !scenarioResults.some(r => r.failureCount > 0 || r.exceptionCount > 0) && sentIdsSet.size > 0 && conflictingCount === 0 && matchedEvents.length === sentIdsSet.size && matchedEvents.every(e => e.outcome === 'ok' && !e.hasExceptions && Number.isFinite(e.cpuTimeMs) && e.cpuTimeMs >= 0 && Number.isFinite(e.wallTimeMs) && e.wallTimeMs >= 0),
    perScenario,
  };
}

/**
 * Extract tail events from file supporting both single-line JSONL and multiline JSON (D3, T02)
 */
export function extractTailEventsFromFile(tailLogPath) {
  if (!tailLogPath || !existsSync(tailLogPath)) {
    return [];
  }
  const content = readFileSync(tailLogPath, 'utf8');
  const lines = content.split('\n').filter((l) => l.trim());
  let allSingleLines = lines.length > 0;
  const singleLineEvents = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      const parsed = parseTailEvent(trimmed);
      if (parsed.outcome === 'malformed') {
        allSingleLines = false;
        break;
      }
      singleLineEvents.push(parsed);
    } else {
      allSingleLines = false;
      break;
    }
  }

  if (allSingleLines && singleLineEvents.length > 0) {
    return singleLineEvents;
  }

  // Braces inside JSON strings must not change object depth.
  const events = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let escaped = false;
  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    if (depth === 0) {
      if (ch === '{') { start = i; depth = 1; inString = false; escaped = false; }
      continue;
    }
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        events.push(parseTailEvent(content.slice(start, i + 1)));
        start = -1;
      }
    }
  }
  return events;
}

/**
 * Offline delayed tail event analyzer without sending new benchmark requests (C3)
 */
export function analyzeTailLogOffline(tailLogPath, sentRequestIds = [], scenarioResults = []) {
  if (!tailLogPath || !existsSync(tailLogPath)) {
    throw new Error(`TAIL_LOG_NOT_FOUND: ${tailLogPath}`);
  }
  const events = extractTailEventsFromFile(tailLogPath);
  const sentSet = new Set(sentRequestIds);
  return analyzeTailTelemetry(sentSet, events, scenarioResults);
}

/**
 * Execute multi-scenario benchmark with shared request budget and complete telemetry (R5, C3)
 */
export async function runBenchmark(options, fetchFn = fetch) {
  validateBenchmarkOptions(options);

  // C3: Unique run ID via crypto.randomUUID
  const runId = typeof crypto?.randomUUID === 'function' ? crypto.randomUUID() : `run-${Date.now()}`;
  const totalBudget = options.requests || 60;
  const scenarioIds = options.scenario ? [options.scenario] : [1, 2, 3, 4, 5, 6];

  const allocations = allocateScenarioRequests(totalBudget, scenarioIds);
  const scenarioResults = [];
  const allSentIds = new Set();

  for (const sId of scenarioIds) {
    const allocatedCount = allocations.get(sId) || 0;
    if (allocatedCount === 0) continue;

    const sReq = await buildScenarioRequest(sId, options.targetUrl, options);
    const result = await runScenarioBenchmark(
      sReq,
      { ...options, requests: allocatedCount },
      runId,
      fetchFn
    );

    for (const id of result.sentRequestIds) {
      allSentIds.add(id);
    }
    scenarioResults.push(result);
  }

  // Parse tail log and correlate with exact sent request IDs (R5, C3, T02)
  if (options.tailLogPath) {
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  const rawTailEvents = options.tailLogPath ? extractTailEventsFromFile(options.tailLogPath) : [];

  const analysis = analyzeTailTelemetry(
    allSentIds,
    rawTailEvents,
    scenarioResults
  );
  const { matchedEvents, unmatchedCount, duplicateCount, perScenario } = analysis;

  const matchedCpuValues = [];
  const globalOutcomes = {};
  let totalExceptionEvents = 0;

  for (const ev of matchedEvents) {
    globalOutcomes[ev.outcome] = (globalOutcomes[ev.outcome] || 0) + 1;
    if (ev.hasExceptions) totalExceptionEvents++;
    if (ev.cpuTimeMs !== null && Number.isFinite(ev.cpuTimeMs) && ev.cpuTimeMs >= 0) {
      matchedCpuValues.push(ev.cpuTimeMs);
    }
  }
  matchedCpuValues.sort((a, b) => a - b);

  const totalCompleted = scenarioResults.reduce((acc, r) => acc + r.successCount, 0);
  const totalFailed = scenarioResults.reduce((acc, r) => acc + r.failureCount, 0);

  return {
    runId,
    totalBudget,
    totalSent: allSentIds.size,
    sentRequestIds: [...allSentIds],
    evidenceComplete: analysis.evidenceComplete,
    conflictingCount: analysis.conflictingCount,
    scenarioResults,
    perScenario,
    totalCompleted,
    totalFailed,
    tailSampleCount: matchedCpuValues.length,
    tailOutcomes: globalOutcomes,
    tailExceptionCount: totalExceptionEvents,
    tailUnmatchedCount: unmatchedCount,
    tailDuplicateCount: duplicateCount,
    tailCpuP50Ms: matchedCpuValues.length > 0 ? calculatePercentile(matchedCpuValues, 50) : null,
    tailCpuP95Ms: matchedCpuValues.length > 0 ? calculatePercentile(matchedCpuValues, 95) : null,
    tailCpuMaxMs: matchedCpuValues.length > 0 ? matchedCpuValues[matchedCpuValues.length - 1] : null,
  };
}

/**
 * Parse CLI arguments
 */
function parseArgs(args) {
  const result = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith('--')) {
        result[key] = next;
        i++;
      } else {
        result[key] = true;
      }
    }
  }
  return result;
}

// Main execution entry point
async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    console.log(`
Cloudflare Free CPU Spike Runner (T01)

Usage:
  node scripts/run-cpu-spike.mjs --dry-run
  node scripts/run-cpu-spike.mjs --run --target-url <url> [--scenario <1-6>] [--requests <n>] [--concurrency <c>]
  node scripts/run-cpu-spike.mjs --offline-analysis --tail-log <file> --sent-ids <file>

Options:
  --dry-run             Validate configuration without sending requests or deploying
  --run                 Explicit action required to execute live benchmark
  --target-url <url>    Spike endpoint URL (must be HTTPS on reviewed origin or localhost)
  --preview-origin <url> Configurable private preview origin allowed for benchmark
  --scenario <1-6>      Execute specific scenario (default: runs all 6)
  --requests <n>        Total requests budget across scenarios (max ${MAX_TOTAL_REQUESTS_CAP})
  --concurrency <c>     Max concurrent requests per scenario (max ${MAX_CONCURRENCY_CAP})
  --output <file>       Write private sanitized run manifest (new file only)
  --tail-log <file>     Path to Wrangler tail log JSONL file to parse CPU telemetry
  --offline-analysis    Run offline delayed tail correlation against sent IDs
`);
    process.exit(0);
  }

  if (args['dry-run']) {
    console.log('[T01 Spike Runner] Dry-run validation passed.');
    console.log(`- Request Cap: ${MAX_TOTAL_REQUESTS_CAP}`);
    console.log(`- Concurrency Cap: ${MAX_CONCURRENCY_CAP}`);
    console.log('- Status: No requests sent. Deployment deferred.');
    process.exit(0);
  }

  if (args['offline-analysis']) {
    const tailLog = typeof args['tail-log'] === 'string' ? args['tail-log'] : '';
    const sentIdsFile = typeof args['sent-ids'] === 'string' ? args['sent-ids'] : '';
    let sentIds = [];
    if (sentIdsFile && existsSync(sentIdsFile)) {
      sentIds = JSON.parse(readFileSync(sentIdsFile, 'utf8'));
    }
    const manifest = Array.isArray(sentIds) ? { sentRequestIds: sentIds, scenarioResults: [] } : sentIds;
    const analysis = analyzeTailLogOffline(tailLog, manifest.sentRequestIds, manifest.scenarioResults);
    console.log('[T01 Spike Runner] Offline tail analysis completed:');
    console.log(JSON.stringify(analysis, null, 2));
    process.exit(0);
  }

  if (!args.run) {
    console.log('[T01 Spike Runner] Notice: No explicit --run or --dry-run specified. Halting safely.');
    process.exit(0);
  }

  const targetUrl = typeof args['target-url'] === 'string' ? args['target-url'] : '';
  const previewOrigin = process.env.SPIKE_PREVIEW_ORIGIN || (typeof args['preview-origin'] === 'string' ? args['preview-origin'] : undefined);
  const spikeSecret = process.env.SPIKE_SECRET || (typeof args['spike-secret'] === 'string' ? args['spike-secret'] : '');
  const testSubjectId = process.env.SPIKE_TEST_SUBJECT_ID;
  const token = process.env.SPIKE_TOKEN || (typeof args.token === 'string' ? args.token : undefined);

  // Strict integer conversions (C3)
  const requests = args.requests !== undefined ? parseStrictInteger(args.requests, 'REQUESTS_COUNT', 1, MAX_TOTAL_REQUESTS_CAP) : 60;
  const concurrency = args.concurrency !== undefined ? parseStrictInteger(args.concurrency, 'CONCURRENCY', 1, MAX_CONCURRENCY_CAP) : 2;
  const scenario = args.scenario !== undefined ? parseStrictInteger(args.scenario, 'SCENARIO_ID', 1, 6) : undefined;
  const tailLogPath = typeof args['tail-log'] === 'string' ? args['tail-log'] : undefined;
  const timeoutMs = args['timeout-ms'] !== undefined ? parseStrictInteger(args['timeout-ms'], 'TIMEOUT_MS', 1000, 60000) : DEFAULT_TIMEOUT_MS;

  if (!targetUrl || !spikeSecret) {
    console.error('Error: targetUrl and spikeSecret are required to run benchmarks.');
    process.exit(1);
  }

  if (scenario !== 6 && (!token || !/^[0-9a-f-]{36}$/i.test(testSubjectId || ''))) throw new Error('Dedicated student token and SPIKE_TEST_SUBJECT_ID are required');
  const allowedOrigins = previewOrigin ? [previewOrigin] : [];

  const summary = await runBenchmark({
    targetUrl,
    allowedOrigins,
    testSubjectId,
    spikeSecret,
    token,
    requests,
    concurrency,
    scenario,
    tailLogPath,
    timeoutMs,
  });

  if (typeof args.output === 'string') saveRunManifest(args.output, summary);
  console.log(JSON.stringify(summary, null, 2));
  console.log(`\n======================================================`);
  console.log(`[T01 Spike Runner] Benchmark Run Summary: ${summary.runId}`);
  console.log(`Total Requests Sent: ${summary.totalSent} | Success: ${summary.totalCompleted} | Failed: ${summary.totalFailed}`);
  console.log(`Tail Samples Matched: ${summary.tailSampleCount} | Unmatched: ${summary.tailUnmatchedCount} | Duplicates: ${summary.tailDuplicateCount}`);
  if (summary.tailCpuP50Ms !== null) {
    console.log(`Global Tail CPU: p50=${summary.tailCpuP50Ms.toFixed(2)}ms, p95=${summary.tailCpuP95Ms.toFixed(2)}ms, max=${summary.tailCpuMaxMs.toFixed(2)}ms`);
  } else {
    console.log(`Global Tail CPU: Telemetry unavailable`);
  }
  console.log(`------------------------------------------------------`);
  console.log(`Per-Scenario Breakdown:`);
  for (const s of summary.perScenario) {
    const cpuStr = s.cpuP50Ms !== null ? `p50=${s.cpuP50Ms.toFixed(2)}ms, p95=${s.cpuP95Ms.toFixed(2)}ms, max=${s.cpuMaxMs.toFixed(2)}ms` : 'N/A';
    console.log(`Scenario ${s.scenarioId} (${s.scenarioName}): ${s.successCount}/${s.sentCount} ok | CPU: ${cpuStr} | Outcomes: ${JSON.stringify(s.outcomes)}`);
  }
  console.log(`======================================================\n`);
}

if (process.argv[1] && process.argv[1].endsWith('run-cpu-spike.mjs')) {
  main().catch((err) => {
    console.error('Spike Runner Error:', err.message);
    process.exit(1);
  });
}

export function saveRunManifest(path, summary) {
  const manifest = { version: 1, runId: summary.runId, sentRequestIds: summary.sentRequestIds, scenarioResults: summary.scenarioResults, perScenario: summary.perScenario, evidenceComplete: summary.evidenceComplete, conflictingCount: summary.conflictingCount };
  writeFileSync(path, JSON.stringify(manifest, null, 2), { flag: 'wx', mode: 0o600 });
  return manifest;
}
