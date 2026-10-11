/**
 * Portable Study Coach & Topic Mastery Service (T03)
 *
 * Extracted from `src/lib/coach.ts`:
 * - Zero Next/React/OpenNext imports.
 * - Replaces N+1 read-then-write mastery loop with atomic SQL ON CONFLICT (user_id, topic_id) DO UPDATE.
 * - Removes 3,500 ms Promise.race silent fallback that masked database errors with empty defaults.
 */

import { SqlTagExecutor } from '../api/db-context';

export interface WeakTopicItem {
  topicId: string;
  topicTitle: string;
  topicSlug: string;
  subjectCode: string;
  subjectName: string;
  accuracyPercent: number;
  totalAttempted: number;
  totalCorrect: number;
  priority: 'critical' | 'review';
}

export interface SubjectMasterySummary {
  subjectId: string;
  questionsCorrect: number;
  subjectCode: string;
  subjectName: string;
  isCompulsory: boolean;
  estimatedScore: number;
  accuracyPercent: number;
  questionsAttempted: number;
  weakTopicsCount: number;
  masteredTopicsCount: number;
}

export interface CoachInsights {
  hasActivity: boolean;
  targetScore: number;
  targetInstitution?: string | null;
  targetCourse?: string | null;
  totalMocksCompleted: number;
  latestScore: number | null;
  bestScore: number | null;
  gapToTarget: number;
  weakestTopics: WeakTopicItem[];
  masteredTopics: Array<{
    topicTitle: string;
    subjectCode: string;
    accuracyPercent: number;
    totalAttempted: number;
  }>;
  subjectSummaries: SubjectMasterySummary[];
  recentMockHistory: Array<{
    attemptId: string;
    totalScore: number;
    englishScore: number;
    subject2Score: number;
    subject3Score: number;
    subject4Score: number;
    completedAt: string;
    timeSpentSeconds: number;
  }>;
  coachRecommendation: {
    badge: string;
    headline: string;
    explanation: string;
    suggestedSubjectCode: string;
    suggestedTopicSlug?: string;
    suggestedTopicTitle?: string;
    potentialGainPoints: number;
  };
}

export function getDefaultCoachInsights(targetScore: number = 280): CoachInsights {
  return {
    hasActivity: false,
    targetScore,
    targetInstitution: null,
    targetCourse: null,
    totalMocksCompleted: 0,
    latestScore: null,
    bestScore: null,
    gapToTarget: targetScore,
    weakestTopics: [],
    masteredTopics: [],
    subjectSummaries: [],
    recentMockHistory: [],
    coachRecommendation: {
      badge: 'BENCHMARK DIAGNOSTIC NEEDED',
      headline: 'Take your baseline diagnostic mock exam.',
      explanation:
        "You haven't completed a full CBT simulation yet. Take a 180-question mock exam to uncover your starting scores across English and electives so your coach can generate your revision plan.",
      suggestedSubjectCode: 'ENG',
      potentialGainPoints: 45,
    },
  };
}

/**
 * Atomically upserts topic mastery counters for a student using SQL ON CONFLICT (user_id, topic_id) DO UPDATE.
 */
export async function recordTopicMasteryBatch(
  sql: SqlTagExecutor,
  userId: string,
  records: ReadonlyArray<{
    subjectId: string;
    topicId: string;
    isCorrect: boolean;
  }>,
  now: Date = new Date()
): Promise<void> {
  if (records.length === 0) {
    return;
  }

  const aggregated = new Map<string, { subjectId: string; total: number; correct: number }>();
  for (const r of records) {
    const entry = aggregated.get(r.topicId) ?? {
      subjectId: r.subjectId,
      total: 0,
      correct: 0,
    };
    entry.total += 1;
    if (r.isCorrect) {
      entry.correct += 1;
    }
    aggregated.set(r.topicId, entry);
  }

  const nowIso = now.toISOString();

  for (const [topicId, data] of aggregated.entries()) {
    const initialAccuracy = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0;
    await sql`
      INSERT INTO student_topic_mastery (
        user_id,
        subject_id,
        topic_id,
        total_attempted,
        total_correct,
        accuracy_percent,
        last_practiced_at
      )
      VALUES (
        ${userId}::uuid,
        ${data.subjectId}::uuid,
        ${topicId}::uuid,
        ${data.total},
        ${data.correct},
        ${initialAccuracy},
        ${nowIso}::timestamptz
      )
      ON CONFLICT (user_id, topic_id) DO UPDATE
      SET
        total_attempted = student_topic_mastery.total_attempted + EXCLUDED.total_attempted,
        total_correct = student_topic_mastery.total_correct + EXCLUDED.total_correct,
        accuracy_percent = ROUND(
          ((student_topic_mastery.total_correct + EXCLUDED.total_correct)::numeric /
           GREATEST(student_topic_mastery.total_attempted + EXCLUDED.total_attempted, 1)::numeric) * 100
        )::int,
        last_practiced_at = EXCLUDED.last_practiced_at
    `;
  }
}

/**
 * Computes study coach insights from explicit owner-scoped queries without silent timeout fallbacks.
 */
export async function getStudentCoachInsights(
  sql: SqlTagExecutor,
  userId: string
): Promise<CoachInsights> {
  type PreferenceRow = {
        target_score: number;
        target_institution: string | null;
        target_course: string | null;
      };
  type EnrollmentRow = {
        id: string;
        name: string;
        code: string;
        is_compulsory: boolean;
      };
  type MockResultRow = {
        total_count: number;
        historical_best: number;
        topic_breakdown: {subjectId:string;total:number;correct:number}[];
        attempt_id: string;
        total_score: number;
        english_score: number;
        subject_2_score: number;
        subject_3_score: number;
        subject_4_score: number;
        time_spent_seconds: number;
        created_at: string | Date;
      };
  type MasteryRow = {
        topic_id: string;
        topic_title: string;
        topic_slug: string;
        subject_code: string;
        subject_name: string;
        subject_id: string;
        accuracy_percent: number;
        total_attempted: number;
        total_correct: number;
      };
  type SubjectAggregateRow = {subject_id:string;total_attempted:number;total_correct:number;weak:number;mastered:number};
  const rows = await sql<Array<{pref_rows: PreferenceRow[];enrolled_rows: EnrollmentRow[];completed_results: MockResultRow[];mastery_rows: MasteryRow[];aggregate_rows: SubjectAggregateRow[];}>>`
    WITH     pref_rows AS (SELECT target_score, target_institution, target_course
      FROM student_preferences
      WHERE user_id = ${userId}::uuid
      LIMIT 1),
    enrolled_rows AS (SELECT s.id, s.name, s.code, s.is_compulsory
      FROM student_subjects ss
      INNER JOIN subjects s ON s.id = ss.subject_id
      WHERE ss.user_id = ${userId}::uuid
      ORDER BY s.is_compulsory DESC, s.display_order ASC, s.code ASC),
    completed_results AS (SELECT
        COUNT(*) OVER()::int AS total_count,
        MAX(total_score) OVER()::int AS historical_best,
        topic_breakdown,
        attempt_id,
        total_score,
        english_score,
        subject2_score AS subject_2_score,
        subject3_score AS subject_3_score,
        subject4_score AS subject_4_score,
        time_spent_seconds,
        created_at
      FROM attempt_results
      WHERE user_id = ${userId}::uuid
      ORDER BY created_at DESC
      LIMIT 10),
    mastery_rows AS (WITH sampled AS (SELECT *,ROW_NUMBER() OVER(PARTITION BY (accuracy_percent<65) ORDER BY accuracy_percent,topic_id) AS sample_rank FROM student_topic_mastery WHERE user_id=${userId}::uuid)
      SELECT
        stm.topic_id,
        t.title AS topic_title,
        t.slug AS topic_slug,
        s.code AS subject_code,
        s.name AS subject_name,
        stm.subject_id,
        stm.accuracy_percent,
        stm.total_attempted,
        stm.total_correct
      FROM sampled stm
      INNER JOIN topics t ON t.id = stm.topic_id
      INNER JOIN subjects s ON s.id = stm.subject_id
      WHERE (stm.accuracy_percent<65 AND stm.sample_rank<=5) OR (stm.accuracy_percent>=75 AND stm.sample_rank<=20)
      ORDER BY stm.accuracy_percent ASC),
    aggregate_rows AS (SELECT subject_id,SUM(total_attempted)::int AS total_attempted,SUM(total_correct)::int AS total_correct,COUNT(*) FILTER(WHERE accuracy_percent<65)::int AS weak,COUNT(*) FILTER(WHERE accuracy_percent>=75)::int AS mastered FROM student_topic_mastery WHERE user_id=${userId}::uuid GROUP BY subject_id)
    SELECT
      COALESCE((SELECT jsonb_agg(to_jsonb(r)) FROM pref_rows r),'[]'::jsonb) AS pref_rows,
      COALESCE((SELECT jsonb_agg(to_jsonb(r)) FROM enrolled_rows r),'[]'::jsonb) AS enrolled_rows,
      COALESCE((SELECT jsonb_agg(to_jsonb(r) ORDER BY r.created_at DESC) FROM completed_results r),'[]'::jsonb) AS completed_results,
      COALESCE((SELECT jsonb_agg(to_jsonb(r) ORDER BY r.accuracy_percent ASC) FROM mastery_rows r),'[]'::jsonb) AS mastery_rows,
      COALESCE((SELECT jsonb_agg(to_jsonb(r)) FROM aggregate_rows r),'[]'::jsonb) AS aggregate_rows
  `;
  const snapshot = rows[0];
  if (!snapshot) throw new Error("Coach aggregate was unavailable.");
  const {pref_rows:prefRows,enrolled_rows:enrolledRows,completed_results:completedResults,mastery_rows:masteryRows,aggregate_rows:aggregateRows}=snapshot;
  const pref = prefRows[0];
  const targetScore = pref?.target_score || 280;
  const enrolledSubs = enrolledRows;

  const totalMocksCompleted = Number(completedResults[0]?.total_count ?? 0);
  const latestScore = completedResults[0]?.total_score ?? null;
  const bestScore =
    completedResults[0]?.historical_best ?? null;
  const gapToTarget =
    latestScore !== null ? Math.max(0, targetScore - latestScore) : targetScore;

  const weakestTopics: WeakTopicItem[] = masteryRows
    .filter((m) => m.accuracy_percent < 65)
    .slice(0, 5)
    .map((m) => ({
      topicId: m.topic_id,
      topicTitle: m.topic_title,
      topicSlug: m.topic_slug,
      subjectCode: m.subject_code,
      subjectName: m.subject_name,
      accuracyPercent: m.accuracy_percent,
      totalAttempted: m.total_attempted,
      totalCorrect: m.total_correct,
      priority: m.accuracy_percent < 45 ? 'critical' : 'review',
    }));

  const masteredTopics = masteryRows
    .filter((m) => m.accuracy_percent >= 75)
    .map((m) => ({
      topicTitle: m.topic_title,
      subjectCode: m.subject_code,
      accuracyPercent: m.accuracy_percent,
      totalAttempted: m.total_attempted,
    }));

  const subjectSummaries: SubjectMasterySummary[] = enrolledSubs.map((sub, idx) => {
    // Historical elective slots may belong to a different combination. Match frozen subject IDs.
    const scores = completedResults.flatMap(result => {
      const topics=(Array.isArray(result.topic_breakdown)?result.topic_breakdown:[]).filter(topic=>topic.subjectId===sub.id);
      const total=topics.reduce((sum,topic)=>sum+Number(topic.total),0);
      return total>0 ? [Math.round(100*topics.reduce((sum,topic)=>sum+Number(topic.correct),0)/total)] : [];
    });
    const avgSubjectScore = scores.length ? Math.round(scores.reduce((a,b)=>a+b,0)/scores.length) : 0;

    const aggregate = aggregateRows.find(row=>row.subject_id===sub.id);
    const totalAttempted = Number(aggregate?.total_attempted??0);
    const totalCorrect = Number(aggregate?.total_correct??0);
    const accuracy = totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : 0;

    return {
      subjectId: sub.id,
      questionsCorrect: totalCorrect,
      subjectCode: sub.code,
      subjectName: sub.name,
      isCompulsory: sub.is_compulsory,
      estimatedScore: scores.length > 0 ? avgSubjectScore : accuracy,
      accuracyPercent: accuracy,
      questionsAttempted: totalAttempted,
      weakTopicsCount: Number(aggregate?.weak??0),
      masteredTopicsCount: Number(aggregate?.mastered??0),
    };
  });

  const hasActivity = totalMocksCompleted > 0 || aggregateRows.length > 0;

  let coachRecommendation: CoachInsights['coachRecommendation'] = {
    badge: 'BENCHMARK DIAGNOSTIC NEEDED',
    headline: 'Take your baseline diagnostic mock exam.',
    explanation:
      "You haven't completed a full CBT simulation yet. Take a 180-question mock exam to uncover your starting scores across English and electives so your coach can generate your revision plan.",
    suggestedSubjectCode: enrolledSubs[0]?.code || 'ENG',
    potentialGainPoints: 45,
  };

  if (weakestTopics.length > 0) {
    const primaryWeak = weakestTopics[0];
    const secondaryWeak = weakestTopics[1];
    const estGain = Math.min(60, Math.round((100 - primaryWeak.accuracyPercent) * 0.4) + 15);

    coachRecommendation = {
      badge:
        primaryWeak.priority === 'critical'
          ? 'HIGH LEVERAGE OPPORTUNITY'
          : 'RECOMMENDED REVISION',
      headline: `Target ${primaryWeak.topicTitle} in ${primaryWeak.subjectName}.`,
      explanation: `Your accuracy is currently ${primaryWeak.accuracyPercent}% (${primaryWeak.totalCorrect}/${primaryWeak.totalAttempted} correct). Focusing on ${primaryWeak.topicTitle}${secondaryWeak ? ` and ${secondaryWeak.topicTitle}` : ''} before your next full mock will recover an estimated +${estGain} aggregate marks toward your ${targetScore} goal.`,
      suggestedSubjectCode: primaryWeak.subjectCode,
      suggestedTopicSlug: primaryWeak.topicSlug,
      suggestedTopicTitle: primaryWeak.topicTitle,
      potentialGainPoints: estGain,
    };
  } else if (hasActivity) {
    coachRecommendation = {
      badge: 'EXCELLENT MOMENTUM',
      headline: 'Solid foundation! Take another timed simulation.',
      explanation:
        'You have reviewed your initial topics. Now take another full 120-minute CBT simulation to test your timing and pacing under real exam hall conditions.',
      suggestedSubjectCode: enrolledSubs[0]?.code || 'ENG',
      potentialGainPoints: 20,
    };
  }

  return {
    hasActivity,
    targetScore,
    targetInstitution: pref?.target_institution ?? null,
    targetCourse: pref?.target_course ?? null,
    totalMocksCompleted,
    latestScore,
    bestScore,
    gapToTarget,
    weakestTopics,
    masteredTopics,
    subjectSummaries,
    recentMockHistory: completedResults.map((r) => ({
      attemptId: r.attempt_id,
      totalScore: r.total_score,
      englishScore: r.english_score,
      subject2Score: r.subject_2_score,
      subject3Score: r.subject_3_score,
      subject4Score: r.subject_4_score,
      completedAt: new Date(r.created_at).toISOString(),
      timeSpentSeconds: r.time_spent_seconds,
    })),
    coachRecommendation,
  };
}
