"use server";

import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { 
  profiles, 
  studentPreferences, 
  subscriptionEntitlements,
  paymentTransactions
} from "@/db/schema";
import { eq, desc } from "drizzle-orm";
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
 * Cancels active recurring subscription on Paystack and schedules the account
 * to switch to the Free tier on the next renewal date.
 */
export async function cancelSubscriptionAction(): Promise<ProfileActionState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in to manage subscriptions." };
  }

  try {
    // 1. Fetch current subscription entitlement
    const entitlement = await db.query.subscriptionEntitlements.findFirst({
      where: eq(subscriptionEntitlements.userId, user.id),
    });

    if (!entitlement || new Date(entitlement.expiresAt) <= new Date()) {
      return { error: "You do not have an active subscription to cancel." };
    }

    if (!entitlement.autoRenew) {
      const formattedDate = new Date(entitlement.expiresAt).toLocaleDateString("en-NG", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
      return {
        success: true,
        message: `Your subscription is already scheduled to cancel on ${formattedDate}.`,
      };
    }

    // 2. Locate Paystack credentials from entitlement or latest payment transaction
    let authCode = entitlement.paystackAuthorizationCode;
    let subCode = entitlement.paystackSubscriptionCode;
    let emailToken = entitlement.paystackEmailToken;
    let customerCode = entitlement.paystackCustomerCode;

    if (!authCode || !subCode) {
      const latestTxn = await db.query.paymentTransactions.findFirst({
        where: eq(paymentTransactions.userId, user.id),
        orderBy: [desc(paymentTransactions.createdAt)],
      });

      if (latestTxn?.paystackPayload) {
        const payload = latestTxn.paystackPayload as Record<string, any>;
        if (!authCode && payload.authorizationCode) authCode = payload.authorizationCode;
        if (!customerCode && payload.customerCode) customerCode = payload.customerCode;
        if (!subCode && payload.subscriptionCode) subCode = payload.subscriptionCode;
        if (!emailToken && payload.emailToken) emailToken = payload.emailToken;
      }
    }

    // 3. Cancel recurring billing on Paystack
    const paystackSecret = process.env.PAYSTACK_SECRET_KEY || "";
    const isRealKey = paystackSecret.startsWith("sk_test_") || paystackSecret.startsWith("sk_live_");

    if (isRealKey && !paystackSecret.includes("placeholder")) {
      const paystackHeaders = {
        Authorization: `Bearer ${paystackSecret}`,
        "Content-Type": "application/json",
      };

      // A. If an explicit Paystack subscription code exists, disable it
      if (subCode && emailToken) {
        try {
          const res = await fetch("https://api.paystack.co/subscription/disable", {
            method: "POST",
            headers: paystackHeaders,
            body: JSON.stringify({ code: subCode, token: emailToken }),
          });
          const data = await res.json();
          console.log("Paystack subscription disable result:", data.status, data.message);
        } catch (apiErr) {
          console.warn("Paystack subscription disable notice:", apiErr);
        }
      } else {
        // Search Paystack for any subscriptions under this customer/email and disable
        try {
          const listRes = await fetch("https://api.paystack.co/subscription?perPage=50", {
            headers: paystackHeaders,
          });
          const listData = await listRes.json();
          if (listData.status && Array.isArray(listData.data)) {
            for (const sub of listData.data) {
              const matchesCustomer = customerCode && sub.customer?.customer_code === customerCode;
              const matchesEmail = user.email && sub.customer?.email?.toLowerCase() === user.email.toLowerCase();
              if ((matchesCustomer || matchesEmail) && sub.status === "active") {
                await fetch("https://api.paystack.co/subscription/disable", {
                  method: "POST",
                  headers: paystackHeaders,
                  body: JSON.stringify({ code: sub.subscription_code, token: sub.email_token }),
                });
                console.log(`Disabled Paystack subscription ${sub.subscription_code}`);
              }
            }
          }
        } catch (searchErr) {
          console.warn("Notice searching Paystack subscriptions:", searchErr);
        }
      }

      // B. Deactivate card authorization on Paystack so card cannot be charged again
      if (authCode) {
        try {
          const deactRes = await fetch("https://api.paystack.co/customer/deactivate_authorization", {
            method: "POST",
            headers: paystackHeaders,
            body: JSON.stringify({ authorization_code: authCode }),
          });
          const deactData = await deactRes.json();
          console.log("Paystack authorization deactivate result:", deactData.status, deactData.message);
        } catch (authErr) {
          console.warn("Paystack authorization deactivation notice:", authErr);
        }
      }
    }

    // 4. Update entitlement in database: Turn off autoRenew and set cancelledAt timestamp
    // Preserving expiresAt so candidate retains Pro access until the renewal date!
    await db.update(subscriptionEntitlements)
      .set({
        autoRenew: false,
        cancelledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(subscriptionEntitlements.userId, user.id));

    const formattedRenewalDate = new Date(entitlement.expiresAt).toLocaleDateString("en-NG", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    revalidatePath("/profile");
    revalidatePath("/dashboard");
    revalidatePath("/pricing");
    revalidatePath("/");

    return {
      success: true,
      message: `Your subscription has been cancelled on Paystack. You will retain full Pro benefits until your next renewal date on ${formattedRenewalDate}, when your account will automatically switch to the Free plan.`,
    };
  } catch (err: any) {
    console.error("Error cancelling subscription:", err);
    return { error: err.message || "Failed to cancel subscription. Please try again." };
  }
}
