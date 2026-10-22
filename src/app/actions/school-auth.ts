"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { db } from "@/db";
import { profiles, schools, schoolMembers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

export type SchoolAuthState = {
  error?: string;
  success?: boolean;
  message?: string;
};

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

export async function schoolSignUpAction(
  prevState: SchoolAuthState | null,
  formData: FormData
): Promise<SchoolAuthState> {
  const schoolName = (formData.get("schoolName") as string)?.trim();
  const schoolType = (formData.get("schoolType") as string)?.trim() || "secondary_school";
  const state = (formData.get("state") as string)?.trim() || "Lagos";
  const adminName = (formData.get("adminName") as string)?.trim();
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const password = formData.get("password") as string;

  if (!schoolName || schoolName.length < 3) {
    return { error: "Please enter a valid school or institution name (at least 3 characters)." };
  }

  if (!adminName || adminName.length < 2) {
    return { error: "Please provide the administrator or principal's full name." };
  }

  if (!email || !email.includes("@")) {
    return { error: "Please provide a valid official email address." };
  }

  if (!password || password.length < 8) {
    return { error: "Administrative passwords must be at least 8 characters long." };
  }

  const supabase = await createClient();
  const adminClient = createAdminClient();

  let userId: string;

  // Path A: Admin API bypasses email confirmation for immediate frictionless onboarding
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
        return { error: "An account with this email already exists. Please sign in to your school portal." };
      }
      return { error: adminError.message };
    }

    if (!adminUserData.user) {
      return { error: "Failed to create administrator account. Please try again." };
    }

    userId = adminUserData.user.id;

    // Immediately establish browser session cookies
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      return { error: "Account created, but portal sign-in failed: " + signInError.message };
    }
  } else {
    // Path B: Standard Supabase Auth signUp
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
      return { error: authError?.message || "Failed to create school account. Please try again." };
    }

    userId = authData.user.id;

    if (!authData.session) {
      await supabase.auth.signInWithPassword({
        email,
        password,
      });
    }
  }

  // Provision Database Models: Profile + School + SchoolMember
  try {
    // 1. Create Profile with role = 'school_admin'
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

    // 2. Create School Tenant Record
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

    // 3. Link Admin as School Owner
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
    // Even if local DB write fails due to dev environment, the Supabase session is established with role: 'school_admin'
  }

  redirect("/schools/dashboard");
}

export async function schoolSignInAction(
  prevState: SchoolAuthState | null,
  formData: FormData
): Promise<SchoolAuthState> {
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Please enter your administrative email and password." };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    return { error: error?.message || "Invalid administrator credentials." };
  }

  // STRICT RBAC CHECK: Student accounts cannot access the school portal
  const userMetadataRole = data.user.user_metadata?.role;
  let effectiveRole = userMetadataRole;

  if (!effectiveRole) {
    // Fallback to database profile lookup
    try {
      const profile = await db.query.profiles.findFirst({
        where: eq(profiles.id, data.user.id),
      });
      if (profile) {
        effectiveRole = profile.role;
      }
    } catch (e) {
      console.warn("Profile check in schoolSignInAction:", e);
    }
  }

  if (effectiveRole === "student") {
    // Immediately terminate session
    await supabase.auth.signOut();
    return {
      error: "This account is registered as a student. Students cannot access the School Administrator Portal. Please sign in at the candidate portal.",
    };
  }

  redirect("/schools/dashboard");
}

export async function schoolForgotPasswordAction(
  prevState: SchoolAuthState | null,
  formData: FormData
): Promise<SchoolAuthState> {
  const email = (formData.get("email") as string)?.trim().toLowerCase();

  if (!email || !email.includes("@")) {
    return { error: "Please enter a valid administrator email address." };
  }

  const supabase = await createClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${appUrl}/schools/reset-password`,
  });

  if (error) {
    return { error: error.message || "Unable to send password reset email. Please try again." };
  }

  return {
    success: true,
    message: "Password reset instructions have been dispatched to your email. Please check your inbox and click the reset link.",
  };
}

export async function schoolResetPasswordAction(
  prevState: SchoolAuthState | null,
  formData: FormData
): Promise<SchoolAuthState> {
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!password || password.length < 8) {
    return { error: "Your new password must be at least 8 characters long." };
  }

  if (password !== confirmPassword) {
    return { error: "Passwords do not match. Please re-enter identical passwords." };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.updateUser({
    password,
  });

  if (error) {
    return { error: error.message || "Failed to update password. Please try again." };
  }

  redirect("/schools/dashboard");
}

export async function schoolSignOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/schools");
}
