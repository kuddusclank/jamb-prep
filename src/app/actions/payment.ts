"use server";

import { matchesPayment } from "@/lib/payment-security";
import { settleVerifiedPayment } from "@/lib/payment-settlement";

import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import {
  paymentTransactions,
  referralRewards,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getUserSubscriptionStatus } from "@/lib/subscription";

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

  const baseKobo = 100000; // ₦1,000

  if (!user) {
    return {
      originalAmountKobo: baseKobo,
      finalAmountKobo: baseKobo,
      originalAmountNaira: baseKobo / 100,
      finalAmountNaira: baseKobo / 100,
      hasDiscount: false,
      rewardId: null,
      discountReason: null,
      userEmail: "",
      isAlreadyPremium: false,
      currentExpiresAt: null,
    };
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
    return {
      authorizationUrl: "/login?redirectTo=/pricing",
      reference: "",
      amountKobo: 0,
      isSimulated: false,
      error: "You must be logged in to subscribe.",
    };
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

  const planCode = process.env.PAYSTACK_PLAN_CODE || "PLN_dwqq6sv5zvy3j5i";

  if (isRealKey && !isPlaceholder) {
    try {
      const payload: Record<string, unknown> = {
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
        signal: AbortSignal.timeout(10000),
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

  return {
    authorizationUrl: "", reference, amountKobo: pricing.finalAmountKobo,
    isSimulated: false, error: "Payment provider is unavailable. Please try again later.",
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
    return {
      success: false,
      message: "You must be logged in to verify subscription.",
      reference: reference || "",
    };
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
  const txn = cleanReference
    ? await db.query.paymentTransactions.findFirst({
        where: and(eq(paymentTransactions.reference, cleanReference), eq(paymentTransactions.userId, user.id)),
      })
    : null;


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
        signal: AbortSignal.timeout(10000),
      });

      const verifyData = await verifyRes.json();
      if (verifyRes.ok && verifyData.status && matchesPayment(verifyData.data, txn.reference, txn.amountKobo)) {
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
  }

  if (!isVerified) {

    return {
      success: false,
      message: "Payment could not be verified by Paystack.",
      reference,
    };
  }

  const expiresAt = await settleVerifiedPayment(txn.reference, paystackMeta || {});

  return {
    success: true,
    message: "Payment successful! 30 days of Premium access activated.",
    expiresAt,
    reference,
    amountNaira: txn.amountKobo / 100,
  };
}
