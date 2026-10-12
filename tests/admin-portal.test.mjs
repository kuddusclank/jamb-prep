import test from 'node:test';
import assert from 'node:assert/strict';
import { createNativeApiHandler } from '../worker/api/entry.ts';
import { resetJwksCache } from '../worker/auth.ts';
import { bulkQuestionImportSchema, questionUpsertSchema, questionReportCreateSchema } from '../worker/api/contracts.ts';

const TEST_SUPABASE_URL = 'https://bqumnaoiiukifvanoonm.supabase.co';
const TEST_ISSUER = 'https://bqumnaoiiukifvanoonm.supabase.co/auth/v1';
const NOW_DATE = new Date('2026-10-11T12:00:00Z');
const NOW_SEC = Math.floor(NOW_DATE.getTime() / 1000);

const STUDENT_ID = '11111111-1111-4111-8111-111111111111';
const ADMIN_ID = '22222222-2222-4222-8222-222222222222';
const QUESTION_ID = '33333333-3333-4333-8333-333333333333';
const SUBJECT_ID = '44444444-4444-4444-8444-444444444444';
const TOPIC_ID = '55555555-5555-4555-8555-555555555555';
const REPORT_ID = '66666666-6666-4666-8666-666666666666';

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

async function generateTestEs256KeyPair(kid = 'test-key-admin') {
  const pair = await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify']
  );
  const publicJwk = await crypto.subtle.exportKey('jwk', pair.publicKey);
  return {
    privateKey: pair.privateKey,
    jwks: { keys: [{ ...publicJwk, kid, alg: 'ES256', use: 'sig' }] },
  };
}

async function signEs256Jwt(privateKey, claims) {
  const header = { alg: 'ES256', typ: 'JWT', kid: 'test-key-admin' };
  const signingInput = `${base64UrlEncodeJson(header)}.${base64UrlEncodeJson(claims)}`;
  const sigBuffer = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    new TextEncoder().encode(signingInput)
  );
  return `${signingInput}.${base64UrlEncodeBytes(new Uint8Array(sigBuffer))}`;
}

function createWaitCollector() {
  const promises = [];
  return {
    ctx: { waitUntil(p) { promises.push(Promise.resolve(p)); } },
    async flush() { await Promise.allSettled(promises); },
  };
}

function createSimulatedAdminDb(handler) {
  const sql = async (strings, ...values) => {
    let full = '';
    if (Array.isArray(strings)) {
      for (let i = 0; i < strings.length; i++) {
        full += strings[i];
        if (i < values.length) full += String(values[i]);
      }
    } else {
      full = String(strings);
    }
    return handler(full, values);
  };
  return {
    factory: () => ({
      sql,
      db: {},
      isHyperdrive: true,
      async cleanup() {},
      async runCommittedTransaction(fn) { return fn(sql); },
      async runSerializableTransaction(fn) { return fn(sql); },
    }),
  };
}

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

test('1. Admin Authorization & Overview: Enforces role checks and returns metrics with subject breakdown', async () => {
  resetJwksCache();
  const { privateKey, jwks } = await generateTestEs256KeyPair();

  const studentToken = await signEs256Jwt(privateKey, {
    sub: STUDENT_ID,
    exp: NOW_SEC + 3600,
    iss: TEST_ISSUER,
    aud: 'authenticated',
    role: 'authenticated',
  });

  const adminToken = await signEs256Jwt(privateKey, {
    sub: ADMIN_ID,
    exp: NOW_SEC + 3600,
    iss: TEST_ISSUER,
    aud: 'authenticated',
    role: 'authenticated',
  });

  const db = createSimulatedAdminDb((queryText) => {
    if (queryText.includes('total_students')) {
      return [{
        total_students: 150,
        total_published_questions: 720,
        total_draft_questions: 45,
        total_reviewed_questions: 10,
        total_archived_questions: 5,
        total_completed_attempts: 88,
        pending_reports: 3,
      }];
    }
    if (queryText.includes('FROM profiles')) {
      if (queryText.includes(ADMIN_ID)) return [{ id: ADMIN_ID, role: 'admin' }];
      return [{ id: STUDENT_ID, role: 'student' }];
    }
    if (queryText.includes('FROM subjects s')) {
      return [{
        code: 'ENG',
        name: 'Use of English',
        is_compulsory: true,
        published_count: 65,
        draft_count: 10,
        total_count: 75,
      }];
    }
    return [];
  });

  const worker = createNativeApiHandler({
    dbFactory: db.factory,
    hooks: {
      nowSec: NOW_SEC,
      now: () => NOW_DATE,
      customJwks: jwks,
      liveSessionVerifier: async () => true,
    },
  });

  const env = { SUPABASE_URL: TEST_SUPABASE_URL };

  // 1a. Unauthenticated request -> 401
  const unauthRes = await worker.fetch(
    new Request('https://jambprep.lecterniq.com/api/v1/admin/overview'),
    env,
    { waitUntil() {} }
  );
  assert.equal(unauthRes.status, 401);

  // 1b. Student token -> 403
  const studentRes = await worker.fetch(
    new Request('https://jambprep.lecterniq.com/api/v1/admin/overview', {
      headers: { Authorization: `Bearer ${studentToken}` },
    }),
    env,
    { waitUntil() {} }
  );
  assert.equal(studentRes.status, 403);
  assert.equal((await studentRes.json()).error.code, 'FORBIDDEN_ADMIN_REQUIRED');

  // 1c. Admin token -> 200 with complete metrics and subject breakdown
  const adminRes = await worker.fetch(
    new Request('https://jambprep.lecterniq.com/api/v1/admin/overview', {
      headers: { Authorization: `Bearer ${adminToken}` },
    }),
    env,
    { waitUntil() {} }
  );
  assert.equal(adminRes.status, 200);
  const data = await adminRes.json();
  assert.equal(data.metrics.total_students, 150);
  assert.equal(data.metrics.total_published_questions, 720);
  assert.equal(data.metrics.total_draft_questions, 45);
  assert.equal(data.metrics.total_questions, 780);
  assert.equal(data.metrics.pending_reports, 3);
  assert.equal(data.subjects[0].code, 'ENG');
  assert.equal(data.subjects[0].published_count, 65);
});

test('2. Question Library: Paginated listing and filter handling', async () => {
  resetJwksCache();
  const { privateKey, jwks } = await generateTestEs256KeyPair();
  const adminToken = await signEs256Jwt(privateKey, {
    sub: ADMIN_ID,
    exp: NOW_SEC + 3600,
    iss: TEST_ISSUER,
    aud: 'authenticated',
  });

  const mockQuestion = {
    id: QUESTION_ID,
    subject_code: 'ENG',
    subject_name: 'Use of English',
    topic_id: TOPIC_ID,
    topic_title: 'Comprehension',
    stem: 'What is the main topic of the passage?',
    image_url: null,
    difficulty: 'medium',
    status: 'published',
    exam_year: 2024,
    created_at: '2026-10-11T10:00:00Z',
    total_count: 42,
    options: [
      { id: '11111111-0000-0000-0000-000000000001', label: 'A', content: 'Option A', is_correct: true },
      { id: '11111111-0000-0000-0000-000000000002', label: 'B', content: 'Option B', is_correct: false },
    ],
    explanation: 'Detailed explanation.',
  };

  const db = createSimulatedAdminDb((queryText) => {
    if (queryText.includes('FROM profiles')) return [{ id: ADMIN_ID, role: 'admin' }];
    if (queryText.includes('WITH filtered AS')) {
      return [mockQuestion];
    }
    return [];
  });

  const worker = createNativeApiHandler({
    dbFactory: db.factory,
    hooks: {
      nowSec: NOW_SEC,
      now: () => NOW_DATE,
      customJwks: jwks,
      liveSessionVerifier: async () => true,
    },
  });

  const res = await worker.fetch(
    new Request('https://jambprep.lecterniq.com/api/v1/admin/questions?page=1&limit=25&subject=ENG&status=published', {
      headers: { Authorization: `Bearer ${adminToken}` },
    }),
    { SUPABASE_URL: TEST_SUPABASE_URL },
    { waitUntil() {} }
  );

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.questions.length, 1);
  assert.equal(data.questions[0].id, QUESTION_ID);
  assert.equal(data.questions[0].subject_code, 'ENG');
  assert.equal(data.questions[0].options[0].is_correct, true);
  assert.equal(data.pagination.total, 42);
  assert.equal(data.pagination.page, 1);
  assert.equal(data.pagination.totalPages, 2);
});

test('3. Question Detail: Retrieves single question or returns 404', async () => {
  resetJwksCache();
  const { privateKey, jwks } = await generateTestEs256KeyPair();
  const adminToken = await signEs256Jwt(privateKey, {
    sub: ADMIN_ID,
    exp: NOW_SEC + 3600,
    iss: TEST_ISSUER,
    aud: 'authenticated',
  });

  const db = createSimulatedAdminDb((queryText) => {
    if (queryText.includes('FROM profiles')) return [{ id: ADMIN_ID, role: 'admin' }];
    if (queryText.includes('FROM questions q') && queryText.includes(QUESTION_ID)) {
      return [{
        id: QUESTION_ID,
        subject_id: SUBJECT_ID,
        subject_code: 'ENG',
        subject_name: 'Use of English',
        topic_id: TOPIC_ID,
        topic_title: 'Comprehension',
        stem: 'What is the main topic?',
        difficulty: 'medium',
        status: 'published',
        exam_year: 2024,
        options: [{ id: 'opt-1', label: 'A', content: 'Choice A', is_correct: true }],
        explanation: 'Detailed answer explanation.',
      }];
    }
    return [];
  });

  const worker = createNativeApiHandler({
    dbFactory: db.factory,
    hooks: {
      nowSec: NOW_SEC,
      now: () => NOW_DATE,
      customJwks: jwks,
      liveSessionVerifier: async () => true,
    },
  });

  // 3a. Found question
  const okRes = await worker.fetch(
    new Request(`https://jambprep.lecterniq.com/api/v1/admin/questions/${QUESTION_ID}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    }),
    { SUPABASE_URL: TEST_SUPABASE_URL },
    { waitUntil() {} }
  );
  assert.equal(okRes.status, 200);
  const data = await okRes.json();
  assert.equal(data.question.id, QUESTION_ID);
  assert.equal(data.question.stem, 'What is the main topic?');

  // 3b. Missing question -> 404
  const notFoundRes = await worker.fetch(
    new Request(`https://jambprep.lecterniq.com/api/v1/admin/questions/99999999-9999-4999-8999-999999999999`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    }),
    { SUPABASE_URL: TEST_SUPABASE_URL },
    { waitUntil() {} }
  );
  assert.equal(notFoundRes.status, 404);
  assert.equal((await notFoundRes.json()).error.code, 'QUESTION_NOT_FOUND');
});

test('4. Question Create & Update: Validates input, creates draft or published, and preserves attempt isolation', async () => {
  resetJwksCache();
  const { privateKey, jwks } = await generateTestEs256KeyPair();
  const adminToken = await signEs256Jwt(privateKey, {
    sub: ADMIN_ID,
    exp: NOW_SEC + 3600,
    iss: TEST_ISSUER,
    aud: 'authenticated',
  });

  const validPayload = {
    subjectCode: 'MTH',
    topicTitle: 'Algebra and Polynomials',
    stem: 'If $2x + 3 = 11$, what is the value of $x$?',
    difficulty: 'easy',
    examYear: 2024,
    options: {
      A: '$x = 4$',
      B: '$x = 5$',
      C: '$x = 7$',
      D: '$x = 2$',
    },
    correctOption: 'A',
    explanation: 'Subtract 3 from both sides: $2x = 8$. Divide by 2: $x = 4$.',
    status: 'draft',
  };

  const executed = [];
  const db = createSimulatedAdminDb((queryText) => {
    executed.push(queryText);
    if (queryText.includes('FROM profiles')) return [{ id: ADMIN_ID, role: 'admin' }];
    if (queryText.includes('FROM subjects WHERE code')) return [{ id: SUBJECT_ID }];
    if (queryText.includes('FROM topics WHERE subject_id')) return [{ id: TOPIC_ID }];
    if (queryText.includes('INSERT INTO questions')) return [{ id: QUESTION_ID }];
    if (queryText.includes('SELECT id, passage_id, editorial_revision FROM questions')) return [{ id: QUESTION_ID, passage_id: null, editorial_revision: 1 }];
    return [];
  });

  const worker = createNativeApiHandler({
    dbFactory: db.factory,
    hooks: {
      idempotencyStore: createSimulatedIdempotencyStore(),
      nowSec: NOW_SEC,
      now: () => NOW_DATE,
      customJwks: jwks,
      liveSessionVerifier: async () => true,
    },
  });

  // 4a. Create new question
  const createRes = await worker.fetch(
    new Request('https://jambprep.lecterniq.com/api/v1/admin/questions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': 'admin-authoring-test',
      },
      body: JSON.stringify(validPayload),
    }),
    { SUPABASE_URL: TEST_SUPABASE_URL },
    { waitUntil() {} }
  );

  assert.equal(createRes.status, 201);
  const createdJson = await createRes.json();
  assert.equal(createdJson.success, true);
  assert.equal(createdJson.questionId, QUESTION_ID);

  // 4b. Update existing question
  const updateRes = await worker.fetch(
    new Request(`https://jambprep.lecterniq.com/api/v1/admin/questions/${QUESTION_ID}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': 'admin-authoring-test',
      },
      body: JSON.stringify({ ...validPayload, status: 'published', expectedRevision: 1, sourceReference:'Test author', rightsNote:'Original test fixture' }),
    }),
    { SUPABASE_URL: TEST_SUPABASE_URL },
    { waitUntil() {} }
  );

  assert.equal(updateRes.status, 200);
  assert.equal((await updateRes.json()).success, true);

  // 4c. Verify attempt_questions table was NOT mutated by the update query
  const touchedAttemptQuestions = executed.some(q => q.includes('attempt_questions') && (q.includes('UPDATE') || q.includes('DELETE')));
  assert.equal(touchedAttemptQuestions, false, 'Historical attempt snapshots must never be overwritten on question bank edit');
});

test('5. Question Lifecycle Status Update: Quickly transitions between draft, published, and archived', async () => {
  resetJwksCache();
  const { privateKey, jwks } = await generateTestEs256KeyPair();
  const adminToken = await signEs256Jwt(privateKey, {
    sub: ADMIN_ID,
    exp: NOW_SEC + 3600,
    iss: TEST_ISSUER,
    aud: 'authenticated',
  });

  const db = createSimulatedAdminDb((queryText) => {
    if (queryText.includes('FROM profiles')) return [{ id: ADMIN_ID, role: 'admin' }];
    if (queryText.includes('UPDATE questions')) return [{ id: QUESTION_ID, status: 'archived' }];
    return [];
  });

  const worker = createNativeApiHandler({
    dbFactory: db.factory,
    hooks: {
      nowSec: NOW_SEC,
      now: () => NOW_DATE,
      customJwks: jwks,
      liveSessionVerifier: async () => true,
    },
  });

  // 5a. Valid status transition to archived
  const res = await worker.fetch(
    new Request(`https://jambprep.lecterniq.com/api/v1/admin/questions/${QUESTION_ID}/status`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: 'archived' }),
    }),
    { SUPABASE_URL: TEST_SUPABASE_URL },
    { waitUntil() {} }
  );

  assert.equal(res.status, 200);
  assert.equal((await res.json()).status, 'archived');

  // 5b. Invalid status -> 422
  const badRes = await worker.fetch(
    new Request(`https://jambprep.lecterniq.com/api/v1/admin/questions/${QUESTION_ID}/status`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: 'non_existent_status' }),
    }),
    { SUPABASE_URL: TEST_SUPABASE_URL },
    { waitUntil() {} }
  );

  assert.equal(badRes.status, 422);
});

test('6. Curriculum Research: Returns active subjects with topics and full 25-subject official JAMB syllabus catalogue', async () => {
  resetJwksCache();
  const { privateKey, jwks } = await generateTestEs256KeyPair();
  const adminToken = await signEs256Jwt(privateKey, {
    sub: ADMIN_ID,
    exp: NOW_SEC + 3600,
    iss: TEST_ISSUER,
    aud: 'authenticated',
  });

  const db = createSimulatedAdminDb((queryText) => {
    if (queryText.includes('FROM profiles')) return [{ id: ADMIN_ID, role: 'admin' }];
    if (queryText.includes('FROM subjects s')) {
      return [{
        id: SUBJECT_ID,
        code: 'ENG',
        name: 'Use of English',
        is_compulsory: true,
        is_active: true,
        display_order: 1,
        topics: [{ id: TOPIC_ID, title: 'Comprehension', slug: 'comprehension', total_questions: 60, published_questions: 55, draft_questions: 5 }],
        total_questions: 60,
        published_questions: 55,
      }];
    }
    return [];
  });

  const worker = createNativeApiHandler({
    dbFactory: db.factory,
    hooks: {
      nowSec: NOW_SEC,
      now: () => NOW_DATE,
      customJwks: jwks,
      liveSessionVerifier: async () => true,
    },
  });

  const res = await worker.fetch(
    new Request('https://jambprep.lecterniq.com/api/v1/admin/curriculum', {
      headers: { Authorization: `Bearer ${adminToken}` },
    }),
    { SUPABASE_URL: TEST_SUPABASE_URL },
    { waitUntil() {} }
  );

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.activeSubjects.length, 1);
  assert.equal(data.activeSubjects[0].code, 'ENG');
  assert.equal(data.activeSubjects[0].topics[0].title, 'Comprehension');

  // Verify official 25-subject research catalogue is present
  assert.equal(data.officialCatalogue.length, 25);
  const agric = data.officialCatalogue.find(s => s.name === 'Agricultural Science' || s.name === 'Agriculture science');
  assert.ok(agric);
  assert.equal(agric.pages, 16);
  assert.ok(agric.officialPdfUrl.includes('AgricPdf'));
});

test('7. Student Question Reporting & Moderation: Student submits issue; Admin reviews and moderates', async () => {
  resetJwksCache();
  const { privateKey, jwks } = await generateTestEs256KeyPair();
  const studentToken = await signEs256Jwt(privateKey, {
    sub: STUDENT_ID,
    exp: NOW_SEC + 3600,
    iss: TEST_ISSUER,
    aud: 'authenticated',
  });
  const adminToken = await signEs256Jwt(privateKey, {
    sub: ADMIN_ID,
    exp: NOW_SEC + 3600,
    iss: TEST_ISSUER,
    aud: 'authenticated',
  });

  const db = createSimulatedAdminDb((queryText) => {
    if (queryText.includes('FROM profiles')) {
      if (queryText.includes(ADMIN_ID)) return [{ id: ADMIN_ID, role: 'admin' }];
      return [{ id: STUDENT_ID, role: 'student' }];
    }
    if (queryText.includes('SELECT id FROM questions WHERE id =')) return [{ id: QUESTION_ID }];
    if (queryText.includes('INSERT INTO question_reports')) return [{ id: REPORT_ID }];
    if (queryText.includes('FROM question_reports r')) {
      return [{
        id: REPORT_ID,
        question_id: QUESTION_ID,
        reason: 'wrong_key',
        comment: 'Option A was marked right but B is clearly correct according to the passage.',
        status: 'open',
        admin_notes: null,
        created_at: '2026-10-11T11:00:00Z',
        stem: 'What is the main topic of the passage?',
        subject_code: 'ENG',
        subject_name: 'Use of English',
        topic_title: 'Comprehension',
        reporter_email: 'student@example.test',
        reporter_display_name: 'Emeka',
        total_count: 1,
      }];
    }
    if (queryText.includes('UPDATE question_reports')) {
      return [{ id: REPORT_ID, status: 'resolved' }];
    }
    return [];
  });

  const worker = createNativeApiHandler({
    dbFactory: db.factory,
    hooks: {
      nowSec: NOW_SEC,
      now: () => NOW_DATE,
      customJwks: jwks,
      liveSessionVerifier: async () => true,
    },
  });

  // 7a. Student submits report
  const studentReportRes = await worker.fetch(
    new Request('https://jambprep.lecterniq.com/api/v1/reports/question', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${studentToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        questionId: QUESTION_ID,
        reason: 'wrong_key',
        comment: 'Option A was marked right but B is clearly correct according to the passage.',
      }),
    }),
    { SUPABASE_URL: TEST_SUPABASE_URL },
    { waitUntil() {} }
  );

  assert.equal(studentReportRes.status, 201);
  const reportData = await studentReportRes.json();
  assert.equal(reportData.success, true);
  assert.equal(reportData.reportId, REPORT_ID);

  // 7b. Admin reads reports queue
  const adminQueueRes = await worker.fetch(
    new Request('https://jambprep.lecterniq.com/api/v1/admin/reports?status=open', {
      headers: { Authorization: `Bearer ${adminToken}` },
    }),
    { SUPABASE_URL: TEST_SUPABASE_URL },
    { waitUntil() {} }
  );

  assert.equal(adminQueueRes.status, 200);
  const queueData = await adminQueueRes.json();
  assert.equal(queueData.reports.length, 1);
  assert.equal(queueData.reports[0].reason, 'wrong_key');
  assert.equal(queueData.reports[0].reporterDisplayName, 'Emeka');

  // 7c. Admin resolves report
  const resolveRes = await worker.fetch(
    new Request(`https://jambprep.lecterniq.com/api/v1/admin/reports/${REPORT_ID}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: 'resolved',
        adminNotes: 'Verified passage and corrected answer key to option B.',
      }),
    }),
    { SUPABASE_URL: TEST_SUPABASE_URL },
    { waitUntil() {} }
  );

  assert.equal(resolveRes.status, 200);
  assert.equal((await resolveRes.json()).status, 'resolved');
});

test('8. CSV Import Preflight: Validates batch items and flags invalid subjects', async () => {
  resetJwksCache();
  const { privateKey, jwks } = await generateTestEs256KeyPair();
  const adminToken = await signEs256Jwt(privateKey, {
    sub: ADMIN_ID,
    exp: NOW_SEC + 3600,
    iss: TEST_ISSUER,
    aud: 'authenticated',
  });

  const db = createSimulatedAdminDb((queryText) => {
    if (queryText.includes('FROM profiles')) return [{ id: ADMIN_ID, role: 'admin' }];
    if (queryText.includes('SELECT code FROM subjects')) return [{ code: 'ENG' }, { code: 'MTH' }];
    if (queryText.includes('FROM topics t JOIN subjects')) return [{code:'ENG',title:'Grammar',slug:'grammar',aliases:[]}];
    return [];
  });

  const worker = createNativeApiHandler({
    dbFactory: db.factory,
    hooks: {
      nowSec: NOW_SEC,
      now: () => NOW_DATE,
      customJwks: jwks,
      liveSessionVerifier: async () => true,
    },
  });

  const batch = [
    {
      subjectCode: 'ENG',
      topicTitle: 'Grammar',
      stem: 'Choose the correct option: She has ___ to the market.',
      difficulty: 'easy',
      options: { A: 'gone', B: 'went', C: 'go', D: 'going' },
      correctOption: 'A',
      explanation: 'Present perfect uses past participle (gone).',
    },
    {
      subjectCode: 'XYZ', // Unknown subject code
      topicTitle: 'Unknown Topic',
      stem: 'What is the answer to question two?',
      difficulty: 'medium',
      options: { A: '1', B: '2', C: '3', D: '4' },
      correctOption: 'B',
      explanation: 'Explanation for question two.',
    },
  ];

  const res = await worker.fetch(
    new Request('https://jambprep.lecterniq.com/api/v1/admin/questions/import/dry-run', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(batch),
    }),
    { SUPABASE_URL: TEST_SUPABASE_URL },
    { waitUntil() {} }
  );

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.totalRows, 2);
  assert.equal(data.validCount, 1);
  assert.equal(data.invalidCount, 1);
  assert.equal(data.rows[0].valid, true);
  assert.equal(data.rows[1].valid, false);
  assert.ok(data.rows[1].errors[0].includes('XYZ'));
});
