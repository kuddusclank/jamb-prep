import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { db } from "@/db";
import { schools, schoolMembers } from "@/db/schema";
import { eq } from "drizzle-orm";

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
    const title = (body.title as string)?.trim() || "Term UTME Mock Examination";
    const scheduledDate = (body.scheduledDate as string)?.trim() || new Date().toISOString();
    const durationMinutes = Number(body.durationMinutes) || 120;
    const totalQuestions = Number(body.totalQuestions) || 180;
    const hotkeyNavigationEnabled = body.hotkeyNavigationEnabled ?? true;

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

    const schoolCode = school?.code || (user.user_metadata?.school_code as string) || "SCH-XYZ";
    const labSessionCode = `LAB-${schoolCode}-${Date.now().toString(36).slice(-4).toUpperCase()}`;

    const session = {
      id: `mock-sess-${Date.now()}`,
      title,
      labSessionCode,
      schoolId: school?.id || user.id,
      schoolCode,
      schoolName: school?.name || "Institutional Partner",
      scheduledDate,
      durationMinutes,
      totalQuestions,
      hotkeyNavigationEnabled,
      proctorKey: `PRC-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      status: "scheduled",
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      session,
      instructions: [
        "Ensure all laboratory desktop monitors are connected to the school LAN or internet.",
        "Students sign in with their email and uppercase surname default password.",
        "Enter the Lab Session Code on the exam entry screen.",
        "8-Key navigation (A, B, C, D for options; P for previous, N for next; S for submit; R for review) is enforced.",
        "Exam auto-submits exactly when the 120:00 timer elapses.",
      ],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected server error occurred.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
