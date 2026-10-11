/**
 * Local Verification Test Suite for T04: Browser Session Flow & Safe Account Provisioning
 *
 * All database, JWKS, live-session, storage, and Supabase Auth adapters in this file are
 * explicitly labeled SIMULATED / INJECTED local test adapters. Zero remote network,
 * database, or provider calls are made.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { createNativeApiHandler as createDefaultNativeApiHandler } from '../worker/api/entry.ts';
import {
  ENABLED_PRODUCTION_ROUTE_IDS,
  NATIVE_API_ROUTES,
} from '../worker/api/router.ts';
import { resetJwksCache } from '../worker/auth.ts';
import {
  buildLoginRedirectUrl,
  sanitizeInternalRedirect,
} from '../src/lib/auth/redirect.ts';
import {
  ACTIVE_USER_STORAGE_KEY,
  clearPrivateBrowserState,
  getPendingExamOutboxCount,
  registerPrivateCacheClearer,
  syncBrowserUserStorage,
} from '../src/lib/auth/storage-cleanup.ts';
import {
  computeBootstrapIdempotencyKey,
  createBrowserSessionManager,
} from '../src/lib/auth/session-manager.ts';
import {
  createNativeApiClient,
  NativeApiClientError,
} from '../src/lib/api/native-client.ts';
import { createClient as createBrowserSupabaseClient } from '../src/lib/supabase/client.ts';

const TEST_SUPABASE_URL = 'https://bqumnaoiiukifvanoonm.supabase.co';
const TEST_ISSUER = `${TEST_SUPABASE_URL}/auth/v1`;
const STUDENT_USER_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_USER_ID = '22222222-2222-4222-8222-222222222222';
const COLLIDING_USER_ID = '11112222-3333-4444-8555-666677778888';
const ADMIN_USER_ID = '99999999-9999-4999-8999-999999999999';
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

async function generateTestEs256KeyPair(kid = 't04-key-1') {
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
    kid: 't04-key-1',
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
 * Simulated in-memory Web Storage (`localStorage` / `sessionStorage`) adapter for local tests.
 */
function createSimulatedStorage(initialEntries = {}) {
  const map = new Map(Object.entries(initialEntries));
  return {
    get length() {
      return map.size;
    },
    key(index) {
      return Array.from(map.keys())[index] ?? null;
    },
    getItem(k) {
      return map.has(k) ? map.get(k) : null;
    },
    setItem(k, v) {
      map.set(String(k), String(v));
    },
    removeItem(k) {
      map.delete(String(k));
    },
    dump() {
      return Object.fromEntries(map.entries());
    },
  };
}

/**
 * Simulated stateful relational database for T04 identity, provisioning, and transactional idempotency.
 */
function createSimulatedT04Database(options = {}) {
  const profilesTable = new Map(); // userId -> { id, display_name, email, role }
  const referralCodesByUser = new Map(); // userId -> code
  const referralCodesByCode = new Map(); // code -> userId
  const referralsByReferredUser = new Map(); // referredUserId -> { id, referrer_id, referred_user_id, status, qualified_at }
  const referralRewardsTable = [];
  const entitlementsTable = [];
  const idempotencyTable = new Map(); // `${userId}:${op}:${key}` -> { request_hash, status, response_status, response_body, expires_at }

  let allocatedCount = 0;
  let cleanupCount = 0;
  let missingIdempotencyTable = Boolean(options.missingIdempotencyTable);
  let failNextCommit = Boolean(options.failNextCommit);

  function cloneMaps() {
    return {
      profiles: new Map(profilesTable),
      codesByUser: new Map(referralCodesByUser),
      codesByCode: new Map(referralCodesByCode),
      referrals: new Map(referralsByReferredUser),
      idem: new Map(idempotencyTable),
    };
  }

  function restoreMaps(snap) {
    profilesTable.clear();
    for (const [k, v] of snap.profiles) profilesTable.set(k, { ...v });
    referralCodesByUser.clear();
    for (const [k, v] of snap.codesByUser) referralCodesByUser.set(k, v);
    referralCodesByCode.clear();
    for (const [k, v] of snap.codesByCode) referralCodesByCode.set(k, v);
    referralsByReferredUser.clear();
    for (const [k, v] of snap.referrals) referralsByReferredUser.set(k, { ...v });
    idempotencyTable.clear();
    for (const [k, v] of snap.idem) idempotencyTable.set(k, { ...v });
  }

  const sqlExecutor = async (strings, ...values) => {
    const query = Array.isArray(strings) ? strings.join('?') : String(strings);

    // 1. Transactional SQL idempotency table operations
    if (query.includes('api_idempotency_keys')) {
      if (missingIdempotencyTable) {
        const err = new Error('relation "api_idempotency_keys" does not exist');
        err.code = '42P01';
        throw err;
      }

      if (query.includes('WITH upsert AS')) {
        const [userId, operation, idempotencyKey, requestHash, nowIso, expiresIso] = values;
        const compositeKey = `${userId.toLowerCase()}:${operation}:${idempotencyKey}`;
        const existing = idempotencyTable.get(compositeKey);
        if (!existing || Date.parse(existing.expires_at) <= Date.parse(nowIso)) {
          const row = {
            request_hash: requestHash,
            status: 'pending',
            response_status: null,
            response_body: null,
            expires_at: expiresIso,
          };
          idempotencyTable.set(compositeKey, row);
          return [{ ...row, inserted_or_reset: true }];
        }
        return [{ ...existing, inserted_or_reset: false }];
      }

      if (query.includes('UPDATE api_idempotency_keys')) {
        const [responseStatus, serializedBody, userId, operation, idempotencyKey, requestHash] = values;
        const compositeKey = `${userId.toLowerCase()}:${operation}:${idempotencyKey}`;
        const existing = idempotencyTable.get(compositeKey);
        if (existing && existing.status === 'pending' && existing.request_hash === requestHash) {
          existing.status = 'completed';
          existing.response_status = responseStatus;
          existing.response_body = JSON.parse(serializedBody);
          return [{ idempotency_key: idempotencyKey }];
        }
        return [];
      }

      if (query.includes('DELETE FROM api_idempotency_keys')) {
        const [userId, operation, idempotencyKey] = values;
        const compositeKey = `${userId.toLowerCase()}:${operation}:${idempotencyKey}`;
        idempotencyTable.delete(compositeKey);
        return [];
      }
    }

    // 2. Profiles upsert & lookup
    if (query.includes('INSERT INTO profiles')) {
      const [id, displayName, email] = values;
      const key = id.toLowerCase();
      const existing = profilesTable.get(key);
      if (!existing) {
        const created = {
          id: key,
          display_name: displayName,
          email,
          role: 'student',
        };
        profilesTable.set(key, created);
        return [{ ...created }];
      }
      // Existing profile: never overwrite role!
      if (!existing.display_name || existing.display_name.trim() === '') {
        existing.display_name = displayName;
      }
      return [{ ...existing }];
    }

    if (query.includes('FROM profiles')) {
      const id = String(values[0] || '').toLowerCase();
      const row = profilesTable.get(id);
      return row ? [{ ...row }] : [];
    }

    // 3. Referral codes lookup & insert
    if (query.includes('INSERT INTO referral_codes')) {
      const [userId, code] = values;
      const cleanUser = userId.toLowerCase();
      const cleanCode = String(code).toUpperCase();
      if (referralCodesByUser.has(cleanUser) || referralCodesByCode.has(cleanCode)) {
        return [];
      }
      referralCodesByUser.set(cleanUser, cleanCode);
      referralCodesByCode.set(cleanCode, cleanUser);
      return [{ code: cleanCode }];
    }

    if (query.includes('FROM referral_codes') && query.includes('WHERE user_id')) {
      const cleanUser = String(values[0] || '').toLowerCase();
      const code = referralCodesByUser.get(cleanUser);
      return code ? [{ code }] : [];
    }

    if (query.includes('FROM referral_codes') && query.includes('WHERE code')) {
      const cleanCode = String(values[0] || '').toUpperCase();
      const ownerId = referralCodesByCode.get(cleanCode);
      return ownerId ? [{ user_id: ownerId }] : [];
    }

    // 4. Referrals insert
    if (query.includes('INSERT INTO referrals')) {
      const [referrerId, referredUserId] = values;
      const cleanReferred = referredUserId.toLowerCase();
      if (referralsByReferredUser.has(cleanReferred)) {
        return [];
      }
      const created = {
        id: `ref-${referralsByReferredUser.size + 1}`,
        referrer_id: referrerId.toLowerCase(),
        referred_user_id: cleanReferred,
        status: 'pending',
        qualified_at: null,
      };
      referralsByReferredUser.set(cleanReferred, created);
      return [{ id: created.id, status: created.status }];
    }

    if (query.includes('FROM student_preferences')) {
      return [];
    }

    if (query.includes('FROM student_subjects')) {
      return [{ subject_count: 0 }];
    }

    return [];
  };

  return {
    profilesTable,
    referralCodesByUser,
    referralCodesByCode,
    referralsByReferredUser,
    referralRewardsTable,
    entitlementsTable,
    idempotencyTable,
    setMissingIdempotencyTable(v) {
      missingIdempotencyTable = Boolean(v);
    },
    setFailNextCommit(v) {
      failNextCommit = Boolean(v);
    },
    get stats() {
      return { allocatedCount, cleanupCount };
    },
    factory: () => {
      allocatedCount += 1;
      return {
        sql: sqlExecutor,
        db: {},
        isHyperdrive: true,
        async runCommittedTransaction(fn) {
          const snap = cloneMaps();
          try {
            const res = await fn(sqlExecutor);
            if (failNextCommit) {
              failNextCommit = false;
              throw new Error('SIMULATED_COMMIT_ERROR');
            }
            return res;
          } catch (err) {
            restoreMaps(snap);
            throw err;
          }
        },
        async runSerializableTransaction(fn) {
          const snap = cloneMaps();
          try {
            const res = await fn(sqlExecutor);
            if (failNextCommit) {
              failNextCommit = false;
              throw new Error('SIMULATED_COMMIT_ERROR');
            }
            return res;
          } catch (err) {
            restoreMaps(snap);
            throw err;
          }
        },
        async cleanup() {
          cleanupCount += 1;
        },
      };
    },
  };
}

test('T04.1 Route Allowlist: default candidate Worker exposes ONLY reviewed T04 endpoints and quarantines all unreviewed product/payment/exam/admin routes', async () => {
  for (const routeId of ['auth.bootstrap','auth.session.get','onboarding.get','onboarding.put']) assert.ok(ENABLED_PRODUCTION_ROUTE_IDS.has(routeId));
  assert.ok(!ENABLED_PRODUCTION_ROUTE_IDS.has('practice.questions.get'), 'Legacy unmetered question endpoint must remain quarantined');

  const worker = createDefaultNativeApiHandler({
    dbFactory: () => {
      throw new Error('Quarantined route must not allocate DB');
    },
  });

  // Verify every route not in ENABLED_PRODUCTION_ROUTE_IDS returns 503 ENDPOINT_NOT_READY
  const quarantinedRoutes = NATIVE_API_ROUTES.filter(
    (r) => !ENABLED_PRODUCTION_ROUTE_IDS.has(r.id)
  );
  assert.ok(quarantinedRoutes.some(route=>route.id === "practice.questions.get"));

  for (const route of quarantinedRoutes) {
    const concretePath = route.pattern.replace(':attemptId', STUDENT_USER_ID);
    const res = await worker.fetch(
      new Request(`https://jambprep.lecterniq.com${concretePath}`, {
        method: route.method,
      }),
      { SUPABASE_URL: TEST_SUPABASE_URL },
      { waitUntil() {} }
    );
    assert.equal(
      res.status,
      503,
      `Expected route ${route.id} (${route.method} ${route.pattern}) to be quarantined with 503`
    );
    assert.equal(res.headers.get('cache-control'), 'no-store');
    const body = await res.json();
    assert.equal(body.error.code, 'ENDPOINT_NOT_READY');
  }

  // Verify enabled T04 routes pass the allowlist gate (reaching 200 for health or 401 for auth routes without token)
  const healthRes = await worker.fetch(
    new Request('https://jambprep.lecterniq.com/api/v1/health'),
    { SUPABASE_URL: TEST_SUPABASE_URL },
    { waitUntil() {} }
  );
  assert.equal(healthRes.status, 200);

  for (const [method, path] of [
    ['POST', '/api/v1/auth/bootstrap'],
    ['GET', '/api/v1/auth/session'],
    ['GET', '/api/v1/auth/admin-session'],
  ]) {
    const res = await worker.fetch(
      new Request(`https://jambprep.lecterniq.com${path}`, { method }),
      { SUPABASE_URL: TEST_SUPABASE_URL },
      { waitUntil() {} }
    );
    assert.equal(res.status, 401);
    assert.equal((await res.json()).error.code, 'MISSING_BEARER_TOKEN');
  }
});

test('T04.2 Safe Account Provisioning, Replay, Collision Recovery & Pending-Only Referral Attribution on Default Worker', async () => {
  resetJwksCache();
  const { privateKey, jwks } = await generateTestEs256KeyPair();
  const simDb = createSimulatedT04Database();

  // Seed referrer account and a colliding referral code ('AMIN1111') owned by COLLIDING_USER_ID
  simDb.referralCodesByUser.set(OTHER_USER_ID, 'TOBI9999');
  simDb.referralCodesByCode.set('TOBI9999', OTHER_USER_ID);
  simDb.referralCodesByUser.set(COLLIDING_USER_ID, 'AMIN1111');
  simDb.referralCodesByCode.set('AMIN1111', COLLIDING_USER_ID);

  // Notice: using createDefaultNativeApiHandler WITHOUT allowUnreviewedProductRoutes
  const worker = createDefaultNativeApiHandler({
    dbFactory: simDb.factory,
    hooks: {
      nowSec: NOW_SEC,
      now: () => NOW_DATE,
      customJwks: jwks,
      liveSessionVerifier: async () => true,
    },
  });
  const env = { SUPABASE_URL: TEST_SUPABASE_URL };

  const studentToken = await signEs256Jwt(privateKey, {
    sub: STUDENT_USER_ID,
    email: 'amina@example.com',
    exp: NOW_SEC + 3600,
    iss: TEST_ISSUER,
    aud: 'authenticated',
  });

  const idemKey = await computeBootstrapIdempotencyKey(
    STUDENT_USER_ID,
    'Amina Bello',
    'TOBI9999'
  );

  // 1. First bootstrap call: resolves 'AMIN1111' collision -> 'AMIN111111', sets role='student', records 'pending' referral
  const firstRes = await worker.fetch(
    new Request('https://jambprep.lecterniq.com/api/v1/auth/bootstrap', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${studentToken}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': idemKey,
      },
      body: JSON.stringify({
        displayName: 'Amina Bello',
        referralCode: 'tobi9999',
      }),
    }),
    env,
    { waitUntil() {} }
  );

  assert.equal(firstRes.status, 200);
  assert.equal(firstRes.headers.get('idempotent-replayed'), null);
  const firstBody = await firstRes.json();
  assert.equal(firstBody.provisioned, true);
  assert.equal(firstBody.userId, STUDENT_USER_ID);
  assert.equal(firstBody.role, 'student');
  assert.equal(firstBody.referralCode, 'AMIN111111'); // Collision-resolved code!
  assert.equal(firstBody.referralAttribution, 'pending');

  // Verify database state: referral is strictly 'pending' with qualified_at = null, and zero signup rewards!
  const referralRow = simDb.referralsByReferredUser.get(STUDENT_USER_ID);
  assert.ok(referralRow);
  assert.equal(referralRow.referrer_id, OTHER_USER_ID);
  assert.equal(referralRow.status, 'pending');
  assert.equal(referralRow.qualified_at, null);
  assert.equal(simDb.referralRewardsTable.length, 0);
  assert.equal(simDb.entitlementsTable.length, 0);

  // 2. Idempotent replay with same Idempotency-Key returns cached 200 with Idempotent-Replayed: true
  const replayRes = await worker.fetch(
    new Request('https://jambprep.lecterniq.com/api/v1/auth/bootstrap', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${studentToken}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': idemKey,
      },
      body: JSON.stringify({
        displayName: 'Amina Bello',
        referralCode: 'tobi9999',
      }),
    }),
    env,
    { waitUntil() {} }
  );
  assert.equal(replayRes.status, 200);
  assert.equal(replayRes.headers.get('idempotent-replayed'), 'true');
  assert.deepEqual(await replayRes.json(), firstBody);
  assert.equal(simDb.profilesTable.size, 1);

  // 3. Self-referral attempt on another user is ignored and never creates a referral row
  const otherToken = await signEs256Jwt(privateKey, {
    sub: OTHER_USER_ID,
    email: 'tobi@example.com',
    exp: NOW_SEC + 3600,
    iss: TEST_ISSUER,
    aud: 'authenticated',
  });
  const selfRefRes = await worker.fetch(
    new Request('https://jambprep.lecterniq.com/api/v1/auth/bootstrap', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${otherToken}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': 'bootstrap-self-ref-test-01',
      },
      body: JSON.stringify({
        displayName: 'Tobi Self',
        referralCode: 'TOBI9999',
      }),
    }),
    env,
    { waitUntil() {} }
  );
  assert.equal(selfRefRes.status, 200);
  const selfRefBody = await selfRefRes.json();
  assert.equal(selfRefBody.referralAttribution, 'self_referral_ignored');
  assert.equal(simDb.referralsByReferredUser.has(OTHER_USER_ID), false);
});

test('T04.3 Fail-Closed Idempotency Prerequisite & Commit Failure Rollback: missing api_idempotency_keys returns 503 without partial writes', async () => {
  resetJwksCache();
  const { privateKey, jwks } = await generateTestEs256KeyPair();
  const simDb = createSimulatedT04Database({ missingIdempotencyTable: true });

  const worker = createDefaultNativeApiHandler({
    dbFactory: simDb.factory,
    hooks: {
      nowSec: NOW_SEC,
      now: () => NOW_DATE,
      customJwks: jwks,
      liveSessionVerifier: async () => true,
    },
  });
  const env = { SUPABASE_URL: TEST_SUPABASE_URL };

  const token = await signEs256Jwt(privateKey, {
    sub: STUDENT_USER_ID,
    email: 'amina@example.com',
    exp: NOW_SEC + 3600,
    iss: TEST_ISSUER,
    aud: 'authenticated',
  });

  // 1. Missing api_idempotency_keys table -> 503 SERVICE_UNAVAILABLE, zero profile rows written, SQL redacted
  const missingTableRes = await worker.fetch(
    new Request('https://jambprep.lecterniq.com/api/v1/auth/bootstrap', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': 'bootstrap-missing-table-01',
      },
      body: JSON.stringify({ displayName: 'Amina Bello' }),
    }),
    env,
    { waitUntil() {} }
  );
  assert.equal(missingTableRes.status, 503);
  const missingBodyText = await missingTableRes.text();
  assert.equal(missingBodyText.includes('api_idempotency_keys'), false);
  assert.equal(JSON.parse(missingBodyText).error.code, 'SERVICE_UNAVAILABLE');
  assert.equal(simDb.profilesTable.size, 0);

  // 2. Enable table, but simulate transaction commit failure -> 500, rolled back, never acknowledged
  simDb.setMissingIdempotencyTable(false);
  simDb.setFailNextCommit(true);

  const commitFailRes = await worker.fetch(
    new Request('https://jambprep.lecterniq.com/api/v1/auth/bootstrap', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': 'bootstrap-commit-fail-01',
      },
      body: JSON.stringify({ displayName: 'Amina Bello' }),
    }),
    env,
    { waitUntil() {} }
  );
  assert.equal(commitFailRes.status, 500);
  assert.equal(simDb.profilesTable.size, 0);
  assert.equal(simDb.idempotencyTable.size, 0);

  // 3. Retry with the SAME Idempotency-Key after failed commit succeeds cleanly!
  const retrySuccessRes = await worker.fetch(
    new Request('https://jambprep.lecterniq.com/api/v1/auth/bootstrap', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': 'bootstrap-commit-fail-01',
      },
      body: JSON.stringify({ displayName: 'Amina Bello' }),
    }),
    env,
    { waitUntil() {} }
  );
  assert.equal(retrySuccessRes.status, 200);
  assert.equal((await retrySuccessRes.json()).provisioned, true);
  assert.equal(simDb.profilesTable.size, 1);
});

test('T04.4 Metadata Role Escalation, Existing Admin Preservation & Foreign Actor Owner Authorization', async () => {
  resetJwksCache();
  const { privateKey, jwks } = await generateTestEs256KeyPair();
  const simDb = createSimulatedT04Database();

  const worker = createDefaultNativeApiHandler({
    dbFactory: simDb.factory,
    hooks: {
      nowSec: NOW_SEC,
      now: () => NOW_DATE,
      customJwks: jwks,
      liveSessionVerifier: async () => true,
    },
  });
  const env = { SUPABASE_URL: TEST_SUPABASE_URL };

  // Craft a JWT with forged role='admin' and forged metadata claims
  const escalatedStudentToken = await signEs256Jwt(privateKey, {
    sub: STUDENT_USER_ID,
    email: 'escalator@example.com',
    exp: NOW_SEC + 3600,
    iss: TEST_ISSUER,
    aud: 'authenticated',
    role: 'admin',
    user_metadata: {
      role: 'admin',
      is_admin: true,
      is_premium: true,
      referral_status: 'qualified',
    },
    app_metadata: {
      role: 'admin',
      provider: 'email',
    },
  });

  // 1. Bootstrap with forged JWT metadata AND forged body fields -> still provisions role='student'
  const bootstrapRes = await worker.fetch(
    new Request('https://jambprep.lecterniq.com/api/v1/auth/bootstrap', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${escalatedStudentToken}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': 'bootstrap-escalate-attempt-01',
      },
      body: JSON.stringify({
        displayName: 'Student Escalator',
        role: 'admin',
        isPremium: true,
        status: 'qualified',
      }),
    }),
    env,
    { waitUntil() {} }
  );
  assert.equal(bootstrapRes.status, 200);
  const bootstrapJson = await bootstrapRes.json();
  assert.equal(bootstrapJson.role, 'student');
  assert.equal(simDb.profilesTable.get(STUDENT_USER_ID).role, 'student');

  // 2. GET /api/v1/auth/session returns authoritative DB role ('student'), ignoring JWT metadata
  const sessionRes = await worker.fetch(
    new Request(`https://jambprep.lecterniq.com/api/v1/auth/session?userId=${STUDENT_USER_ID}`, {
      headers: { Authorization: `Bearer ${escalatedStudentToken}` },
    }),
    env,
    { waitUntil() {} }
  );
  assert.equal(sessionRes.status, 200);
  const sessionJson = await sessionRes.json();
  assert.equal(sessionJson.authenticated, true);
  assert.equal(sessionJson.provisioned, true);
  assert.equal(sessionJson.user.role, 'student');

  // 3. Foreign actor check: requesting ?userId=OTHER_USER_ID with STUDENT_USER_ID token -> 403 FORBIDDEN_NOT_OWNER
  const foreignRes = await worker.fetch(
    new Request(`https://jambprep.lecterniq.com/api/v1/auth/session?userId=${OTHER_USER_ID}`, {
      headers: { Authorization: `Bearer ${escalatedStudentToken}` },
    }),
    env,
    { waitUntil() {} }
  );
  assert.equal(foreignRes.status, 403);
  assert.equal((await foreignRes.json()).error.code, 'FORBIDDEN_NOT_OWNER');

  // 4. GET /api/v1/auth/admin-session rejects escalated student token with 403 FORBIDDEN_ADMIN_REQUIRED
  const adminDeniedRes = await worker.fetch(
    new Request('https://jambprep.lecterniq.com/api/v1/auth/admin-session', {
      headers: { Authorization: `Bearer ${escalatedStudentToken}` },
    }),
    env,
    { waitUntil() {} }
  );
  assert.equal(adminDeniedRes.status, 403);
  assert.equal((await adminDeniedRes.json()).error.code, 'FORBIDDEN_ADMIN_REQUIRED');

  // 5. Seed an authoritative admin in DB; verify bootstrap does NOT downgrade admin to student, and admin-session succeeds
  simDb.profilesTable.set(ADMIN_USER_ID, {
    id: ADMIN_USER_ID,
    display_name: 'Platform Admin',
    email: 'admin@lecterniq.com',
    role: 'admin',
  });
  const adminToken = await signEs256Jwt(privateKey, {
    sub: ADMIN_USER_ID,
    email: 'admin@lecterniq.com',
    exp: NOW_SEC + 3600,
    iss: TEST_ISSUER,
    aud: 'authenticated',
  });

  const adminBootstrapRes = await worker.fetch(
    new Request('https://jambprep.lecterniq.com/api/v1/auth/bootstrap', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': 'bootstrap-admin-preserve-01',
      },
      body: JSON.stringify({ displayName: 'Platform Admin' }),
    }),
    env,
    { waitUntil() {} }
  );
  assert.equal(adminBootstrapRes.status, 200);
  assert.equal((await adminBootstrapRes.json()).role, 'admin');
  assert.equal(simDb.profilesTable.get(ADMIN_USER_ID).role, 'admin');

  const adminAllowedRes = await worker.fetch(
    new Request('https://jambprep.lecterniq.com/api/v1/auth/admin-session', {
      headers: { Authorization: `Bearer ${adminToken}` },
    }),
    env,
    { waitUntil() {} }
  );
  assert.equal(adminAllowedRes.status, 200);
  const adminAllowedJson = await adminAllowedRes.json();
  assert.equal(adminAllowedJson.authorized, true);
  assert.equal(adminAllowedJson.user.role, 'admin');
});

test('T04.5 Browser Session Manager & Native Bearer Client: coalesced init/refresh, 401 single retry, revocation, logout & account-switch state clearing', async () => {
  resetJwksCache();
  const { privateKey, jwks } = await generateTestEs256KeyPair();
  const simDb = createSimulatedT04Database();

  let isLiveSessionValid = true;
  const worker = createDefaultNativeApiHandler({
    dbFactory: simDb.factory,
    hooks: {
      nowSec: NOW_SEC,
      now: () => NOW_DATE,
      customJwks: jwks,
      liveSessionVerifier: async () => isLiveSessionValid,
    },
  });
  const env = { SUPABASE_URL: TEST_SUPABASE_URL };

  const expiredToken = await signEs256Jwt(privateKey, {
    sub: STUDENT_USER_ID,
    email: 'amina@example.com',
    exp: NOW_SEC - 10, // Already expired!
    iss: TEST_ISSUER,
    aud: 'authenticated',
    user_metadata: { role: 'admin', display_name: 'Amina Bello' },
  });

  const freshToken = await signEs256Jwt(privateKey, {
    sub: STUDENT_USER_ID,
    email: 'amina@example.com',
    exp: NOW_SEC + 3600,
    iss: TEST_ISSUER,
    aud: 'authenticated',
    user_metadata: { role: 'admin', display_name: 'Amina Bello' },
  });

  const secondUserToken = await signEs256Jwt(privateKey, {
    sub: OTHER_USER_ID,
    email: 'tobi@example.com',
    exp: NOW_SEC + 3600,
    iss: TEST_ISSUER,
    aud: 'authenticated',
    user_metadata: { display_name: 'Tobi Adeyemi' },
  });

  // Seed simulated browser storage with Student A's private exam outboxes and caches
  const localStorageSim = createSimulatedStorage({
    [ACTIVE_USER_STORAGE_KEY]: STUDENT_USER_ID,
    [`jamb_outbox_${STUDENT_USER_ID}`]: JSON.stringify([{ questionId: 'q1', optionId: 'o1' }]),
    [`jamb_cbt_${STUDENT_USER_ID}`]: JSON.stringify({ answers: { q1: 'o1' } }),
    [`jamb_exam_${STUDENT_USER_ID}`]: JSON.stringify({ answers: { q1: 'o1' } }),
    jambprep_cache_dashboard: JSON.stringify({ score: 290 }),
    unrelated_theme_preference: 'light',
  });
  const sessionStorageSim = createSimulatedStorage({
    [`mock-interruption:${STUDENT_USER_ID}`]: 'episode-123',
  });

  let inMemoryCacheClearedCount = 0;
  const unregisterCache = registerPrivateCacheClearer(() => {
    inMemoryCacheClearedCount += 1;
  });

  try {
    assert.equal(
      getPendingExamOutboxCount({ localStorage: localStorageSim, sessionStorage: sessionStorageSim }),
      1
    );

    let getSessionCalls = 0;
    let refreshSessionCalls = 0;
    let onAuthStateChangeSubscriptions = 0;
    let signOutCalls = 0;

    // Initial session has a future expires_at in browser storage, but server rejects `expiredToken` with 401
    // so we test the 401 -> single refreshSession() -> single retry flow!
    let currentBrowserSession = {
      access_token: expiredToken,
      expires_at: NOW_SEC + 3600,
      user: {
        id: STUDENT_USER_ID,
        email: 'amina@example.com',
        user_metadata: { role: 'admin', display_name: 'Amina Bello' },
      },
    };

    const simulatedAuthAdapter = {
      async getSession() {
        getSessionCalls += 1;
        await new Promise((r) => setTimeout(r, 5));
        return { data: { session: currentBrowserSession }, error: null };
      },
      async refreshSession() {
        refreshSessionCalls += 1;
        await new Promise((r) => setTimeout(r, 5));
        if (!currentBrowserSession) {
          return { data: { session: null }, error: { message: 'Refresh token invalid' } };
        }
        currentBrowserSession = {
          ...currentBrowserSession,
          access_token: freshToken,
          expires_at: NOW_SEC + 3600,
        };
        return { data: { session: currentBrowserSession }, error: null };
      },
      async signInWithPassword({ email }) {
        if (email === 'tobi@example.com') {
          currentBrowserSession = {
            access_token: secondUserToken,
            expires_at: NOW_SEC + 3600,
            user: {
              id: OTHER_USER_ID,
              email: 'tobi@example.com',
              user_metadata: { display_name: 'Tobi Adeyemi' },
            },
          };
        }
        return {
          data: { session: currentBrowserSession, user: currentBrowserSession?.user ?? null },
          error: null,
        };
      },
      async signUp({ email, options }) {
        return {
          data: {
            session: currentBrowserSession,
            user: currentBrowserSession?.user ?? { id: STUDENT_USER_ID, email, user_metadata: options?.data },
          },
          error: null,
        };
      },
      async signOut() {
        signOutCalls += 1;
        currentBrowserSession = null;
        return { error: null };
      },
      onAuthStateChange() {
        onAuthStateChangeSubscriptions += 1;
        return { data: { subscription: { unsubscribe() {} } } };
      },
    };

    const clearedEvents = [];
    const sessionManager = createBrowserSessionManager({
      authAdapter: simulatedAuthAdapter,
      storageEnv: { localStorage: localStorageSim, sessionStorage: sessionStorageSim },
      nowSec: () => NOW_SEC,
      onPrivateStateCleared: (ev) => clearedEvents.push(ev),
    });

    // 1. Multiple subscribers and concurrent initialize() calls attach only 1 listener and make only 1 getSession() call
    const unsub1 = sessionManager.subscribe(() => {});
    const unsub2 = sessionManager.subscribe(() => {});
    const [initA, initB, initC] = await Promise.all([
      sessionManager.initialize(),
      sessionManager.initialize(),
      sessionManager.initialize(),
    ]);
    assert.equal(onAuthStateChangeSubscriptions, 1);
    assert.equal(getSessionCalls, 1);
    assert.equal(initA.status, 'authenticated');
    assert.equal(initB.user.id, STUDENT_USER_ID);
    assert.equal(initC.role, null); // Never populated from user_metadata.role = 'admin'!
    unsub1();
    unsub2();

    // 2. Native API client: expiredToken gets 401 from Worker -> coalesces 1 refreshSession() -> retries with same Idempotency-Key -> 200 OK
    const redirectedUrls = [];
    const seenHeaders = [];
    const apiClient = createNativeApiClient({
      baseUrl: 'https://jambprep.lecterniq.com',
      sessionManager,
      getCurrentPath: () => '/mock?mode=diagnostic',
      onUnauthorizedRedirect: (url) => redirectedUrls.push(url),
      fetchImpl: async (input, init) => {
        const req = new Request(input, init);
        seenHeaders.push({
          auth: req.headers.get('authorization'),
          idem: req.headers.get('idempotency-key'),
        });
        return await worker.fetch(req, env, { waitUntil() {} });
      },
    });

    const bootstrapRes = await apiClient.bootstrapAccount({
      displayName: 'Amina Bello',
    });
    assert.equal(bootstrapRes.provisioned, true);
    assert.equal(bootstrapRes.role, 'student');
    assert.equal(refreshSessionCalls, 1); // Refreshed once after initial 401
    assert.equal(seenHeaders.length, 2); // Initial 401 + 1 retry
    assert.equal(seenHeaders[0].idem, seenHeaders[1].idem); // Exact same Idempotency-Key preserved across retry!
    assert.equal(sessionManager.getState().role, 'student');
    assert.equal(sessionManager.getState().provisioned, true);

    // 3. Account switch (Student A -> Student B via signInWithPassword) purges Student A's outboxes, snapshots, and caches!
    await sessionManager.signInWithPassword({
      email: 'tobi@example.com',
      password: 'password123',
    });
    assert.equal(sessionManager.getState().user.id, OTHER_USER_ID);
    assert.equal(clearedEvents.length, 1);
    assert.equal(clearedEvents[0].reason, 'account_switch');
    assert.equal(clearedEvents[0].previousUserId, STUDENT_USER_ID);
    assert.equal(clearedEvents[0].nextUserId, OTHER_USER_ID);
    assert.equal(localStorageSim.getItem(`jamb_outbox_${STUDENT_USER_ID}`), null);
    assert.equal(localStorageSim.getItem(`jamb_cbt_${STUDENT_USER_ID}`), null);
    assert.equal(localStorageSim.getItem(`jamb_exam_${STUDENT_USER_ID}`), null);
    assert.equal(localStorageSim.getItem('jambprep_cache_dashboard'), null);
    assert.equal(sessionStorageSim.getItem(`mock-interruption:${STUDENT_USER_ID}`), null);
    assert.equal(localStorageSim.getItem(ACTIVE_USER_STORAGE_KEY), OTHER_USER_ID);
    // Unrelated non-private storage key is preserved
    assert.equal(localStorageSim.getItem('unrelated_theme_preference'), 'light');
    assert.ok(inMemoryCacheClearedCount >= 1);

    // 4. Live session revocation (401 SESSION_REVOKED) immediately clears private state without retrying refresh and redirects to safe login URL
    localStorageSim.setItem(`jamb_outbox_${OTHER_USER_ID}`, JSON.stringify([{ questionId: 'q2', optionId: 'o2' }]));
    isLiveSessionValid = false;
    const refreshBeforeRevoke = refreshSessionCalls;

    await assert.rejects(
      () => apiClient.getSessionIdentity(),
      (err) => err instanceof NativeApiClientError && err.status === 401 && err.code === 'SESSION_REVOKED'
    );
    assert.equal(refreshSessionCalls, refreshBeforeRevoke); // Zero refresh attempts on SESSION_REVOKED!
    assert.equal(sessionManager.getState().status, 'unauthenticated');
    assert.equal(localStorageSim.getItem(`jamb_outbox_${OTHER_USER_ID}`), null);
    assert.equal(localStorageSim.getItem(ACTIVE_USER_STORAGE_KEY), null);
    assert.equal(signOutCalls, 1);
    assert.deepEqual(redirectedUrls, ['/login?redirectTo=%2Fmock%3Fmode%3Ddiagnostic']);
  } finally {
    unregisterCache();
  }
});

test('T04.6 Recoverable Signup Provisioning in BrowserSessionManager: retries after partial failure with same deterministic Idempotency-Key', async () => {
  const localStorageSim = createSimulatedStorage();
  const sessionStorageSim = createSimulatedStorage();

  let currentSession = null;
  let signUpCount = 0;
  let signInCount = 0;

  const authAdapter = {
    async getSession() {
      return { data: { session: currentSession }, error: null };
    },
    async refreshSession() {
      return { data: { session: currentSession }, error: null };
    },
    async signUp({ email, options }) {
      signUpCount += 1;
      if (signUpCount > 1) {
        return {
          data: { session: null, user: null },
          error: { message: 'User already registered' },
        };
      }
      currentSession = {
        access_token: 'sim-access-token-1',
        expires_at: NOW_SEC + 3600,
        user: {
          id: STUDENT_USER_ID,
          email,
          user_metadata: options?.data,
        },
      };
      return {
        data: { session: currentSession, user: currentSession.user },
        error: null,
      };
    },
    async signInWithPassword() {
      signInCount += 1;
      return {
        data: { session: currentSession, user: currentSession?.user ?? null },
        error: null,
      };
    },
    async signOut() {
      currentSession = null;
      return { error: null };
    },
  };

  let provisionAttempts = 0;
  const observedIdempotencyKeys = [];

  const sessionManager = createBrowserSessionManager({
    authAdapter,
    storageEnv: { localStorage: localStorageSim, sessionStorage: sessionStorageSim },
    nowSec: () => NOW_SEC,
    provisioningExecutor: async ({ displayName, referralCode, idempotencyKey }) => {
      provisionAttempts += 1;
      observedIdempotencyKeys.push(idempotencyKey);
      if (provisionAttempts === 1) {
        throw new Error('Simulated transient network failure during bootstrap');
      }
      return {
        provisioned: true,
        userId: STUDENT_USER_ID,
        displayName,
        role: 'student',
        referralCode: 'AMIN1111',
        referralAttribution: referralCode ? 'pending' : 'none',
      };
    },
  });

  // Attempt 1: Auth user is created, but provisioningExecutor fails transiently
  const firstAttempt = await sessionManager.signUpAndProvision({
    displayName: 'Amina Bello',
    email: 'amina@example.com',
    password: 'password123',
    referralCode: 'TOBI9999',
  });
  assert.equal(firstAttempt.authCreated, true);
  assert.equal(firstAttempt.provisioned, false);
  assert.match(firstAttempt.error, /Simulated transient network failure/);

  // Attempt 2: User clicks "Create account" again; manager reuses active session & deterministic Idempotency-Key and completes provisioning!
  const secondAttempt = await sessionManager.signUpAndProvision({
    displayName: 'Amina Bello',
    email: 'amina@example.com',
    password: 'password123',
    referralCode: 'TOBI9999',
  });
  assert.equal(secondAttempt.authCreated, true);
  assert.equal(secondAttempt.provisioned, true);
  assert.equal(secondAttempt.error, null);
  assert.equal(secondAttempt.provisioningResult.referralCode, 'AMIN1111');
  assert.equal(observedIdempotencyKeys.length, 2);
  assert.equal(observedIdempotencyKeys[0], observedIdempotencyKeys[1]);
  assert.equal(signInCount, 0); // Reused active session without unnecessary auth waterfalls
});

test('T04.7 Open-Redirect Rejection & Browser Supabase Database Lockdown', () => {
  // 1. Unsafe external, protocol-relative, backslash, scheme, control-char, and loop redirects -> '/dashboard'
  const unsafeTargets = [
    '',
    '   ',
    null,
    undefined,
    'https://evil.com',
    'http://evil.com/dashboard',
    '//evil.com',
    '///evil.com/path',
    '/\\evil.com',
    '\\\\evil.com',
    '/%2fevil.com',
    '/%5cevil.com',
    'javascript:alert(1)',
    '/javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    '/dashboard\nSet-Cookie:malicious=1',
    '/dashboard\r\t/evil',
    '/login',
    '/login?redirectTo=/practice',
    '/register',
    '/register?ref=TOBI',
    '/signup',
    `/${'a'.repeat(600)}`,
  ];

  for (const target of unsafeTargets) {
    assert.equal(
      sanitizeInternalRedirect(target),
      '/dashboard',
      `Expected unsafe redirect target ${JSON.stringify(target)} to sanitize to /dashboard`
    );
  }

  // 2. Safe internal destinations preserve path, query string, and hash
  assert.equal(sanitizeInternalRedirect('/practice?subject=ENG'), '/practice?subject=ENG');
  assert.equal(
    sanitizeInternalRedirect('/exam?attemptId=64ca2cc3-36f9-4990-a0e0-54a3b4713b19'),
    '/exam?attemptId=64ca2cc3-36f9-4990-a0e0-54a3b4713b19'
  );
  assert.equal(
    sanitizeInternalRedirect('/checkout/verify?reference=JAMB_SUB_01'),
    '/checkout/verify?reference=JAMB_SUB_01'
  );
  assert.equal(sanitizeInternalRedirect('/profile#subscription'), '/profile#subscription');
  assert.equal(buildLoginRedirectUrl('https://evil.com'), '/login');
  assert.equal(
    buildLoginRedirectUrl('/result?attemptId=123'),
    '/login?redirectTo=%2Fresult%3FattemptId%3D123'
  );

  // 3. Browser Supabase client strictly locks down .from() and .rpc() table access
  const browserSupabase = createBrowserSupabaseClient();
  assert.throws(() => browserSupabase.from('questions'), /BROWSER_TABLE_ACCESS_LOCKED/);
  assert.throws(() => browserSupabase.rpc('score_attempt'), /BROWSER_TABLE_ACCESS_LOCKED/);
});


function localDeferred() {
  let resolve;
  const promise = new Promise((r) => { resolve = r; });
  return { promise, resolve };
}

function localRaceAuth(session, deferredRefresh) {
  let callback;
  return {
    getSession: async () => ({ data: { session }, error: null }),
    refreshSession: () => deferredRefresh.promise,
    signOut: async () => ({ error: null }),
    onAuthStateChange: (cb) => { callback = cb; return { data: { subscription: { unsubscribe() {} } } }; },
    emit: (value) => callback('SIGNED_IN', value),
  };
}

const raceSession = (id) => ({ access_token: `local-${id}`, expires_at: NOW_SEC + 3600, user: { id } });

test('review: an old refresh cannot resurrect logout or replace a switched account', async () => {
  for (const switchAccount of [false, true]) {
    const deferred = localDeferred();
    const auth = localRaceAuth(raceSession(STUDENT_USER_ID), deferred);
    const manager = createBrowserSessionManager({ authAdapter: auth, nowSec: () => NOW_SEC, storageEnv: { localStorage: null, sessionStorage: null } });
    await manager.initialize();
    const refreshing = manager.refreshAccessToken();
    if (switchAccount) auth.emit(raceSession(OTHER_USER_ID));
    else await manager.signOut();
    deferred.resolve({ data: { session: raceSession(STUDENT_USER_ID) }, error: null });
    assert.equal(await refreshing, null);
    assert.equal(manager.getState().user?.id ?? null, switchAccount ? OTHER_USER_ID : null);
    manager.destroy();
  }
});

test('review: stale API failures do not refresh or log out the new account', async () => {
  const deferred = localDeferred();
  const auth = localRaceAuth(raceSession(STUDENT_USER_ID), localDeferred());
  const manager = createBrowserSessionManager({ authAdapter: auth, nowSec: () => NOW_SEC, storageEnv: { localStorage: null, sessionStorage: null } });
  await manager.initialize();
  const client = createNativeApiClient({ baseUrl: '', sessionManager: manager, fetchImpl: async (_, init) => { assert.equal(init.headers['Cache-Control'], undefined); return deferred.promise; } });
  const pending = client.request('/api/v1/auth/session');
  await new Promise((r) => setTimeout(r, 0));
  auth.emit(raceSession(OTHER_USER_ID));
  deferred.resolve(new Response(JSON.stringify({ error: { code: 'SESSION_REVOKED' } }), { status: 401 }));
  await assert.rejects(pending, (err) => err.code === 'SESSION_CHANGED');
  assert.equal(manager.getState().user.id, OTHER_USER_ID);
  manager.destroy();
});

test('review: API deadline bounds stalled response bodies and rejects external API paths', async () => {
  const client = createNativeApiClient({ baseUrl: '', requestTimeoutMs: 10, fetchImpl: async () => new Response(new ReadableStream({ pull() { return new Promise(() => {}); } })) });
  await assert.rejects(client.request('/api/v1/health', { auth: false }), (err) => err.code === 'REQUEST_TIMEOUT');
  await assert.rejects(client.request('//external.example/api/v1/health', { auth: false }), (err) => err.code === 'INVALID_API_PATH');
});

test('review: empty SQL results cannot masquerade as successful provisioning', async () => {
  const { provisionStudentAccountAtomic } = await import('../worker/services/auth-provisioning-service.ts');
  await assert.rejects(provisionStudentAccountAtomic(async () => [], { userId: STUDENT_USER_ID, email: 'test@example.com', displayName: 'Test' }), (err) => err.status === 503);
  await assert.rejects(provisionStudentAccountAtomic(async (parts) => parts.join('').includes('INSERT INTO profiles') ? [{ id: STUDENT_USER_ID, display_name: 'Test', email: 'test@example.com', role: 'student' }] : [], { userId: STUDENT_USER_ID, email: 'test@example.com', displayName: 'Test' }), (err) => err.status === 503);
});


test('review: stalled session initialization terminates and cold unauthenticated startup purges old private data', async () => {
  const stalled = createBrowserSessionManager({ authTimeoutMs: 10, authAdapter: { getSession: () => new Promise(() => {}) }, storageEnv: { localStorage: null, sessionStorage: null } });
  assert.equal((await stalled.initialize()).status, 'error');
  stalled.destroy();
  let cleared = 0;
  const manager = createBrowserSessionManager({ authAdapter: { getSession: async () => ({ data: { session: null }, error: null }) }, storageEnv: { localStorage: null, sessionStorage: null }, onPrivateStateCleared: () => { cleared += 1; } });
  assert.equal((await manager.initialize()).status, 'unauthenticated');
  assert.equal(cleared, 1);
  manager.destroy();
});

test('review: legacy private data without an owner marker is purged before binding an account', () => {
  const localStorage = createSimulatedStorage({ jamb_outbox_legacy: '["old-answer"]', public_theme: 'dark' });
  const result = syncBrowserUserStorage(STUDENT_USER_ID, { localStorage, sessionStorage: null });
  assert.ok(result.cleared);
  assert.equal(localStorage.getItem('jamb_outbox_legacy'), null);
  assert.equal(localStorage.getItem(ACTIVE_USER_STORAGE_KEY), STUDENT_USER_ID);
  assert.equal(localStorage.getItem('public_theme'), 'dark');
});
