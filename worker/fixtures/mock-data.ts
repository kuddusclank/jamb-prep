/**
 * Synthetic Test Fixtures for Isolated Feasibility Spike (T01)
 *
 * Requirements:
 * - Isolated owned fixtures; zero mutation of real student, payment, or question tables.
 * - 180-question authentic UTME exam structure: 60 English + 40 Math + 40 Physics + 40 Chemistry.
 * - Strict confidentiality: client-facing exam payloads withhold correctOptionId, isCorrect, and explanations.
 * - Synthetic test keys for Paystack webhook HMAC; zero copying of production secrets.
 */

export interface QuestionOption {
  id: string;
  label: 'A' | 'B' | 'C' | 'D';
  text: string;
}

export interface StoredQuestion {
  id: string;
  subjectCode: string;
  topicSlug: string;
  stem: string;
  passage?: string | null;
  options: QuestionOption[];
  correctOptionId: string;
  explanation: string;
}

export interface ClientQuestionItem {
  id: string;
  subjectCode: string;
  topicSlug: string;
  stem: string;
  passage?: string | null;
  options: QuestionOption[];
}

export interface CandidateAnswer {
  questionId: string;
  selectedOptionId: string;
  answeredAt: string; // ISO date string
}

export interface ProfileFixture {
  id: string;
  displayName: string;
  email: string;
  role: 'student' | 'admin';
}

export interface EntitlementFixture {
  id: string;
  userId: string;
  isPremium: boolean;
  status: 'active' | 'inactive';
  expiresAt: string;
}

export interface AttemptFixture {
  id: string;
  userId: string;
  status: 'in_progress' | 'completed';
  startedAt: string;
  expiresAt: string;
}

export const SPIKE_TEST_SUBJECT_ID = '11111111-1111-4111-8111-111111111111';

export const SYNTHETIC_CANDIDATE: ProfileFixture = {
  id: SPIKE_TEST_SUBJECT_ID,
  displayName: 'Spike Test Candidate',
  email: 'spike-student@example.com',
  role: 'student',
};

export const SYNTHETIC_ENTITLEMENT: EntitlementFixture = {
  id: '33333333-3333-4333-8333-333333333333',
  userId: SPIKE_TEST_SUBJECT_ID,
  isPremium: false,
  status: 'active',
  expiresAt: '2026-10-09T12:00:00.000Z',
};

export const SPIKE_TEST_ATTEMPT_ID = '22222222-2222-4222-8222-222222222222';
export const SPIKE_PERFECT_ATTEMPT_ID = '22222222-2222-4222-8222-222222222223';
export const SPIKE_ZERO_ATTEMPT_ID = '22222222-2222-4222-8222-222222222224';
export const SPIKE_EXPIRED_ATTEMPT_ID = '22222222-2222-4222-8222-222222222225';
export const SPIKE_COMPLETED_ATTEMPT_ID = '22222222-2222-4222-8222-222222222226';

export const SYNTHETIC_MOCK_ATTEMPT: AttemptFixture = {
  id: SPIKE_TEST_ATTEMPT_ID,
  userId: SPIKE_TEST_SUBJECT_ID,
  status: 'in_progress',
  startedAt: '2026-10-10T12:00:00.000Z',
  expiresAt: '2026-10-10T23:59:59.000Z', // Active test window
};

/**
 * Dynamically derive profile, entitlement, and attempt fixtures with clock-derived timestamps (R2, C1)
 */
export function deriveAttemptFixtures(
  testSubjectId: string,
  nowMs: number = Date.now()
): {
  profile: ProfileFixture;
  entitlement: EntitlementFixture;
  attempts: Map<string, AttemptFixture>;
} {
  const profile: ProfileFixture = {
    id: testSubjectId,
    displayName: 'Spike Test Candidate',
    email: 'spike-student@example.com',
    role: 'student',
  };

  // C1: Expired past timestamp when isPremium is false, aligned with SQL and mock
  const pastEntitlementExpiry = new Date(nowMs - 86400 * 1000).toISOString();
  const entitlement: EntitlementFixture = {
    id: '33333333-3333-4333-8333-333333333333',
    userId: testSubjectId,
    isPremium: false,
    status: 'active',
    expiresAt: pastEntitlementExpiry,
  };

  const pastStartIso = new Date(nowMs - 10 * 60 * 1000).toISOString();
  const futureExpiryIso = new Date(nowMs + 110 * 60 * 1000).toISOString();
  const expiredStartIso = new Date(nowMs - 125 * 60 * 1000).toISOString();
  const expiredExpiryIso = new Date(nowMs - 5 * 60 * 1000).toISOString();

  const attempts = new Map<string, AttemptFixture>([
    [
      SPIKE_TEST_ATTEMPT_ID,
      {
        id: SPIKE_TEST_ATTEMPT_ID,
        userId: testSubjectId,
        status: 'in_progress',
        startedAt: pastStartIso,
        expiresAt: futureExpiryIso,
      },
    ],
    [
      SPIKE_PERFECT_ATTEMPT_ID,
      {
        id: SPIKE_PERFECT_ATTEMPT_ID,
        userId: testSubjectId,
        status: 'in_progress',
        startedAt: pastStartIso,
        expiresAt: futureExpiryIso,
      },
    ],
    [
      SPIKE_ZERO_ATTEMPT_ID,
      {
        id: SPIKE_ZERO_ATTEMPT_ID,
        userId: testSubjectId,
        status: 'in_progress',
        startedAt: pastStartIso,
        expiresAt: futureExpiryIso,
      },
    ],
    [
      SPIKE_EXPIRED_ATTEMPT_ID,
      {
        id: SPIKE_EXPIRED_ATTEMPT_ID,
        userId: testSubjectId,
        status: 'in_progress',
        startedAt: expiredStartIso,
        expiresAt: expiredExpiryIso,
      },
    ],
    [
      SPIKE_COMPLETED_ATTEMPT_ID,
      {
        id: SPIKE_COMPLETED_ATTEMPT_ID,
        userId: testSubjectId,
        status: 'completed',
        startedAt: pastStartIso,
        expiresAt: futureExpiryIso,
      },
    ],
  ]);

  return { profile, entitlement, attempts };
}

/**
 * Generate 180 deterministic questions across 4 subjects
 * - 60 English questions (1–60)
 * - 40 Mathematics questions (61–100)
 * - 40 Physics questions (101–140)
 * - 40 Chemistry questions (141–180)
 */
export function generateSynthetic180Questions(): StoredQuestion[] {
  const subjects: Array<{ code: string; count: number }> = [
    { code: 'ENG', count: 60 },
    { code: 'MTH', count: 40 },
    { code: 'PHY', count: 40 },
    { code: 'CHM', count: 40 },
  ];

  const questions: StoredQuestion[] = [];
  let index = 1;

  for (const sub of subjects) {
    for (let i = 1; i <= sub.count; i++) {
      const qId = `q-${sub.code.toLowerCase()}-${String(i).padStart(3, '0')}`;
      const optA = `${qId}-opt-a`;
      const optB = `${qId}-opt-b`;
      const optC = `${qId}-opt-c`;
      const optD = `${qId}-opt-d`;

      // Deterministic correct option: alternating A, B, C, D
      const correctOptionId = [optA, optB, optC, optD][(i - 1) % 4];

      questions.push({
        id: qId,
        subjectCode: sub.code,
        topicSlug: `${sub.code.toLowerCase()}-topic-${((i - 1) % 5) + 1}`,
        stem: `Synthetic question stem ${index} for subject ${sub.code} testing concept #${i}.`,
        passage: sub.code === 'ENG' && i <= 15 ? 'Comprehension passage text for English reading section.' : null,
        options: [
          { id: optA, label: 'A', text: `Option A for question ${index}` },
          { id: optB, label: 'B', text: `Option B for question ${index}` },
          { id: optC, label: 'C', text: `Option C for question ${index}` },
          { id: optD, label: 'D', text: `Option D for question ${index}` },
        ],
        correctOptionId,
        explanation: `Detailed explanation for question ${index} proving why ${correctOptionId.slice(-1).toUpperCase()} is correct.`,
      });
      index++;
    }
  }

  return questions;
}

export const SYNTHETIC_180_QUESTIONS: StoredQuestion[] = generateSynthetic180Questions();

/**
 * Sanitize exam payload for candidate delivery:
 * Strictly withholds correctOptionId, isCorrect, and explanations.
 */
export function sanitizeExamPayload(questions: StoredQuestion[]): ClientQuestionItem[] {
  return questions.map((q) => ({
    id: q.id,
    subjectCode: q.subjectCode,
    topicSlug: q.topicSlug,
    stem: q.stem,
    passage: q.passage,
    options: q.options.map((o) => ({
      id: o.id,
      label: o.label,
      text: o.text,
    })),
  }));
}

/**
 * Generate 180 deterministic candidate answers with specified accuracy (C1):
 * - accuracy 1.0 -> 400 points (100% correct)
 * - accuracy 0.75 -> 300 points (75% correct)
 * - accuracy 0.0 -> 0 points (0% correct)
 * Timestamps are strictly server-accepted past times within startedAt..min(now, expiresAt).
 */
export function generateCandidateAnswersWithAccuracy(
  questions: StoredQuestion[],
  attemptStartedAtOrExpiresAt: string,
  attemptExpiresAtOrAccuracy: string | number,
  accuracyOrNowMs: number = 0.75,
  nowMs: number = Date.now()
): CandidateAnswer[] {
  let startedAt: string;
  let expiresAt: string;
  let accuracy: number;
  let clockNowMs: number;

  if (typeof attemptExpiresAtOrAccuracy === 'number') {
    // Called with (questions, attemptExpiresAt, accuracy)
    expiresAt = attemptStartedAtOrExpiresAt;
    accuracy = attemptExpiresAtOrAccuracy;
    clockNowMs = typeof accuracyOrNowMs === 'number' && accuracyOrNowMs > 1 ? accuracyOrNowMs : Date.now();
    startedAt = new Date(Math.min(clockNowMs, new Date(expiresAt).getTime()) - 10 * 60 * 1000).toISOString();
  } else {
    // Called with (questions, attemptStartedAt, attemptExpiresAt, accuracy, nowMs)
    startedAt = attemptStartedAtOrExpiresAt;
    expiresAt = attemptExpiresAtOrAccuracy;
    accuracy = accuracyOrNowMs;
    clockNowMs = nowMs;
  }

  const startMs = new Date(startedAt).getTime();
  const expiresMs = new Date(expiresAt).getTime();
  const maxAcceptedPastMs = Math.min(clockNowMs - 500, expiresMs - 500);
  const validWindowMs = Math.max(1000, maxAcceptedPastMs - startMs);
  const stepMs = validWindowMs / (questions.length + 1);

  return questions.map((q, idx) => {
    let isCorrect = false;
    if (accuracy >= 1.0) {
      isCorrect = true;
    } else if (accuracy <= 0.0) {
      isCorrect = false;
    } else if (accuracy === 0.75) {
      isCorrect = idx % 4 !== 0; // Exactly 75% across each subject
    } else {
      isCorrect = (idx / questions.length) < accuracy;
    }

    const selectedOptionId = isCorrect
      ? q.correctOptionId
      : q.options.find((o) => o.id !== q.correctOptionId)!.id;

    const answeredAtMs = Math.floor(startMs + (idx + 1) * stepMs);
    const answeredAt = new Date(answeredAtMs).toISOString();

    return {
      questionId: q.id,
      selectedOptionId,
      answeredAt,
    };
  });
}

/**
 * Generate 180 deterministic candidate answers (default 75% accuracy -> 300 points)
 */
export function generateCandidateAnswers(
  questions: StoredQuestion[],
  attemptExpiresAt: string,
  attemptStartedAt?: string,
  nowMs?: number
): CandidateAnswer[] {
  if (attemptStartedAt) {
    return generateCandidateAnswersWithAccuracy(questions, attemptStartedAt, attemptExpiresAt, 0.75, nowMs);
  }
  return generateCandidateAnswersWithAccuracy(questions, attemptExpiresAt, 0.75);
}

/**
 * Compute 400-point scaled score from answers against stored questions (C1)
 * Scaling formula:
 * - English: 60 questions scaled to 100 points ((rawCorrect / 60) * 100)
 * - Electives: 40 questions each scaled to 100 points ((rawCorrect / 40) * 100)
 * Total Score = Sum of 4 subject scaled scores (out of 400 points)
 * Timely filter: Answers must be within startedAt..min(now, expiresAt).
 */
export function scoreMockAttempt(
  questions: StoredQuestion[],
  answers: CandidateAnswer[],
  deadlineIso: string,
  startedAtIso?: string,
  nowIso?: string
): {
  totalScore: number;
  subjectScores: Record<string, { rawCorrect: number; totalQuestions: number; scaledScore: number }>;
  totalCorrect: number;
  totalAnsweredTimely: number;
} {
  const deadlineMs = new Date(deadlineIso).getTime();
  const startedMs = startedAtIso ? new Date(startedAtIso).getTime() : 0;
  const nowMs = nowIso ? new Date(nowIso).getTime() : Date.now();
  const maxAcceptedMs = Math.min(deadlineMs, nowMs);
  const answerMap = new Map<string, CandidateAnswer>();

  // Only consider timely and valid past answers within startedAt..min(now, expiresAt)
  for (const a of answers) {
    const t = new Date(a.answeredAt).getTime();
    if (t >= startedMs && t <= maxAcceptedMs) {
      answerMap.set(a.questionId, a);
    }
  }

  const subjectStats: Record<string, { rawCorrect: number; totalQuestions: number }> = {
    ENG: { rawCorrect: 0, totalQuestions: 0 },
    MTH: { rawCorrect: 0, totalQuestions: 0 },
    PHY: { rawCorrect: 0, totalQuestions: 0 },
    CHM: { rawCorrect: 0, totalQuestions: 0 },
  };

  let totalCorrect = 0;

  for (const q of questions) {
    const stats = subjectStats[q.subjectCode];
    if (stats) {
      stats.totalQuestions += 1;
      const ans = answerMap.get(q.id);
      if (ans && ans.selectedOptionId === q.correctOptionId) {
        stats.rawCorrect += 1;
        totalCorrect += 1;
      }
    }
  }

  const subjectScores: Record<string, { rawCorrect: number; totalQuestions: number; scaledScore: number }> = {};
  let totalScore = 0;

  for (const [code, stats] of Object.entries(subjectStats)) {
    const maxQuestions = stats.totalQuestions || (code === 'ENG' ? 60 : 40);
    const scaledScore = Math.round((stats.rawCorrect / maxQuestions) * 100);
    subjectScores[code] = {
      rawCorrect: stats.rawCorrect,
      totalQuestions: stats.totalQuestions,
      scaledScore,
    };
    totalScore += scaledScore;
  }

  return {
    totalScore,
    subjectScores,
    totalCorrect,
    totalAnsweredTimely: answerMap.size,
  };
}

/**
 * Synthetic Webhook Test Keys and Payloads (zero production secrets)
 */
export const SYNTHETIC_HMAC_SECRET = 'synthetic-spike-secret-not-production-key-32chars';

export const SYNTHETIC_WEBHOOK_PAYLOAD = JSON.stringify({
  event: 'charge.success',
  data: {
    id: 987654321,
    domain: 'test',
    status: 'success',
    reference: 'SPIKE_PAYMENT_REF_20261010',
    amount: 100000,
    message: null,
    gateway_response: 'Successful',
    paid_at: '2026-10-10T12:30:00.000Z',
    created_at: '2026-10-10T12:29:00.000Z',
    channel: 'card',
    currency: 'NGN',
    ip_address: '127.0.0.1',
    metadata: {
      userId: '11111111-1111-4111-8111-111111111111',
    },
    customer: {
      id: 123456,
      email: 'spike-student@example.com',
      customer_code: 'CUS_spike123',
    },
  },
});

/**
 * Compute valid SHA-512 HMAC hex signature for synthetic webhook payloads (R5)
 */
export async function computeSyntheticWebhookHmac(
  payload: string,
  secret: string = SYNTHETIC_HMAC_SECRET
): Promise<string> {
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
