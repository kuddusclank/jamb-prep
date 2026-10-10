import { db } from "@/db";
import { 
  studentTopicMastery, 
  topics, 
  subjects, 
  attemptResults, 
  attempts, 
  studentPreferences,
  studentSubjects,
  questions
} from "@/db/schema";
import { eq, and, desc, sql, inArray } from "drizzle-orm";

export interface WeakTopicItem {
  topicId: string;
  topicTitle: string;
  topicSlug: string;
  subjectCode: string;
  subjectName: string;
  accuracyPercent: number;
  totalAttempted: number;
  totalCorrect: number;
  priority: "critical" | "review";
}

export interface SubjectMasterySummary {
  subjectCode: string;
  subjectName: string;
  isCompulsory: boolean;
  estimatedScore: number; // 0 - 100
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
    completedAt: Date;
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

/**
 * Batch updates or inserts topic mastery records for a student.
 */
export async function recordTopicMasteryBatch(
  userId: string,
  records: Array<{
    subjectId: string;
    topicId: string;
    isCorrect: boolean;
  }>
) {
  if (records.length === 0) return;

  // Aggregate incoming records by topicId
  const aggregated: Record<string, { subjectId: string; total: number; correct: number }> = {};
  for (const r of records) {
    if (!aggregated[r.topicId]) {
      aggregated[r.topicId] = { subjectId: r.subjectId, total: 0, correct: 0 };
    }
    aggregated[r.topicId].total += 1;
    if (r.isCorrect) aggregated[r.topicId].correct += 1;
  }

  for (const [topicId, data] of Object.entries(aggregated)) {
    const existing = await db.query.studentTopicMastery.findFirst({
      where: and(
        eq(studentTopicMastery.userId, userId),
        eq(studentTopicMastery.topicId, topicId)
      ),
    });

    if (existing) {
      const newTotal = existing.totalAttempted + data.total;
      const newCorrect = existing.totalCorrect + data.correct;
      const accuracy = newTotal > 0 ? Math.round((newCorrect / newTotal) * 100) : 0;

      await db.update(studentTopicMastery)
        .set({
          totalAttempted: newTotal,
          totalCorrect: newCorrect,
          accuracyPercent: accuracy,
          lastPracticedAt: new Date(),
        })
        .where(eq(studentTopicMastery.id, existing.id));
    } else {
      const accuracy = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0;
      await db.insert(studentTopicMastery).values({
        userId,
        subjectId: data.subjectId,
        topicId,
        totalAttempted: data.total,
        totalCorrect: data.correct,
        accuracyPercent: accuracy,
        lastPracticedAt: new Date(),
      }).onConflictDoNothing();
    }
  }
}

/**
 * Computes deep diagnostic study coach insights for a student.
 */
export async function getStudentCoachInsights(userId: string): Promise<CoachInsights> {
  try {
    const computeInsights = async (): Promise<CoachInsights> => {
      // Fetch all 4 data dimensions in parallel to minimize network roundtrips
      const [pref, enrolled, completedResults, masteryRows] = await Promise.all([
        db.query.studentPreferences.findFirst({
          where: eq(studentPreferences.userId, userId),
        }),
    db
      .select({
        id: subjects.id,
        name: subjects.name,
        code: subjects.code,
        isCompulsory: subjects.isCompulsory,
      })
      .from(studentSubjects)
      .innerJoin(subjects, eq(studentSubjects.subjectId, subjects.id))
      .where(eq(studentSubjects.userId, userId)),
    db
      .select({
        attemptId: attemptResults.attemptId,
        totalScore: attemptResults.totalScore,
        englishScore: attemptResults.englishScore,
        subject2Score: attemptResults.subject2Score,
        subject3Score: attemptResults.subject3Score,
        subject4Score: attemptResults.subject4Score,
        timeSpentSeconds: attemptResults.timeSpentSeconds,
        createdAt: attemptResults.createdAt,
      })
      .from(attemptResults)
      .where(eq(attemptResults.userId, userId))
      .orderBy(desc(attemptResults.createdAt))
      .limit(10),
    db
      .select({
        topicId: studentTopicMastery.topicId,
        topicTitle: topics.title,
        topicSlug: topics.slug,
        subjectCode: subjects.code,
        subjectName: subjects.name,
        subjectId: studentTopicMastery.subjectId,
        accuracyPercent: studentTopicMastery.accuracyPercent,
        totalAttempted: studentTopicMastery.totalAttempted,
        totalCorrect: studentTopicMastery.totalCorrect,
      })
      .from(studentTopicMastery)
      .innerJoin(topics, eq(studentTopicMastery.topicId, topics.id))
      .innerJoin(subjects, eq(studentTopicMastery.subjectId, subjects.id))
      .where(eq(studentTopicMastery.userId, userId))
      .orderBy(studentTopicMastery.accuracyPercent),
  ]);

  const targetScore = pref?.targetScore || 280;
  const enrolledSubs = enrolled.length > 0 ? enrolled : await db.query.subjects.findMany({ limit: 4 });

  const totalMocksCompleted = completedResults.length;
  const latestScore = completedResults[0]?.totalScore ?? null;
  const bestScore = completedResults.reduce((max, r) => Math.max(max, r.totalScore), 0) || null;
  const gapToTarget = latestScore !== null ? Math.max(0, targetScore - latestScore) : targetScore;

  // Group into weak vs mastered
  const weakestTopics: WeakTopicItem[] = masteryRows
    .filter((m) => m.accuracyPercent < 65)
    .slice(0, 5)
    .map((m) => ({
      topicId: m.topicId,
      topicTitle: m.topicTitle,
      topicSlug: m.topicSlug,
      subjectCode: m.subjectCode,
      subjectName: m.subjectName,
      accuracyPercent: m.accuracyPercent,
      totalAttempted: m.totalAttempted,
      totalCorrect: m.totalCorrect,
      priority: m.accuracyPercent < 45 ? "critical" : "review",
    }));

  const masteredTopics = masteryRows
    .filter((m) => m.accuracyPercent >= 75)
    .map((m) => ({
      topicTitle: m.topicTitle,
      subjectCode: m.subjectCode,
      accuracyPercent: m.accuracyPercent,
      totalAttempted: m.totalAttempted,
    }));

  // 5. Subject-Level Summaries
  const subjectSummaries: SubjectMasterySummary[] = enrolledSubs.map((sub, idx) => {
    // Find average score from recent mocks if available
    let avgSubjectScore = 0;
    if (completedResults.length > 0) {
      const scores = completedResults.map((r) => {
        if (sub.isCompulsory) return r.englishScore;
        if (idx === 1) return r.subject2Score;
        if (idx === 2) return r.subject3Score;
        return r.subject4Score;
      });
      avgSubjectScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    }

    const subMastery = masteryRows.filter((m) => m.subjectCode === sub.code);
    const totalAttempted = subMastery.reduce((sum, m) => sum + m.totalAttempted, 0);
    const totalCorrect = subMastery.reduce((sum, m) => sum + m.totalCorrect, 0);
    const accuracy = totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : 0;

    return {
      subjectCode: sub.code,
      subjectName: sub.name,
      isCompulsory: sub.isCompulsory,
      estimatedScore: avgSubjectScore || (accuracy > 0 ? accuracy : 50),
      accuracyPercent: accuracy,
      questionsAttempted: totalAttempted,
      weakTopicsCount: subMastery.filter((m) => m.accuracyPercent < 65).length,
      masteredTopicsCount: subMastery.filter((m) => m.accuracyPercent >= 75).length,
    };
  });

  // 6. Formulate Purposeful Coach Advice ("Know what to study next")
  const hasActivity = totalMocksCompleted > 0 || masteryRows.length > 0;

  let coachRecommendation = {
    badge: "BENCHMARK DIAGNOSTIC NEEDED",
    headline: "Take your baseline diagnostic mock exam.",
    explanation: "You haven't completed a full CBT simulation yet. Take a 180-question mock exam to uncover your starting scores across English and electives so your coach can generate your revision plan.",
    suggestedSubjectCode: enrolledSubs[0]?.code || "ENG",
    suggestedTopicSlug: undefined as string | undefined,
    suggestedTopicTitle: undefined as string | undefined,
    potentialGainPoints: 45,
  };

  if (weakestTopics.length > 0) {
    const primaryWeak = weakestTopics[0];
    const secondaryWeak = weakestTopics[1];
    const estGain = Math.min(60, Math.round((100 - primaryWeak.accuracyPercent) * 0.4) + 15);

    coachRecommendation = {
      badge: primaryWeak.priority === "critical" ? "HIGH LEVERAGE OPPORTUNITY" : "RECOMMENDED REVISION",
      headline: `Target ${primaryWeak.topicTitle} in ${primaryWeak.subjectName}.`,
      explanation: `Your accuracy is currently ${primaryWeak.accuracyPercent}% (${primaryWeak.totalCorrect}/${primaryWeak.totalAttempted} correct). Focusing on ${primaryWeak.topicTitle}${secondaryWeak ? ` and ${secondaryWeak.topicTitle}` : ''} before your next full mock will recover an estimated +${estGain} aggregate marks toward your ${targetScore} goal.`,
      suggestedSubjectCode: primaryWeak.subjectCode,
      suggestedTopicSlug: primaryWeak.topicSlug,
      suggestedTopicTitle: primaryWeak.topicTitle,
      potentialGainPoints: estGain,
    };
  } else if (hasActivity) {
    coachRecommendation = {
      badge: "EXCELLENT MOMENTUM",
      headline: "Solid foundation! Take another timed simulation.",
      explanation: "You have reviewed your initial topics. Now take another full 120-minute CBT simulation to test your timing and pacing under real exam hall conditions.",
      suggestedSubjectCode: enrolledSubs[0]?.code || "ENG",
      suggestedTopicSlug: undefined,
      suggestedTopicTitle: undefined,
      potentialGainPoints: 20,
    };
  }

  return {
    hasActivity,
    targetScore,
    targetInstitution: pref?.targetInstitution,
    targetCourse: pref?.targetCourse,
    totalMocksCompleted,
    latestScore,
    bestScore,
    gapToTarget,
    weakestTopics,
    masteredTopics,
    subjectSummaries,
    recentMockHistory: completedResults.map((r) => ({
      attemptId: r.attemptId,
      totalScore: r.totalScore,
      englishScore: r.englishScore,
      subject2Score: r.subject2Score,
      subject3Score: r.subject3Score,
      subject4Score: r.subject4Score,
      completedAt: r.createdAt,
      timeSpentSeconds: r.timeSpentSeconds,
    })),
      coachRecommendation,
    };
  };

  return await Promise.race([
    computeInsights(),
    new Promise<CoachInsights>((resolve) =>
      setTimeout(() => resolve(getDefaultCoachInsights()), 3500)
    ),
  ]);
} catch (err) {
  console.warn("Notice loading coach insights:", err);
  return getDefaultCoachInsights();
}
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
      badge: "BENCHMARK DIAGNOSTIC NEEDED",
      headline: "Take your baseline diagnostic mock exam.",
      explanation: "You haven't completed a full CBT simulation yet. Take a 180-question mock exam to uncover your starting scores across English and electives so your coach can generate your revision plan.",
      suggestedSubjectCode: "ENG",
      potentialGainPoints: 45,
    },
  };
}
