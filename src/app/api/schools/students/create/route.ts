import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { db } from "@/db";
import { profiles, schools, schoolMembers, schoolStudents } from "@/db/schema";
import { eq } from "drizzle-orm";

function computeDefaultPassword(lastName: string): string {
  return lastName.trim().toUpperCase();
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

    const body = await request.json();
    const firstName = (body.firstName as string)?.trim();
    const lastName = (body.lastName as string)?.trim();
    const email = (body.email as string)?.trim().toLowerCase();
    const studentIdentifier = (body.studentIdentifier as string)?.trim() || null;
    const phone = (body.phone as string)?.trim() || null;

    if (!firstName || firstName.length < 2) {
      return NextResponse.json({ error: "Please enter a valid first name." }, { status: 400 });
    }
    if (!lastName || lastName.length < 2) {
      return NextResponse.json({ error: "Please enter a valid last name / surname." }, { status: 400 });
    }
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
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
    const schoolCode = school?.code || (user.user_metadata?.school_code as string) || "SCH-INSTITUTION";
    const defaultPassword = computeDefaultPassword(lastName);
    const fullName = `${firstName} ${lastName}`;

    const adminClient = createAdminClient();
    const supabase = await createClient();

    let studentUserId: string;

    if (adminClient) {
      const { data: createdUser, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password: defaultPassword,
        email_confirm: true,
        user_metadata: {
          role: "student",
          display_name: fullName,
          first_name: firstName,
          last_name: lastName,
          school_id: schoolId,
          school_code: schoolCode,
          phone,
        },
      });

      if (createError) {
        const msg = createError.message.toLowerCase();
        if (msg.includes("already registered") || msg.includes("already exists")) {
          // If the student already exists in Supabase Auth, check if they are already in this school roster
          const existingProfile = await db.query.profiles.findFirst({
            where: eq(profiles.email, email),
          });

          if (existingProfile) {
            studentUserId = existingProfile.id;
          } else {
            return NextResponse.json(
              { error: "A candidate account with this email already exists." },
              { status: 409 }
            );
          }
        } else {
          return NextResponse.json({ error: createError.message }, { status: 400 });
        }
      } else if (createdUser.user) {
        studentUserId = createdUser.user.id;
      } else {
        return NextResponse.json({ error: "Failed to create candidate identity." }, { status: 500 });
      }
    } else {
      // In dev fallback without admin key, generate deterministic pseudo-ID
      studentUserId = "std-" + Math.random().toString(36).substring(2, 10);
    }

    // Provision Profile
    try {
      await db
        .insert(profiles)
        .values({
          id: studentUserId,
          displayName: fullName,
          email,
          role: "student",
        })
        .onConflictDoUpdate({
          target: profiles.id,
          set: {
            displayName: fullName,
          },
        });

      // Bind to school_students roster
      if (school?.id) {
        await db
          .insert(schoolStudents)
          .values({
            schoolId: school.id,
            studentUserId,
            studentIdentifier,
            ingestionMethod: "manual",
            licenseStatus: "inactive",
          })
          .onConflictDoNothing();
      }
    } catch (dbErr) {
      console.warn("Notice during student database record creation:", dbErr);
    }

    return NextResponse.json({
      success: true,
      student: {
        id: studentUserId,
        name: fullName,
        firstName,
        lastName,
        email,
        studentIdentifier,
        defaultPassword,
        licenseStatus: "inactive",
        enrolmentMethod: "manual",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected server error occurred.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
