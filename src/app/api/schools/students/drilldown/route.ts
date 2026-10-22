import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { db } from "@/db";
import { schools, schoolMembers, schoolStudents, profiles } from "@/db/schema";
import { eq, and } from "drizzle-orm";

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

    // Default mock diagnostic profile for standard Nigerian UTME combination
    const drilldown = {
      studentId,
      name: body.name || "Candidate",
      email: body.email || "candidate@school.edu.ng",
      studentIdentifier: body.studentIdentifier || "ST-001",
      licenseStatus: body.licenseStatus || "active",
      subjects: [
        { name: "Use of English", code: "ENG", score: 76, maxScore: 100, accuracy: "76%", status: "strong" },
        { name: "Mathematics", code: "MTH", score: 68, maxScore: 100, accuracy: "68%", status: "moderate" },
        { name: "Physics", code: "PHY", score: 72, maxScore: 100, accuracy: "72%", status: "strong" },
        { name: "Chemistry", code: "CHM", score: 68, maxScore: 100, accuracy: "68%", status: "moderate" },
      ],
      totalScore: 284,
      maxPossibleScore: 400,
      percentileRank: "84th Percentile",
      weakTopics: [
        { subject: "Chemistry", topic: "Organic Nomenclature", errorRate: "68%" },
        { subject: "Mathematics", topic: "Calculus (Integration by Parts)", errorRate: "60%" },
        { subject: "Use of English", topic: "Inversion Idioms & Concord", errorRate: "46%" },
      ],
      strongTopics: [
        { subject: "Physics", topic: "Mechanics & Vector Quantities", accuracy: "88%" },
        { subject: "Use of English", topic: "Comprehension & Lexis", accuracy: "84%" },
        { subject: "Mathematics", topic: "Algebra & Quadratic Equations", accuracy: "82%" },
      ],
      mockHistory: [
        { date: "Oct 18, 2026", examName: "SS3 Mid-Term CBT Rehearsal", score: 284, timeSpent: "114 mins" },
        { date: "Oct 10, 2026", examName: "Diagnostic Readiness Baseline", score: 262, timeSpent: "119 mins" },
      ],
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
