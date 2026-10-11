/**
 * Comprehensive Unit, Security, and Adapter Tests for Worker Feasibility Spike (T01)
 *
 * Requirements (C1–C4, R1–R5):
 * - C1: SQL fixture/benchmark parity: successful write revision 2; shared questions with explicit
 *   attempt-question membership; passages retained; truthful entitlement; server-accepted past answer timestamps.
 * - C2: Bounded statement counts (<= 15); instrumented setup/action/rollback/cleanup timings;
 *   full 180-question/answer coverage test on SQL adapter.
 * - C3: Strict endpoint response contracts; safe per-scenario correlated telemetry; configurable preview origin;
 *   strict Number CLI parsing; unique run IDs; offline delayed-tail analysis.
 * - C4: Restored security regressions (tampering, expired, nbf, issuer, audience, >128KB cancellation,
 *   raw-byte HMAC); answer validation rejection coverage; actual SQL-path error/state/membership/cleanup tests;
 *   issuer-scoped JWKS coalescing/throttling.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  verifySupabaseJwt,
  resetJwksCache,
  base64UrlToBytes,
  readBoundedStream,
} from '../worker/auth.ts';
import {
  createSpikeDbClient,
  createMockSpikeDbClient,
  runInRollbackFixtureTx,
  bulkInsert,
  assertSafePayloadJson,
  assertValidBenchmarkSchema,
  BENCHMARK_SCHEMA_PATTERN,
} from '../worker/db.ts';
import {
  handleSpikeRoutes,
  computeHmacSha512HexFromBytes,
  timingSafeEqualString,
} from '../worker/spike-routes.ts';
import workerEntry from '../worker/index.ts';
import {
  SPIKE_TEST_SUBJECT_ID,
  SPIKE_TEST_ATTEMPT_ID,
  SPIKE_PERFECT_ATTEMPT_ID,
  SPIKE_ZERO_ATTEMPT_ID,
  SPIKE_EXPIRED_ATTEMPT_ID,
  SPIKE_COMPLETED_ATTEMPT_ID,
  SYNTHETIC_CANDIDATE,
  SYNTHETIC_ENTITLEMENT,
  SYNTHETIC_HMAC_SECRET,
  SYNTHETIC_WEBHOOK_PAYLOAD,
  SYNTHETIC_180_QUESTIONS,
  sanitizeExamPayload,
  deriveAttemptFixtures,
  computeSyntheticWebhookHmac,
  generateCandidateAnswersWithAccuracy,
} from '../worker/fixtures/mock-data.ts';
import {
  parseTailEvent,
  calculatePercentile,
  isAllowedTargetUrl,
  buildScenarioRequest,
  allocateScenarioRequests,
  validateBenchmarkOptions,
  validateEndpointResponse,
  correlateTailEvents,
  analyzeTailTelemetry,
  analyzeTailLogOffline,
  runScenarioBenchmark,
  parseStrictInteger,
} from '../scripts/run-cpu-spike.mjs';

const worker = workerEntry.default || workerEntry;

function bytesToBase64Url(bytes) {
  const binary = String.fromCharCode(...bytes);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function textToBase64Url(text) {
  return bytesToBase64Url(new TextEncoder().encode(text));
}

// Helper to generate a synthetic ECDSA P-256 key pair and signed JWT
async function createSyntheticJwtSigner(kid = 'spike-test-kid-1', issuer = 'https://bqumnaoiiukifvanoonm.supabase.co/auth/v1') {
  const keyPair = await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify']
  );

  const publicJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
  publicJwk.kid = kid;
  publicJwk.alg = 'ES256';
  publicJwk.use = 'sig';

  const jwks = {
    keys: [publicJwk],
  };

  async function signToken(payloadOverrides = {}, headerOverrides = {}) {
    const header = {
      alg: 'ES256',
      typ: 'JWT',
      kid,
      ...headerOverrides,
    };

    const payload = {
      sub: SPIKE_TEST_SUBJECT_ID,
      email: SYNTHETIC_CANDIDATE.email,
      role: 'student',
      iss: issuer,
      aud: 'authenticated',
      exp: Math.floor(Date.now() / 1000) + 3600,
      ...payloadOverrides,
    };

    const headerB64 = textToBase64Url(JSON.stringify(header));
    const payloadB64 = textToBase64Url(JSON.stringify(payload));
    const signingInput = new TextEncoder().encode(`${headerB64}.${payloadB64}`);

    const signature = await crypto.subtle.sign(
      { name: 'ECDSA', hash: { name: 'SHA-256' } },
      keyPair.privateKey,
      signingInput
    );

    const signatureB64 = bytesToBase64Url(new Uint8Array(signature));
    return `${headerB64}.${payloadB64}.${signatureB64}`;
  }

  return { keyPair, publicJwk, jwks, signToken };
}

// Helper to generate a synthetic RSA key pair and signed RS256 JWT
async function createSyntheticRsaJwtSigner(kid = 'spike-rsa-kid-1') {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: 'RSASSA-PKCS1-v1_5',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['sign', 'verify']
  );

  const publicJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
  publicJwk.kid = kid;
  publicJwk.alg = 'RS256';
  publicJwk.use = 'sig';

  const jwks = {
    keys: [publicJwk],
  };

  async function signToken(payloadOverrides = {}) {
    const header = { alg: 'RS256', typ: 'JWT', kid };
    const payload = {
      sub: SPIKE_TEST_SUBJECT_ID,
      email: 'rsa-student@example.com',
      iss: 'https://bqumnaoiiukifvanoonm.supabase.co/auth/v1',
      aud: 'authenticated',
      exp: Math.floor(Date.now() / 1000) + 3600,
      ...payloadOverrides,
    };

    const headerB64 = textToBase64Url(JSON.stringify(header));
    const payloadB64 = textToBase64Url(JSON.stringify(payload));
    const signingInput = new TextEncoder().encode(`${headerB64}.${payloadB64}`);

    const signature = await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      keyPair.privateKey,
      signingInput
    );

    const signatureB64 = bytesToBase64Url(new Uint8Array(signature));
    return `${headerB64}.${payloadB64}.${signatureB64}`;
  }

  return { keyPair, publicJwk, jwks, signToken };
}

// ====================================================================
// Suite 1: JWT & Auth Security Regressions (C4)
// ====================================================================

test('[C4 JWT] Valid signed ES256 and RS256 tokens pass verification', async () => {
  resetJwksCache();
  const esSigner = await createSyntheticJwtSigner();
  const esToken = await esSigner.signToken();

  const esResult = await verifySupabaseJwt(esToken, {
    supabaseUrl: 'https://bqumnaoiiukifvanoonm.supabase.co',
    customJwks: esSigner.jwks,
  });

  assert.equal(esResult.valid, true);
  assert.equal(esResult.claims?.sub, SPIKE_TEST_SUBJECT_ID);

  resetJwksCache();
  const rsaSigner = await createSyntheticRsaJwtSigner();
  const rsaToken = await rsaSigner.signToken();

  const rsaResult = await verifySupabaseJwt(rsaToken, {
    supabaseUrl: 'https://bqumnaoiiukifvanoonm.supabase.co',
    customJwks: rsaSigner.jwks,
  });

  assert.equal(rsaResult.valid, true);
  assert.equal(rsaResult.claims?.sub, SPIKE_TEST_SUBJECT_ID);
});

test('[C4 JWT Security] Rejects tampered signatures (INVALID_SIGNATURE)', async () => {
  resetJwksCache();
  const signer = await createSyntheticJwtSigner();
  const validToken = await signer.signToken();
  const parts = validToken.split('.');
  const tamperedSig = parts[2].slice(0, -4) + 'AAAA';
  const tamperedToken = `${parts[0]}.${parts[1]}.${tamperedSig}`;

  const res = await verifySupabaseJwt(tamperedToken, {
    supabaseUrl: 'https://bqumnaoiiukifvanoonm.supabase.co',
    customJwks: signer.jwks,
  });
  assert.equal(res.valid, false);
  assert.equal(res.error, 'INVALID_SIGNATURE');
});

test('[C4 JWT Security] Rejects expired tokens (TOKEN_EXPIRED)', async () => {
  resetJwksCache();
  const signer = await createSyntheticJwtSigner();
  const now = Math.floor(Date.now() / 1000);
  const expiredToken = await signer.signToken({ exp: now - 30 });

  const res = await verifySupabaseJwt(expiredToken, {
    supabaseUrl: 'https://bqumnaoiiukifvanoonm.supabase.co',
    customJwks: signer.jwks,
    nowSec: now,
  });
  assert.equal(res.valid, false);
  assert.equal(res.error, 'TOKEN_EXPIRED');
});

test('[C4 JWT Security] Rejects future nbf tokens (TOKEN_NOT_YET_VALID)', async () => {
  resetJwksCache();
  const signer = await createSyntheticJwtSigner();
  const now = Math.floor(Date.now() / 1000);
  const futureNbfToken = await signer.signToken({ nbf: now + 300 });

  const res = await verifySupabaseJwt(futureNbfToken, {
    supabaseUrl: 'https://bqumnaoiiukifvanoonm.supabase.co',
    customJwks: signer.jwks,
    nowSec: now,
  });
  assert.equal(res.valid, false);
  assert.equal(res.error, 'TOKEN_NOT_YET_VALID');
});

test('[C4 JWT Security] Rejects non-finite or invalid nbf timestamps (INVALID_NBF_TIMESTAMP)', async () => {
  resetJwksCache();
  const signer = await createSyntheticJwtSigner();
  const badNbfToken = await signer.signToken({ nbf: 'not-a-number' });

  const res = await verifySupabaseJwt(badNbfToken, {
    supabaseUrl: 'https://bqumnaoiiukifvanoonm.supabase.co',
    customJwks: signer.jwks,
  });
  assert.equal(res.valid, false);
  assert.equal(res.error, 'INVALID_NBF_TIMESTAMP');
});

test('[C4 JWT Security] Rejects issuer mismatch (INVALID_CLAIM_ISSUER)', async () => {
  resetJwksCache();
  const signer = await createSyntheticJwtSigner();
  const badIssToken = await signer.signToken({ iss: 'https://unauthorized-issuer.com/auth/v1' });

  const res = await verifySupabaseJwt(badIssToken, {
    supabaseUrl: 'https://bqumnaoiiukifvanoonm.supabase.co',
    customJwks: signer.jwks,
  });
  assert.equal(res.valid, false);
  assert.equal(res.error, 'INVALID_CLAIM_ISSUER');
});

test('[C4 JWT Security] Rejects audience mismatch (INVALID_CLAIM_AUDIENCE)', async () => {
  resetJwksCache();
  const signer = await createSyntheticJwtSigner();
  const badAudToken = await signer.signToken({ aud: 'anon' });

  const res = await verifySupabaseJwt(badAudToken, {
    supabaseUrl: 'https://bqumnaoiiukifvanoonm.supabase.co',
    customJwks: signer.jwks,
  });
  assert.equal(res.valid, false);
  assert.equal(res.error, 'INVALID_CLAIM_AUDIENCE');
});

test('[C4 JWT Security] Rejects forbidden algorithms none and HS256', async () => {
  resetJwksCache();
  const signer = await createSyntheticJwtSigner();

  const noneToken = await signer.signToken({}, { alg: 'none' });
  const noneRes = await verifySupabaseJwt(noneToken, {
    supabaseUrl: 'https://bqumnaoiiukifvanoonm.supabase.co',
    customJwks: signer.jwks,
  });
  assert.equal(noneRes.valid, false);
  assert.equal(noneRes.error, 'UNSUPPORTED_OR_FORBIDDEN_ALGORITHM');

  const hs256Token = await signer.signToken({}, { alg: 'HS256' });
  const hsRes = await verifySupabaseJwt(hs256Token, {
    supabaseUrl: 'https://bqumnaoiiukifvanoonm.supabase.co',
    customJwks: signer.jwks,
  });
  assert.equal(hsRes.valid, false);
  assert.equal(hsRes.error, 'UNSUPPORTED_OR_FORBIDDEN_ALGORITHM');
});

test('[C4 JWT Bounds] Rejects oversized tokens > 4 KB (TOKEN_TOO_LARGE)', async () => {
  resetJwksCache();
  const signer = await createSyntheticJwtSigner();
  const validToken = await signer.signToken();
  const giantToken = validToken + 'a'.repeat(4500);

  const res = await verifySupabaseJwt(giantToken, {
    supabaseUrl: 'https://bqumnaoiiukifvanoonm.supabase.co',
    customJwks: signer.jwks,
  });
  assert.equal(res.valid, false);
  assert.equal(res.error, 'TOKEN_TOO_LARGE');
});

// ====================================================================
// Suite 2: JWKS Cache, Stream Bounds & Issuer Scoping (C4)
// ====================================================================

test('[C4 JWKS Atomic Replacement] Refreshed same-kid invalid key evicts stale cached key', async () => {
  resetJwksCache();
  const signer = await createSyntheticJwtSigner('rotation-kid-1');
  const now = Math.floor(Date.now() / 1000);
  const validToken = await signer.signToken({ exp: now + 7200 });

  const res1 = await verifySupabaseJwt(validToken, {
    supabaseUrl: 'https://bqumnaoiiukifvanoonm.supabase.co',
    customJwks: signer.jwks,
    nowSec: now,
  });
  assert.equal(res1.valid, true);

  const corruptedJwk = { ...signer.publicJwk, alg: 'HS256' };
  const corruptedJwks = { keys: [corruptedJwk] };

  const res2 = await verifySupabaseJwt(validToken, {
    supabaseUrl: 'https://bqumnaoiiukifvanoonm.supabase.co',
    customJwks: corruptedJwks,
    nowSec: now + 400,
  });
  assert.equal(res2.valid, false);
  assert.equal(res2.error, 'KEY_NOT_FOUND_OR_REVOKED');
});

test('[C4 JWKS Guards] Null, non-object, and array entries in JWKS are safely ignored', async () => {
  resetJwksCache();
  const signer = await createSyntheticJwtSigner('valid-kid-1');
  const validToken = await signer.signToken();

  const jwksWithGarbage = {
    keys: [null, undefined, 'invalid-string', ['nested'], signer.publicJwk],
  };

  const res = await verifySupabaseJwt(validToken, {
    supabaseUrl: 'https://bqumnaoiiukifvanoonm.supabase.co',
    customJwks: jwksWithGarbage,
  });
  assert.equal(res.valid, true);
  assert.equal(res.claims?.sub, SPIKE_TEST_SUBJECT_ID);
});

test('[C4 JWKS Issuer Scoping] Throttling Issuer A does NOT block or throttle Issuer B', async () => {
  resetJwksCache();
  let fetchCountA = 0;
  let fetchCountB = 0;

  const mockFetch = async (url) => {
    if (url.includes('issuer-a')) {
      fetchCountA++;
      return new Response(JSON.stringify({ keys: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    if (url.includes('issuer-b')) {
      fetchCountB++;
      return new Response(JSON.stringify({ keys: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response(null, { status: 404 });
  };

  const signerA = await createSyntheticJwtSigner('kid-a', 'https://issuer-a.supabase.co/auth/v1');
  const signerB = await createSyntheticJwtSigner('kid-b', 'https://issuer-b.supabase.co/auth/v1');
  const tokenA = await signerA.signToken();
  const tokenB = await signerB.signToken();
  const now = 1700000000;

  await verifySupabaseJwt(tokenA, { supabaseUrl: 'https://issuer-a.supabase.co', customFetch: mockFetch, nowSec: now });
  assert.equal(fetchCountA, 1);

  await verifySupabaseJwt(tokenA, { supabaseUrl: 'https://issuer-a.supabase.co', customFetch: mockFetch, nowSec: now + 5 });
  assert.equal(fetchCountA, 1);

  await verifySupabaseJwt(tokenB, { supabaseUrl: 'https://issuer-b.supabase.co', customFetch: mockFetch, nowSec: now + 5 });
  assert.equal(fetchCountB, 1);
});

test('[C4 Stream Bounds & Abort] readBoundedStream cancels unclosed stream on excess bytes and on abort signal', async () => {
  let readerCancelled = false;
  const oversizedStream = new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array(70 * 1024));
      controller.enqueue(new Uint8Array(70 * 1024));
    },
    cancel() {
      readerCancelled = true;
    },
  });

  await assert.rejects(
    async () => {
      await readBoundedStream(oversizedStream, 128 * 1024);
    },
    /PAYLOAD_TOO_LARGE/
  );
  assert.equal(readerCancelled, true);

  const abortController = new AbortController();
  let stalledStreamCancelled = false;
  const stalledStream = new ReadableStream({
    pull() {
      return new Promise(() => {});
    },
    cancel() {
      stalledStreamCancelled = true;
    },
  });

  setTimeout(() => abortController.abort(), 20);

  await assert.rejects(
    async () => {
      await readBoundedStream(stalledStream, 128 * 1024, abortController.signal);
    },
    /STREAM_ABORTED/
  );
  assert.equal(stalledStreamCancelled, true);
});

// ====================================================================
// Suite 3: Preview Secret & Lazy Database Initialization (R3)
// ====================================================================

test('[R3 Preview Secret] Worker fails closed if SPIKE_SECRET is missing or mismatch', async () => {
  const ctx = { waitUntil: () => {}, passThroughOnException: () => {} };

  const req1 = new Request('https://worker/api/spike/mock-payload', {
    method: 'GET',
    headers: { 'x-spike-secret': 'secret' },
  });
  const res1 = await worker.fetch(req1, {}, ctx);
  assert.equal(res1.status, 503);

  const req2 = new Request('https://worker/api/spike/mock-payload', {
    method: 'GET',
    headers: { 'x-spike-secret': 'wrong-secret' },
  });
  const res2 = await worker.fetch(req2, { SPIKE_SECRET: 'right-secret' }, ctx);
  assert.equal(res2.status, 403);
});

test('[R3 Lazy DB Allocation] Auth and HMAC scenarios never allocate database client', async () => {
  resetJwksCache();
  const signer = await createSyntheticJwtSigner();
  const token = await signer.signToken();
  const env = {
    SPIKE_SECRET: 'test-secret',
    SPIKE_TEST_SUBJECT_ID,
    SYNTHETIC_HMAC_SECRET,
  };

  let dbGetterCalled = false;
  const lazyDbGetter = () => {
    dbGetterCalled = true;
    throw new Error('SHOULD_NOT_BE_CALLED');
  };

  const req1 = new Request('https://worker/api/spike/auth-jwt', {
    method: 'POST',
    headers: {
      'x-spike-secret': 'test-secret',
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });
  const res1 = await handleSpikeRoutes(req1, env, lazyDbGetter, { customJwks: signer.jwks });
  assert.equal(res1.status, 200);
  assert.equal(dbGetterCalled, false);

  const rawBytes = new TextEncoder().encode(SYNTHETIC_WEBHOOK_PAYLOAD);
  const signature = await computeHmacSha512HexFromBytes(SYNTHETIC_HMAC_SECRET, rawBytes);
  const req6 = new Request('https://worker/api/spike/webhook-hmac', {
    method: 'POST',
    headers: {
      'x-spike-secret': 'test-secret',
      'x-paystack-signature': signature,
      'Content-Type': 'application/json',
    },
    body: SYNTHETIC_WEBHOOK_PAYLOAD,
  });
  const res6 = await handleSpikeRoutes(req6, env, lazyDbGetter);
  assert.equal(res6.status, 200);
  assert.equal(dbGetterCalled, false);
});

test('[R3 Foreign Student Token] Foreign subject rejected with 403 before DB allocation', async () => {
  resetJwksCache();
  const signer = await createSyntheticJwtSigner();
  const foreignToken = await signer.signToken({ sub: '99999999-9999-4999-8999-999999999999' });
  const env = {
    SPIKE_SECRET: 'test-secret',
    SPIKE_TEST_SUBJECT_ID,
  };

  let dbGetterCalled = false;
  const lazyDbGetter = () => {
    dbGetterCalled = true;
    return createMockSpikeDbClient();
  };

  const req = new Request('https://worker/api/spike/db-read', {
    method: 'GET',
    headers: {
      'x-spike-secret': 'test-secret',
      Authorization: `Bearer ${foreignToken}`,
    },
  });
  const res = await handleSpikeRoutes(req, env, lazyDbGetter, { customJwks: signer.jwks });
  assert.equal(res.status, 403);
  assert.equal(dbGetterCalled, false);
});

test('[R3 Missing DB Binding] Controlled 503 when DB binding is unavailable on route execution', async () => {
  resetJwksCache();
  const signer = await createSyntheticJwtSigner();
  const token = await signer.signToken();

  const env = {
    SPIKE_SECRET: 'test-secret',
    SPIKE_TEST_SUBJECT_ID,
  };

  const req = new Request('https://worker/api/spike/db-read', {
    method: 'GET',
    headers: {
      'x-spike-secret': 'test-secret',
      Authorization: `Bearer ${token}`,
    },
  });

  const res = await handleSpikeRoutes(
    req,
    env,
    () => createSpikeDbClient(env),
    { customJwks: signer.jwks }
  );

  assert.equal(res.status, 503);
  const data = await res.json();
  assert.equal(data.error, 'DATABASE_CONNECTION_UNAVAILABLE');
});

// ====================================================================
// Suite 4: Database Fixtures, Bounded Setup & Actual SQL Adapter Path (C1, C2)
// ====================================================================

test('[C2 Bounded Setup & Query Count Assertion] Statement count is bounded (<= 15) and timings recorded', async () => {
  let statementCount = 0;

  const mockSql = Object.assign(
    async (strings) => {
      statementCount++;
      return [];
    },
    {
      begin: async (callback) => {
        const tx = async () => {
          statementCount++;
          return [];
        };
        try {
          await callback(tx);
        } catch (err) {
          if (err.message === 'INTENTIONAL_SPIKE_ROLLBACK') {
            throw err;
          }
          throw err;
        }
      },
      end: async () => {},
    }
  );

  const client = createSpikeDbClient(
    { DATABASE_URL: 'postgres://dummy', SPIKE_TEST_SUBJECT_ID },
    false,
    mockSql
  );

  await client.getProfileAndEntitlement(SPIKE_TEST_SUBJECT_ID);

  assert.ok(statementCount <= 15, `Expected statement count <= 15, got ${statementCount}`);
  assert.ok(client.lastTimings, 'Expected instrumented timings to be recorded');
  assert.ok(client.lastTimings.setupMs >= 0);
  assert.ok(client.lastTimings.actionMs >= 0);
});

test('[T02 Optimized Server-Side Fixture SQL] Generates generate_series SQL and bounds per-scenario query counts', async () => {
  const executedStatements = [];
  const executedValues = [];

  const mockSql = Object.assign(
    async () => [],
    {
      begin: async (callback) => {
        const tx = async (strings, ...values) => {
          const raw = strings.join('?');
          executedStatements.push(raw);
          executedValues.push(values);

          if (raw.includes('FROM timely') || raw.includes('eng_correct')) {
            const attemptId = values[0];
            let eng = 45, mth = 30, phy = 30, chm = 30, tot = 135;
            if (attemptId === SPIKE_PERFECT_ATTEMPT_ID) {
              eng = 60; mth = 40; phy = 40; chm = 40; tot = 180;
            } else if (attemptId === SPIKE_ZERO_ATTEMPT_ID) {
              eng = 0; mth = 0; phy = 0; chm = 0; tot = 0;
            }
            return [{
              owned_count: 1,
              eng_correct: eng,
              mth_correct: mth,
              phy_correct: phy,
              chm_correct: chm,
              total_correct: tot,
              total_timely: 180,
            }];
          }
          if (raw.includes('questions_json')) {
            const sanitized = sanitizeExamPayload(SYNTHETIC_180_QUESTIONS);
            return [{
              attempt_id: values[0] || SPIKE_TEST_ATTEMPT_ID,
              total_questions: sanitized.length,
              questions_json: JSON.stringify(sanitized),
            }];
          }
          if (raw.includes('FROM pg_temp.spike_attempts')) {
            return [{
              id: values[0] || SPIKE_TEST_ATTEMPT_ID,
              user_id: SPIKE_TEST_SUBJECT_ID,
              status: 'in_progress',
              started_at: new Date(Date.now() - 600000).toISOString(),
              expires_at: new Date(Date.now() + 3600000).toISOString(),
            }];
          }
          if (raw.includes('FROM pg_temp.spike_profiles')) {
            return [{
              id: SPIKE_TEST_SUBJECT_ID,
              displayName: 'Spike Test Candidate',
              email: 'spike-student@example.com',
              role: 'student',
              entitlementId: '33333333-3333-4333-8333-333333333333',
              entitlementUserId: SPIKE_TEST_SUBJECT_ID,
              isPremium: false,
              entitlementStatus: 'active',
              entitlementExpiresAt: new Date(0).toISOString(),
            }];
          }
          if (raw.includes('spike_attempt_questions') && raw.includes('spike_question_options')) {
            return [{ q_id: 'q-eng-001', o_id: 'q-eng-001-opt-a' }];
          }
          if (raw.includes('FROM pg_temp.spike_attempt_questions aq JOIN pg_temp.spike_questions q')) {
            // Payload fetch scenario
            return [{
              q_id: 'q-eng-001',
              q_subject: 'ENG',
              q_topic: 'eng-topic-1',
              q_order: 1,
              q_text: 'Synthetic question stem 1 for subject ENG testing concept #1.',
              q_passage: 'Comprehension passage text for English reading section.',
              o_id: 'q-eng-001-opt-a',
              o_letter: 'A',
              o_text: 'Option A for question 1',
              o_order: 1,
            }];
          }
          if (raw.includes('SELECT revision FROM pg_temp.spike_attempt_answers')) {
            return [{ revision: 1 }];
          }
          return [];
        };

        try {
          await callback(tx);
        } catch (err) {
          if (err.message === 'INTENTIONAL_SPIKE_ROLLBACK') {
            throw err;
          }
          throw err;
        }
      },
      end: async () => {},
    }
  );

  const client = createSpikeDbClient(
    { DATABASE_URL: 'postgres://dummy', SPIKE_TEST_SUBJECT_ID },
    false,
    mockSql
  );

  // 1. Profile scenario statement bounds and selective DDL
  executedStatements.length = 0;
  await client.getProfileAndEntitlement(SPIKE_TEST_SUBJECT_ID);
  assert.ok(client.lastTimings.statementCount <= 5, `Profile statement count: ${client.lastTimings.statementCount}`);
  assert.ok(executedStatements.some((s) => s.includes('spike_profiles')));
  assert.ok(executedStatements.some((s) => s.includes('spike_entitlements')));
  assert.ok(!executedStatements.some((s) => s.includes('spike_questions')));

  // 2. Payload scenario statement bounds and generate_series SQL
  executedStatements.length = 0;
  await client.getAttemptPayload(SPIKE_TEST_ATTEMPT_ID, SPIKE_TEST_SUBJECT_ID);
  assert.ok(client.lastTimings.statementCount <= 10, `Payload statement count: ${client.lastTimings.statementCount}`);
  assert.ok(executedStatements.some((s) => s.includes('INSERT INTO pg_temp.spike_questions') && s.includes('generate_series')));
  assert.ok(executedStatements.some((s) => s.includes('INSERT INTO pg_temp.spike_question_options') && s.includes('generate_series')));
  assert.ok(executedStatements.some((s) => s.includes('INSERT INTO pg_temp.spike_attempt_questions') && s.includes('generate_series')));
  assert.ok(!executedStatements.some((s) => s.includes('spike_profiles')));

  // 3. Write scenario statement bounds and pre-seeded answer
  executedStatements.length = 0;
  await client.upsertAnswerInRollback({
    attemptId: SPIKE_TEST_ATTEMPT_ID,
    userId: SPIKE_TEST_SUBJECT_ID,
    questionId: 'q-eng-001',
    selectedOptionId: 'q-eng-001-opt-a',
    revision: 2,
    serverReceivedAt: new Date().toISOString(),
  });
  assert.ok(client.lastTimings.statementCount <= 14, `Write statement count: ${client.lastTimings.statementCount}`);
  assert.ok(executedStatements.some((s) => s.includes('INSERT INTO pg_temp.spike_attempt_answers') && s.includes('q-eng-001')));

  // 4. Score scenario statement bounds, generate_series answers, and omitted options DDL
  executedStatements.length = 0;
  await client.scoreAttemptInRollback({
    attemptId: SPIKE_TEST_ATTEMPT_ID,
    userId: SPIKE_TEST_SUBJECT_ID,
    serverSubmittedAt: new Date().toISOString(),
  });
  assert.ok(client.lastTimings.statementCount <= 13, `Score statement count: ${client.lastTimings.statementCount}`);
  assert.ok(executedStatements.some((s) => s.includes('INSERT INTO pg_temp.spike_attempt_answers') && s.includes('generate_series')));
  assert.ok(!executedStatements.some((s) => s.includes('spike_question_options')), 'Score scenario omits options table for efficiency');
});

test('[C1, C2 Real SQL Adapter Scoring] Scores 0, 300, and 400 points deterministically on adapter rows', async () => {
  let rollbackTriggered = false;

  const mockSql = Object.assign(
    async () => [],
    {
      begin: async (callback) => {
        const tx = async (strings, ...values) => {
          const raw = strings.join('?');

          if (raw.includes('FROM timely') || raw.includes('eng_correct')) {
            const attemptId = values[0];
            let eng = 45, mth = 30, phy = 30, chm = 30, tot = 135;
            if (attemptId === SPIKE_PERFECT_ATTEMPT_ID) {
              eng = 60; mth = 40; phy = 40; chm = 40; tot = 180;
            } else if (attemptId === SPIKE_ZERO_ATTEMPT_ID) {
              eng = 0; mth = 0; phy = 0; chm = 0; tot = 0;
            }
            return [{
              owned_count: 1,
              eng_correct: eng,
              mth_correct: mth,
              phy_correct: phy,
              chm_correct: chm,
              total_correct: tot,
              total_timely: 180,
            }];
          }
          if (raw.includes('FROM pg_temp.spike_attempts')) {
            return [{
              id: values[0] || SPIKE_TEST_ATTEMPT_ID,
              user_id: SPIKE_TEST_SUBJECT_ID,
              status: 'in_progress',
              started_at: new Date(Date.now() - 600000).toISOString(),
              expires_at: new Date(Date.now() + 3600000).toISOString(),
            }];
          }

          return [];
        };

        try {
          await callback(tx);
        } catch (err) {
          if (err.message === 'INTENTIONAL_SPIKE_ROLLBACK') {
            rollbackTriggered = true;
            throw err;
          }
          throw err;
        }
      },
      end: async () => {},
    }
  );

  const client = createSpikeDbClient(
    { DATABASE_URL: 'postgres://dummy', SPIKE_TEST_SUBJECT_ID },
    false,
    mockSql
  );

  const res300 = await client.scoreAttemptInRollback({
    attemptId: SPIKE_TEST_ATTEMPT_ID,
    userId: SPIKE_TEST_SUBJECT_ID,
    serverSubmittedAt: new Date().toISOString(),
  });
  assert.equal(res300.totalScore, 300);
  assert.equal(res300.totalAnsweredTimely, 180);
  assert.equal(res300.rolledBack, true);

  const res400 = await client.scoreAttemptInRollback({
    attemptId: SPIKE_PERFECT_ATTEMPT_ID,
    userId: SPIKE_TEST_SUBJECT_ID,
    serverSubmittedAt: new Date().toISOString(),
  });
  assert.equal(res400.totalScore, 400);
  assert.equal(res400.totalCorrect, 180);
  assert.equal(res400.totalAnsweredTimely, 180);

  const res0 = await client.scoreAttemptInRollback({
    attemptId: SPIKE_ZERO_ATTEMPT_ID,
    userId: SPIKE_TEST_SUBJECT_ID,
    serverSubmittedAt: new Date().toISOString(),
  });
  assert.equal(res0.totalScore, 0);
  assert.equal(res0.totalCorrect, 0);
  assert.equal(rollbackTriggered, true);
});

test('[C1 Payload Passages & Truthful Entitlement] Retains passages and aligns isPremium in SQL', async () => {
  const mockSql = Object.assign(
    async () => [],
    {
      begin: async (callback) => {
        const tx = async (strings) => {
          const raw = strings.join('?');

          if (raw.includes('FROM pg_temp.spike_profiles')) {
            return [{
              id: SPIKE_TEST_SUBJECT_ID,
              displayName: 'Spike Test Candidate',
              email: 'spike-student@example.com',
              role: 'student',
              entitlementId: '33333333-3333-4333-8333-333333333333',
              entitlementUserId: SPIKE_TEST_SUBJECT_ID,
              isPremium: false,
              entitlementStatus: 'active',
            }];
          }

          if (raw.includes('FROM pg_temp.spike_attempts')) {
            return [{
              id: SPIKE_TEST_ATTEMPT_ID,
              user_id: SPIKE_TEST_SUBJECT_ID,
              status: 'in_progress',
              started_at: new Date(Date.now() - 600000).toISOString(),
              expires_at: new Date(Date.now() + 3600000).toISOString(),
            }];
          }

          if (raw.includes('FROM pg_temp.spike_attempt_questions')) {
            return [
              {
                q_id: 'q-eng-001',
                q_subject: 'ENG',
                q_topic: 'reading',
                q_order: 1,
                q_text: 'Comprehension stem 1',
                q_passage: 'Comprehension passage text for English reading section.',
                o_id: 'q-eng-001-opt-a',
                o_letter: 'A',
                o_text: 'Option A',
                o_order: 1,
              },
            ];
          }

          return [];
        };
        try {
          await callback(tx);
        } catch (err) {
          if (err.message === 'INTENTIONAL_SPIKE_ROLLBACK') throw err;
          throw err;
        }
      },
      end: async () => {},
    }
  );

  const client = createSpikeDbClient(
    { DATABASE_URL: 'postgres://dummy', SPIKE_TEST_SUBJECT_ID },
    false,
    mockSql
  );

  const prof = await client.getProfileAndEntitlement(SPIKE_TEST_SUBJECT_ID);
  assert.equal(prof.entitlement?.isPremium, false);

  const payload = await client.getAttemptPayload(SPIKE_TEST_ATTEMPT_ID, SPIKE_TEST_SUBJECT_ID);
  assert.equal(payload.questions[0].passage, 'Comprehension passage text for English reading section.');
  assert.equal('correctOptionId' in payload.questions[0], false);
});

test('[R1 Rollback Wrapper] Re-throws SQL errors directly with zero synthetic fallback', async () => {
  const mockFailingSql = Object.assign(
    async () => [],
    {
      begin: async () => {
        throw new Error('PG_TABLE_DOES_NOT_EXIST');
      },
      end: async () => {},
    }
  );

  const client = createSpikeDbClient(
    { DATABASE_URL: 'postgres://dummy', SPIKE_TEST_SUBJECT_ID },
    false,
    mockFailingSql
  );

  await assert.rejects(
    async () => {
      await client.getProfileAndEntitlement(SPIKE_TEST_SUBJECT_ID);
    },
    /PG_TABLE_DOES_NOT_EXIST/
  );
});

test('[C2 Database Cleanup] Cleans up database client safely without unhandled errors', async () => {
  let endCalled = false;
  const mockSql = Object.assign(
    async () => [],
    {
      begin: async () => {},
      end: async () => {
        endCalled = true;
      },
    }
  );

  const client = createSpikeDbClient(
    { DATABASE_URL: 'postgres://dummy', SPIKE_TEST_SUBJECT_ID },
    false,
    mockSql
  );

  await client.cleanup();
  assert.equal(endCalled, true);
});

// ====================================================================
// Suite 5: Answer Validation Rejections & Revision Semantics (C1, C4)
// ====================================================================

test('[C1, C4 Answer Validation] Enforces revision 2 success, rejects stale revision 1, deadlines and foreign attempts', async () => {
  const db = createMockSpikeDbClient(SPIKE_TEST_SUBJECT_ID);

  const writeRes2 = await db.upsertAnswerInRollback({
    attemptId: SPIKE_TEST_ATTEMPT_ID,
    userId: SPIKE_TEST_SUBJECT_ID,
    questionId: 'q-eng-001',
    selectedOptionId: 'q-eng-001-opt-a',
    revision: 2,
    serverReceivedAt: new Date().toISOString(),
  });
  assert.equal(writeRes2.success, true);
  assert.equal(writeRes2.ackRevision, 2);

  await assert.rejects(
    async () => {
      await db.upsertAnswerInRollback({
        attemptId: SPIKE_TEST_ATTEMPT_ID,
        userId: SPIKE_TEST_SUBJECT_ID,
        questionId: 'q-eng-001',
        selectedOptionId: 'q-eng-001-opt-a',
        revision: 1,
        serverReceivedAt: new Date().toISOString(),
      });
    },
    /STALE_REVISION_REJECTED/
  );

  await assert.rejects(
    async () => {
      await db.upsertAnswerInRollback({
        attemptId: SPIKE_TEST_ATTEMPT_ID,
        userId: SPIKE_TEST_SUBJECT_ID,
        questionId: 'q-eng-001',
        selectedOptionId: 'q-eng-001-opt-a',
        revision: 0,
        serverReceivedAt: new Date().toISOString(),
      });
    },
    /INVALID_REVISION_NUMBER/
  );

  await assert.rejects(
    async () => {
      await db.upsertAnswerInRollback({
        attemptId: SPIKE_EXPIRED_ATTEMPT_ID,
        userId: SPIKE_TEST_SUBJECT_ID,
        questionId: 'q-eng-001',
        selectedOptionId: 'q-eng-001-opt-a',
        revision: 2,
        serverReceivedAt: new Date().toISOString(),
      });
    },
    /ATTEMPT_DEADLINE_EXCEEDED/
  );

  await assert.rejects(
    async () => {
      await db.upsertAnswerInRollback({
        attemptId: SPIKE_COMPLETED_ATTEMPT_ID,
        userId: SPIKE_TEST_SUBJECT_ID,
        questionId: 'q-eng-001',
        selectedOptionId: 'q-eng-001-opt-a',
        revision: 2,
        serverReceivedAt: new Date().toISOString(),
      });
    },
    /ATTEMPT_ALREADY_COMPLETED/
  );

  await assert.rejects(
    async () => {
      await db.upsertAnswerInRollback({
        attemptId: SPIKE_TEST_ATTEMPT_ID,
        userId: '99999999-9999-4999-8999-999999999999',
        questionId: 'q-eng-001',
        selectedOptionId: 'q-eng-001-opt-a',
        revision: 2,
        serverReceivedAt: new Date().toISOString(),
      });
    },
    /ATTEMPT_NOT_FOUND_OR_FORBIDDEN/
  );

  await assert.rejects(
    async () => {
      await db.upsertAnswerInRollback({
        attemptId: SPIKE_TEST_ATTEMPT_ID,
        userId: SPIKE_TEST_SUBJECT_ID,
        questionId: 'q-unknown-999',
        selectedOptionId: 'opt-a',
        revision: 2,
        serverReceivedAt: new Date().toISOString(),
      });
    },
    /QUESTION_NOT_IN_ATTEMPT/
  );
});

test('[R2 Clock Derivation] Dynamically derives active and expired attempt windows', () => {
  const fakeClockNowMs = new Date('2026-11-15T12:00:00.000Z').getTime();
  const fixtures = deriveAttemptFixtures(SPIKE_TEST_SUBJECT_ID, fakeClockNowMs);

  const activeAttempt = fixtures.attempts.get(SPIKE_TEST_ATTEMPT_ID);
  assert.ok(activeAttempt);
  assert.ok(new Date(activeAttempt.expiresAt).getTime() > fakeClockNowMs);

  const expiredAttempt = fixtures.attempts.get(SPIKE_EXPIRED_ATTEMPT_ID);
  assert.ok(expiredAttempt);
  assert.ok(new Date(expiredAttempt.expiresAt).getTime() < fakeClockNowMs);
});

// ====================================================================
// Suite 6: Webhook HMAC Signature & Raw Bytes Preservation (C4)
// ====================================================================

test('[C4 Webhook HMAC] Valid synthetic HMAC succeeds; tampered bytes or wrong secret fail', async () => {
  const env = {
    SPIKE_SECRET: 'test-secret',
    SPIKE_TEST_SUBJECT_ID,
    SYNTHETIC_HMAC_SECRET,
  };

  const rawBytes = new TextEncoder().encode(SYNTHETIC_WEBHOOK_PAYLOAD);
  const validSig = await computeHmacSha512HexFromBytes(SYNTHETIC_HMAC_SECRET, rawBytes);

  const reqValid = new Request('https://worker/api/spike/webhook-hmac', {
    method: 'POST',
    headers: {
      'x-spike-secret': 'test-secret',
      'x-paystack-signature': validSig,
      'Content-Type': 'application/json',
    },
    body: SYNTHETIC_WEBHOOK_PAYLOAD,
  });
  const resValid = await handleSpikeRoutes(reqValid, env, () => createMockSpikeDbClient());
  assert.equal(resValid.status, 200);
  const data = await resValid.json();
  assert.equal(data.success, true);
  assert.equal(data.event, 'charge.success');

  const reqBadSig = new Request('https://worker/api/spike/webhook-hmac', {
    method: 'POST',
    headers: {
      'x-spike-secret': 'test-secret',
      'x-paystack-signature': '00'.repeat(64),
      'Content-Type': 'application/json',
    },
    body: SYNTHETIC_WEBHOOK_PAYLOAD,
  });
  const resBadSig = await handleSpikeRoutes(reqBadSig, env, () => createMockSpikeDbClient());
  assert.equal(resBadSig.status, 400);

  const tamperedPayload = SYNTHETIC_WEBHOOK_PAYLOAD.replace('100000', '100001');
  const reqTampered = new Request('https://worker/api/spike/webhook-hmac', {
    method: 'POST',
    headers: {
      'x-spike-secret': 'test-secret',
      'x-paystack-signature': validSig,
      'Content-Type': 'application/json',
    },
    body: tamperedPayload,
  });
  const resTampered = await handleSpikeRoutes(reqTampered, env, () => createMockSpikeDbClient());
  assert.equal(resTampered.status, 400);
});

// ====================================================================
// Suite 7: Harness Injected-Fetch, Strict Contracts & Telemetry (C3)
// ====================================================================

test('[C3 Harness Injected-Fetch] Exercises all six handlers with strict contracts; rejects stale writes and empty payloads', async () => {
  resetJwksCache();
  const signer = await createSyntheticJwtSigner();
  const token = await signer.signToken();
  const env = {
    SPIKE_SECRET: 'spike-secret',
    SPIKE_TEST_SUBJECT_ID,
    SYNTHETIC_HMAC_SECRET,
  };

  const mockDb = createMockSpikeDbClient(SPIKE_TEST_SUBJECT_ID);

  const injectedFetch = async (url, init) => {
    const req = new Request(url, init);
    return await handleSpikeRoutes(req, env, () => mockDb, { customJwks: signer.jwks });
  };

  const req1 = await buildScenarioRequest(1, 'http://localhost:3000', { spikeSecret: 'spike-secret', token });
  const res1 = await runScenarioBenchmark(req1, { requests: 1, concurrency: 1 }, 'run-test', injectedFetch);
  assert.equal(res1.successCount, 1);
  assert.equal(res1.failureCount, 0);

  const req2 = await buildScenarioRequest(2, 'http://localhost:3000', { spikeSecret: 'spike-secret', token });
  const res2 = await runScenarioBenchmark(req2, { requests: 1, concurrency: 1 }, 'run-test', injectedFetch);
  assert.equal(res2.successCount, 1);

  const req3 = await buildScenarioRequest(3, 'http://localhost:3000', { spikeSecret: 'spike-secret', token, revision: 2 });
  const res3 = await runScenarioBenchmark(req3, { requests: 1, concurrency: 1, revision: 2 }, 'run-test', injectedFetch);
  assert.equal(res3.successCount, 1);

  const req3Stale = await buildScenarioRequest(3, 'http://localhost:3000', { spikeSecret: 'spike-secret', token, revision: 1 });
  const res3Stale = await runScenarioBenchmark(req3Stale, { requests: 1, concurrency: 1, revision: 2 }, 'run-test', injectedFetch);
  assert.equal(res3Stale.failureCount, 1);

  const req4 = await buildScenarioRequest(4, 'http://localhost:3000', { spikeSecret: 'spike-secret', token });
  const res4 = await runScenarioBenchmark(req4, { requests: 1, concurrency: 1 }, 'run-test', injectedFetch);
  assert.equal(res4.successCount, 1);

  const req5 = await buildScenarioRequest(5, 'http://localhost:3000', { spikeSecret: 'spike-secret', token });
  const res5 = await runScenarioBenchmark(req5, { requests: 1, concurrency: 1 }, 'run-test', injectedFetch);
  assert.equal(res5.successCount, 1);

  const req6 = await buildScenarioRequest(6, 'http://localhost:3000', { spikeSecret: 'spike-secret', syntheticSecret: SYNTHETIC_HMAC_SECRET });
  const res6 = await runScenarioBenchmark(req6, { requests: 1, concurrency: 1 }, 'run-test', injectedFetch);
  assert.equal(res6.successCount, 1);

  const emptyFetch = async () => new Response(JSON.stringify({}), { status: 200, headers: { 'Content-Type': 'application/json' } });
  const resEmpty = await runScenarioBenchmark(req1, { requests: 1, concurrency: 1 }, 'run-test', emptyFetch);
  assert.equal(resEmpty.failureCount, 1);
  assert.equal(resEmpty.successCount, 0);
});

test('[C3 Parameter Parsing & Configurable Preview Origin] Rejects decimals like 1.5; validates preview origin', () => {
  assert.throws(() => parseStrictInteger('1.5', 'REQUESTS'), /INVALID_REQUESTS/);
  assert.throws(() => parseStrictInteger('0', 'CONCURRENCY', 1), /INVALID_CONCURRENCY/);
  assert.equal(parseStrictInteger('10', 'REQUESTS'), 10);

  const customOrigin = 'https://custom-preview-branch.pages.dev';
  assert.equal(isAllowedTargetUrl(customOrigin, [customOrigin]), true);
  assert.equal(isAllowedTargetUrl(customOrigin, []), false);
});

test('[C3 Correlated Telemetry & Offline Analysis] Tracks unmatched, duplicate, and per-scenario telemetry', () => {
  const sentIds = new Set(['run-1-s1-0', 'run-1-s2-0']);
  const tailLogs = [
    { requestId: 'run-1-s1-0', cpuTimeMs: 2.1, wallTimeMs: 12, outcome: 'ok', hasExceptions: false },
    { requestId: 'run-1-s1-0', cpuTimeMs: 2.1, wallTimeMs: 12, outcome: 'ok', hasExceptions: false },
    { requestId: 'unrelated-tail-id', cpuTimeMs: 10.5, wallTimeMs: 40, outcome: 'exceededCpu', hasExceptions: true },
    { requestId: 'run-1-s2-0', cpuTimeMs: 4.8, wallTimeMs: 25, outcome: 'ok', hasExceptions: false },
  ];

  const analysis = analyzeTailTelemetry(sentIds, tailLogs, [
    { scenarioId: 1, scenarioName: 'auth-jwt', count: 1, successCount: 1, failureCount: 0, exceptionCount: 0 },
    { scenarioId: 2, scenarioName: 'db-read', count: 1, successCount: 1, failureCount: 0, exceptionCount: 0 },
  ]);

  assert.equal(analysis.matchedEvents.length, 2);
  assert.equal(analysis.unmatchedCount, 1);
  assert.equal(analysis.duplicateCount, 1);
  assert.equal(analysis.perScenario.length, 2);
  assert.equal(analysis.perScenario[0].cpuP50Ms, 2.1);
  assert.equal(analysis.perScenario[1].cpuP50Ms, 4.8);
});

test('[D1] Reserved SQL uses single statements and measures rollback delay', async () => {
  let setupQueries = 0;
  const sql = { begin: async (callback) => {
    try {
      await callback(async (strings) => {
        const statements = strings.join('?').split(';').filter(s => s.trim());
        assert.equal(statements.length, 1, 'Extended protocol must have one statement');
        setupQueries++;
        return [];
      });
    } catch (error) {
      await new Promise(r => setTimeout(r, 15));
      throw error;
    }
  }};
  const result = await runInRollbackFixtureTx(sql, {testSubjectId: SPIKE_TEST_SUBJECT_ID, scenario: 'score'}, async () => ({success: true}));
  assert.ok(setupQueries <= 15);
  assert.ok(result.timings.rollbackMs >= 10);
});

test('[D2] Harness rejects leaked final answers and wrong fixture scores', async () => {
  const {validateEndpointResponse} = await import('../scripts/run-cpu-spike.mjs');
  const questions = sanitizeExamPayload(SYNTHETIC_180_QUESTIONS);
  const valid = {success: true, attemptId: SPIKE_TEST_ATTEMPT_ID, totalQuestions: 180, questions};
  assert.equal(validateEndpointResponse(4, valid), true);
  questions[179].options[3].isCorrect = true;
  assert.equal(validateEndpointResponse(4, valid), false);
  delete questions[179].options[3].isCorrect;
  questions[179].correctOptionId = 'leak';
  assert.equal(validateEndpointResponse(4, valid), false);
  assert.equal(validateEndpointResponse(5, {success:true,attemptId:SPIKE_TEST_ATTEMPT_ID,rolledBack:true,totalScore:0,totalAnsweredTimely:180}), false);
  assert.equal(validateEndpointResponse(4, {...valid, questions: Array(180).fill(null)}), false);
});

test('[D2] Injected stalled response terminates at timeout and cancels', async () => {
  const {runScenarioBenchmark} = await import('../scripts/run-cpu-spike.mjs');
  let cancelled = false;
  const result = await runScenarioBenchmark({id:1,name:'auth',url:'http://localhost:3000',method:'POST',headers:{},body:'{}'}, {requests:1,concurrency:1,timeoutMs:15}, 'timeout-review', async () => new Response(new ReadableStream({cancel(){cancelled=true;}})));
  assert.equal(result.failureCount, 1);
  assert.equal(cancelled, true);
});

test('[D3] Conflicting failures and missing samples cannot produce complete evidence', async () => {
  const {analyzeTailTelemetry} = await import('../scripts/run-cpu-spike.mjs');
  const id = 'review-s1-0';
  const events = [{requestId:id,outcome:'ok',cpuTimeMs:1,wallTimeMs:2,hasExceptions:false}, {requestId:id,outcome:'exceededCpu',cpuTimeMs:null,wallTimeMs:null,hasExceptions:true}];
  const result = analyzeTailTelemetry(new Set([id]), events, [{scenarioId:1,count:1}]);
  assert.equal(result.evidenceComplete,false);
  assert.equal(result.conflictingCount,1);
  assert.equal(result.perScenario[0].exceptionEvents,1);
  const missing = analyzeTailTelemetry(new Set([id]), [], [{scenarioId:1,count:1}]);
  assert.equal(missing.perScenario[0].entirelyMissingSamples,1);
  assert.equal(missing.evidenceComplete,false);
});

test('[D3] Private manifest round-trip retains expected counts offline', async () => {
  const {mkdtempSync,readFileSync,writeFileSync,statSync,rmSync} = await import('node:fs');
  const {tmpdir} = await import('node:os');
  const {join} = await import('node:path');
  const {saveRunManifest,analyzeTailLogOffline} = await import('../scripts/run-cpu-spike.mjs');
  const folder = mkdtempSync(join(tmpdir(),'jamb-manifest-'));
  try {
    const path = join(folder,'manifest.json');
    saveRunManifest(path,{runId:'test',sentRequestIds:['test-s1-0'],scenarioResults:[{scenarioId:1,count:1}],perScenario:[],evidenceComplete:false,headers:{Authorization:'must-not-save'}});
    assert.equal(statSync(path).mode & 0o777,0o600);
    const contents=readFileSync(path,'utf8');
    assert.equal(contents.includes('must-not-save'),false);
    const manifest=JSON.parse(contents);
    const tail=join(folder,'tail.jsonl');writeFileSync(tail,'');
    const analysis=analyzeTailLogOffline(tail,manifest.sentRequestIds,manifest.scenarioResults);
    assert.equal(analysis.perScenario[0].sentCount,1);
    assert.equal(analysis.perScenario[0].entirelyMissingSamples,1);
  } finally {rmSync(folder,{recursive:true});}
});

test('[T02 review] Pretty tail parsing handles quoted braces and banners', async () => {
  const {mkdtempSync,writeFileSync,rmSync} = await import('node:fs');
  const {tmpdir} = await import('node:os');
  const {join} = await import('node:path');
  const {extractTailEventsFromFile} = await import('../scripts/run-cpu-spike.mjs');
  const dir=mkdtempSync(join(tmpdir(),'jamb-tail-parser-'));
  try {
    const path=join(dir,'tail.txt');
    writeFileSync(path,'Connected to preview\n'+JSON.stringify({cpuTime:3,wallTime:12,outcome:'ok',exceptions:[],logs:[{message:'quoted } and { and " with slash \\'}],event:{request:{headers:{'x-spike-request-id':'review-s2-0'}}}},null,2)+'\n'+JSON.stringify({cpuTime:1,wallTime:2,outcome:'ok',event:{request:{headers:{'x-spike-request-id':'review-s1-0'}}}},null,2));
    const events=extractTailEventsFromFile(path);assert.equal(events.length,2);assert.equal(events[0].cpuTimeMs,3);
  } finally {rmSync(dir,{recursive:true});}
});

test('[T02 review] Database probe authenticates first and masks provider details', async () => {
  resetJwksCache();const signer=await createSyntheticJwtSigner();const token=await signer.signToken();
  const env={SPIKE_SECRET:'synthetic-secret',SPIKE_TEST_SUBJECT_ID};let allocated=0;
  const getter=()=>{allocated++;return {connectionProbe:async()=>{throw Object.assign(new Error('sensitive-internal-host'),{code:'CONNECTION_CLOSED'});}};};
  const missing=await handleSpikeRoutes(new Request('https://worker/api/spike/db-probe',{headers:{'x-spike-secret':'synthetic-secret'}}),env,getter,{customJwks:signer.jwks});assert.equal(missing.status,401);assert.equal(allocated,0);
  const failure=await handleSpikeRoutes(new Request('https://worker/api/spike/db-probe',{headers:{'x-spike-secret':'synthetic-secret',Authorization:`Bearer ${token}`}}),env,getter,{customJwks:signer.jwks});assert.equal(failure.status,503);assert.deepEqual(await failure.json(),{error:'DATABASE_PROBE_FAILED',category:'CONNECTION_CLOSED'});
});

test('[T02 Aggregation & Safety] Guard validates payload JSON framing, bounds, and key confidentiality', () => {
  const validJson = JSON.stringify([{ id: 'q-eng-001', subjectCode: 'ENG', topicSlug: 'eng-1', stem: 'Stem', passage: null, options: [] }]);
  const ok = assertSafePayloadJson(SPIKE_TEST_ATTEMPT_ID, 1, validJson);
  assert.equal(ok.attemptId, SPIKE_TEST_ATTEMPT_ID);
  assert.equal(ok.totalQuestions, 1);
  assert.equal(ok.questionsJson, validJson);

  // Rejects invalid attempt ID
  assert.throws(() => assertSafePayloadJson('not-a-uuid', 1, validJson), /PAYLOAD_INTEGRITY_FAILED/);
  // Rejects non-array framing
  assert.throws(() => assertSafePayloadJson(SPIKE_TEST_ATTEMPT_ID, 1, '{"not":"array"}'), /PAYLOAD_INTEGRITY_FAILED/);
  assert.throws(() => assertSafePayloadJson(SPIKE_TEST_ATTEMPT_ID, 1, ''), /PAYLOAD_INTEGRITY_FAILED/);
  // Rejects forbidden answer-key fields (both camelCase and snake_case)
  assert.throws(() => assertSafePayloadJson(SPIKE_TEST_ATTEMPT_ID, 1, '[{"id":"q1","correctOptionId":"opt-a"}]'), /PAYLOAD_INTEGRITY_FAILED/);
  assert.throws(() => assertSafePayloadJson(SPIKE_TEST_ATTEMPT_ID, 1, '[{"id":"q1","correct_option_id":"opt-a"}]'), /PAYLOAD_INTEGRITY_FAILED/);
  assert.throws(() => assertSafePayloadJson(SPIKE_TEST_ATTEMPT_ID, 1, '[{"id":"q1","explanation":"why"}]'), /PAYLOAD_INTEGRITY_FAILED/);
  assert.throws(() => assertSafePayloadJson(SPIKE_TEST_ATTEMPT_ID, 1, '[{"id":"q1","isCorrect":true}]'), /PAYLOAD_INTEGRITY_FAILED/);
  // Rejects oversized string
  assert.throws(() => assertSafePayloadJson(SPIKE_TEST_ATTEMPT_ID, 1, '[' + ' '.repeat(130 * 1024) + ']'), /PAYLOAD_INTEGRITY_FAILED/);
});

test('[T02 Route Aggregation Integration] Routes stream aggregated payload and score without full row decoding', async () => {
  resetJwksCache();
  const signer = await createSyntheticJwtSigner();
  const token = await signer.signToken();
  const env = { SPIKE_SECRET: 'test-secret', SPIKE_TEST_SUBJECT_ID };

  // Payload endpoint
  const payloadReq = new Request(`https://worker/api/spike/mock-payload?attemptId=${SPIKE_TEST_ATTEMPT_ID}`, {
    headers: { 'x-spike-secret': 'test-secret', Authorization: `Bearer ${token}` },
  });
  const payloadRes = await handleSpikeRoutes(payloadReq, env, () => createMockSpikeDbClient(), { customJwks: signer.jwks });
  assert.equal(payloadRes.status, 200);
  const payloadBody = await payloadRes.json();
  assert.equal(payloadBody.success, true);
  assert.equal(payloadBody.totalQuestions, 180);
  assert.equal(payloadBody.questions.length, 180);
  assert.equal('correctOptionId' in payloadBody.questions[0], false);
  assert.equal('explanation' in payloadBody.questions[0], false);

  // Malformed attemptId rejected generically
  const badIdReq = new Request('https://worker/api/spike/mock-payload?attemptId=not-a-valid-uuid', {
    headers: { 'x-spike-secret': 'test-secret', Authorization: `Bearer ${token}` },
  });
  const badIdRes = await handleSpikeRoutes(badIdReq, env, () => createMockSpikeDbClient(), { customJwks: signer.jwks });
  assert.equal(badIdRes.status, 403);

  // Score endpoint
  const scoreReq = new Request('https://worker/api/spike/mock-score', {
    method: 'POST',
    headers: { 'x-spike-secret': 'test-secret', Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ attemptId: SPIKE_TEST_ATTEMPT_ID }),
  });
  const scoreRes = await handleSpikeRoutes(scoreReq, env, () => createMockSpikeDbClient(), { customJwks: signer.jwks });
  assert.equal(scoreRes.status, 200);
  const scoreBody = await scoreRes.json();
  assert.equal(scoreBody.success, true);
  assert.equal(scoreBody.totalScore, 300);
  assert.equal(scoreBody.totalCorrect, 135);
  assert.equal(scoreBody.totalAnsweredTimely, 180);
  assert.equal(scoreBody.rolledBack, true);
});



test('[T02 review] SQL JSON payload limit counts UTF8 bytes', () => {
  const unicode = '["' + '界'.repeat(42 * 1024) + '"]';
  assert.ok(unicode.length < 120 * 1024);
  assert.throws(() => assertSafePayloadJson(SPIKE_TEST_ATTEMPT_ID, 1, unicode), /PAYLOAD_INTEGRITY_FAILED/);
});

test('[T02 Benchmark Schema Isolation] Rejects invalid benchmark schema names and validates strict pattern', async () => {
  assert.equal(BENCHMARK_SCHEMA_PATTERN.test('jambprep_benchmark_1a2b3c4d5e6f'), true);
  assert.equal(BENCHMARK_SCHEMA_PATTERN.test('public'), false);
  assert.equal(BENCHMARK_SCHEMA_PATTERN.test('jambprep_benchmark_'), false);
  assert.equal(BENCHMARK_SCHEMA_PATTERN.test('jambprep_benchmark_1a2b3c4d;DROP SCHEMA'), false);
  assert.equal(BENCHMARK_SCHEMA_PATTERN.test('jambprep_benchmark_XYZ'), false);

  assert.throws(() => assertValidBenchmarkSchema('public'), /INVALID_BENCHMARK_SCHEMA/);
  assert.throws(() => assertValidBenchmarkSchema('jambprep_benchmark_UPPERCASE'), /INVALID_BENCHMARK_SCHEMA/);
  assert.equal(assertValidBenchmarkSchema('jambprep_benchmark_abcdef012345'), 'jambprep_benchmark_abcdef012345');

  const signer = await createSyntheticJwtSigner();
  const token = await signer.signToken();
  const env = { SPIKE_SECRET: 'test-secret', SPIKE_TEST_SUBJECT_ID };

  // Rejects invalid schema header in route handler
  const req = new Request('https://worker/api/spike/db-read', {
    headers: {
      'x-spike-secret': 'test-secret',
      Authorization: `Bearer ${token}`,
      'x-spike-benchmark-schema': 'public',
    },
  });
  const res = await handleSpikeRoutes(req, env, () => createMockSpikeDbClient(), { customJwks: signer.jwks });
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.error, 'INVALID_BENCHMARK_SCHEMA');
});



test('[T02 concurrency review] Serializable transaction retries whole action and rejects exhausted failures', async () => {
  const {runSerializableSpikeTransaction} = await import('../worker/db.ts');
  let calls = 0;
  let actions = 0;
  const sql = { begin: async (mode, action) => {
    assert.equal(mode, 'isolation level serializable');
    calls++;
    await action({});
    if (calls < 3) throw Object.assign(new Error('retry'), {code: '40001'});
  }};
  await runSerializableSpikeTransaction(sql, async () => {actions++;});
  assert.equal(calls, 3);
  assert.equal(actions, 3);
  let failures = 0;
  await assert.rejects(runSerializableSpikeTransaction({begin: async () => {
    failures++; throw Object.assign(new Error('conflict'), {code: '40001'});
  }}, async () => {}), /conflict/);
  assert.equal(failures, 3);
  await assert.rejects(runSerializableSpikeTransaction({begin: async () => {
    throw new Error('INTENTIONAL_SPIKE_ROLLBACK');
  }}, async () => {}), /INTENTIONAL_SPIKE_ROLLBACK/);
});
