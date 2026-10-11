/**
 * Local Verification Test Suite for T03: Portable Native API & Database/Security Foundation
 *
 * All database, JWKS, and live-session adapters in this file are explicitly labeled
 * SIMULATED / INJECTED local test adapters. Zero remote network or database calls are made.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { createNativeApiHandler as createDefaultNativeApiHandler } from '../worker/api/entry.ts';

// Existing product-route tests inspect staged handlers through local injection only.
function createNativeApiHandler(options = {}) {
  return createDefaultNativeApiHandler({ ...options, hooks: { ...options.hooks, allowUnreviewedProductRoutes: true } });
}
import {
  ApiError,
  sanitizeDiagnosticMessage,
  toSafeApiError,
} from '../worker/api/errors.ts';
import {
  assertSafeExamPayloadJson,
  getOwnedAttemptPayloadJson,
  submitAndScoreExamAttemptAtomic,
  upsertOwnedExamAnswerAtomic,
} from '../worker/services/exam-foundation-service.ts';
import {
  hasValidPaystackWebhookSignature,
  matchesPayment,
} from '../worker/services/payment-security.ts';
import {
  getCheckoutPricing,
  settleVerifiedPaymentAtomic,
} from '../worker/services/subscription-service.ts';
import { resetJwksCache } from '../worker/auth.ts';

const TEST_SUPABASE_URL = 'https://bqumnaoiiukifvanoonm.supabase.co';
const TEST_ISSUER = `${TEST_SUPABASE_URL}/auth/v1`;
const STUDENT_USER_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_USER_ID = '22222222-2222-4222-8222-222222222222';
const ADMIN_USER_ID = '99999999-9999-4999-8999-999999999999';
const ATTEMPT_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const QUESTION_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const OPTION_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const NOW_SEC = 1_791_600_000;
const NOW_DATE = new Date(NOW_SEC * 1000);

function base64UrlEncodeBytes(bytes) {
  return Buffer.from(bytes)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function base64UrlEncodeJson(obj) {
  return base64UrlEncodeBytes(Buffer.from(JSON.stringify(obj), 'utf8'));
}

async function generateTestEs256KeyPair(kid = 't03-key-1') {
  const pair = await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify']
  );
  const publicJwk = await crypto.subtle.exportKey('jwk', pair.publicKey);
  return {
    privateKey: pair.privateKey,
    jwks: {
      keys: [
        {
          ...publicJwk,
          kid,
          alg: 'ES256',
          use: 'sig',
        },
      ],
    },
  };
}

async function signEs256Jwt(privateKey, claims, headerOverrides = {}) {
  const header = {
    alg: 'ES256',
    typ: 'JWT',
    kid: 't03-key-1',
    ...headerOverrides,
  };
  const signingInput = `${base64UrlEncodeJson(header)}.${base64UrlEncodeJson(claims)}`;
  const sigBuffer = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    new TextEncoder().encode(signingInput)
  );
  return `${signingInput}.${base64UrlEncodeBytes(new Uint8Array(sigBuffer))}`;
}

/**
 * Simulated In-Memory Idempotency Store for deterministic local unit testing.
 */
function createSimulatedIdempotencyStore() {
  const records = new Map();
  return {
    records,
    async claimOrLookup({ userId, operation, idempotencyKey, requestHash }) {
      const mapKey = `${userId}:${operation}:${idempotencyKey}`;
      const existing = records.get(mapKey);
      if (!existing) {
        records.set(mapKey, {
          requestHash,
          status: 'pending',
          responseStatus: null,
          responseBody: null,
        });
        return { kind: 'acquired' };
      }
      if (existing.requestHash !== requestHash) {
        return { kind: 'hash_mismatch' };
      }
      if (existing.status === 'pending') {
        return { kind: 'conflict_pending' };
      }
      return {
        kind: 'replayed',
        responseStatus: existing.responseStatus,
        responseBody: existing.responseBody,
      };
    },
    async markCompleted({
      userId,
      operation,
      idempotencyKey,
      requestHash,
      responseStatus,
      responseBody,
    }) {
      const mapKey = `${userId}:${operation}:${idempotencyKey}`;
      records.set(mapKey, {
        requestHash,
        status: 'completed',
        responseStatus,
        responseBody,
      });
    },
    async releasePending({ userId, operation, idempotencyKey }) {
      const mapKey = `${userId}:${operation}:${idempotencyKey}`;
      const existing = records.get(mapKey);
      if (existing && existing.status === 'pending') {
        records.delete(mapKey);
      }
    },
  };
}

/**
 * Simulated RequestDbContext for local unit testing without network sockets.
 */
function createSimulatedDbFixture(options = {}) {
  let allocatedCount = 0;
  let cleanupCount = 0;
  let committedTxCount = 0;
  let serializableTxAttempts = 0;
  const executedQueries = [];

  const sqlExecutor = async (strings, ...values) => {
    const queryText = Array.isArray(strings) ? strings.join(' ? ') : String(strings);
    executedQueries.push({ queryText, values });
    if (options.onSql) {
      return await options.onSql(queryText, values, {
        serializableTxAttempts,
        committedTxCount,
      });
    }
    return [];
  };

  const factory = () => {
    allocatedCount += 1;
    return {
      sql: sqlExecutor,
      db: {},
      isHyperdrive: true,
      async runCommittedTransaction(fn) {
        committedTxCount += 1;
        if (options.failCommitWith) {
          throw options.failCommitWith;
        }
        return await fn(sqlExecutor);
      },
      async runSerializableTransaction(fn, txOpts) {
        const maxAttempts = Math.max(1, Math.min(txOpts?.maxAttempts ?? 3, 5));
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          serializableTxAttempts += 1;
          try {
            if (options.failSerializableAttempt) {
              const maybeErr = options.failSerializableAttempt(attempt);
              if (maybeErr) {
                throw maybeErr;
              }
            }
            return await fn(sqlExecutor);
          } catch (err) {
            if (err instanceof ApiError) {
              throw err;
            }
            const code = err && typeof err === 'object' ? err.code : undefined;
            if (code === '40001' || code === '40P01') {
              if (attempt < maxAttempts) {
                continue;
              }
              throw new ApiError({
                status: 409,
                code: 'SERIALIZATION_CONFLICT',
                message: 'Concurrent transaction conflict detected. Please retry your request.',
              });
            }
            throw new ApiError({
              status: 500,
              code: 'TRANSACTION_COMMIT_FAILED',
              message: 'Serializable database transaction failed to commit.',
            });
          }
        }
      },
      async cleanup() {
        cleanupCount += 1;
        if (options.throwOnCleanup) {
          // Simulate a broken socket close; createLazyDbHolder must swallow it safely
          throw new Error('SIMULATED_SOCKET_CLOSE_ERROR');
        }
      },
    };
  };

  return {
    factory,
    get stats() {
      return {
        allocatedCount,
        cleanupCount,
        committedTxCount,
        serializableTxAttempts,
        executedQueries,
      };
    },
  };
}

function createWaitUntilCollector() {
  const promises = [];
  return {
    ctx: {
      waitUntil(p) {
        promises.push(p);
      },
    },
    async flush() {
      await Promise.all(promises);
    },
    get count() {
      return promises.length;
    },
  };
}

test('1. CORS & Origin policy: allows reviewed origins without credentials header and rejects disallowed origins before DB allocation', async () => {
  resetJwksCache();
  const simDb = createSimulatedDbFixture();
  const worker = createNativeApiHandler({
    dbFactory: simDb.factory,
    hooks: { now: () => NOW_DATE },
  });
  const env = { SUPABASE_URL: TEST_SUPABASE_URL };

  // 1a. Allowed production origin preflight
  const preflightWait = createWaitUntilCollector();
  const preflightRes = await worker.fetch(
    new Request('https://jambprep.lecterniq.com/api/v1/dashboard', {
      method: 'OPTIONS',
      headers: { Origin: 'https://jambprep.lecterniq.com' },
    }),
    env,
    preflightWait.ctx
  );
  assert.equal(preflightRes.status, 204);
  assert.equal(
    preflightRes.headers.get('access-control-allow-origin'),
    'https://jambprep.lecterniq.com'
  );
  assert.equal(preflightRes.headers.get('access-control-allow-credentials'), null);
  assert.equal(
    preflightRes.headers.get('access-control-allow-headers'),
    'Authorization, Content-Type, Idempotency-Key'
  );
  assert.equal(preflightRes.headers.get('access-control-max-age'), '86400');
  assert.equal(preflightRes.headers.get('vary'), 'Origin');
  assert.equal(simDb.stats.allocatedCount, 0);

  // 1b. Disallowed origin on preflight -> 403 FORBIDDEN_ORIGIN
  const badPreflightRes = await worker.fetch(
    new Request('https://jambprep.lecterniq.com/api/v1/dashboard', {
      method: 'OPTIONS',
      headers: { Origin: 'https://evil-phishing.example.com' },
    }),
    env,
    preflightWait.ctx
  );
  assert.equal(badPreflightRes.status, 403);
  const badPreflightJson = await badPreflightRes.json();
  assert.equal(badPreflightJson.error.code, 'FORBIDDEN_ORIGIN');
  assert.equal(simDb.stats.allocatedCount, 0);

  // 1c. Disallowed origin on GET -> 403 FORBIDDEN_ORIGIN before auth or DB
  const badGetRes = await worker.fetch(
    new Request('https://jambprep.lecterniq.com/api/v1/health', {
      method: 'GET',
      headers: { Origin: 'https://evil-phishing.example.com' },
    }),
    env,
    preflightWait.ctx
  );
  assert.equal(badGetRes.status, 403);
  assert.equal(simDb.stats.allocatedCount, 0);
});

test('2. Exact routing: returns 404 for unknown paths and 405 with Allow header for wrong HTTP methods without allocating DB', async () => {
  const simDb = createSimulatedDbFixture();
  const worker = createNativeApiHandler({
    dbFactory: simDb.factory,
    hooks: { now: () => NOW_DATE },
  });
  const env = { SUPABASE_URL: TEST_SUPABASE_URL };
  const wait = createWaitUntilCollector();

  // Unknown path -> 404
  const notFoundRes = await worker.fetch(
    new Request('https://jambprep.lecterniq.com/api/v1/unknown-route', {
      method: 'GET',
    }),
    env,
    wait.ctx
  );
  assert.equal(notFoundRes.status, 404);
  assert.equal(notFoundRes.headers.get('cache-control'), 'no-store');
  const notFoundBody = await notFoundRes.json();
  assert.equal(notFoundBody.error.code, 'NOT_FOUND');

  // Wrong method -> 405 with Allow header
  const wrongMethodRes = await worker.fetch(
    new Request('https://jambprep.lecterniq.com/api/v1/dashboard', {
      method: 'DELETE',
    }),
    env,
    wait.ctx
  );
  assert.equal(wrongMethodRes.status, 405);
  assert.equal(wrongMethodRes.headers.get('allow'), 'GET, OPTIONS');
  const wrongMethodBody = await wrongMethodRes.json();
  assert.equal(wrongMethodBody.error.code, 'METHOD_NOT_ALLOWED');
  assert.equal(simDb.stats.allocatedCount, 0);
});

test('3. Bearer JWT authentication: rejects missing, expired, tampered, foreign-issuer, oversized, and revoked-session tokens before DB allocation', async () => {
  resetJwksCache();
  const { privateKey, jwks } = await generateTestEs256KeyPair();
  const { privateKey: foreignKey } = await generateTestEs256KeyPair();

  let isSessionLive = true;
  const simDb = createSimulatedDbFixture();
  const worker = createNativeApiHandler({
    dbFactory: simDb.factory,
    hooks: {
      nowSec: NOW_SEC,
      now: () => NOW_DATE,
      customJwks: jwks,
      liveSessionVerifier: async () => isSessionLive,
    },
  });
  const env = { SUPABASE_URL: TEST_SUPABASE_URL };
  const wait = createWaitUntilCollector();

  // 3a. Missing Authorization header -> 401
  const missingRes = await worker.fetch(
    new Request('https://jambprep.lecterniq.com/api/v1/dashboard'),
    env,
    wait.ctx
  );
  assert.equal(missingRes.status, 401);
  assert.equal((await missingRes.json()).error.code, 'MISSING_BEARER_TOKEN');

  // 3b. Expired token -> 401
  const expiredToken = await signEs256Jwt(privateKey, {
    sub: STUDENT_USER_ID,
    exp: NOW_SEC - 10,
    iss: TEST_ISSUER,
    aud: 'authenticated',
  });
  const expiredRes = await worker.fetch(
    new Request('https://jambprep.lecterniq.com/api/v1/dashboard', {
      headers: { Authorization: `Bearer ${expiredToken}` },
    }),
    env,
    wait.ctx
  );
  assert.equal(expiredRes.status, 401);
  assert.equal((await expiredRes.json()).error.code, 'INVALID_OR_EXPIRED_TOKEN');

  // 3c. Foreign issuer -> 401
  const foreignIssuerToken = await signEs256Jwt(privateKey, {
    sub: STUDENT_USER_ID,
    exp: NOW_SEC + 3600,
    iss: 'https://other-project.supabase.co/auth/v1',
    aud: 'authenticated',
  });
  const foreignRes = await worker.fetch(
    new Request('https://jambprep.lecterniq.com/api/v1/dashboard', {
      headers: { Authorization: `Bearer ${foreignIssuerToken}` },
    }),
    env,
    wait.ctx
  );
  assert.equal(foreignRes.status, 401);

  // 3d. Tampered signature (signed with foreign key) -> 401
  const tamperedToken = await signEs256Jwt(foreignKey, {
    sub: STUDENT_USER_ID,
    exp: NOW_SEC + 3600,
    iss: TEST_ISSUER,
    aud: 'authenticated',
  });
  const tamperedRes = await worker.fetch(
    new Request('https://jambprep.lecterniq.com/api/v1/dashboard', {
      headers: { Authorization: `Bearer ${tamperedToken}` },
    }),
    env,
    wait.ctx
  );
  assert.equal(tamperedRes.status, 401);

  // 3e. Oversized token (> 4096 bytes) -> 401
  const oversizedToken = `eyJhbGciOiJFUzI1NiJ9.${'a'.repeat(4100)}.sig`;
  const oversizedRes = await worker.fetch(
    new Request('https://jambprep.lecterniq.com/api/v1/dashboard', {
      headers: { Authorization: `Bearer ${oversizedToken}` },
    }),
    env,
    wait.ctx
  );
  assert.equal(oversizedRes.status, 401);

  // 3f. Revoked live session on sensitive write route -> 401 SESSION_REVOKED before DB allocation
  isSessionLive = false;
  const validToken = await signEs256Jwt(privateKey, {
    sub: STUDENT_USER_ID,
    exp: NOW_SEC + 3600,
    iss: TEST_ISSUER,
    aud: 'authenticated',
  });
  const revokedRes = await worker.fetch(
    new Request('https://jambprep.lecterniq.com/api/v1/profile', {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${validToken}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': 'idem-profile-revoked-01',
      },
      body: JSON.stringify({ displayName: 'Adaeze', targetScore: 300 }),
    }),
    env,
    wait.ctx
  );
  assert.equal(revokedRes.status, 401);
  assert.equal((await revokedRes.json()).error.code, 'SESSION_REVOKED');
  assert.equal(simDb.stats.allocatedCount, 0);
});

test('4. Role escalation prevention: JWT user_metadata.role="admin" is rejected with 403 when DB profiles.role is "student"', async () => {
  resetJwksCache();
  const { privateKey, jwks } = await generateTestEs256KeyPair();

  let dbRoleForActor = 'student';
  const simDb = createSimulatedDbFixture({
    onSql: async (queryText) => {
      if (queryText.includes('total_students')) {
        return [
          {
            total_students: 42,
            total_published_questions: 720,
            total_completed_attempts: 15,
          },
        ];
      }
      if (queryText.includes('FROM profiles')) {
        return [{ id: STUDENT_USER_ID, role: dbRoleForActor }];
      }
      return [];
    },
  });

  const worker = createNativeApiHandler({
    dbFactory: simDb.factory,
    hooks: {
      nowSec: NOW_SEC,
      now: () => NOW_DATE,
      customJwks: jwks,
      liveSessionVerifier: async () => true,
    },
  });
  const env = { SUPABASE_URL: TEST_SUPABASE_URL };
  const wait = createWaitUntilCollector();

  // Craft a valid JWT where the client injected role: 'admin' in claims and user_metadata
  const escalatedToken = await signEs256Jwt(privateKey, {
    sub: STUDENT_USER_ID,
    exp: NOW_SEC + 3600,
    iss: TEST_ISSUER,
    aud: 'authenticated',
    role: 'admin',
    user_metadata: { role: 'admin', is_admin: true },
    app_metadata: { role: 'admin' },
  });

  const deniedRes = await worker.fetch(
    new Request('https://jambprep.lecterniq.com/api/v1/admin/overview', {
      headers: { Authorization: `Bearer ${escalatedToken}` },
    }),
    env,
    wait.ctx
  );
  await wait.flush();
  assert.equal(deniedRes.status, 403);
  assert.equal((await deniedRes.json()).error.code, 'FORBIDDEN_ADMIN_REQUIRED');
  assert.equal(simDb.stats.cleanupCount, 1);

  // Now set authoritative DB role to 'admin' and verify access succeeds
  dbRoleForActor = 'admin';
  const allowedRes = await worker.fetch(
    new Request('https://jambprep.lecterniq.com/api/v1/admin/overview', {
      headers: { Authorization: `Bearer ${escalatedToken}` },
    }),
    env,
    wait.ctx
  );
  await wait.flush();
  assert.equal(allowedRes.status, 200);
  const allowedBody = await allowedRes.json();
  assert.equal(allowedBody.metrics.total_published_questions, 720);
});

test('5. Body byte bounds & validation: enforces 413 on oversized bodies, 400 on bad JSON/UUID, and 422 on schema failure before DB writes', async () => {
  resetJwksCache();
  const { privateKey, jwks } = await generateTestEs256KeyPair();
  const simDb = createSimulatedDbFixture();
  const worker = createNativeApiHandler({
    dbFactory: simDb.factory,
    hooks: {
      nowSec: NOW_SEC,
      now: () => NOW_DATE,
      customJwks: jwks,
      liveSessionVerifier: async () => true, // Injected local session adapter.
    },
  });
  const env = { SUPABASE_URL: TEST_SUPABASE_URL };
  const wait = createWaitUntilCollector();

  const token = await signEs256Jwt(privateKey, {
    sub: STUDENT_USER_ID,
    exp: NOW_SEC + 3600,
    iss: TEST_ISSUER,
    aud: 'authenticated',
  });

  // 5a. Oversized body (> 4 KB) on PUT /api/v1/onboarding -> 413 PAYLOAD_TOO_LARGE
  const largePayload = JSON.stringify({
    electives: ['Mathematics', 'Physics', 'Chemistry'],
    targetScore: 300,
    targetInstitution: 'X'.repeat(5000),
  });
  const tooLargeRes = await worker.fetch(
    new Request('https://jambprep.lecterniq.com/api/v1/onboarding', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': 'idem-onboard-large-01',
      },
      body: largePayload,
    }),
    env,
    wait.ctx
  );
  assert.equal(tooLargeRes.status, 413);
  assert.equal((await tooLargeRes.json()).error.code, 'PAYLOAD_TOO_LARGE');
  assert.equal(simDb.stats.allocatedCount, 0);

  // 5b. Invalid UUID path parameter -> 400 INVALID_UUID
  const badUuidRes = await worker.fetch(
    new Request('https://jambprep.lecterniq.com/api/v1/exams/attempts/not-a-uuid'),
    { ...env },
    wait.ctx
  );
  // Wait: unauthenticated hits 401 first, let's pass token to test UUID validation
  const badUuidAuthedRes = await worker.fetch(
    new Request('https://jambprep.lecterniq.com/api/v1/exams/attempts/not-a-uuid', {
      headers: { Authorization: `Bearer ${token}` },
    }),
    env,
    wait.ctx
  );
  assert.equal(badUuidRes.status, 401);
  assert.equal(badUuidAuthedRes.status, 400);
  assert.equal((await badUuidAuthedRes.json()).error.code, 'INVALID_UUID');
  assert.equal(simDb.stats.allocatedCount, 0);

  // 5c. Semantic validation failure on onboarding (duplicate electives / targetScore out of range) -> 422
  const invalidSchemaRes = await worker.fetch(
    new Request('https://jambprep.lecterniq.com/api/v1/onboarding', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': 'idem-onboard-invalid-01',
      },
      body: JSON.stringify({
        electives: ['Mathematics', 'Mathematics', 'Physics'],
        targetScore: 450,
      }),
    }),
    env,
    wait.ctx
  );
  assert.equal(invalidSchemaRes.status, 422);
  const invalidBody = await invalidSchemaRes.json();
  assert.equal(invalidBody.error.code, 'VALIDATION_FAILED');
  assert.ok(Array.isArray(invalidBody.error.details));
  assert.equal(simDb.stats.allocatedCount, 0);
});

test('6. Idempotency: enforces 400 missing key, 409 pending conflict, 422 payload hash mismatch, and 200 replay with Idempotent-Replayed: true', async () => {
  resetJwksCache();
  const { privateKey, jwks } = await generateTestEs256KeyPair();
  const idempotencyStore = createSimulatedIdempotencyStore();

  let handlerExecutions = 0;
  const simDb = createSimulatedDbFixture({
    onSql: async (queryText) => {
      if (queryText.includes('SELECT id FROM profiles')) return [{ id: STUDENT_USER_ID }];
      if (queryText.includes('FROM subjects')) {
        handlerExecutions += 1;
        return ['Use of English', 'Mathematics', 'Physics', 'Chemistry'].map((name, index) => ({
          id: `33333333-3333-4333-8333-33333333333${index}`, name, code: index === 0 ? 'ENG' : `E${index}`, is_compulsory: index === 0,
        }));
      }
      return [];
    },
  });

  const worker = createNativeApiHandler({
    dbFactory: simDb.factory,
    hooks: {
      nowSec: NOW_SEC,
      now: () => NOW_DATE,
      customJwks: jwks,
      liveSessionVerifier: async () => true, // Injected local session adapter.
      idempotencyStore,
    },
  });
  const env = { SUPABASE_URL: TEST_SUPABASE_URL };
  const wait = createWaitUntilCollector();

  const token = await signEs256Jwt(privateKey, {
    sub: STUDENT_USER_ID,
    exp: NOW_SEC + 3600,
    iss: TEST_ISSUER,
    aud: 'authenticated',
  });

  const validBody = JSON.stringify({
    electives: ['Mathematics', 'Physics', 'Chemistry'],
    targetScore: 320,
    targetInstitution: 'UNILAG',
    targetCourse: 'Computer Science',
  });

  // 6a. Missing Idempotency-Key -> 400 MISSING_IDEMPOTENCY_KEY
  const missingKeyRes = await worker.fetch(
    new Request('https://jambprep.lecterniq.com/api/v1/onboarding', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: validBody,
    }),
    env,
    wait.ctx
  );
  assert.equal(missingKeyRes.status, 400);
  assert.equal((await missingKeyRes.json()).error.code, 'MISSING_IDEMPOTENCY_KEY');

  // 6b. First execution with Idempotency-Key -> 200 OK
  const firstRes = await worker.fetch(
    new Request('https://jambprep.lecterniq.com/api/v1/onboarding', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': 'onboard-key-12345678',
      },
      body: validBody,
    }),
    env,
    wait.ctx
  );
  await wait.flush();
  assert.equal(firstRes.status, 200);
  assert.equal(firstRes.headers.get('idempotent-replayed'), null);
  const firstJson = await firstRes.json();
  assert.equal(firstJson.saved, true);
  assert.equal(handlerExecutions, 1); // One locked catalog query.

  // 6c. Second execution with same Idempotency-Key + same body -> 200 replayed without re-running DB writes
  const replayRes = await worker.fetch(
    new Request('https://jambprep.lecterniq.com/api/v1/onboarding', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': 'onboard-key-12345678',
      },
      body: validBody,
    }),
    env,
    wait.ctx
  );
  await wait.flush();
  assert.equal(replayRes.status, 200);
  assert.equal(replayRes.headers.get('idempotent-replayed'), 'true');
  assert.deepEqual(await replayRes.json(), firstJson);
  assert.equal(handlerExecutions, 1); // Replay executes no catalog query.

  // 6d. Reused Idempotency-Key with different payload -> 422 IDEMPOTENCY_KEY_PAYLOAD_MISMATCH
  const mismatchRes = await worker.fetch(
    new Request('https://jambprep.lecterniq.com/api/v1/onboarding', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': 'onboard-key-12345678',
      },
      body: JSON.stringify({
        electives: ['Mathematics', 'Physics', 'Biology'],
        targetScore: 290,
      }),
    }),
    env,
    wait.ctx
  );
  assert.equal(mismatchRes.status, 422);
  assert.equal((await mismatchRes.json()).error.code, 'IDEMPOTENCY_KEY_PAYLOAD_MISMATCH');

  // 6e. Simulated in-flight pending key -> 409 IDEMPOTENCY_CONFLICT_IN_PROGRESS
  await idempotencyStore.claimOrLookup({
    userId: STUDENT_USER_ID,
    operation: 'onboarding.put',
    idempotencyKey: 'onboard-pending-key-99',
    requestHash: await (async () => {
      const { computeRequestHash } = await import('../worker/api/idempotency.ts');
      return computeRequestHash('onboarding.put', validBody);
    })(),
  });
  const pendingRes = await worker.fetch(
    new Request('https://jambprep.lecterniq.com/api/v1/onboarding', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': 'onboard-pending-key-99',
      },
      body: validBody,
    }),
    env,
    wait.ctx
  );
  assert.equal(pendingRes.status, 409);
  assert.equal((await pendingRes.json()).error.code, 'IDEMPOTENCY_CONFLICT_IN_PROGRESS');
});

test('7. Owner scopes & Exam Foundation: enforces actor ownership (403), payload safety guard, and atomic answer/submit state checks', async () => {
  // 7a. Payload safety guard rejects forbidden answer-key fields and oversized UTF-8 payloads
  assert.throws(
    () => assertSafeExamPayloadJson('[{"id":"q1","isCorrect":true}]'),
    (err) => err instanceof ApiError && err.status === 500
  );
  assert.throws(
    () => assertSafeExamPayloadJson('[{"id":"q1","explanation":"secret solution"}]'),
    (err) => err instanceof ApiError && err.status === 500
  );

  // 7b. Foreign owner on getOwnedAttemptPayloadJson -> 403 FORBIDDEN_NOT_OWNER
  const foreignSql = async () => [
    {
      attempt_id: ATTEMPT_ID,
      user_id: OTHER_USER_ID,
      status: 'in_progress',
      started_at: NOW_DATE.toISOString(),
      expires_at: new Date(NOW_SEC * 1000 + 3600_000).toISOString(),
      total_questions: 0,
      questions_json: '[]',
    },
  ];
  await assert.rejects(
    () =>
      getOwnedAttemptPayloadJson(foreignSql, {
        attemptId: ATTEMPT_ID,
        userId: STUDENT_USER_ID,
      }),
    (err) => err instanceof ApiError && err.status === 403 && err.code === 'FORBIDDEN_NOT_OWNER'
  );

  // 7c. Stale revision on upsertOwnedExamAnswerAtomic -> 409 STALE_ANSWER_REVISION
  const staleDb = createSimulatedDbFixture({
    onSql: async () => [
      {
        attempt_exists: true,
        owner_matches: true,
        status_active: true,
        within_window: true,
        membership_valid: true,
        ack_revision: null,
      },
    ],
  }).factory();

  await assert.rejects(
    () =>
      upsertOwnedExamAnswerAtomic(staleDb, {
        attemptId: ATTEMPT_ID,
        userId: STUDENT_USER_ID,
        questionId: QUESTION_ID,
        selectedOptionId: OPTION_ID,
        revision: 1,
      }),
    (err) => err instanceof ApiError && err.status === 409 && err.code === 'STALE_ANSWER_REVISION'
  );
});

test('8. SERIALIZABLE transaction retries, commit failure handling, cleanup on error, and error redaction', async () => {
  resetJwksCache();
  const { privateKey, jwks } = await generateTestEs256KeyPair();

  // 8a. Transient 40001 serialization failure retries and succeeds on attempt 2
  const retryDbFixture = createSimulatedDbFixture({
    failSerializableAttempt: (attempt) => {
      if (attempt === 1) {
        const err = new Error('could not serialize access due to concurrent update');
        err.code = '40001';
        return err;
      }
      return null;
    },
    onSql: async () => [
      {
        attempt_exists: true,
        owner_matches: true,
        status_active: true,
        within_window: true,
        membership_valid: true,
        ack_revision: 3,
      },
    ],
  });

  const retryResult = await upsertOwnedExamAnswerAtomic(retryDbFixture.factory(), {
    attemptId: ATTEMPT_ID,
    userId: STUDENT_USER_ID,
    questionId: QUESTION_ID,
    selectedOptionId: OPTION_ID,
    revision: 3,
  });
  assert.equal(retryResult.acknowledged, true);
  assert.equal(retryResult.revision, 3);
  assert.equal(retryDbFixture.stats.serializableTxAttempts, 2);

  // 8b. Exhausted 40001 retries (all 3 attempts fail) -> 409 SERIALIZATION_CONFLICT, never acknowledges write
  const exhaustedDbFixture = createSimulatedDbFixture({
    failSerializableAttempt: () => {
      const err = new Error('could not serialize access');
      err.code = '40001';
      return err;
    },
  });
  await assert.rejects(
    () =>
      submitAndScoreExamAttemptAtomic(exhaustedDbFixture.factory(), {
        attemptId: ATTEMPT_ID,
        userId: STUDENT_USER_ID,
      }),
    (err) => err instanceof ApiError && err.status === 409 && err.code === 'SERIALIZATION_CONFLICT'
  );
  assert.equal(exhaustedDbFixture.stats.serializableTxAttempts, 3);

  // 8c. Commit failure with sensitive SQL/connection string/keys is redacted and still runs waitUntil cleanup safely
  const failingDbFixture = createSimulatedDbFixture({
    throwOnCleanup: true,
    onSql: async () => {
      throw new Error(
        'FATAL postgresql://postgres:SuperSecretPass@db.internal:5432/postgres failed on SELECT * FROM profiles WHERE sk_live_999888777'
      );
    },
  });

  const worker = createNativeApiHandler({
    dbFactory: failingDbFixture.factory,
    hooks: {
      nowSec: NOW_SEC,
      now: () => NOW_DATE,
      customJwks: jwks,
    },
  });
  const token = await signEs256Jwt(privateKey, {
    sub: STUDENT_USER_ID,
    exp: NOW_SEC + 3600,
    iss: TEST_ISSUER,
    aud: 'authenticated',
  });
  const wait = createWaitUntilCollector();
  const errorRes = await worker.fetch(
    new Request(
      `https://jambprep.lecterniq.com/api/v1/exams/attempts/${ATTEMPT_ID}/answers`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          questionId: QUESTION_ID,
          selectedOptionId: OPTION_ID,
          revision: 1,
        }),
      }
    ),
    { SUPABASE_URL: TEST_SUPABASE_URL },
    wait.ctx
  );

  // Flushing waitUntil must NOT reject even though cleanup() threw SIMULATED_SOCKET_CLOSE_ERROR
  await assert.doesNotReject(() => wait.flush());
  assert.equal(failingDbFixture.stats.cleanupCount, 1);
  assert.equal(errorRes.status, 500);
  const errorText = await errorRes.text();
  assert.equal(errorText.includes('SuperSecretPass'), false);
  assert.equal(errorText.includes('postgresql://'), false);
  assert.equal(errorText.includes('sk_live_'), false);
  assert.equal(errorText.includes('SELECT * FROM'), false);

  const diag = sanitizeDiagnosticMessage(
    new Error('postgresql://user:pass@host:5432/db key=sk_live_abc12345')
  );
  assert.equal(diag.includes('pass'), false);
  assert.equal(diag.includes('sk_live_abc12345'), false);
  assert.equal(toSafeApiError(new Error('raw driver crash')).status, 500);
});

test('9. Paystack Web Crypto HMAC-SHA512 webhook verification and atomic payment/referral settlement', async () => {
  const secret = 'sk_test_webhook_secret_key_for_t03';
  const payloadObj = {
    event: 'charge.success',
    data: {
      id: 987654321,
      status: 'success',
      reference: 'JAMB_SUB_TEST_001',
      amount: 50000,
      currency: 'NGN',
      metadata: {
        userId: STUDENT_USER_ID,
        rewardId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      },
    },
  };
  const rawBody = JSON.stringify(payloadObj);

  // Compute valid HMAC-SHA512 hex signature
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-512' },
    false,
    ['sign']
  );
  const sigBuf = await crypto.subtle.sign(
    'HMAC',
    cryptoKey,
    new TextEncoder().encode(rawBody)
  );
  const validSignature = Buffer.from(sigBuf).toString('hex');

  assert.equal(
    await hasValidPaystackWebhookSignature(rawBody, validSignature, secret),
    true
  );
  assert.equal(
    await hasValidPaystackWebhookSignature(rawBody, '00'.repeat(64), secret),
    false
  );
  assert.equal(
    matchesPayment(payloadObj.data, 'JAMB_SUB_TEST_001', 50000, STUDENT_USER_ID),
    true
  );
  assert.equal(
    matchesPayment(payloadObj.data, 'JAMB_SUB_TEST_001', 100000, STUDENT_USER_ID),
    false
  );

  // Verify pricing and atomic settlement via simulated DB
  let rewardRedeemed = false;
  let transactionMarkedSuccess = false;
  const simDb = createSimulatedDbFixture({
    onSql: async (queryText) => {
      if (queryText.includes('FROM payment_transactions') && queryText.includes('FOR UPDATE')) {
        return [
          {
            id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
            user_id: STUDENT_USER_ID,
            reference: 'JAMB_SUB_TEST_001',
            amount_kobo: 50000,
            status: 'pending',
            paystack_payload: {
              rewardId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
              hasDiscount: true,
            },
          },
        ];
      }
      if (queryText.includes('UPDATE referral_rewards')) {
        rewardRedeemed = true;
        return [{ id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd' }];
      }
      if (queryText.includes('UPDATE payment_transactions')) {
        transactionMarkedSuccess = true;
        return [];
      }
      if (queryText.includes('FROM referral_rewards')) {
        return [{ id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd' }];
      }
      return [];
    },
  });

  const pricing = await getCheckoutPricing(
    simDb.factory().sql,
    STUDENT_USER_ID,
    'student@example.com',
    NOW_DATE
  );
  assert.equal(pricing.hasDiscount, true);
  assert.equal(pricing.finalAmountKobo, 50000);

  const settled = await settleVerifiedPaymentAtomic(simDb.factory(), {
    reference: 'JAMB_SUB_TEST_001',
    expectedUserId: STUDENT_USER_ID,
    now: NOW_DATE,
  });
  assert.equal(settled.alreadyProcessed, false);
  assert.equal(settled.amountKobo, 50000);
  assert.equal(rewardRedeemed, true);
  assert.equal(transactionMarkedSuccess, true);
});

test('10. SQL Idempotency Store & Portable Coach Service: executes atomic ON CONFLICT upserts and computes coach insights without silent timeout fallbacks', async () => {
  const { createSqlIdempotencyStore } = await import('../worker/api/idempotency.ts');
  const { recordTopicMasteryBatch, getStudentCoachInsights } = await import(
    '../worker/services/coach-service.ts'
  );

  let sqlIdempotencyRow = null;
  const simDb = createSimulatedDbFixture({
    onSql: async (queryText, values) => {
      if (queryText.includes('INSERT INTO api_idempotency_keys')) {
        if (!sqlIdempotencyRow) {
          sqlIdempotencyRow = {
            request_hash: values[3],
            status: 'pending',
            response_status: null,
            response_body: null,
            inserted_or_reset: true,
          };
          return [sqlIdempotencyRow];
        }
        return [
          {
            ...sqlIdempotencyRow,
            inserted_or_reset: false,
          },
        ];
      }
      if (queryText.includes('UPDATE api_idempotency_keys')) {
        sqlIdempotencyRow.status = 'completed';
        sqlIdempotencyRow.response_status = values[0];
        sqlIdempotencyRow.response_body = JSON.parse(values[1]);
        return [{ idempotency_key: values[4] }];
      }
      if (queryText.includes('AS pref_rows') && queryText.includes('AS aggregate_rows')) {
        return [{pref_rows:[{target_score:300,target_institution:'UI',target_course:'Medicine'}],enrolled_rows:[{id:'sub-1',name:'Use of English',code:'ENG',is_compulsory:true}],completed_results:[{total_count:1,historical_best:260,total_score:260,topic_breakdown:[],created_at:NOW_DATE.toISOString(),attempt_id:ATTEMPT_ID}],mastery_rows:[{topic_id:'top-1',topic_title:'Concord & Lexis',topic_slug:'concord-lexis',subject_code:'ENG',subject_name:'Use of English',subject_id:'sub-1',accuracy_percent:40,total_attempted:10,total_correct:4}],aggregate_rows:[{subject_id:'sub-1',total_attempted:10,total_correct:4,weak:1,mastered:0}]}];
      }
      if (queryText.includes('FROM student_preferences')) {
        return [{ target_score: 300, target_institution: 'UI', target_course: 'Medicine' }];
      }
      if (queryText.includes('FROM student_subjects')) {
        return [{ id: 'sub-1', name: 'Use of English', code: 'ENG', is_compulsory: true }];
      }
      if (queryText.includes('FROM attempt_results')) {
        return [
          {
            attempt_id: ATTEMPT_ID,
            total_score: 260,
            english_score: 70,
            subject_2_score: 65,
            subject_3_score: 60,
            subject_4_score: 65,
            time_spent_seconds: 5400,
            created_at: NOW_DATE.toISOString(),
          },
        ];
      }
      if (queryText.includes('FROM student_topic_mastery')) {
        return [
          {
            topic_id: 'top-1',
            topic_title: 'Concord & Lexis',
            topic_slug: 'concord-lexis',
            subject_code: 'ENG',
            subject_name: 'Use of English',
            subject_id: 'sub-1',
            accuracy_percent: 40,
            total_attempted: 10,
            total_correct: 4,
          },
        ];
      }
      return [];
    },
  });

  const sql = simDb.factory().sql;
  const sqlStore = createSqlIdempotencyStore(sql);

  const firstClaim = await sqlStore.claimOrLookup({
    userId: STUDENT_USER_ID,
    operation: 'test.op',
    idempotencyKey: 'sql-key-0001',
    requestHash: 'hash-abc',
    nowIso: NOW_DATE.toISOString(),
  });
  assert.equal(firstClaim.kind, 'acquired');

  const secondPendingClaim = await sqlStore.claimOrLookup({
    userId: STUDENT_USER_ID,
    operation: 'test.op',
    idempotencyKey: 'sql-key-0001',
    requestHash: 'hash-abc',
    nowIso: NOW_DATE.toISOString(),
  });
  assert.equal(secondPendingClaim.kind, 'conflict_pending');

  await sqlStore.markCompleted({
    userId: STUDENT_USER_ID,
    operation: 'test.op',
    idempotencyKey: 'sql-key-0001',
    requestHash: 'hash-abc',
    responseStatus: 201,
    responseBody: { ok: true },
  });

  const replayClaim = await sqlStore.claimOrLookup({
    userId: STUDENT_USER_ID,
    operation: 'test.op',
    idempotencyKey: 'sql-key-0001',
    requestHash: 'hash-abc',
    nowIso: NOW_DATE.toISOString(),
  });
  assert.equal(replayClaim.kind, 'replayed');
  assert.equal(replayClaim.responseStatus, 201);
  assert.deepEqual(replayClaim.responseBody, { ok: true });

  await recordTopicMasteryBatch(
    sql,
    STUDENT_USER_ID,
    [
      { subjectId: '11111111-1111-4111-8111-111111111111', topicId: '22222222-2222-4222-8222-222222222222', isCorrect: true },
      { subjectId: '11111111-1111-4111-8111-111111111111', topicId: '22222222-2222-4222-8222-222222222222', isCorrect: false },
    ],
    NOW_DATE
  );

  const insights = await getStudentCoachInsights(sql, STUDENT_USER_ID);
  assert.equal(insights.targetScore, 300);
  assert.equal(insights.latestScore, 260);
  assert.equal(insights.gapToTarget, 40);
  assert.equal(insights.weakestTopics.length, 1);
  assert.equal(insights.weakestTopics[0].priority, 'critical');
  assert.equal(insights.coachRecommendation.badge, 'HIGH LEVERAGE OPPORTUNITY');
});



test('default Worker authenticates product routes before DB allocation', async () => {
  const handler = createDefaultNativeApiHandler({ dbFactory: () => { throw new Error('Database must not be allocated'); } });
  for (const path of [
    '/api/v1/payments/checkout',
    '/api/v1/payments/verify',
    '/api/v1/exams/attempts',
    '/api/v1/admin/questions/import',
  ]) {
    const response = await handler.fetch(new Request(`https://api.example.com${path}`, { method: 'POST' }), {}, { waitUntil() { throw new Error('No cleanup expected'); } });
    assert.equal(response.status, 503);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.match(await response.text(), /SERVICE_CONFIG_UNAVAILABLE/);
  }
});

test('SQL idempotency claim fails closed when a conflicting insert is invisible to its snapshot', async () => {
  const { createSqlIdempotencyStore } = await import('../worker/api/idempotency.ts');
  const store = createSqlIdempotencyStore(async () => []);
  assert.deepEqual(await store.claimOrLookup({ userId: STUDENT_USER_ID, operation: 'test', idempotencyKey: 'test-key', requestHash: 'hash' }), { kind: 'conflict_pending' });
});


test('stalled request body is cancelled at its deadline', async () => {
  const { readBoundedTextBody } = await import('../worker/api/contracts.ts');
  let cancelled = false;
  const body = new ReadableStream({ pull() { return new Promise(() => {}); }, cancel() { cancelled = true; } });
  const request = new Request('https://example.com', { method: 'POST', body, duplex: 'half' });
  await assert.rejects(readBoundedTextBody(request, 1024, 10), (err) => err instanceof ApiError && err.status === 400);
  assert.equal(cancelled, true);
});

test('transactional idempotency uses one executor and rolls back if completion fails', async () => {
  const { executeTransactionalIdempotentMutation } = await import('../worker/api/idempotency.ts');
  let committed = false;
  let rolledBack = false;
  let mutationStaged = false;
  const tx = async (parts) => parts.join('').includes('WITH upsert') ? [{ inserted_or_reset: true }] : [];
  const db = { runSerializableTransaction: async (fn) => {
    try { const result = await fn(tx); committed = true; return result; }
    catch (err) { mutationStaged = false; rolledBack = true; throw err; }
  } };
  await assert.rejects(executeTransactionalIdempotentMutation({
    db, userId: STUDENT_USER_ID, operation: 'test', idempotencyKey: 'test-key', canonicalPayload: '{}',
    execute: async (executor) => { assert.equal(executor, tx); mutationStaged = true; return { body: { ok: true } }; },
  }), (err) => err instanceof ApiError && err.status === 409);
  assert.equal(committed, false);
  assert.equal(rolledBack, true);
  assert.equal(mutationStaged, false);
});


test('transactional idempotency commits completion with mutation and does not acknowledge commit failure', async () => {
  const { executeTransactionalIdempotentMutation } = await import('../worker/api/idempotency.ts');
  const seen = [];
  const tx = async (parts) => {
    const sql = parts.join('');
    seen.push(sql);
    return sql.includes('WITH upsert') ? [{ inserted_or_reset: true }] : [{ idempotency_key: 'test-key' }];
  };
  const input = { userId: STUDENT_USER_ID, operation: 'test', idempotencyKey: 'test-key', canonicalPayload: '{}', execute: async (executor) => { await executor`UPDATE example_mutation SET value = 1`; return { body: { ok: true } }; } };
  const result = await executeTransactionalIdempotentMutation({ ...input, db: { runSerializableTransaction: (fn) => fn(tx) } });
  assert.deepEqual(result.body, { ok: true });
  assert.equal(seen.length, 3);
  assert.match(seen[0], /WITH upsert/);
  assert.match(seen[1], /example_mutation/);
  assert.match(seen[2], /UPDATE api_idempotency_keys/);
  await assert.rejects(executeTransactionalIdempotentMutation({ ...input, db: { runSerializableTransaction: async (fn) => { await fn(tx); throw new Error('simulated commit failure'); } } }), /simulated commit failure/);
});


test('live-session provider errors, oversized bodies and redirects fail safely', async () => {
  const { verifyLiveSupabaseSession } = await import('../worker/api/authorization.ts');
  const actor = { userId: STUDENT_USER_ID, token: 'local-test-token' };
  const env = { SUPABASE_URL: TEST_SUPABASE_URL, SUPABASE_ANON_KEY: 'local-public-key' };
  for (const response of [new Response('unavailable', { status: 503 }), new Response('x'.repeat(17000))]) {
    await assert.rejects(verifyLiveSupabaseSession(actor, env, { customFetch: async (_, init) => { assert.equal(init.redirect, 'manual'); return response; } }), (err) => err instanceof ApiError && err.status === 503);
  }
});

test('transaction retry count rejects fractional, nonfinite and out-of-range values without connecting', async () => {
  const { createRequestDbContext } = await import('../worker/api/db-context.ts');
  const db = createRequestDbContext({ DATABASE_URL: 'postgres://local:local@127.0.0.1:1/local' });
  try {
    for (const maxAttempts of [0, 4, 1.5, NaN, Infinity]) {
      await assert.rejects(db.runSerializableTransaction(async () => { throw new Error('Must not execute'); }, { maxAttempts }), (err) => err instanceof ApiError && err.status === 422);
    }
  } finally { await db.cleanup(); }
});
