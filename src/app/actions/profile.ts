"use server";

import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { 
  profiles, 
  studentPreferences, 
  subscriptionEntitlements 
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export type ProfileActionState = {
  success?: boolean;
  error?: string;
  message?: string;
};

/**
 * Updates candidate's display name and academic target preferences.
 */
export async function updateProfileAction(
  prevState: ProfileActionState | null,
  formData: FormData
): Promise<ProfileActionState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in to update your profile." };
  }

  const displayName = (formData.get("displayName") as string)?.trim();
  const targetScoreRaw = formData.get("targetScore") as string;
  const targetInstitution = (formData.get("targetInstitution") as string)?.trim() || null;
  const targetCourse = (formData.get("targetCourse") as string)?.trim() || null;

  if (!displayName || displayName.length < 2) {
    return { error: "Please enter a valid display name (at least 2 characters)." };
  }

  const targetScore = parseInt(targetScoreRaw, 10);
  if (isNaN(targetScore) || targetScore < 100 || targetScore > 400) {
    return { error: "Target score must be between 100 and 400." };
  }

  try {
    // 1. Update Profile Display Name
    await db.update(profiles)
      .set({
        displayName,
        updatedAt: new Date(),
      })
      .where(eq(profiles.id, user.id));

    // Update user metadata in Supabase Auth
    await supabase.auth.updateUser({
      data: { display_name: displayName },
    });

    // 2. Update Student Preferences
    await db.insert(studentPreferences)
      .values({
        userId: user.id,
        targetScore,
        targetInstitution,
        targetCourse,
        examYear: 2026,
      })
      .onConflictDoUpdate({
        target: studentPreferences.userId,
        set: {
          targetScore,
          targetInstitution,
          targetCourse,
          updatedAt: new Date(),
        },
      });

    revalidatePath("/profile");
    revalidatePath("/dashboard");
    revalidatePath("/");

    return { 
      success: true, 
      message: "Your profile details have been saved successfully." 
    };
  } catch (err: any) {
    console.error("Error updating profile:", err);
    return { error: err.message || "Failed to update profile. Please try again." };
  }
}

/**
 * Cancels active subscription entitlement for the candidate.
 */
export async function cancelSubscriptionAction(): Promise<ProfileActionState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in to manage subscriptions." };
  }

  try {
    // Remove active entitlement row immediately, reverting user to Free tier
    await db.delete(subscriptionEntitlements)
      .where(eq(subscriptionEntitlements.userId, user.id));

    revalidatePath("/profile");
    revalidatePath("/dashboard");
    revalidatePath("/pricing");
    revalidatePath("/");

    return {
      success: true,
      message: "Your subscription has been cancelled. You are now on the Free tier.",
    };
  } catch (err: any) {
    console.error("Error cancelling subscription:", err);
    return { error: err.message || "Failed to cancel subscription. Please try again." };
  }
}
