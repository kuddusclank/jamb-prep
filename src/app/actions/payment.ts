"use server";

import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { 
  paymentTransactions, 
  referralRewards, 
  subscriptionDiscounts 
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { activateUserSubscription, getUserSubscriptionStatus } from "@/lib/subscription";

export interface CheckoutPricing {
  originalAmountKobo: number; // e.g. 100000 = ₦1,000
  finalAmountKobo: number;    // e.g. 50000 = ₦500 or 100000
  originalAmountNaira: number;
  finalAmountNaira: number;
  hasDiscount: boolean;
  rewardId: string | null;
  discountReason: string | null;
  userEmail: string;
  isAlreadyPremium: boolean;
  currentExpiresAt: Date | null;
}

/**
 * Returns current pricing and applicable referral discounts for the logged-in student.
 */
export async function getCheckoutPricingAction(): Promise<CheckoutPricing> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be logged in to view checkout pricing.");
  }

  const subStatus = await getUserSubscriptionStatus(user.id);

  // Check for available 50% referral voucher
  let reward = null;
  try {
    reward = await Promise.race([
      db.query.referralRewards.findFirst({
        where: and(
          eq(referralRewards.userId, user.id),
          eq(referralRewards.status, "available")
        ),
      }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 3500)),
    ]);
  } catch (err) {
    console.warn("Notice checking referral rewards:", err);
  }

  const baseKobo = 100000; // ₦1,000
  const hasDiscount = !!reward;
  const finalKobo = hasDiscount ? 50000 : baseKobo; // ₦500 or ₦1,000

  return {
    originalAmountKobo: baseKobo,
    finalAmountKobo: finalKobo,
    originalAmountNaira: baseKobo / 100,
    finalAmountNaira: finalKobo / 100,
    hasDiscount,
    rewardId: reward ? reward.id : null,
    discountReason: hasDiscount ? "50% Referral Milestone (2 Friends Invited)" : null,
    userEmail: user.email || "",
    isAlreadyPremium: subStatus.isPremium,
    currentExpiresAt: subStatus.expiresAt,
  };
}

export interface InitializePaymentResult {
  authorizationUrl: string;
  reference: string;
  amountKobo: number;
  isSimulated: boolean;
  error?: string;
}

/**
 * Initiates a Paystack checkout transaction.
 */
export async function initializePaystackCheckoutAction(): Promise<InitializePaymentResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be logged in to subscribe.");
  }

  const pricing = await getCheckoutPricingAction();
  const reference = `JAMB_SUB_${Date.now()}_${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

  // Record pending transaction in database
  await db.insert(paymentTransactions).values({
    userId: user.id,
    reference,
    amountKobo: pricing.finalAmountKobo,
    status: "pending",
    channel: "paystack",
    paystackPayload: {
      userEmail: user.email,
      rewardId: pricing.rewardId,
      hasDiscount: pricing.hasDiscount,
    },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const callbackUrl = `${appUrl}/checkout/verify`;
  const paystackSecret = process.env.PAYSTACK_SECRET_KEY || "";

  // Check if valid Paystack test or live key exists
  const isRealKey = paystackSecret.startsWith("sk_test_") || paystackSecret.startsWith("sk_live_");
  const isPlaceholder = paystackSecret.includes("placeholder");

  const planCode = process.env.PAYSTACK_PLAN_CODE || "PLN_tts4cz7tf89srcl";

  if (isRealKey && !isPlaceholder) {
    try {
      const payload: Record<string, any> = {
        email: user.email,
        amount: pricing.finalAmountKobo,
        reference,
        callback_url: callbackUrl,
        metadata: {
          userId: user.id,
          rewardId: pricing.rewardId,
          planCode: "MONTHLY_PREMIUM",
          app: "jambprep",
        },
      };

      if (planCode) {
        payload.plan = planCode;
      }

      const response = await fetch("https://api.paystack.co/transaction/initialize", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${paystackSecret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.status && data.data?.authorization_url) {
        return {
          authorizationUrl: data.data.authorization_url,
          reference,
          amountKobo: pricing.finalAmountKobo,
          isSimulated: false,
        };
      } else {
        console.warn("Paystack initialize response notice:", data);
      }
    } catch (apiErr) {
      console.warn("Paystack initialize network error:", apiErr);
    }
  }

  // Seamless fallback for local development / testing without live merchant keys
  return {
    authorizationUrl: `/checkout/verify?reference=${reference}&simulated=true`,
    reference,
    amountKobo: pricing.finalAmountKobo,
    isSimulated: true,
  };
}

export interface VerifyPaymentResult {
  success: boolean;
  message: string;
  expiresAt?: Date;
  reference: string;
  amountNaira?: number;
}

/**
 * Verifies transaction payment and provisions premium entitlements.
 */
export async function verifyPaystackPaymentAction(reference: string): Promise<VerifyPaymentResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be logged in to verify subscription.");
  }

  // 1. Sanitize reference in case Paystack appended query artifacts
  let cleanReference = (reference || "").trim();
  if (cleanReference.includes("?")) {
    cleanReference = cleanReference.split("?")[0];
  }
  if (cleanReference.includes("&")) {
    cleanReference = cleanReference.split("&")[0];
  }
  cleanReference = cleanReference.trim();

  // Find transaction record by reference
  let txn = cleanReference
    ? await db.query.paymentTransactions.findFirst({
        where: eq(paymentTransactions.reference, cleanReference),
      })
    : null;

  // Fallback: If reference was malformed or missing, look for user's latest pending transaction
  if (!txn) {
    txn = await db.query.paymentTransactions.findFirst({
      where: and(
        eq(paymentTransactions.userId, user.id),
        eq(paymentTransactions.status, "pending")
      ),
      orderBy: (t, { desc }) => [desc(t.createdAt)],
    });
  }

  if (!txn) {
    return {
      success: false,
      message: "Transaction record not found.",
      reference: cleanReference,
    };
  }

  // 2. If already processed, return current status
  if (txn.status === "success") {
    const subStatus = await getUserSubscriptionStatus(txn.userId);
    return {
      success: true,
      message: "Subscription is already active.",
      expiresAt: subStatus.expiresAt || undefined,
      reference: txn.reference,
      amountNaira: txn.amountKobo / 100,
    };
  }

  const paystackSecret = process.env.PAYSTACK_SECRET_KEY || "";
  const isRealKey = paystackSecret.startsWith("sk_test_") || paystackSecret.startsWith("sk_live_");
  const isPlaceholder = paystackSecret.includes("placeholder");

  let isVerified = false;
  let paystackMeta: { authorizationCode?: string | null; customerCode?: string | null; subscriptionCode?: string | null; emailToken?: string | null } | undefined = undefined;

  if (isRealKey && !isPlaceholder) {
    try {
      const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${txn.reference}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${paystackSecret}`,
        },
      });

      const verifyData = await verifyRes.json();
      if (verifyData.status && verifyData.data?.status === "success") {
        isVerified = true;
        paystackMeta = {
          authorizationCode: verifyData.data?.authorization?.authorization_code || null,
          customerCode: verifyData.data?.customer?.customer_code || null,
          subscriptionCode: verifyData.data?.subscription?.subscription_code || null,
          emailToken: verifyData.data?.subscription?.email_token || null,
        };
      }
    } catch (err) {
      console.warn("Notice during Paystack verification:", err);
    }
  } else {
    // In local sandbox / testing mode, mark as verified
    isVerified = true;
  }

  if (!isVerified) {
    await db.update(paymentTransactions)
      .set({ status: "failed" })
      .where(eq(paymentTransactions.id, txn.id));

    return {
      success: false,
      message: "Payment could not be verified by Paystack.",
      reference,
    };
  }

  // 3. Mark transaction as success
  await db.update(paymentTransactions)
    .set({ 
      status: "success",
      ...(paystackMeta ? {
        paystackPayload: {
          ...(txn.paystackPayload as object || {}),
          ...paystackMeta,
        }
      } : {})
    })
    .where(eq(paymentTransactions.id, txn.id));

  // 4. Activate 30-day Premium Entitlement
  const { expiresAt } = await activateUserSubscription(txn.userId, 30, "MONTHLY_1000", paystackMeta);

  // 5. If referral reward was used, redeem it and log subscription discount
  const payload = txn.paystackPayload as { rewardId?: string } | null;
  if (payload?.rewardId) {
    try {
      await db.update(referralRewards)
        .set({
          status: "redeemed",
          redeemedAt: new Date(),
        })
        .where(eq(referralRewards.id, payload.rewardId));

      await db.insert(subscriptionDiscounts).values({
        userId: txn.userId,
        rewardId: payload.rewardId,
        transactionId: txn.id,
        originalAmountKobo: 100000,
        discountedAmountKobo: txn.amountKobo,
        appliedAt: new Date(),
      });
    } catch (rewardErr) {
      console.warn("Notice updating referral reward redemption:", rewardErr);
    }
  }

  return {
    success: true,
    message: "Payment successful! 30 days of Premium access activated.",
    expiresAt,
    reference,
    amountNaira: txn.amountKobo / 100,
  };
}
