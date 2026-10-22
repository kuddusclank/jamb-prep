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

    // Return candidate diagnostic profile (clean state when no mock activities have been completed)
    const drilldown = {
      studentId,
      name: body.name || "Candidate",
      email: body.email || "",
      studentIdentifier: body.studentIdentifier || null,
      licenseStatus: body.licenseStatus || "inactive",
      subjects: [
        { name: "Use of English", code: "ENG", score: null, maxScore: 100, accuracy: "—", status: "unattempted" },
        { name: "Mathematics", code: "MTH", score: null, maxScore: 100, accuracy: "—", status: "unattempted" },
        { name: "Physics", code: "PHY", score: null, maxScore: 100, accuracy: "—", status: "unattempted" },
        { name: "Chemistry", code: "CHM", score: null, maxScore: 100, accuracy: "—", status: "unattempted" },
      ],
      totalScore: null,
      maxPossibleScore: 400,
      percentileRank: "Awaiting first mock attempt",
      weakTopics: [],
      strongTopics: [],
      mockHistory: [],
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
