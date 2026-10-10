"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { db } from "@/db";
import { 
  profiles, 
  referralCodes, 
  referrals, 
  referralRewards 
} from "@/db/schema";
import { eq, count } from "drizzle-orm";
import { redirect } from "next/navigation";

// Generate a random, human-readable referral code (e.g. TOBI7482)
function generateReferralCode(name: string): string {
  const cleanPrefix = name.replace(/[^a-zA-Z]/g, "").slice(0, 4).toUpperCase() || "JAMB";
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `${cleanPrefix}${randomSuffix}`;
}

export type AuthState = {
  error?: string;
  success?: boolean;
};

export async function signUpAction(prevState: AuthState | null, formData: FormData): Promise<AuthState> {
  const displayName = formData.get("displayName") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const referralCodeInput = (formData.get("referralCode") as string)?.trim().toUpperCase();

  if (!displayName || !email || !password) {
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
    const provisionPromise = async () => {
      // 1. Create Profile
      await db.insert(profiles).values({
        id: userId,
        displayName,
        email,
        role: "student",
      }).onConflictDoNothing();

      // 2. Generate Candidate's Unique Referral Code
      const studentCode = generateReferralCode(displayName);
      await db.insert(referralCodes).values({
        userId,
        code: studentCode,
      }).onConflictDoNothing();

      // 3. Attribute Referral if referred by another student
      if (referralCodeInput) {
        const referrerRecord = await db.query.referralCodes.findFirst({
          where: eq(referralCodes.code, referralCodeInput),
        });

        if (referrerRecord && referrerRecord.userId !== userId) {
          // Record qualified referral
          await db.insert(referrals).values({
            referrerId: referrerRecord.userId,
            referredUserId: userId,
            status: "qualified",
            qualifiedAt: new Date(),
          }).onConflictDoNothing();

          // Check if referrer reached the 2-referral milestone
          const [refCount] = await db
            .select({ value: count() })
            .from(referrals)
            .where(eq(referrals.referrerId, referrerRecord.userId));

          if (refCount && refCount.value >= 2) {
            // Check if reward already issued
            const existingReward = await db.query.referralRewards.findFirst({
              where: eq(referralRewards.userId, referrerRecord.userId),
            });

            if (!existingReward) {
              await db.insert(referralRewards).values({
                userId: referrerRecord.userId,
                rewardType: "FIRST_MONTH_50_PERCENT",
                status: "available",
              });
            }
          }
        }
      }
    };

    // Use a 4-second timeout boundary to guarantee response never hangs
    await Promise.race([
      provisionPromise(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Provisioning timeout")), 4000)),
    ]);
  } catch (dbErr) {
    console.warn("Database provisioning notice (Supabase DB notice):", dbErr);
  }

  redirect("/onboarding");
}

export async function signInAction(prevState: AuthState | null, formData: FormData): Promise<AuthState> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const redirectTo = (formData.get("redirectTo") as string) || "/dashboard";

  if (!email || !password) {
    return { error: "Please enter both your email address and password." };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message || "Invalid email or password." };
  }

  redirect(redirectTo);
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
