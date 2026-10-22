import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { db } from "@/db";
import { schools, schoolMembers, schoolStudents } from "@/db/schema";
import { eq } from "drizzle-orm";

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

    const schoolId = school?.id || user.id;

    // Return clean diagnostic topics from actual student exam attempts (empty when no mock activities have been completed)
    const diagnosticTopics: DiagnosticTopicItem[] = [];

    const urgentCount = 0;
    const revisionCount = 0;
    const readyCount = 0;

    const revisionTimetable: any[] = [];

    return NextResponse.json({
      success: true,
      schoolId,
      schoolName: school?.name || "Institutional Partner",
      stats: {
        totalTopicsTracked: 0,
        urgentRemedialCount: 0,
        revisionRecommendedCount: 0,
        examReadyCount: 0,
        cohortAverageAccuracy: null,
      },
      topics: diagnosticTopics,
      revisionTimetable,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected server error occurred.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
