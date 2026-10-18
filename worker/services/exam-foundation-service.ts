/**
 * Portable Production CBT Exam Foundation Service (T03)
 *
 * Applies the T02-verified database-side aggregation and single-statement SERIALIZABLE
 * transaction architecture to production tables with real COMMIT semantics:
 * - Zero spike rollback sentinels (`INTENTIONAL_SPIKE_ROLLBACK`).
 * - Zero `commitSyntheticSql` or `jambprep_benchmark_*` schemas.
 * - Explicit field allowlist for 180-question payload JSON (never exposes is_correct or explanations).
 * - Atomic single-statement CTE for answer upsert with row lock (`FOR UPDATE`), deadline check,
 *   membership validation, and monotonic revision enforcement.
 * - Atomic single-statement CTE for attempt finalization & 400-mark UTME scaling under SERIALIZABLE
 *   isolation with bounded 40001/40P01 retry.
 */

import { assertActorOwnership } from '../api/authorization';
import { RequestDbContext, SqlTagExecutor } from '../api/db-context';
import { ApiError } from '../api/errors';
import {
  recordAcceptedStudyGoalEvent,
  recordCompletedMockStreakQualification,
} from './study-schedule-service';

export const MAX_EXAM_PAYLOAD_UTF8_BYTES = 512 * 1024; // 512 KB

const FORBIDDEN_PAYLOAD_FIELD_REGEX =
  /"(?:isCorrect|is_correct|explanation|correctOption|correctOptionId|correct_option_id|frozen_explanation|verifiedBy|verified_by)"\s*:/;

/**
 * Verifies that an aggregated exam payload JSON string is within the 512 KB UTF-8 byte ceiling
 * and never contains privileged answer-key or explanation fields.
 */
export function assertSafeExamPayloadJson(jsonText: string): void {
  const byteLength = new TextEncoder().encode(jsonText).byteLength;
  if (byteLength > MAX_EXAM_PAYLOAD_UTF8_BYTES) {
    throw new ApiError({
      status: 500,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Serialized exam payload exceeds maximum safe transport size.',
    });
  }
  if (FORBIDDEN_PAYLOAD_FIELD_REGEX.test(jsonText)) {
    throw new ApiError({
      status: 500,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Security policy violation in exam payload serialization.',
    });
  }
}

export interface OwnedExamPayloadResult {
  attemptId: string;
  status: string;
  startedAt: string;
  expiresAt: string;
  totalQuestions: number;
  examConditions: boolean;
  questionsJson: string;
  selectionWarnings: string[];
}

/**
 * Fetches an owned exam attempt and its 180 frozen questions aggregated in PostgreSQL
 * using an explicit safe column allowlist.
 */
export async function getOwnedAttemptPayloadJson(
  sql: SqlTagExecutor,
  params: {
    attemptId: string;
    userId: string;
  }
): Promise<OwnedExamPayloadResult> {
  const rows = await sql<
    Array<{
      attempt_id: string;
      user_id: string;
      status: string;
      started_at: string | Date;
      expires_at: string | Date;
      total_questions: number | string;
      exam_conditions?: boolean;
      questions_json: string;
      selection_warnings?:string[];
    }>
  >`
    WITH target_attempt AS (
      SELECT id,user_id,status,started_at,expires_at,exam_conditions,blueprint_manifest FROM attempts
      WHERE id=${params.attemptId}::uuid AND user_id=${params.userId}::uuid AND mode='mock'
    ), ordered_questions AS (
      SELECT aq.position, aq.snapshot || jsonb_build_object('isFlagged',aq.is_flagged,'selectedOptionId',aa.selected_option_id,'revision',COALESCE(aa.revision,0)) AS payload
      FROM target_attempt ta JOIN attempt_questions aq ON aq.attempt_id=ta.id
      LEFT JOIN attempt_answers aa ON aa.attempt_id=ta.id AND aa.question_id=aq.question_id
      WHERE aq.snapshot IS NOT NULL
    ) SELECT ta.id AS attempt_id,ta.user_id,ta.status,ta.started_at,ta.expires_at,ta.exam_conditions,
      COALESCE((SELECT jsonb_agg(DISTINCT warning) FROM jsonb_array_elements(COALESCE(ta.blueprint_manifest->'subjects','[]'::jsonb)) subject CROSS JOIN LATERAL jsonb_array_elements_text(COALESCE(subject->'warnings','[]'::jsonb)) warning),'[]'::jsonb) AS selection_warnings,
      (SELECT COUNT(*)::int FROM ordered_questions) AS total_questions,
      COALESCE((SELECT jsonb_agg(payload ORDER BY position)::text FROM ordered_questions),'[]') AS questions_json FROM target_attempt ta
  `;

  const row = rows[0];
  if (!row) {
    throw new ApiError({
      status: 404,
      code: 'NOT_FOUND',
      message: 'Exam attempt not found.',
    });
  }

  assertActorOwnership({ userId: params.userId }, row.user_id);
  assertSafeExamPayloadJson(row.questions_json);
  if (Number(row.total_questions) !== 180) throw new ApiError({ status: 503, code: 'SERVICE_UNAVAILABLE', message: 'This attempt has no complete frozen exam. Contact support to recover it.' });

  return {
    attemptId: row.attempt_id,
    status: row.status,
    startedAt: new Date(row.started_at).toISOString(),
    expiresAt: new Date(row.expires_at).toISOString(),
    totalQuestions: Number(row.total_questions),
    examConditions: Boolean(row.exam_conditions),
    questionsJson: row.questions_json,selectionWarnings:row.selection_warnings??[],
  };
}

export interface UpsertExamAnswerResult {
  acknowledged: true;
  attemptId: string;
  questionId: string;
  selectedOptionId: string | null;
  revision: number;
  savedAt: string;
}

/**
 * Atomically upserts a single exam answer inside a committed SERIALIZABLE transaction.
 * Locks the parent `attempts` row with FOR UPDATE to serialize against concurrent submission,
 * validates ownership, active status, server clock window, question/option membership, and
 * monotonic revision ordering in a single SQL statement.
 */
export async function upsertOwnedExamAnswerAtomic(
  dbCtx: RequestDbContext,
  params: {
    attemptId: string;
    userId: string;
    questionId: string;
    selectedOptionId: string | null;
    revision?: number;
    serverReceivedAt?: string;
  }
): Promise<UpsertExamAnswerResult> {
  const revision = params.revision ?? 1;
  const serverReceivedAt = params.serverReceivedAt ?? new Date().toISOString();

  return await dbCtx.runSerializableTransaction(async (tx) => {
    const rows = await tx<
      Array<{
        attempt_exists: boolean;
        owner_matches: boolean;
        status_active: boolean;
        within_window: boolean;
        membership_valid: boolean;
        ack_revision: number | null;
      }>
    >`
      WITH target_attempt AS (
        SELECT id, user_id, status, started_at, expires_at
        FROM attempts
        WHERE id = ${params.attemptId}::uuid
        AND user_id = ${params.userId}::uuid AND mode='mock'
        FOR UPDATE
      ),
      active_owned_attempt AS (
        SELECT id
        FROM target_attempt
        WHERE user_id = ${params.userId}::uuid
          AND status = 'in_progress'
          AND started_at <= ${serverReceivedAt}::timestamptz
          AND expires_at > ${serverReceivedAt}::timestamptz
      ),
      valid_membership AS (
        SELECT aq.question_id, ${params.selectedOptionId}::uuid AS option_id
        FROM active_owned_attempt aoa JOIN attempt_questions aq ON aq.attempt_id=aoa.id AND aq.question_id=${params.questionId}::uuid
        WHERE aq.snapshot IS NOT NULL AND (${params.selectedOptionId}::uuid IS NULL OR EXISTS (
          SELECT 1 FROM jsonb_array_elements(aq.snapshot->'options') item WHERE item->>'id'=${params.selectedOptionId}::text))
      ),
      upserted AS (
        INSERT INTO attempt_answers (
          attempt_id,
          question_id,
          selected_option_id,
          revision,
          answered_at
        )
        SELECT
          ${params.attemptId}::uuid,
          vm.question_id,
          vm.option_id,
          ${revision}::int,
          ${serverReceivedAt}::timestamptz
        FROM valid_membership vm
        ON CONFLICT (attempt_id, question_id) DO UPDATE
        SET
          selected_option_id = EXCLUDED.selected_option_id,
          revision = EXCLUDED.revision,
          answered_at = EXCLUDED.answered_at
        WHERE attempt_answers.revision < EXCLUDED.revision OR (attempt_answers.revision = EXCLUDED.revision AND attempt_answers.selected_option_id IS NOT DISTINCT FROM EXCLUDED.selected_option_id)
        RETURNING revision
      )
      SELECT
        EXISTS (SELECT 1 FROM target_attempt) AS attempt_exists,
        EXISTS (SELECT 1 FROM target_attempt WHERE user_id = ${params.userId}::uuid) AS owner_matches,
        EXISTS (SELECT 1 FROM target_attempt WHERE user_id = ${params.userId}::uuid AND status = 'in_progress') AS status_active,
        EXISTS (SELECT 1 FROM active_owned_attempt) AS within_window,
        EXISTS (SELECT 1 FROM valid_membership) AS membership_valid,
        (SELECT revision FROM upserted LIMIT 1) AS ack_revision
    `;

    const outcome = rows[0];
    if (!outcome || !outcome.attempt_exists) {
      throw new ApiError({
        status: 404,
        code: 'NOT_FOUND',
        message: 'Exam attempt not found.',
      });
    }
    if (!outcome.owner_matches) {
      throw new ApiError({
        status: 403,
        code: 'FORBIDDEN_NOT_OWNER',
        message: 'You do not own this exam attempt.',
      });
    }
    if (!outcome.status_active) {
      throw new ApiError({
        status: 409,
        code: 'ATTEMPT_NOT_ACTIVE',
        message: 'Exam attempt is no longer active.',
      });
    }
    if (!outcome.within_window) {
      throw new ApiError({
        status: 409,
        code: 'ATTEMPT_EXPIRED',
        message: 'Exam attempt timer has expired.',
      });
    }
    if (!outcome.membership_valid) {
      throw new ApiError({
        status: 422,
        code: 'INVALID_QUESTION_MEMBERSHIP',
        message: 'Question or option does not belong to this exam attempt.',
      });
    }
    if (outcome.ack_revision === null || outcome.ack_revision === undefined) {
      throw new ApiError({
        status: 409,
        code: 'STALE_ANSWER_REVISION',
        message: 'Answer update rejected because a newer revision is already saved.',
      });
    }

    if (params.selectedOptionId !== null) {
      await recordAcceptedStudyGoalEvent(
        tx,
        {
          userId: params.userId,
          attemptId: params.attemptId,
          questionId: params.questionId,
          mode: 'mock',
          now: new Date(serverReceivedAt),
        }
      );
    }

    return {
      acknowledged: true,
      attemptId: params.attemptId,
      questionId: params.questionId,
      selectedOptionId: params.selectedOptionId,
      revision: Number(outcome.ack_revision),
      savedAt: serverReceivedAt,
    };
  });
}

export interface SubmitAndScoreExamResult {
  attemptId: string;
  totalScore: number;
  englishScore: number;
  subject2Score: number;
  subject3Score: number;
  subject4Score: number;
  totalCorrect: number;
  totalAnsweredTimely: number;
  timeSpentSeconds: number;
  completedAt: string;
}

/**
 * Atomically finalizes and scores an owned exam attempt inside a committed SERIALIZABLE transaction.
 * Locks the parent `attempts` row with FOR UPDATE, scores only server-stored timely answers
 * (`saved_at <= expires_at`), inserts `attempt_results`, and transitions `attempts.status = 'completed'`.
 */
export async function submitAndScoreExamAttemptAtomic(
  dbCtx: RequestDbContext,
  params: {
    attemptId: string;
    userId: string;
    serverSubmittedAt?: string;
  }
): Promise<SubmitAndScoreExamResult> {
  const serverSubmittedAt = params.serverSubmittedAt ?? new Date().toISOString();

  return await dbCtx.runSerializableTransaction(async (tx) => {
    const replay = await tx<Array<{ total_score: number; english_score: number; subject2_score: number; subject3_score: number; subject4_score: number; total_correct: number; total_answered: number; time_spent_seconds: number; created_at: string }>>`
      SELECT ar.* FROM attempts a JOIN attempt_results ar ON ar.attempt_id=a.id WHERE a.id=${params.attemptId}::uuid AND a.user_id=${params.userId}::uuid AND a.status='completed' AND a.mode='mock'`;
    if (replay[0]) { const r=replay[0]; return { attemptId: params.attemptId,totalScore:r.total_score,englishScore:r.english_score,subject2Score:r.subject2_score,subject3Score:r.subject3_score,subject4Score:r.subject4_score,totalCorrect:r.total_correct,totalAnsweredTimely:r.total_answered,timeSpentSeconds:r.time_spent_seconds,completedAt:new Date(r.created_at).toISOString() }; }
    const rows = await tx<
      Array<{
        attempt_exists: boolean;
        owner_matches: boolean;
        status_active: boolean;
        inserted_result_id: string | null;
        updated_attempt_id: string | null;
        total_score: number;
        english_score: number;
        subject_2_score: number;
        subject_3_score: number;
        subject_4_score: number;
        total_correct: number;
        total_answered_timely: number;
        time_spent_seconds: number;
      }>
    >`
      WITH locked_attempt AS (
        SELECT id, user_id, status, started_at, expires_at
        FROM attempts
        WHERE id = ${params.attemptId}::uuid
        AND user_id = ${params.userId}::uuid AND mode='mock'
        FOR UPDATE
      ),
      active_owned AS (
        SELECT
          id,
          user_id,
          started_at,
          expires_at,
          GREATEST(
            0,
            LEAST(
              7200,
              EXTRACT(EPOCH FROM (LEAST(${serverSubmittedAt}::timestamptz, expires_at) - started_at))::int
            )
          ) AS time_spent_seconds
        FROM locked_attempt
        WHERE user_id = ${params.userId}::uuid
          AND status = 'in_progress'
          AND (SELECT COUNT(*) FROM attempt_questions aq WHERE aq.attempt_id=locked_attempt.id AND aq.snapshot IS NOT NULL AND aq.correct_option_id IS NOT NULL)=180
      ),
      subject_slots AS (
        SELECT
          aq.subject_id,
          aq.snapshot->>'subjectCode' AS subject_code,
          (aq.snapshot->>'subjectCode'='ENG') AS is_compulsory,
          MIN(aq.position) AS first_pos,
          COUNT(*)::int AS total_questions,
          COUNT(aa.id) FILTER (WHERE aa.answered_at <= ao.expires_at AND aa.selected_option_id IS NOT NULL)::int AS timely_answered,
          COUNT(aa.id) FILTER (WHERE aa.answered_at <= ao.expires_at AND aa.selected_option_id = aq.correct_option_id)::int AS raw_correct
        FROM active_owned ao
        INNER JOIN attempt_questions aq ON aq.attempt_id = ao.id
        LEFT JOIN attempt_answers aa
          ON aa.attempt_id = ao.id AND aa.question_id = aq.question_id
        GROUP BY aq.subject_id,aq.snapshot->>'subjectCode'
      ),
      ranked_subjects AS (
        SELECT
          subject_id,
          subject_code,
          is_compulsory,
          total_questions,
          timely_answered,
          raw_correct,
          ROUND((raw_correct::numeric / GREATEST(total_questions, 1)::numeric) * 100)::int AS scaled_score,
          ROW_NUMBER() OVER (ORDER BY is_compulsory DESC, first_pos ASC) AS slot_num
        FROM subject_slots
      ),
      aggregated_scores AS (
        SELECT
          COALESCE(MAX(scaled_score) FILTER (WHERE slot_num = 1), 0)::int AS english_score,
          COALESCE(MAX(scaled_score) FILTER (WHERE slot_num = 2), 0)::int AS subject_2_score,
          COALESCE(MAX(scaled_score) FILTER (WHERE slot_num = 3), 0)::int AS subject_3_score,
          COALESCE(MAX(scaled_score) FILTER (WHERE slot_num = 4), 0)::int AS subject_4_score,
          COALESCE(SUM(scaled_score), 0)::int AS total_score,
          COALESCE(SUM(raw_correct), 0)::int AS total_correct,
          COALESCE(SUM(timely_answered), 0)::int AS total_answered_timely
        FROM ranked_subjects
      ),
      topic_breakdown AS (
        SELECT aq.subject_id AS "subjectId", aq.topic_id AS "topicId", aq.snapshot->>'topicTitle' AS "topicTitle", aq.snapshot->>'subjectCode' AS "subjectCode",
          COUNT(*)::int AS total, COUNT(aa.id) FILTER (WHERE aa.answered_at<=ao.expires_at AND aa.selected_option_id=aq.correct_option_id)::int AS correct
        FROM active_owned ao JOIN attempt_questions aq ON aq.attempt_id=ao.id
        LEFT JOIN attempt_answers aa ON aa.attempt_id=ao.id AND aa.question_id=aq.question_id
        GROUP BY aq.subject_id,aq.topic_id,aq.snapshot->>'topicTitle',aq.snapshot->>'subjectCode'
      ),
      inserted_result AS (
        INSERT INTO attempt_results (
          attempt_id,
          user_id,
          total_score,
          english_score,
          subject2_score,
          subject3_score,
          subject4_score,
          total_answered,
          total_correct,
          topic_breakdown,
          time_spent_seconds,
          created_at
        )
        SELECT
          ao.id,
          ao.user_id,
          ag.total_score,
          ag.english_score,
          ag.subject_2_score,
          ag.subject_3_score,
          ag.subject_4_score,
          ag.total_answered_timely,
          ag.total_correct,
          (SELECT COALESCE(jsonb_agg(tb), '[]'::jsonb) FROM topic_breakdown tb),
          ao.time_spent_seconds,
          ${serverSubmittedAt}::timestamptz
        FROM active_owned ao
        CROSS JOIN aggregated_scores ag
        ON CONFLICT (attempt_id) DO NOTHING
        RETURNING id
      ),
      recorded_evidence AS (
        INSERT INTO scored_response_events(attempt_id,question_id,user_id,subject_id,topic_id,mode,answered,is_correct,difficulty,scored_at,editorial_revision)
        SELECT aq.attempt_id,aq.question_id,ao.user_id,aq.subject_id,aq.topic_id,'mock',
        aa.selected_option_id IS NOT NULL AND aa.answered_at<=ao.expires_at,
        COALESCE(aa.selected_option_id=aq.correct_option_id AND aa.answered_at<=ao.expires_at,false),
        COALESCE(aq.snapshot->>'difficulty','medium'),${serverSubmittedAt}::timestamptz,COALESCE((aq.snapshot->>'editorialRevision')::int,1)
        FROM active_owned ao JOIN attempt_questions aq ON aq.attempt_id=ao.id
        LEFT JOIN attempt_answers aa ON aa.attempt_id=aq.attempt_id AND aa.question_id=aq.question_id CROSS JOIN inserted_result ir
        WHERE aq.topic_id IS NOT NULL ON CONFLICT DO NOTHING RETURNING question_id
      ),
      updated_mastery AS (
        INSERT INTO student_topic_mastery (user_id,subject_id,topic_id,total_attempted,total_correct,accuracy_percent,last_practiced_at)
        SELECT ${params.userId}::uuid,tb."subjectId",tb."topicId",tb.total,tb.correct,ROUND(100.0*tb.correct/GREATEST(tb.total,1))::int,${serverSubmittedAt}::timestamptz
        FROM topic_breakdown tb CROSS JOIN inserted_result ir WHERE tb."topicId" IS NOT NULL
        ON CONFLICT (user_id,topic_id) DO UPDATE SET total_attempted=student_topic_mastery.total_attempted+EXCLUDED.total_attempted,total_correct=student_topic_mastery.total_correct+EXCLUDED.total_correct,
          accuracy_percent=ROUND(100.0*(student_topic_mastery.total_correct+EXCLUDED.total_correct)/GREATEST(student_topic_mastery.total_attempted+EXCLUDED.total_attempted,1))::int,last_practiced_at=EXCLUDED.last_practiced_at
        RETURNING id
      ),
      updated_attempt AS (
        UPDATE attempts a
        SET
          status = 'completed',
          completed_at = ${serverSubmittedAt}::timestamptz
        FROM active_owned ao, inserted_result ir
        WHERE a.id = ao.id
          AND a.status = 'in_progress'
          AND ir.id IS NOT NULL
        RETURNING a.id
      )
      SELECT
        EXISTS (SELECT 1 FROM locked_attempt) AS attempt_exists,
        EXISTS (SELECT 1 FROM locked_attempt WHERE user_id = ${params.userId}::uuid) AS owner_matches,
        EXISTS (SELECT 1 FROM active_owned) AS status_active,
        (SELECT id FROM inserted_result LIMIT 1) AS inserted_result_id,
        (SELECT id FROM updated_attempt LIMIT 1) AS updated_attempt_id,
        ag.total_score,
        ag.english_score,
        ag.subject_2_score,
        ag.subject_3_score,
        ag.subject_4_score,
        ag.total_correct,
        ag.total_answered_timely,
        COALESCE((SELECT time_spent_seconds FROM active_owned LIMIT 1), 0) AS time_spent_seconds
      FROM aggregated_scores ag
    `;

    const outcome = rows[0];
    if (!outcome || !outcome.attempt_exists) {
      throw new ApiError({
        status: 404,
        code: 'NOT_FOUND',
        message: 'Exam attempt not found.',
      });
    }
    if (!outcome.owner_matches) {
      throw new ApiError({
        status: 403,
        code: 'FORBIDDEN_NOT_OWNER',
        message: 'You do not own this exam attempt.',
      });
    }
    if (!outcome.status_active || !outcome.inserted_result_id || !outcome.updated_attempt_id) {
      throw new ApiError({
        status: 409,
        code: 'ATTEMPT_NOT_ACTIVE',
        message: 'Exam attempt has already been submitted or is no longer active.',
      });
    }

    // Completing any CBT mock simulation automatically qualifies today's study streak
    await recordCompletedMockStreakQualification(tx, {
      userId: params.userId,
      attemptId: params.attemptId,
      now: new Date(serverSubmittedAt),
    });

    return {
      attemptId: params.attemptId,
      totalScore: Number(outcome.total_score),
      englishScore: Number(outcome.english_score),
      subject2Score: Number(outcome.subject_2_score),
      subject3Score: Number(outcome.subject_3_score),
      subject4Score: Number(outcome.subject_4_score),
      totalCorrect: Number(outcome.total_correct),
      totalAnsweredTimely: Number(outcome.total_answered_timely),
      timeSpentSeconds: Number(outcome.time_spent_seconds),
      completedAt: serverSubmittedAt,
    };
  });
}
