import type { SqlTagExecutor } from '../api/db-context';
import { ApiError } from '../api/errors';
import { assertValidUuid } from '../api/contracts';
import { recordTopicMasteryBatch } from './coach-service';
import { recordAcceptedStudyGoalEvent } from './study-schedule-service';

export interface WeeklyPackSubject {
  id: string;
  code: string;
  name: string;
  isCompulsory: boolean;
  questionCount: number;
}

export interface WeeklyPackQuestionFeedback {
  correctOption: string;
  explanation: string;
}

export interface WeeklyPackProgress {
  total: number;
  answered: number;
  bySubject: Record<string, { total: number; answered: number }>;
}

export interface WeeklyPackPayload {
  packId: string;
  weekKey: string;
  status: string;
  expiresAt: string;
  subjects: WeeklyPackSubject[];
  questions: Array<Record<string, unknown>>;
  feedback: Record<string, WeeklyPackQuestionFeedback>;
  answers: Record<string, { selectedOption: string; answeredAt: string }>;
  progress: WeeklyPackProgress;
}

/**
 * Calculates current ISO week key in Africa/Lagos (WAT, UTC+1).
 * E.g., '2026-W43'
 */
export function getWatWeekKey(now: Date): string {
  const watMs = now.getTime() + 3600000;
  const watDate = new Date(watMs);
  const dayOfWeek = watDate.getUTCDay();
  const daysSinceMonday = (dayOfWeek + 6) % 7;
  const monday = new Date(watMs - daysSinceMonday * 86400000);
  const year = monday.getUTCFullYear();
  const firstThursday = new Date(Date.UTC(year, 0, 4));
  const firstThursdayDay = (firstThursday.getUTCDay() + 6) % 7;
  const firstMonday = new Date(Date.UTC(year, 0, 4 - firstThursdayDay));
  const weekNum = Math.floor((monday.getTime() - firstMonday.getTime()) / (7 * 86400000)) + 1;
  return `${year}-W${String(weekNum).padStart(2, '0')}`;
}

/**
 * Calculates upcoming Sunday 23:59:59.999 in Africa/Lagos (WAT), returned as a UTC Date.
 */
export function getWatWeekExpiry(now: Date): Date {
  const watMs = now.getTime() + 3600000;
  const watDate = new Date(watMs);
  const dayOfWeek = watDate.getUTCDay();
  const daysUntilSunday = (7 - dayOfWeek) % 7;
  const sundayWatMs = watMs + daysUntilSunday * 86400000;
  const sundayWat = new Date(sundayWatMs);
  const sundayEndWat = Date.UTC(
    sundayWat.getUTCFullYear(),
    sundayWat.getUTCMonth(),
    sundayWat.getUTCDate(),
    23, 59, 59, 999
  );
  return new Date(sundayEndWat - 3600000);
}

/**
 * Retrieves the student's issued 250-question weekly pack for the current week,
 * or deterministically generates and freezes one if none exists yet.
 */
export async function getOrIssueWeeklyPack(
  tx: SqlTagExecutor,
  userId: string,
  now: Date
): Promise<WeeklyPackPayload> {
  assertValidUuid(userId);
  const weekKey = getWatWeekKey(now);
  const weekExpiry = getWatWeekExpiry(now);

  // 1. Check if an existing pack was already issued for this week
  const [existing] = await tx<Array<{
    id: string;
    status: string;
    expires_at: string;
    blueprint_manifest: {
      type: string;
      weekKey: string;
      subjects: WeeklyPackSubject[];
    };
  }>>`
    SELECT id, status, expires_at, blueprint_manifest
    FROM attempts
    WHERE user_id = ${userId}::uuid
      AND mode = 'practice'
      AND (blueprint_manifest->>'type') = 'weekly_pack'
      AND (blueprint_manifest->>'weekKey') = ${weekKey}
    ORDER BY started_at DESC, id DESC
    LIMIT 1
  `;

  if (existing) {
    const rows = await tx<Array<{
      question_id: string;
      position: number;
      snapshot: Record<string, unknown>;
      correct_option_id: string;
      frozen_explanation: string | null;
      subject_id: string;
      selected_option_id: string | null;
      answered_at: string | null;
    }>>`
      SELECT aq.question_id, aq.position, aq.snapshot, aq.correct_option_id, aq.frozen_explanation, aq.subject_id,
             aa.selected_option_id, aa.answered_at
      FROM attempt_questions aq
      LEFT JOIN attempt_answers aa ON aa.attempt_id = aq.attempt_id AND aa.question_id = aq.question_id
      WHERE aq.attempt_id = ${existing.id}::uuid
      ORDER BY aq.position ASC
    `;

    const feedback: Record<string, WeeklyPackQuestionFeedback> = {};
    const answers: Record<string, { selectedOption: string; answeredAt: string }> = {};
    const bySubject: Record<string, { total: number; answered: number }> = {};

    for (const r of rows) {
      const snap = r.snapshot as {
        options?: Array<{ id: string; label: string }>;
        subjectCode?: string;
      };
      const subCode = snap.subjectCode || 'OTHER';
      if (!bySubject[subCode]) {
        bySubject[subCode] = { total: 0, answered: 0 };
      }
      bySubject[subCode].total++;

      // Map correct answer label
      const correctOpt = snap.options?.find(o => o.id === r.correct_option_id);
      feedback[r.question_id] = {
        correctOption: correctOpt?.label || 'A',
        explanation: r.frozen_explanation || 'No explanation provided.',
      };

      if (r.selected_option_id) {
        const selectedOpt = snap.options?.find(o => o.id === r.selected_option_id);
        if (selectedOpt) {
          answers[r.question_id] = {
            selectedOption: selectedOpt.label,
            answeredAt: r.answered_at || new Date().toISOString(),
          };
          bySubject[subCode].answered++;
        }
      }
    }

    const answeredCount = Object.keys(answers).length;
    return {
      packId: existing.id,
      weekKey,
      status: existing.status,
      expiresAt: String(existing.expires_at),
      subjects: existing.blueprint_manifest.subjects,
      questions: rows.map(r => r.snapshot),
      feedback,
      answers,
      progress: {
        total: rows.length,
        answered: answeredCount,
        bySubject,
      },
    };
  }

  // 2. Fetch the student's 4 active enrolled subjects (English compulsory + 3 electives)
  const subjects = await tx<Array<{
    id: string;
    code: string;
    name: string;
    is_compulsory: boolean;
  }>>`
    SELECT s.id, s.code, s.name, s.is_compulsory
    FROM subjects s
    JOIN student_subjects ss ON ss.subject_id = s.id
    WHERE ss.user_id = ${userId}::uuid AND s.is_active
    ORDER BY s.is_compulsory DESC, s.display_order, s.code
  `;

  if (
    subjects.length !== 4 ||
    subjects.filter(s => s.code === 'ENG' && s.is_compulsory).length !== 1 ||
    subjects.filter(s => !s.is_compulsory).length !== 3
  ) {
    throw new ApiError({
      status: 409,
      code: 'CONFLICT',
      message: 'Choose your English and 3 elective subjects in your profile before downloading weekly practice.',
    });
  }

  // 3. Allocate question counts: 85 for English, 55 each for the 3 electives = 250 total
  const subjectQuotas: Array<{ subject: typeof subjects[0]; targetCount: number }> = [
    { subject: subjects[0], targetCount: 85 },
    { subject: subjects[1], targetCount: 55 },
    { subject: subjects[2], targetCount: 55 },
    { subject: subjects[3], targetCount: 55 },
  ];

  type CandidateRow = {
    id: string;
    subject_id: string;
    topic_id: string;
    snapshot: Record<string, unknown>;
    correct_option_id: string;
    explanation: string | null;
  };

  const selectedQuestions: CandidateRow[] = [];
  const subjectSummaries: WeeklyPackSubject[] = [];

  for (const { subject, targetCount } of subjectQuotas) {
    const rows = await tx<CandidateRow[]>`
      WITH candidates AS (
        SELECT q.*, ROW_NUMBER() OVER(
          PARTITION BY q.topic_id
          ORDER BY
            COALESCE((SELECT count(*) FROM scored_response_events e WHERE e.user_id = ${userId}::uuid AND e.question_id = q.id), 0),
            RANDOM()
        ) AS topic_rank
        FROM study_question_pool q
        WHERE q.subject_id = ${subject.id}::uuid
          AND NOT EXISTS (
            SELECT 1 FROM attempts a
            JOIN attempt_questions aq ON aq.attempt_id = a.id
            WHERE a.user_id = ${userId}::uuid
              AND a.mode = 'mock'
              AND a.status = 'in_progress'
              AND aq.question_id = q.id
          )
      )
      SELECT id, subject_id, topic_id, snapshot, correct_option_id, explanation
      FROM candidates
      ORDER BY topic_rank, RANDOM()
      LIMIT ${targetCount}
    `;

    selectedQuestions.push(...rows);
    subjectSummaries.push({
      id: subject.id,
      code: subject.code,
      name: subject.name,
      isCompulsory: subject.is_compulsory,
      questionCount: rows.length,
    });
  }

  if (selectedQuestions.length < 50) {
    throw new ApiError({
      status: 503,
      code: 'SERVICE_UNAVAILABLE',
      message: 'Not enough reviewed questions are available to assemble your weekly practice pack. Please try again later.',
    });
  }

  // 4. Create the frozen attempt record
  const manifest = {
    type: 'weekly_pack',
    weekKey,
    version: 1,
    subjects: subjectSummaries,
    totalQuestions: selectedQuestions.length,
  };

  const [attempt] = await tx<Array<{ id: string }>>`
    INSERT INTO attempts (
      user_id, mode, status, started_at, expires_at, practice_requested_count, blueprint_manifest
    ) VALUES (
      ${userId}::uuid, 'practice', 'in_progress', ${now.toISOString()}::timestamptz,
      ${weekExpiry.toISOString()}::timestamptz, ${selectedQuestions.length},
      ${JSON.stringify(manifest)}::text::jsonb
    ) RETURNING id
  `;

  // 5. Bulk insert attempt_questions
  const questionsData = selectedQuestions.map((q, idx) => ({
    question_id: q.id,
    subject_id: q.subject_id,
    topic_id: q.topic_id,
    position: idx + 1,
    snapshot: { ...q.snapshot, position: idx + 1 },
    correct_option_id: q.correct_option_id,
    explanation: q.explanation,
  }));

  await tx`
    INSERT INTO attempt_questions (
      attempt_id, question_id, subject_id, topic_id, position, snapshot, correct_option_id, frozen_explanation
    )
    SELECT ${attempt.id}::uuid, x.question_id, x.subject_id, x.topic_id, x.position, x.snapshot, x.correct_option_id, x.explanation
    FROM jsonb_to_recordset(${JSON.stringify(questionsData)}::text::jsonb) AS x(
      question_id uuid, subject_id uuid, topic_id uuid, position int, snapshot jsonb, correct_option_id uuid, explanation text
    )
  `;

  const feedback: Record<string, WeeklyPackQuestionFeedback> = {};
  const bySubject: Record<string, { total: number; answered: number }> = {};

  for (const q of selectedQuestions) {
    const snap = q.snapshot as {
      options?: Array<{ id: string; label: string }>;
      subjectCode?: string;
    };
    const subCode = snap.subjectCode || 'OTHER';
    if (!bySubject[subCode]) {
      bySubject[subCode] = { total: 0, answered: 0 };
    }
    bySubject[subCode].total++;

    const correctOpt = snap.options?.find(o => o.id === q.correct_option_id);
    feedback[q.id] = {
      correctOption: correctOpt?.label || 'A',
      explanation: q.explanation || 'No explanation provided.',
    };
  }

  return {
    packId: attempt.id,
    weekKey,
    status: 'in_progress',
    expiresAt: weekExpiry.toISOString(),
    subjects: subjectSummaries,
    questions: questionsData.map(q => q.snapshot),
    feedback,
    answers: {},
    progress: {
      total: selectedQuestions.length,
      answered: 0,
      bySubject,
    },
  };
}

export interface SyncAnswerItem {
  questionId: string;
  selectedOption: 'A' | 'B' | 'C' | 'D';
  answeredAt?: string;
  timeSpentSeconds?: number;
}

export interface WeeklyPackSyncResult {
  success: boolean;
  syncedCount: number;
  totalAnswered: number;
  totalQuestions: number;
  isCompleted: boolean;
  streakUpdated: boolean;
}

/**
 * Ingests a batch of offline weekly practice answers, records scored events,
 * updates the study streak, and refreshes topic diagnostics.
 */
export async function syncWeeklyPackAnswers(
  tx: SqlTagExecutor,
  userId: string,
  payload: { packId: string; answers: SyncAnswerItem[] },
  now: Date
): Promise<WeeklyPackSyncResult> {
  assertValidUuid(userId);
  assertValidUuid(payload.packId);

  if (!Array.isArray(payload.answers)) {
    throw new ApiError({
      status: 422,
      code: 'VALIDATION_FAILED',
      message: 'Answers must be provided as a list.',
    });
  }

  const [attempt] = await tx<Array<{
    id: string;
    status: string;
    expires_at: string;
  }>>`
    SELECT id, status, expires_at
    FROM attempts
    WHERE id = ${payload.packId}::uuid
      AND user_id = ${userId}::uuid
      AND mode = 'practice'
      AND (blueprint_manifest->>'type') = 'weekly_pack'
    FOR UPDATE
  `;

  if (!attempt) {
    throw new ApiError({
      status: 404,
      code: 'NOT_FOUND',
      message: 'Weekly practice pack not found or does not belong to you.',
    });
  }

  let newlySynced = 0;
  let streakUpdated = false;

  for (const item of payload.answers) {
    if (!item.questionId || !['A', 'B', 'C', 'D'].includes(item.selectedOption)) {
      continue;
    }

    const rows = await tx<Array<{
      snapshot: { options: Array<{ id: string; label: string }>; difficulty?: string; editorialRevision?: number };
      correct_option_id: string;
      frozen_explanation: string | null;
      subject_id: string;
      topic_id: string;
    }>>`
      SELECT aq.snapshot, aq.correct_option_id, aq.frozen_explanation, aq.subject_id, aq.topic_id
      FROM attempt_questions aq
      WHERE aq.attempt_id = ${payload.packId}::uuid
        AND aq.question_id = ${item.questionId}::uuid
    `;

    if (!rows.length) continue;
    const qRow = rows[0];

    const chosenOpt = qRow.snapshot.options.find(o => o.label === item.selectedOption);
    if (!chosenOpt) continue;

    const answerTimestamp = item.answeredAt && !isNaN(new Date(item.answeredAt).getTime())
      ? new Date(item.answeredAt).toISOString()
      : now.toISOString();

    const inserted = await tx<Array<{ selected_option_id: string }>>`
      INSERT INTO attempt_answers (attempt_id, question_id, selected_option_id, answered_at, revision)
      VALUES (${payload.packId}::uuid, ${item.questionId}::uuid, ${chosenOpt.id}::uuid, ${answerTimestamp}::timestamptz, 1)
      ON CONFLICT (attempt_id, question_id) DO NOTHING
      RETURNING selected_option_id
    `;

    if (inserted.length > 0) {
      newlySynced++;
      const isCorrect = chosenOpt.id === qRow.correct_option_id;

      // Record scored response event
      await tx`
        INSERT INTO scored_response_events (
          attempt_id, question_id, user_id, subject_id, topic_id, mode, answered, is_correct, difficulty, scored_at, editorial_revision
        )
        VALUES (
          ${payload.packId}::uuid, ${item.questionId}::uuid, ${userId}::uuid,
          ${qRow.subject_id}::uuid, ${qRow.topic_id}::uuid, 'practice', true, ${isCorrect},
          COALESCE(${qRow.snapshot.difficulty || 'medium'}, 'medium'),
          ${now.toISOString()}::timestamptz,
          COALESCE(${qRow.snapshot.editorialRevision || 1}, 1)
        )
        ON CONFLICT DO NOTHING
      `;

      // Update topic mastery
      await recordTopicMasteryBatch(tx, userId, [{
        subjectId: qRow.subject_id,
        topicId: qRow.topic_id,
        isCorrect,
      }], now);

      // Record study goal / streak progress
      const goalRes = await recordAcceptedStudyGoalEvent(tx, {
        userId,
        attemptId: payload.packId,
        questionId: item.questionId,
        mode: 'practice',
        now,
      });

      if (goalRes.justQualified || goalRes.qualifiedToday) {
        streakUpdated = true;
      }
    }
  }

  // Count total answers and total questions
  const [progress] = await tx<Array<{ total: number; answered: number }>>`
    SELECT
      count(aq.id)::int AS total,
      count(aa.selected_option_id)::int AS answered
    FROM attempt_questions aq
    LEFT JOIN attempt_answers aa ON aa.attempt_id = aq.attempt_id AND aa.question_id = aq.question_id
    WHERE aq.attempt_id = ${payload.packId}::uuid
  `;

  const isCompleted = Number(progress.total) > 0 && Number(progress.answered) >= Number(progress.total);
  if (isCompleted && attempt.status !== 'completed') {
    await tx`
      UPDATE attempts
      SET status = 'completed', completed_at = ${now.toISOString()}::timestamptz
      WHERE id = ${payload.packId}::uuid
    `;
  }

  return {
    success: true,
    syncedCount: newlySynced,
    totalAnswered: Number(progress.answered),
    totalQuestions: Number(progress.total),
    isCompleted,
    streakUpdated,
  };
}
