import { withDeadline } from "@/lib/with-deadline";
import { getSqlClient } from "@/db";
import { CoachInsights, getDefaultCoachInsights, WeakTopicItem, SubjectMasterySummary } from "./coach";

export interface DashboardState {
  insights: CoachInsights;
  isPremium: boolean;
  qualifiedReferrals: number;
  has50PercentReward: boolean;
}

export async function getDashboardState(userId: string): Promise<DashboardState> {
  const defaultInsights = getDefaultCoachInsights();
  const defaultState: DashboardState = {
    insights: defaultInsights,
    isPremium: false,
    qualifiedReferrals: 0,
    has50PercentReward: false,
  };

  try {
    const sql = getSqlClient();

    const [row] = await withDeadline(sql`
        SELECT
          (SELECT row_to_json(e) FROM (SELECT * FROM subscription_entitlements WHERE user_id = ${userId} LIMIT 1) e) AS entitlement,
          (SELECT row_to_json(p) FROM (SELECT * FROM student_preferences WHERE user_id = ${userId} LIMIT 1) p) AS preference,
          (SELECT json_agg(s) FROM (
            SELECT subjects.id, subjects.name, subjects.code, subjects.is_compulsory
            FROM student_subjects
            JOIN subjects ON student_subjects.subject_id = subjects.id
            WHERE student_subjects.user_id = ${userId}
          ) s) AS subjects,
          (SELECT json_agg(a) FROM (
            SELECT * FROM attempt_results WHERE user_id = ${userId} ORDER BY created_at DESC LIMIT 10
          ) a) AS attempts,
          (SELECT json_agg(m) FROM (
            SELECT student_topic_mastery.*, topics.title as topic_title, topics.slug as topic_slug, subjects.code as subject_code, subjects.name as subject_name
            FROM student_topic_mastery
            JOIN topics ON student_topic_mastery.topic_id = topics.id
            JOIN subjects ON student_topic_mastery.subject_id = subjects.id
            WHERE student_topic_mastery.user_id = ${userId}
          ) m) AS mastery,
          (SELECT COUNT(*) FROM referrals WHERE referrer_id = ${userId}) AS referral_count,
          (SELECT row_to_json(r) FROM (SELECT * FROM referral_rewards WHERE user_id = ${userId} LIMIT 1) r) AS reward
      `, 4000, "Dashboard single roundtrip");

    if (!row) return defaultState;

    // 1. Subscription
    let isPremium = false;
    if (row.entitlement?.expires_at) {
      isPremium = new Date(row.entitlement.expires_at).getTime() > Date.now();
    }

    // 2. Referrals & Rewards
    const qualifiedReferrals = parseInt(row.referral_count || "0", 10);
    const has50PercentReward = row.reward?.status === "available";

    // 3. Compute Coach Insights in memory
    const pref = row.preference;
    const enrolledSubs: Array<{ id: string; name: string; code: string; is_compulsory: boolean }> =
      row.subjects || [
        { id: "1", name: "Use of English", code: "ENG", is_compulsory: true },
        { id: "2", name: "Mathematics", code: "MTH", is_compulsory: false },
        { id: "3", name: "Physics", code: "PHY", is_compulsory: false },
        { id: "4", name: "Chemistry", code: "CHM", is_compulsory: false },
      ];

    const completedResults: any[] = row.attempts || [];
    const masteryRows: any[] = row.mastery || [];

    const targetScore = pref?.target_score || 280;
    const totalMocksCompleted = completedResults.length;
    const latestScore = completedResults[0]?.total_score ?? null;
    const bestScore = completedResults.reduce((max: number, r: any) => Math.max(max, r.total_score || 0), 0) || null;
    const gapToTarget = latestScore !== null ? Math.max(0, targetScore - latestScore) : targetScore;

    const weakestTopics: WeakTopicItem[] = masteryRows
      .filter((m: any) => (m.accuracy_percent || 0) < 65)
      .slice(0, 5)
      .map((m: any) => ({
        topicId: m.topic_id,
        topicTitle: m.topic_title || "General Revision",
        topicSlug: m.topic_slug || "topic",
        subjectCode: m.subject_code || "ENG",
        subjectName: m.subject_name || "English",
        accuracyPercent: m.accuracy_percent || 0,
        totalAttempted: m.total_attempted || 0,
        totalCorrect: m.total_correct || 0,
        priority: (m.accuracy_percent || 0) < 45 ? "critical" : "review",
      }));

    const masteredTopics = masteryRows
      .filter((m: any) => (m.accuracy_percent || 0) >= 75)
      .map((m: any) => ({
        topicTitle: m.topic_title || "Topic",
        subjectCode: m.subject_code || "ENG",
        accuracyPercent: m.accuracy_percent || 0,
        totalAttempted: m.total_attempted || 0,
      }));

    const subjectSummaries: SubjectMasterySummary[] = enrolledSubs.map((sub, idx) => {
      let avgSubjectScore = 0;
      if (completedResults.length > 0) {
        const scores = completedResults.map((r: any) => {
          if (sub.is_compulsory) return r.english_score || 0;
          if (idx === 1) return r.subject2_score || 0;
          if (idx === 2) return r.subject3_score || 0;
          return r.subject4_score || 0;
        });
        avgSubjectScore = Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length);
      }

      const subMastery = masteryRows.filter((m: any) => m.subject_code === sub.code);
      const totalAttempted = subMastery.reduce((sum: number, m: any) => sum + (m.total_attempted || 0), 0);
      const totalCorrect = subMastery.reduce((sum: number, m: any) => sum + (m.total_correct || 0), 0);
      const accuracy = totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : 0;

      return {
        subjectCode: sub.code,
        subjectName: sub.name,
        isCompulsory: sub.is_compulsory,
        estimatedScore: avgSubjectScore || (accuracy > 0 ? accuracy : 50),
        accuracyPercent: accuracy,
        questionsAttempted: totalAttempted,
        weakTopicsCount: subMastery.filter((m: any) => (m.accuracy_percent || 0) < 65).length,
        masteredTopicsCount: subMastery.filter((m: any) => (m.accuracy_percent || 0) >= 75).length,
      };
    });

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
        explanation: `Your accuracy is currently ${primaryWeak.accuracyPercent}% (${primaryWeak.totalCorrect}/${primaryWeak.totalAttempted} correct). Focusing on ${primaryWeak.topicTitle}${secondaryWeak ? ` and ${secondaryWeak.topicTitle}` : ""} before your next full mock will recover an estimated +${estGain} aggregate marks toward your ${targetScore} goal.`,
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

    const recentMockHistory = completedResults.map((r: any) => ({
      attemptId: r.attempt_id,
      totalScore: r.total_score,
      englishScore: r.english_score,
      subject2Score: r.subject2_score,
      subject3Score: r.subject3_score,
      subject4Score: r.subject4_score,
      completedAt: new Date(r.created_at),
      timeSpentSeconds: r.time_spent_seconds || 0,
    }));

    return {
      insights: {
        hasActivity,
        targetScore,
        targetInstitution: pref?.target_institution,
        targetCourse: pref?.target_course,
        totalMocksCompleted,
        latestScore,
        bestScore,
        gapToTarget,
        weakestTopics,
        masteredTopics,
        subjectSummaries,
        recentMockHistory,
        coachRecommendation,
      },
      isPremium,
      qualifiedReferrals,
      has50PercentReward,
    };
  } catch (err) {
    console.warn("Notice in getDashboardState single roundtrip:", err);
    return defaultState;
  }
}
