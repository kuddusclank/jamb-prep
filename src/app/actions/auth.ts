"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sanitizeInternalRedirect } from "@/lib/auth/redirect";
import { db } from "@/db";
import {
  profiles,
  referralCodes,
  referrals,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

function generateCandidateReferralCodes(name: string, userId: string): string[] {
  const cleanPrefix = name.replace(/[^a-zA-Z]/g, "").slice(0, 4).toUpperCase() || "JAMB";
  const cleanHex = userId.replace(/[^a-fA-F0-9]/g, "").toUpperCase() || "000000000000";
  return Array.from(
    new Set([
      `${cleanPrefix}${cleanHex.slice(0, 4)}`,
      `${cleanPrefix}${cleanHex.slice(0, 6)}`,
      `${cleanPrefix}${cleanHex.slice(0, 8)}`,
      `${cleanPrefix}${cleanHex.slice(0, 12)}`,
      `JP${cleanHex.slice(0, 16)}`,
      `JP${cleanHex}`,
    ])
  );
}

async function provisionUserRecordsRecoverable(params: {
  userId: string;
  displayName: string;
  email: string;
  referralCodeInput?: string;
}): Promise<void> {
  const { userId, displayName, email, referralCodeInput } = params;

  // 1. Create Profile with role = 'student' on creation; never overwrite existing role on conflict
  await db
    .insert(profiles)
    .values({
      id: userId,
      displayName,
      email,
      role: "student",
    })
    .onConflictDoNothing();

  // 2. Ensure Candidate's Unique Referral Code (recoverable & collision-safe)
  const existingCode = await db.query.referralCodes.findFirst({
    where: eq(referralCodes.userId, userId),
  });

  if (!existingCode) {
    for (const candidateCode of generateCandidateReferralCodes(displayName, userId)) {
      await db
        .insert(referralCodes)
        .values({
          userId,
          code: candidateCode,
        })
        .onConflictDoNothing();

      const verifyMine = await db.query.referralCodes.findFirst({
        where: eq(referralCodes.userId, userId),
      });
      if (verifyMine) {
        break;
      }
    }
  }

  const confirmedProfile = await db.query.profiles.findFirst({ where: eq(profiles.id, userId) });
  const confirmedCode = await db.query.referralCodes.findFirst({ where: eq(referralCodes.userId, userId) });
  if (!confirmedProfile || !confirmedCode) {
    throw new Error("ACCOUNT_PROVISIONING_NOT_CONFIRMED");
  }

  // 3. Attribute Referral strictly as 'pending' (Confirmed rule: qualifies only after first completed diagnostic mock)
  const cleanRef = referralCodeInput?.trim().toUpperCase();
  if (cleanRef) {
    const referrerRecord = await db.query.referralCodes.findFirst({
      where: eq(referralCodes.code, cleanRef),
    });

    if (
      referrerRecord &&
      referrerRecord.userId.toLowerCase() !== userId.toLowerCase()
    ) {
      await db
        .insert(referrals)
        .values({
          referrerId: referrerRecord.userId,
          referredUserId: userId,
          status: "pending",
          qualifiedAt: null,
        })
        .onConflictDoNothing();
    }
  }
}

export type AuthState = {
  error?: string;
  success?: boolean;
};

export async function signUpAction(prevState: AuthState | null, formData: FormData): Promise<AuthState> {
  const displayName = (formData.get("displayName") as string)?.trim();
  const email = (formData.get("email") as string)?.trim();
  const password = formData.get("password") as string;
  const referralCodeInput = (formData.get("referralCode") as string)?.trim().toUpperCase();

  if (!displayName || displayName.length < 2 || !email || !password) {
    return { error: "Please provide your full name, email address, and a password." };
  }

  if (password.length < 6) {
    return { error: "Your password must be at least 6 characters long." };
  }

  const supabase = await createClient();
  const adminClient = createAdminClient();

  let userId: string;

  // Path A: Admin API bypasses email confirmation entirely (no SMTP, no rate limit)
  if (adminClient) {
    const { data: adminUserData, error: adminError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        display_name: displayName,
      },
    });

    if (adminError) {
      const msg = adminError.message.toLowerCase();
      if (msg.includes("already registered") || msg.includes("already exists")) {
        return { error: "An account with this email already exists. Please log in instead." };
      }
      return { error: adminError.message };
    }

    if (!adminUserData.user) {
      return { error: "Failed to create user account. Please try again." };
    }

    userId = adminUserData.user.id;

    // Immediately establish browser session cookies
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      return { error: "Account created, but sign-in failed: " + signInError.message };
    }
  } else {
    // Path B: Standard signUp (works seamlessly when "Confirm email" is disabled in dashboard)
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
        },
      },
    });

    if (authError || !authData.user) {
      const msg = authError?.message || "";
      if (msg.toLowerCase().includes("rate limit") || msg.toLowerCase().includes("over_email_send_rate_limit")) {
        return {
          error: "Supabase email rate limit triggered. Please disable 'Confirm email' in Supabase Dashboard (Auth > Providers > Email > uncheck 'Confirm email') or add SUPABASE_SERVICE_ROLE_KEY to bypass emails completely."
        };
      }
      return { error: authError?.message || "Failed to create account. Please try again." };
    }

    userId = authData.user.id;

    // Ensure session cookie is saved
    if (!authData.session) {
      await supabase.auth.signInWithPassword({
        email,
        password,
      });
    }
  }

  // Provision profile and referral models in database
  try {
    await Promise.race([
      provisionUserRecordsRecoverable({
        userId,
        displayName,
        email,
        referralCodeInput,
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Provisioning timeout")), 4000)),
    ]);
  } catch (dbErr) {
    console.warn("Database provisioning notice (Supabase DB notice):", dbErr);
    return {
      error: "Your account was created, but profile setup timed out. Please submit again to finish setup.",
    };
  }

  redirect("/onboarding");
}

export async function provisionRegisteredUserAction(
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  const displayName = (formData.get("displayName") as string)?.trim() || "";
  const email = (formData.get("email") as string)?.trim() || "";
  const referralCodeInput = (formData.get("referralCode") as string)?.trim().toUpperCase();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Authentication session is required to provision your profile." };
  }

  const userId = user.id;
  const safeMetaDisplayName =
    typeof user.user_metadata?.display_name === "string"
      ? user.user_metadata.display_name.trim()
      : "";

  try {
    await provisionUserRecordsRecoverable({
      userId,
      displayName: displayName || safeMetaDisplayName || "Student",
      email: user.email || `${userId}@student.jambprep.local`,
      referralCodeInput,
    });
  } catch (err) {
    console.warn("Notice in provisionRegisteredUserAction:", err);
    return {
      success: false,
      error: "Unable to complete profile provisioning right now. Please try again.",
    };
  }

  return { success: true };
}

export async function signInAction(prevState: AuthState | null, formData: FormData): Promise<AuthState> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const redirectTo = sanitizeInternalRedirect(formData.get("redirectTo") as string, "/dashboard");

  if (!email || !password) {
    return { error: "Please enter both your email address and password." };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data?.user) {
    return { error: error?.message || "Invalid email or password." };
  }

  // Route non-students to their respective authorized portals
  const role = data.user.user_metadata?.role;
  if (role === "school_admin") {
    redirect("/schools/dashboard");
  }
  if (role === "admin") {
    redirect("/admin");
  }

  redirect(redirectTo);
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
