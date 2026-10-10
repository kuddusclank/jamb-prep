import { cache } from "react";
import { db } from "@/db";
import { subscriptionEntitlements } from "@/db/schema";
import { eq } from "drizzle-orm";

export interface SubscriptionStatus {
  isPremium: boolean;
  expiresAt: Date | null;
  daysRemaining: number;
  planCode: string | null;
  autoRenew: boolean;
  cancelledAt: Date | null;
}

/**
 * Checks whether a student currently has an active premium entitlement.
 */
export const getUserSubscriptionStatus = cache(async (userId: string): Promise<SubscriptionStatus> => {
  try {
    const entitlement = await db.query.subscriptionEntitlements.findFirst({
      where: eq(subscriptionEntitlements.userId, userId),
    });

    if (!entitlement) {
      return {
        isPremium: false,
        expiresAt: null,
        daysRemaining: 0,
        planCode: null,
        autoRenew: true,
        cancelledAt: null,
      };
    }

    const now = new Date();
    const expiry = new Date(entitlement.expiresAt);
    const isPremium = expiry.getTime() > now.getTime();
    const msRemaining = Math.max(0, expiry.getTime() - now.getTime());
    const daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));

    return {
      isPremium,
      expiresAt: expiry,
      daysRemaining: isPremium ? daysRemaining : 0,
      planCode: entitlement.planCode,
      autoRenew: entitlement.autoRenew ?? true,
      cancelledAt: entitlement.cancelledAt ? new Date(entitlement.cancelledAt) : null,
    };
  } catch (err) {
    console.warn("Notice checking subscription status:", err);
    return {
      isPremium: false,
      expiresAt: null,
      daysRemaining: 0,
      planCode: null,
      autoRenew: true,
      cancelledAt: null,
    };
  }
});

export interface PaystackMetadata {
  subscriptionCode?: string | null;
  emailToken?: string | null;
  authorizationCode?: string | null;
  customerCode?: string | null;
}

/**
 * Activates or extends a student's premium access by a given number of days.
 */
export async function activateUserSubscription(
  userId: string,
  days: number = 30,
  planCode: string = "MONTHLY_1000",
  paystackMeta?: PaystackMetadata
): Promise<{ success: boolean; expiresAt: Date }> {
  const currentStatus = await getUserSubscriptionStatus(userId);
  const now = new Date();

  // If user already has an active subscription, extend from the existing expiry date
  let newExpiryTime: number;
  if (currentStatus.isPremium && currentStatus.expiresAt) {
    newExpiryTime = currentStatus.expiresAt.getTime() + (days * 24 * 60 * 60 * 1000);
  } else {
    newExpiryTime = now.getTime() + (days * 24 * 60 * 60 * 1000);
  }

  const newExpiresAt = new Date(newExpiryTime);

  await db.insert(subscriptionEntitlements).values({
    userId,
    expiresAt: newExpiresAt,
    planCode,
    autoRenew: true,
    cancelledAt: null,
    paystackSubscriptionCode: paystackMeta?.subscriptionCode || null,
    paystackEmailToken: paystackMeta?.emailToken || null,
    paystackAuthorizationCode: paystackMeta?.authorizationCode || null,
    paystackCustomerCode: paystackMeta?.customerCode || null,
    updatedAt: now,
  }).onConflictDoUpdate({
    target: subscriptionEntitlements.userId,
    set: {
      expiresAt: newExpiresAt,
      planCode,
      autoRenew: true,
      cancelledAt: null,
      ...(paystackMeta?.subscriptionCode ? { paystackSubscriptionCode: paystackMeta.subscriptionCode } : {}),
      ...(paystackMeta?.emailToken ? { paystackEmailToken: paystackMeta.emailToken } : {}),
      ...(paystackMeta?.authorizationCode ? { paystackAuthorizationCode: paystackMeta.authorizationCode } : {}),
      ...(paystackMeta?.customerCode ? { paystackCustomerCode: paystackMeta.customerCode } : {}),
      updatedAt: now,
    },
  });

  return { success: true, expiresAt: newExpiresAt };
}
