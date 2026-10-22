import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { db } from "@/db";
import { profiles, schools, schoolMembers } from "@/db/schema";

function generateSchoolCode(name: string): string {
  const clean = name.replace(/[^a-zA-Z]/g, "").slice(0, 3).toUpperCase() || "SCH";
  const num = Math.floor(1000 + Math.random() * 9000);
  return `SCH-${clean}${num}`;
}

function generateSchoolSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40) || "institution";
  const rand = Math.random().toString(36).substring(2, 6);
  return `${base}-${rand}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const schoolName = (body.schoolName as string)?.trim();
    const schoolType = (body.schoolType as string)?.trim() || "secondary_school";
    const state = (body.state as string)?.trim() || "Lagos";
    const adminName = (body.adminName as string)?.trim();
    const email = (body.email as string)?.trim().toLowerCase();
    const password = body.password as string;

    if (!schoolName || schoolName.length < 3) {
      return NextResponse.json(
        { error: "Please enter a valid school or institution name (at least 3 characters)." },
        { status: 400 }
      );
    }

    if (!adminName || adminName.length < 2) {
      return NextResponse.json(
        { error: "Please provide the administrator or principal's full name." },
        { status: 400 }
      );
    }

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Please provide a valid official email address." },
        { status: 400 }
      );
    }

    if (!password || password.length < 8) {
      return NextResponse.json(
        { error: "Administrative passwords must be at least 8 characters long." },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const adminClient = createAdminClient();

    let userId: string;

    if (adminClient) {
      const { data: adminUserData, error: adminError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          role: "school_admin",
          display_name: adminName,
          school_name: schoolName,
          school_type: schoolType,
          state,
        },
      });

      if (adminError) {
        const msg = adminError.message.toLowerCase();
        if (msg.includes("already registered") || msg.includes("already exists")) {
          return NextResponse.json(
            { error: "An account with this email already exists. Please sign in to your school portal." },
            { status: 409 }
          );
        }
        return NextResponse.json({ error: adminError.message }, { status: 400 });
      }

      if (!adminUserData.user) {
        return NextResponse.json(
          { error: "Failed to create administrator account. Please try again." },
          { status: 500 }
        );
      }

      userId = adminUserData.user.id;

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        return NextResponse.json(
          { error: "Account created, but portal sign-in failed: " + signInError.message },
          { status: 500 }
        );
      }
    } else {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role: "school_admin",
            display_name: adminName,
            school_name: schoolName,
            school_type: schoolType,
            state,
          },
        },
      });

      if (authError || !authData.user) {
        return NextResponse.json(
          { error: authError?.message || "Failed to create school account. Please try again." },
          { status: 400 }
        );
      }

      userId = authData.user.id;

      if (!authData.session) {
        await supabase.auth.signInWithPassword({
          email,
          password,
        });
      }
    }

    try {
      await db
        .insert(profiles)
        .values({
          id: userId,
          displayName: adminName,
          email,
          role: "school_admin",
        })
        .onConflictDoUpdate({
          target: profiles.id,
          set: {
            role: "school_admin",
            displayName: adminName,
          },
        });

      const code = generateSchoolCode(schoolName);
      const slug = generateSchoolSlug(schoolName);

      const [newSchool] = await db
        .insert(schools)
        .values({
          name: schoolName,
          slug,
          code,
          type: schoolType,
          state,
          adminId: userId,
          contactEmail: email,
          isActive: true,
        })
        .returning();

      if (newSchool) {
        await db
          .insert(schoolMembers)
          .values({
            schoolId: newSchool.id,
            userId,
            role: "owner",
          })
          .onConflictDoNothing();
      }
    } catch (dbErr) {
      console.warn("School database provisioning notice:", dbErr);
    }

    return NextResponse.json({
      success: true,
      redirectTo: "/schools/dashboard",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected server error occurred.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
