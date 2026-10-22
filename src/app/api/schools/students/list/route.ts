import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { db } from "@/db";
import { profiles, schools, schoolMembers, schoolStudents } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const role = user.user_metadata?.role;
    if (role === "student") {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 403 });
    }

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

    if (!school) {
      return NextResponse.json({
        success: true,
        students: [],
        school: null,
      });
    }

    const enrolledRows = await db
      .select({
        id: schoolStudents.id,
        studentUserId: schoolStudents.studentUserId,
        studentIdentifier: schoolStudents.studentIdentifier,
        ingestionMethod: schoolStudents.ingestionMethod,
        licenseStatus: schoolStudents.licenseStatus,
        licenseExpiresAt: schoolStudents.licenseExpiresAt,
        createdAt: schoolStudents.createdAt,
        name: profiles.displayName,
        email: profiles.email,
      })
      .from(schoolStudents)
      .leftJoin(profiles, eq(schoolStudents.studentUserId, profiles.id))
      .where(eq(schoolStudents.schoolId, school.id))
      .orderBy(desc(schoolStudents.createdAt));

    const formatted = enrolledRows.map((row) => {
      const parts = (row.name || "").trim().split(/\s+/);
      const lastName = parts.length > 1 ? parts[parts.length - 1] : parts[0] || "CANDIDATE";
      const cleanPass = lastName.toUpperCase();
      const defaultPassword = cleanPass.length >= 6 ? cleanPass : `${cleanPass}123456`.slice(0, 6);

      return {
        id: row.id,
        studentUserId: row.studentUserId,
        name: row.name || row.email,
        email: row.email,
        studentIdentifier: row.studentIdentifier,
        ingestionMethod: row.ingestionMethod,
        licenseStatus: row.licenseStatus,
        licenseExpiresAt: row.licenseExpiresAt,
        defaultPassword,
        createdAt: row.createdAt,
      };
    });

    return NextResponse.json({
      success: true,
      students: formatted,
      school: {
        id: school.id,
        name: school.name,
        code: school.code,
        type: school.type,
        state: school.state,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected server error occurred.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
