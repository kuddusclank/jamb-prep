import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { db } from "@/db";
import { sql } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const role = user.user_metadata?.role;
    if (role === "student") {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 403 });
    }

    const body = await request.json();
    const studentId = (body.studentId as string)?.trim();

    if (!studentId) {
      return NextResponse.json({ error: "No student ID provided." }, { status: 400 });
    }

    // 1. Resolve actual user profile id from either student_user_id or school_students.id
    const studentRecord = await db.execute<{
      userId: string;
      displayName: string;
      email: string;
      studentIdentifier: string | null;
      licenseStatus: string;
    }>(sql`
      SELECT
        p.id as "userId",
        p.display_name as "displayName",
        p.email,
        ss.student_identifier as "studentIdentifier",
        ss.license_status as "licenseStatus"
      FROM profiles p
      LEFT JOIN school_students ss ON ss.student_user_id = p.id
      WHERE p.id = ${studentId}::uuid OR ss.id = ${studentId}::uuid
      LIMIT 1
    `);

    const targetUser = studentRecord[0] || null;
    const actualUserId = targetUser?.userId || (studentId.length === 36 ? studentId : null);

    let weakTopics: Array<{ topic: string; subject: string; errorRate: string }> = [];
    let strongTopics: Array<{ topic: string; subject: string; accuracy: string }> = [];
    let mockHistory: Array<{ date: string; examName: string; score: number; timeSpent: string }> = [];
    let practiceSummary = {
      topicsPracticed: 0,
      totalQuestionsAttempted: 0,
      totalQuestionsCorrect: 0,
      overallPracticeAccuracy: null as number | null,
      practiceSessionsCount: 0,
    };
    let latestMockTotal: number | null = null;
    let rawMocks: any[] = [];

    if (actualUserId) {
      // 2. Fetch practice mastery and progress
      const practiceStats = await db.execute<{
        topics_practiced: string;
        total_questions_attempted: string;
        total_questions_correct: string;
        overall_practice_accuracy: string;
        practice_sessions_count: string;
      }>(sql`
        SELECT
          count(distinct m.topic_id) as topics_practiced,
          coalesce(sum(m.total_attempted), 0) as total_questions_attempted,
          coalesce(sum(m.total_correct), 0) as total_questions_correct,
          coalesce(round(avg(m.accuracy_percent)), 0) as overall_practice_accuracy,
          (SELECT count(*) FROM attempts a WHERE a.user_id = ${actualUserId}::uuid AND a.mode = 'practice') as practice_sessions_count
        FROM student_topic_mastery m
        WHERE m.user_id = ${actualUserId}::uuid
      `);

      if (practiceStats[0]) {
        practiceSummary = {
          topicsPracticed: Number(practiceStats[0].topics_practiced || 0),
          totalQuestionsAttempted: Number(practiceStats[0].total_questions_attempted || 0),
          totalQuestionsCorrect: Number(practiceStats[0].total_questions_correct || 0),
          overallPracticeAccuracy: practiceStats[0].total_questions_attempted !== "0" ? Number(practiceStats[0].overall_practice_accuracy) : null,
          practiceSessionsCount: Number(practiceStats[0].practice_sessions_count || 0),
        };
      }

      // 3. Fetch verified weak topics from both practice and mocks
      const rawWeak = await db.execute<{
        topic: string;
        subject: string;
        accuracy_percent: number;
      }>(sql`
        SELECT t.title as topic, s.code as subject, m.accuracy_percent
        FROM student_topic_mastery m
        JOIN topics t ON m.topic_id = t.id
        JOIN subjects s ON m.subject_id = s.id
        WHERE m.user_id = ${actualUserId}::uuid AND m.total_attempted >= 2
        ORDER BY m.accuracy_percent ASC, m.total_attempted DESC
        LIMIT 5
      `);

      weakTopics = rawWeak.map((w) => ({
        topic: w.topic,
        subject: w.subject,
        errorRate: `${100 - (w.accuracy_percent || 0)}%`,
      }));

      // 4. Fetch verified strong topics from both practice and mocks
      const rawStrong = await db.execute<{
        topic: string;
        subject: string;
        accuracy_percent: number;
      }>(sql`
        SELECT t.title as topic, s.code as subject, m.accuracy_percent
        FROM student_topic_mastery m
        JOIN topics t ON m.topic_id = t.id
        JOIN subjects s ON m.subject_id = s.id
        WHERE m.user_id = ${actualUserId}::uuid AND m.total_attempted >= 2
        ORDER BY m.accuracy_percent DESC, m.total_attempted DESC
        LIMIT 5
      `);

      strongTopics = rawStrong.map((s) => ({
        topic: s.topic,
        subject: s.subject,
        accuracy: `${s.accuracy_percent || 0}%`,
      }));

      // 5. Fetch mock exam results
      rawMocks = await db.execute<{
        total_score: number;
        english_score: number;
        subject2_score: number;
        subject3_score: number;
        subject4_score: number;
        time_spent_seconds: number;
        topic_breakdown: any;
        created_at: string;
      }>(sql`
        SELECT
          ar.total_score,
          ar.english_score,
          ar.subject2_score,
          ar.subject3_score,
          ar.subject4_score,
          ar.time_spent_seconds,
          ar.topic_breakdown,
          ar.created_at
        FROM attempt_results ar
        WHERE ar.user_id = ${actualUserId}::uuid
        ORDER BY ar.created_at DESC
        LIMIT 5
      `);

      const latestMock = rawMocks[0] || null;
      if (latestMock) {
        latestMockTotal = latestMock.total_score;

        // If practice topic mastery was sparse, supplement with latest mock topic breakdown
        if (weakTopics.length === 0 && Array.isArray(latestMock.topic_breakdown)) {
          weakTopics = latestMock.topic_breakdown
            .filter((b: any) => b.correct === 0 && b.total >= 1)
            .slice(0, 5)
            .map((b: any) => ({
              topic: b.topicTitle || "Subject Topic",
              subject: b.subjectCode || "GENERAL",
              errorRate: "100%",
            }));
        }

        if (strongTopics.length === 0 && Array.isArray(latestMock.topic_breakdown)) {
          strongTopics = latestMock.topic_breakdown
            .filter((b: any) => b.correct === b.total && b.total >= 1)
            .slice(0, 5)
            .map((b: any) => ({
              topic: b.topicTitle || "Subject Topic",
              subject: b.subjectCode || "GENERAL",
              accuracy: "100%",
            }));
        }
      }

      mockHistory = rawMocks.map((m, idx) => ({
        date: new Date(m.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
        examName: `UTME Standard CBT Simulation #${rawMocks.length - idx}`,
        score: m.total_score,
        timeSpent: `${Math.round(m.time_spent_seconds / 60)} mins`,
      }));
    }

    const latest = (actualUserId && rawMocks && rawMocks[0]) ? rawMocks[0] : null;

    const drilldown = {
      studentId,
      name: targetUser?.displayName || body.name || "Candidate",
      email: targetUser?.email || body.email || "",
      studentIdentifier: targetUser?.studentIdentifier || body.studentIdentifier || null,
      licenseStatus: targetUser?.licenseStatus || body.licenseStatus || "inactive",
      subjects: [
        {
          name: "Use of English",
          code: "ENG",
          score: latest ? latest.english_score : null,
          maxScore: 100,
          accuracy: latest && typeof latest.english_score === "number" ? `${latest.english_score}%` : "—",
          status: latest ? "completed" : "unattempted",
        },
        {
          name: "Mathematics",
          code: "MTH",
          score: latest ? latest.subject2_score : null,
          maxScore: 100,
          accuracy: latest && typeof latest.subject2_score === "number" ? `${latest.subject2_score}%` : "—",
          status: latest ? "completed" : "unattempted",
        },
        {
          name: "Physics",
          code: "PHY",
          score: latest ? latest.subject3_score : null,
          maxScore: 100,
          accuracy: latest && typeof latest.subject3_score === "number" ? `${latest.subject3_score}%` : "—",
          status: latest ? "completed" : "unattempted",
        },
        {
          name: "Chemistry",
          code: "CHM",
          score: latest ? latest.subject4_score : null,
          maxScore: 100,
          accuracy: latest && typeof latest.subject4_score === "number" ? `${latest.subject4_score}%` : "—",
          status: latest ? "completed" : "unattempted",
        },
      ],
      totalScore: latestMockTotal,
      maxPossibleScore: 400,
      percentileRank: latestMockTotal ? (latestMockTotal >= 250 ? "Top 15% Cohort" : "Active Cohort") : null,
      practiceSummary,
      weakTopics,
      strongTopics,
      mockHistory,
    };

    return NextResponse.json({
      success: true,
      drilldown,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected server error occurred.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
