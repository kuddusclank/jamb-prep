import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import { createHmac } from 'node:crypto';

const require = createRequire(import.meta.url);
function load(file, mocks = {}, globals = {}) {
  const code = ts.transpileModule(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const loadedModule = { exports: {} };
  vm.runInNewContext(code, {
    exports: loadedModule.exports, module: loadedModule,
    require: name => Object.hasOwn(mocks, name) ? mocks[name] : require(name),
    process: { env: {} }, Buffer, URL, console, performance, setTimeout, clearTimeout,
    ...globals,
  }, { filename: file });
  return loadedModule.exports;
}

const security = load('src/lib/payment-security.ts');
test('webhook signature fails closed for missing, malformed, forged and altered payloads', () => {
  const body = '{"event":"charge.success"}';
  const secret = 'test-private-key';
  const signature = createHmac('sha512', secret).update(body).digest('hex');
  assert.equal(security.hasValidWebhookSignature(body, signature, secret), true);
  for (const candidate of [null, '', 'abc', '0'.repeat(128)]) {
    assert.equal(security.hasValidWebhookSignature(body, candidate, secret), false);
  }
  assert.equal(security.hasValidWebhookSignature(body + ' ', signature, secret), false);
  assert.equal(security.hasValidWebhookSignature(body, signature, ''), false);
});
test('payment verification binds success to exact reference, amount and NGN currency', () => {
  const payment = { status: 'success', reference: 'own-payment', amount: 100000, currency: 'NGN' };
  assert.equal(security.matchesPayment(payment, 'own-payment', 100000), true);
  for (const altered of [null, {}, { ...payment, amount: 1 }, { ...payment, currency: 'USD' },
    { ...payment, reference: 'other-payment' }, { ...payment, status: 'pending' }]) {
    assert.equal(security.matchesPayment(altered, 'own-payment', 100000), false);
  }
});
test('read deadline clears its timer on success, failure and timeout', async () => {
  let callback, cleared = 0;
  const { withDeadline } = load('src/lib/with-deadline.ts', {}, {
    setTimeout: fn => { callback = fn; return 1; }, clearTimeout: () => { cleared++; },
  });
  assert.equal(await withDeadline(Promise.resolve(7), 50, 'read'), 7);
  await assert.rejects(withDeadline(Promise.reject(new Error('db failed')), 50, 'read'), /db failed/);
  const pending = withDeadline(new Promise(() => {}), 50, 'read');
  callback();
  await assert.rejects(pending, /read timeout/);
  assert.equal(cleared, 3);
});
test('database pool is reused inside one Worker request, isolated across requests and closed after response', async () => {
  let context = { env: { HYPERDRIVE: { connectionString: 'postgres://user:password@hyperdrive:5432/db' } }, ctx: {} };
  const afters = [], pools = [];
  const postgres = (url, options) => {
    const client = { options, ended: false, end: async () => { client.ended = true; } };
    pools.push(client); return client;
  };
  const database = load('src/db/index.ts', {
    'postgres': { default: postgres }, './schema': {}, 'drizzle-orm/postgres-js': { drizzle: client => ({ client }) },
    '@opennextjs/cloudflare': { getCloudflareContext: () => context },
    'next/server': { after: callback => afters.push(callback) },
  });
  const first = database.getSqlClient();
  assert.equal(database.getSqlClient(), first);
  assert.equal(database.getDatabase().client, first);
  context = { ...context, ctx: {} };
  assert.notEqual(database.getSqlClient(), first);
  assert.equal(pools.length, 2);
  assert.equal(first.options.prepare, true);
  assert.equal(first.options.fetch_types, false);
  await Promise.all(afters.map(fn => fn()));
  assert.equal(pools.every(pool => pool.ended), true);
});

const tableNames = ['subjects', 'topics', 'passages', 'questions', 'questionOptions', 'questionExplanations',
  'attemptInterruptions', 'attempts', 'attemptQuestions', 'attemptAnswers', 'attemptResults', 'studentSubjects', 'profiles',
  'paymentTransactions', 'referralRewards', 'subscriptionEntitlements'];
const schema = Object.fromEntries(tableNames.map(name => [name, new Proxy({ name }, {
  get: (target, key) => key === 'name' ? target.name : `${name}.${String(key)}`,
})]));
const operators = { eq: (...args) => args, and: (...args) => args, gt: (...args) => args,
  inArray: (...args) => args, sql: (...args) => args };
function fakeDatabase(rows) {
  const reads = [], projections = [];
  return {
    reads, projections,
    query: {
      subjects: { findFirst: async () => ({ id: 'subject-1', code: 'ENG', name: 'English' }) },
      topics: { findFirst: async () => null },
      attempts: { findFirst: async () => ({ id: 'attempt-1', expiresAt: new Date(Date.now() + 60000), examConditions: true }) },
    },
    select(projection) {
      projections.push(projection);
      let table;
      const builder = {
        from(value) { table = value.name; return builder; },
        innerJoin() { return builder; }, where() { return builder; },
        orderBy() { return builder; }, limit() { return builder; },
        then(resolve, reject) { reads.push(table); return Promise.resolve(rows[table] || []).then(resolve, reject); },
      };
      return builder;
    },
  };
}
const auth = { createClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: 'student-1' } } }) } }) };
test('practice fetch batches related data independent of question count and withholds answer keys', async () => {
  const questions = Array.from({ length: 60 }, (_, i) => ({ id: `q-${i}`, stem: 'Question', topicId: 't-1', passageId: 'p-1', difficulty: 'easy' }));
  const db = fakeDatabase({ questions, topics: [{ id: 't-1', title: 'Topic' }], passages: [{ id: 'p-1', content: 'Passage' }],
    questionOptions: questions.map(q => ({ questionId: q.id, label: 'A', content: 'Option' })) });
  const actions = load('src/app/actions/practice.ts', {
    '@/db': { db }, '@/db/schema': schema, 'drizzle-orm': operators,
    '@/lib/supabase/server': auth, '@/lib/coach': {},
  });
  const result = await actions.getPracticeQuestions('ENG', undefined, 60);
  assert.equal(result.length, 60);
  assert.equal(db.reads.length, 4);
  assert.equal(result[0].passage.content, 'Passage');
  assert.equal(result[0].options[0].label, 'A');
  assert.equal(db.projections.some(p => Object.hasOwn(p, 'isCorrect')), false);
  assert.equal(JSON.stringify(result).includes('isCorrect'), false);
  await assert.rejects(actions.getPracticeQuestions('ENG', undefined, 10000), /between 1 and 60/);
  const before = db.reads.length;
  assert.equal((await actions.getPracticeQuestions('ENG', 'missing-topic')).length, 0);
  assert.equal(db.reads.length, before);
});
test('180-question exam resume uses constant batch reads and preserves order, answers and expiry', async () => {
  const frozen = Array.from({ length: 180 }, (_, i) => ({ questionId: `q-${i}`, position: i + 1, subjectCode: 'ENG',
    subjectName: 'English', stem: 'Question', difficulty: 'easy', passageId: 'p-1' }));
  const db = fakeDatabase({ attemptQuestions: frozen, passages: [{ id: 'p-1', content: 'Passage' }],
    questionOptions: frozen.map(q => ({ id: `o-${q.questionId}`, questionId: q.questionId, label: 'A', content: 'Option' })),
    attemptAnswers: [{ questionId: 'q-0', selectedOptionId: 'o-q-0' }] });
  const actions = load('src/app/actions/exam.ts', {
    '@/db': { db }, '@/db/schema': schema, 'drizzle-orm': operators, '@/lib/supabase/server': auth,
    'next/navigation': { redirect: () => { throw new Error('redirect'); } },
    '@/lib/coach': {}, '@/lib/subscription': { getUserSubscriptionStatus: async () => ({ isPremium: true }) },
  });
  const result = await actions.startMockAttempt(false, 'attempt-1');
  assert.equal(result.questions.length, 180);
  assert.equal(result.questions[179].position, 180);
  assert.equal(result.initialAnswers['q-0'], 'o-q-0');
  assert.equal(result.initialLabels['q-0'], 'A');
  assert.equal(result.examConditions, true);
  assert.equal(db.reads.length, 5);
  assert.equal(JSON.stringify(result).includes('isCorrect'), false);
});
test('admin import rejects unauthenticated and student requests before reading payload or writing database', async () => {
  for (const user of [null, { id: 'student-1' }]) {
    const route = load('src/app/api/admin/questions/import/route.ts', {
      'next/server': { NextResponse: { json: (body, options) => ({ body, ...options }) } },
      '@/lib/supabase/server': { createClient: async () => ({ auth: { getUser: async () => ({ data: { user } }) } }) },
      '@/db': { db: { query: { profiles: { findFirst: async () => ({ role: 'student' }) } } } },
      '@/db/schema': schema, 'drizzle-orm': operators, '@/lib/validation/question': {},
    });
    const response = await route.POST({ json: () => { throw new Error('Body must not be read'); } });
    assert.equal(response.status, user ? 403 : 401);
  }
});

test('payment settlement commits once, survives replay, and rolls back rejected rewards (temporary database tables)',
  { skip: process.env.JAMBPREP_DB_TESTS !== 'true' }, async () => {
    const { default: postgres } = await import('postgres');
    const { drizzle } = await import('drizzle-orm/postgres-js');
    const { randomUUID } = await import('node:crypto');
    process.loadEnvFile(new URL('../.env.local', import.meta.url).pathname);
    const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false, connect_timeout: 8 });
    try {
      // Session-local tables shadow public tables. No persistent app data is modified.
      for (const name of ['profiles', 'payment_transactions', 'subscription_entitlements', 'referral_rewards', 'subscription_discounts']) {
        await sql.unsafe(`CREATE TEMP TABLE "${name}" (LIKE public."${name}" INCLUDING ALL)`);
      }
      const liveSchema = load('src/db/schema.ts');
      const db = drizzle(sql, { schema: liveSchema });
      const { settleVerifiedPayment } = load('src/lib/payment-settlement.ts', {
        '@/db': { db }, '@/db/schema': liveSchema,
      });
      const userId = randomUUID();
      await db.insert(liveSchema.profiles).values({ id: userId, displayName: 'Regression Student', email: 'regression@example.invalid' });
      await db.insert(liveSchema.paymentTransactions).values({ userId, reference: 'regression-payment', amountKobo: 100000, status: 'pending' });
      const expiries = await Promise.all([
        settleVerifiedPayment('regression-payment', {}),
        settleVerifiedPayment('regression-payment', {}),
      ]);
      assert.equal(expiries[0].getTime(), expiries[1].getTime());
      const [entitlement] = await db.select().from(liveSchema.subscriptionEntitlements);
      assert.ok(entitlement.expiresAt.getTime() > Date.now() + 29 * 86400000);
      assert.ok(entitlement.expiresAt.getTime() < Date.now() + 31 * 86400000);
      await db.insert(liveSchema.paymentTransactions).values({
        userId, reference: 'regression-invalid-reward', amountKobo: 50000, status: 'pending',
        paystackPayload: { rewardId: randomUUID() },
      });
      await assert.rejects(settleVerifiedPayment('regression-invalid-reward', {}), /Referral reward is unavailable/);
      const rows = await db.select().from(liveSchema.paymentTransactions);
      assert.equal(rows.find(row => row.reference === 'regression-invalid-reward').status, 'pending');
      const [after] = await db.select().from(liveSchema.subscriptionEntitlements);
      assert.equal(after.expiresAt.getTime(), entitlement.expiresAt.getTime());
    } finally {
      await sql.end({ timeout: 1 });
    }
  });

test('page identity rejects invalid signatures and does not call the Auth user endpoint', async () => {
  let valid = true;
  const { getCurrentUser } = load('src/lib/supabase/current-user.ts', {
    react: { cache: fn => fn },
    './server': { createClient: async () => ({ auth: {
      getClaims: async () => ({ data: { claims: { sub: 'student-1', email: 'student@example.invalid', user_metadata: {} } }, error: valid ? null : new Error('invalid signature') }),
      getUser: () => { throw new Error('Unexpected network user lookup'); },
    } }) },
  });
  assert.equal((await getCurrentUser()).id, 'student-1');
  valid = false;
  assert.equal(await getCurrentUser(), null);
});
test('callback rejects a foreign reference without looking for another pending payment', async () => {
  let lookups = 0;
  const actions = load('src/app/actions/payment.ts', {
    '@/lib/payment-security': security, '@/lib/payment-settlement': {},
    '@/lib/supabase/server': auth, '@/db/schema': schema, 'drizzle-orm': operators,
    '@/lib/subscription': {},
    '@/db': { db: { query: { paymentTransactions: { findFirst: async ({ where }) => {
      lookups++;
      assert.equal(JSON.stringify(where).includes('student-1'), true);
      return null;
    } } } } },
  });
  const result = await actions.verifyPaystackPaymentAction('foreign-reference');
  assert.equal(result.success, false);
  assert.equal(lookups, 1);
});
test('webhook endpoint rejects missing signatures before accessing the database', async () => {
  const route = load('src/app/api/webhooks/paystack/route.ts', {
    'next/server': { NextResponse: { json: (body, options) => ({ body, ...options }) } },
    '@/lib/payment-security': security, '@/lib/payment-settlement': {}, '@/db/schema': schema,
    '@/db': { db: new Proxy({}, { get: () => { throw new Error('Database must not be accessed'); } }) },
    'drizzle-orm': operators,
  }, { process: { env: { PAYSTACK_SECRET_KEY: 'private-key' } } });
  const result = await route.POST({ text: async () => '{"event":"charge.success"}', headers: { get: () => null } });
  assert.equal(result.status, 401);
});
