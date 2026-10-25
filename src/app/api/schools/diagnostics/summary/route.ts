import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { db } from "@/db";
import { schools, schoolMembers } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export interface DiagnosticTopicItem {
  id: string;
  subject: string;
  topic: string;
  accuracyRate: number; // percentage (0-100)
  questionsAttempted: number;
  status: "urgent_remedial" | "revision_recommended" | "exam_ready";
  recommendedAction: string;
}

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

    // Resolve School Tenant
    let school = await db.query.schools.findFirst({
      where: eq(schools.adminId, user.id),
    });

    if (!school) {
      const membership = await db.query.schoolMembers.findFirst({
        where: eq(schoolMembers.userId, user.id),
      });
      if (membership) {
        school = await db.query.schools.findFirst({
          where: eq(schools.id, membership.schoolId),
        });
      }
    }

    const schoolId = school?.id || null;

    // Fetch aggregated syllabus topic diagnostic accuracy across enrolled school candidates from both practice & mocks
    let topicRows: Array<{
      id: string;
      subject: string;
      topic: string;
      total_attempted: string;
      total_correct: string;
      accuracy_rate: string;
    }> = [];

    if (schoolId) {
      topicRows = await db.execute<{
        id: string;
        subject: string;
        topic: string;
        total_attempted: string;
        total_correct: string;
        accuracy_rate: string;
      }>(sql`
        SELECT
          t.id,
          s.code as subject,
          t.title as topic,
          sum(m.total_attempted) as total_attempted,
          sum(m.total_correct) as total_correct,
          round((sum(m.total_correct)::float / nullif(sum(m.total_attempted), 0)::float) * 100) as accuracy_rate
        FROM student_topic_mastery m
        JOIN school_students ss ON ss.student_user_id = m.user_id
        JOIN topics t ON m.topic_id = t.id
        JOIN subjects s ON m.subject_id = s.id
        WHERE ss.school_id = ${schoolId}::uuid
        GROUP BY t.id, s.code, t.title
        HAVING sum(m.total_attempted) > 0
        ORDER BY accuracy_rate ASC, total_attempted DESC
      `);
    }

    const diagnosticTopics: DiagnosticTopicItem[] = topicRows.map((r) => {
      const rate = Number(r.accuracy_rate) || 0;
      let status: "urgent_remedial" | "revision_recommended" | "exam_ready" = "revision_recommended";
      let recommendedAction = "Schedule group tutorial and past-question drill.";

      if (rate < 50) {
        status = "urgent_remedial";
        recommendedAction = "Critical gap: Re-teach core syllabus principles before next mock.";
      } else if (rate >= 70) {
        status = "exam_ready";
        recommendedAction = "Mastered topic: Candidate retention is on track for UTME.";
      }

      return {
        id: r.id,
        subject: r.subject,
        topic: r.topic,
        accuracyRate: rate,
        questionsAttempted: Number(r.total_attempted) || 0,
        status,
        recommendedAction,
      };
    });

    const urgentCount = diagnosticTopics.filter((t) => t.status === "urgent_remedial").length;
    const revisionCount = diagnosticTopics.filter((t) => t.status === "revision_recommended").length;
    const readyCount = diagnosticTopics.filter((t) => t.status === "exam_ready").length;

    const avgAccuracy = diagnosticTopics.length > 0
      ? Math.round(diagnosticTopics.reduce((acc, t) => acc + t.accuracyRate, 0) / diagnosticTopics.length)
      : null;

    // Generate weekly remedial timetable dynamically from verified weak topics
    const revisionTimetable = diagnosticTopics
      .filter((t) => t.status === "urgent_remedial")
      .slice(0, 5)
      .map((t, i) => {
        const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
        return {
          day: days[i % days.length],
          subject: t.subject,
          topic: t.topic,
          suggestedTime: "03:30 PM - 04:30 PM",
        };
      });

    return NextResponse.json({
      success: true,
      schoolId,
      schoolName: school?.name || "Institutional Partner",
      stats: {
        totalTopicsTracked: diagnosticTopics.length,
        urgentRemedialCount: urgentCount,
        revisionRecommendedCount: revisionCount,
        examReadyCount: readyCount,
        cohortAverageAccuracy: avgAccuracy,
      },
      topics: diagnosticTopics,
      revisionTimetable,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected server error occurred.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
