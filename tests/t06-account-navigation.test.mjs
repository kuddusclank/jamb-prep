import {readySubjectRows} from './helpers/mock-ready-fixture.mjs';
/** T06 local injected adapters only: no Supabase, provider, or remote database traffic. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createAccountCoordinator, accountDestination } from '../src/lib/auth/account-coordinator.ts';
import { createBrowserSessionManager } from '../src/lib/auth/session-manager.ts';
import { createNativeApiClient } from '../src/lib/api/native-client.ts';
import { saveStudentOnboardingAtomic } from '../worker/services/onboarding-service.ts';
import { getAuthenticatedSessionIdentity } from '../worker/services/auth-provisioning-service.ts';

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const session = (id = A) => ({ access_token: `local-${id}`, expires_at: 9999999999, user: { id, email: `${id}@example.test`, user_metadata: { role: 'admin' } } });
const identity = (id = A, overrides = {}) => ({ authenticated: true, provisioned: true, onboardingCompleted: true, user: { id, email: null, displayName: null, role: 'student' }, referralCode: 'EXISTINGCODE', ...overrides });
function deferred() { let resolve; const promise = new Promise((r) => { resolve = r; }); return { promise, resolve }; }
async function managerFixture(options = {}) {
  let callback;
  let current = session();
  const manager = createBrowserSessionManager({ authAdapter: {
    getSession: async () => ({ data: { session: current }, error: null }),
    refreshSession: options.refresh ?? (async () => ({ data: { session: current }, error: null })),
    signOut: async () => ({ error: null }),
    signInWithPassword: options.signIn ?? (async () => ({ data: { session: current, user: current.user }, error: null })),
    signUp: async () => ({ data: { session: current, user: current.user }, error: null }),
    onAuthStateChange(fn) { callback = fn; return { data: { subscription: { unsubscribe() {} } } }; },
  }, nowSec: () => 1000 });
  await manager.initialize();
  if (options.expired) { current = { ...session(), expires_at: 1001 }; callback('TOKEN_REFRESHED', current); }
  return { manager, switch(id) { current = id ? session(id) : null; callback(id ? 'SIGNED_IN' : 'SIGNED_OUT', current); } };
}
const catalog = ['Use of English', 'Mathematics', 'Physics', 'Chemistry'].map((name, index) => ({ id: `33333333-3333-4333-8333-33333333333${index}`, name, code: index ? `E${index}` : 'ENG', is_compulsory: index === 0 }));
const body = { electives: catalog.slice(1).map((s) => s.name), targetScore: 300 };

 test('routing uses server onboarding/provisioning state and rejects external/auth redirect loops', () => {
  assert.equal(accountDestination(identity(A, { provisioned: false }), '/dashboard'), '/register?resume=1');
  assert.equal(accountDestination(identity(A, { provisioned: false }), '/register'), null);
  assert.equal(accountDestination(identity(A, { onboardingCompleted: false }), '/login'), '/onboarding');
  assert.equal(accountDestination(identity(), '/login', 'https://evil.test'), '/dashboard');
  assert.equal(accountDestination(identity(), '/register', '/login'), '/dashboard');
  assert.equal(accountDestination(identity(), '/onboarding', '/onboarding?x=1'), '/dashboard');
  assert.equal(accountDestination(identity(), '/login', '/result?attemptId=x'), '/result?attemptId=x');
});

test('identity reads coalesce, expire and are scoped to the current actor', async () => {
  const fixture = await managerFixture(); let reads = 0; let clock = 0;
  const coordinator = createAccountCoordinator(fixture.manager, { async getSessionIdentity({ expectedUserId }) { reads++; return identity(expectedUserId); } }, () => clock);
  try {
    await Promise.all([coordinator.loadIdentity(), coordinator.loadIdentity()]); assert.equal(reads, 1);
    await coordinator.loadIdentity(); assert.equal(reads, 1);
    clock = 30001; await coordinator.loadIdentity(); assert.equal(reads, 2);
    fixture.switch(B); assert.equal((await coordinator.loadIdentity()).user.id, B); assert.equal(reads, 3);
    fixture.switch(null); await assert.rejects(coordinator.loadIdentity(), /Sign in/);
  } finally { coordinator.destroy(); fixture.manager.destroy(); }
});

test('stale reads cannot repopulate cache after account switch or logout', async () => {
  const fixture = await managerFixture(); const delay = deferred(); let reads = 0;
  const coordinator = createAccountCoordinator(fixture.manager, { getSessionIdentity({ expectedUserId }) { reads++; return reads === 1 ? delay.promise : Promise.resolve(identity(expectedUserId)); } });
  try {
    const old = coordinator.loadIdentity(); fixture.switch(B); delay.resolve(identity(A));
    await assert.rejects(old, /Account changed/);
    assert.equal((await coordinator.loadIdentity()).user.id, B); assert.equal(reads, 2);
  } finally { coordinator.destroy(); fixture.manager.destroy(); }
});

test('onboarding failures retain retry keys; commits invalidate reads and subsequent intents get fresh keys', async () => {
  const fixture = await managerFixture(); const keys = []; let attempts = 0; let reads = 0;
  const coordinator = createAccountCoordinator(fixture.manager, {
    async getSessionIdentity() { reads++; return identity(); },
    async request(path, options) { keys.push(options.idempotencyKey); if (++attempts === 1) throw new Error('Temporarily unavailable'); return { data: { saved: true } }; },
  });
  try {
    await coordinator.loadIdentity();
    await assert.rejects(coordinator.saveOnboarding(body), /unavailable/);
    await coordinator.saveOnboarding(body); assert.equal(keys[0], keys[1]);
    await coordinator.loadIdentity(); assert.equal(reads, 2);
    await coordinator.saveOnboarding(body); assert.notEqual(keys[1], keys[2]);
  } finally { coordinator.destroy(); fixture.manager.destroy(); }
});

test('pending native requests abort on external account switch, without logging out the next account', async () => {
  const fixture = await managerFixture(); const started = deferred();
  const api = createNativeApiClient({ baseUrl: '', sessionManager: fixture.manager, fetchImpl: async (url, options) => {
    started.resolve(); return new Promise((resolve, reject) => options.signal.addEventListener('abort', () => reject(options.signal.reason), { once: true }));
  } });
  try {
    const pending = api.getSessionIdentity(); await started.promise; fixture.switch(B);
    await assert.rejects(pending, (err) => err.code === 'SESSION_CHANGED');
    assert.equal(fixture.manager.getState().user.id, B);
  } finally { fixture.manager.destroy(); }
});

test('provider refresh outages preserve session and permit a subsequent retry', async () => {
  let calls = 0;
  const fixture = await managerFixture({ refresh: async () => ++calls === 1 ? { data: { session: null }, error: { status: 503, message: 'Temporarily unavailable' } } : { data: { session: session() }, error: null } });
  try {
    await assert.rejects(fixture.manager.refreshAccessToken(), /temporarily unavailable/);
    assert.equal(fixture.manager.getState().user.id, A);
    assert.equal(await fixture.manager.refreshAccessToken(), session().access_token);
    assert.equal(fixture.manager.getState().role, null); // Forged metadata never grants authority.
  } finally { fixture.manager.destroy(); }
});

test('late sign-in result cannot restore a logged-out account', async () => {
  const delay = deferred(); const fixture = await managerFixture({ signIn: () => delay.promise });
  try {
    const pending = fixture.manager.signInWithPassword({ email: 'student@example.test', password: 'testing123' });
    await fixture.manager.signOut(); delay.resolve({ data: { session: session(), user: session().user }, error: null });
    assert.match((await pending).error, /Account changed/);
    assert.equal(fixture.manager.getState().status, 'unauthenticated');
  } finally { fixture.manager.destroy(); }
});


function sqlFixture(rows = catalog, failInsert = false) {
  const writes = [];
  const sql = async (strings, ...values) => {
    const query = strings.join('?');
    if (query.includes('FROM profiles')) return [{ id: A }];
    if (query.includes('WITH latest AS')) return readySubjectRows(rows);
    if (query.includes('FROM subjects')) return rows;
    if (query.includes('INSERT INTO student_subjects') && failInsert) throw new Error('Simulated write failure');
    writes.push({ query, values }); return [];
  };
  return { sql, writes };
}

test('onboarding writes one actor, English and three catalog electives, preserving omitted product fields', async () => {
  const fixture = sqlFixture(); const result = await saveStudentOnboardingAtomic(fixture.sql, A, { ...body, userId: B }, new Date('2026-10-11'));
  assert.equal(result.saved, true); assert.deepEqual(result.subjects, catalog.map((s) => s.name));
  assert.equal(fixture.writes.filter(write => /INSERT|DELETE|UPDATE/.test(write.query)).length, 6);
  for (const write of fixture.writes) { assert.equal(write.values.includes(A), true); assert.equal(write.values.includes(B), false); }
  assert.match(fixture.writes[0].query, /CASE WHEN/);
});

test('invalid, unavailable or compulsory elective catalogs fail before any write', async () => {
  for (const rows of [catalog.slice(0, 3), catalog.map((s, i) => i === 2 ? { ...s, is_compulsory: true } : s), catalog.map((s, i) => i === 2 ? { ...s, code: 'ENG' } : s)]) {
    const fixture = sqlFixture(rows); await assert.rejects(saveStudentOnboardingAtomic(fixture.sql, A, body, new Date()), (err) => err.status === 422); assert.equal(fixture.writes.length, 0);
  }
  const fixture = sqlFixture(); await assert.rejects(saveStudentOnboardingAtomic(fixture.sql, A, { ...body, electives: ['Physics', 'Physics', 'Chemistry'] }, new Date()), (err) => err.status === 422); assert.equal(fixture.writes.length, 0);
});

test('onboarding ignores a late save acknowledgement after switching accounts and prevents duplicate submits', async () => {
  const fixture = await managerFixture(); const delay = deferred(); const started = deferred();
  const coordinator = createAccountCoordinator(fixture.manager, { async request() { started.resolve(); return delay.promise; } });
  try {
    const pending = coordinator.saveOnboarding(body); await started.promise;
    await assert.rejects(coordinator.saveOnboarding(body), /current save/);
    fixture.switch(B); delay.resolve({ data: { saved: true } });
    await assert.rejects(pending, /Account changed/);
    assert.equal(fixture.manager.getState().user.id, B);
  } finally { coordinator.destroy(); fixture.manager.destroy(); }
});

test('onboarding completion requires exactly four active subjects with English and three electives', async () => {
  for (const [counts, expected] of [[{ subject_count: 4, active_count: 4, english_count: 1, elective_count: 3 }, true], [{ subject_count: 5, active_count: 4, english_count: 1, elective_count: 3 }, false], [{ subject_count: 4, active_count: 3, english_count: 1, elective_count: 2 }, false], [{ subject_count: 4, active_count: 4, english_count: 0, elective_count: 4 }, false]]) {
    const sql = async (strings) => {
      const query = strings.join('?');
      if (query.includes('FROM profiles')) return [{ id: A, role: 'student', email: 'a@example.test' }];
      if (query.includes('FROM student_preferences')) return [{ target_score: 300 }];
      if (query.includes('FROM student_subjects')) return [counts];
      return [];
    };
    const result = await getAuthenticatedSessionIdentity(sql, { userId: A, email: 'a@example.test' });
    assert.equal(result.onboardingCompleted, expected);
  }
});

test('account switch during expired-token recovery cannot expire the next account', async () => {
  const delay = deferred(); const started = deferred();
  const fixture = await managerFixture({ expired: true, refresh: () => { started.resolve(); return delay.promise; } });
  const api = createNativeApiClient({ baseUrl: '', sessionManager: fixture.manager, fetchImpl: async () => { throw new Error('Must not send the stale request'); } });
  try {
    const pending = api.getSessionIdentity(); await started.promise; fixture.switch(B);
    delay.resolve({ data: { session: null }, error: { status: 401, message: 'Expired' } });
    await assert.rejects(pending, (err) => err.code === 'SESSION_CHANGED');
    assert.equal(fixture.manager.getState().user.id, B);
  } finally { fixture.manager.destroy(); }
});

test('real idempotency wrapper and onboarding service share one injected transaction and reject write/commit failure', async () => {
  const { executeTransactionalIdempotentMutation } = await import('../worker/api/idempotency.ts');
  for (const failure of ['insert', 'commit', null]) {
    const committed = []; let allocated = 0; let staged = [];
    const tx = async (parts, ...values) => {
      const query = parts.join('?');
      if (query.includes('WITH upsert')) return [{ inserted_or_reset: true }];
      if (query.includes('UPDATE api_idempotency_keys')) { staged.push('completed'); return [{ idempotency_key: 'onboard-local-key' }]; }
      if (query.includes('FROM profiles')) return [{ id: A }];
      if (query.includes('WITH latest AS')) return readySubjectRows(catalog);
      if (query.includes('FROM subjects')) return catalog;
      if (query.includes('INSERT INTO student_subjects') && failure === 'insert') throw new Error('Injected insert failure');
      staged.push(query); return [];
    };
    const db = { async runSerializableTransaction(execute) {
      allocated++;
      const result = await execute(tx);
      if (failure === 'commit') throw new Error('Injected commit failure');
      committed.push(...staged); return result;
    } };
    const mutation = executeTransactionalIdempotentMutation({ db, userId: A, operation: 'onboarding.put', idempotencyKey: 'onboard-local-key', canonicalPayload: JSON.stringify(body), execute: async (executor) => ({ body: await saveStudentOnboardingAtomic(executor, A, body, new Date('2026-10-11')) }) });
    if (failure) { await assert.rejects(mutation, /Injected/); assert.equal(committed.length, 0); }
    else { assert.equal((await mutation).body.saved, true); assert.ok(committed.some(query => query.includes('INSERT INTO student_preferences'))); assert.equal(committed.at(-1), 'completed'); }
    assert.equal(allocated, 1);
  }
});

test('an authenticated interrupted signup can finish provisioning without entering its password again', async () => {
  const fixture = await managerFixture(); let calls = 0;
  try {
    const result = await fixture.manager.signUpAndProvision({ displayName: 'Student', email: session().user.email, password: '', provisioningExecutor: async (input) => { calls++; return { provisioned: true, userId: A, role: 'student', referralCode: 'LOCALCODE' }; } });
    assert.equal(result.provisioned, true); assert.equal(calls, 1); assert.equal(result.error, null);
  } finally { fixture.manager.destroy(); }
});

test('missing or unsafe API configuration fails explicitly before authentication or fetch', async () => {
  const original = process.env.NEXT_PUBLIC_API_BASE_URL; delete process.env.NEXT_PUBLIC_API_BASE_URL;
  try {
    for (const options of [{}, { baseUrl: 'https://user:password@example.test' }, { baseUrl: 'http://remote.example.test' }]) {
      const api = createNativeApiClient({ ...options, sessionManager: { getState() { throw new Error('Must not touch auth'); } }, fetchImpl: async () => { throw new Error('Must not fetch'); } });
      await assert.rejects(api.request('/api/v1/auth/session'), (err) => err.code === 'API_NOT_CONFIGURED');
    }
  } finally { if (original === undefined) delete process.env.NEXT_PUBLIC_API_BASE_URL; else process.env.NEXT_PUBLIC_API_BASE_URL = original; }
});


test('legacy onboarded account repairs its missing referral code once before loading referral data', async () => {
  const fixture = await managerFixture(); let recovered = false; let bootstraps = 0;
  const coordinator = createAccountCoordinator(fixture.manager, {
    async getSessionIdentity() { return identity(A, { referralCode: recovered ? 'RECOVEREDCODE' : null }); },
    async bootstrapAccount(input) { assert.equal(input.referralCode, null); assert.equal(input.displayName, 'Student'); bootstraps++; recovered = true; },
    async request(path) { assert.equal(path, '/api/v1/referrals'); assert.equal(recovered, true); return { data: { code: 'RECOVEREDCODE' } }; },
  });
  try {
    const [account, referrals] = await Promise.all([coordinator.loadIdentity(), coordinator.loadResource('/api/v1/referrals')]);
    assert.equal(account.onboardingCompleted, true); assert.equal(account.referralCode, 'RECOVEREDCODE');
    assert.equal(referrals.code, 'RECOVEREDCODE'); assert.equal(bootstraps, 1);
    await coordinator.loadIdentity(); assert.equal(bootstraps, 1);
  } finally { coordinator.destroy(); fixture.manager.destroy(); }
});

test('onboarding rejects a catalog choice whose active blueprint cannot form a full mock before any writes',async()=>{
 const fixture=sqlFixture();const sql=async(parts,...values)=>parts.join('?').includes('WITH latest AS')?[]:fixture.sql(parts,...values);
 await assert.rejects(saveStudentOnboardingAtomic(sql,A,body,new Date()),error=>error.status===422&&/not ready/.test(error.message));assert.equal(fixture.writes.length,0);
});

test('deliberate subject edits stay on onboarding while provisioning and initial setup guards remain enforced',()=>{
 assert.equal(accountDestination(identity(),'/onboarding','/dashboard',true),null);
 assert.equal(accountDestination(identity(),'/onboarding'),'/dashboard');
 assert.equal(accountDestination(identity(A,{provisioned:false}),'/onboarding','/dashboard',true),'/register?resume=1');
 assert.equal(accountDestination(identity(A,{onboardingCompleted:false}),'/onboarding','/dashboard',true),null);
 assert.equal(accountDestination(identity(),'/login','/dashboard',true),'/dashboard');
});
