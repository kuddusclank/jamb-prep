import { db } from "@/db";
import { paymentTransactions, profiles, referralRewards, subscriptionDiscounts, subscriptionEntitlements } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import type { PaystackMetadata } from "./subscription";

/** Both callbacks and webhooks use the same atomic, replay-safe settlement. */
export async function settleVerifiedPayment(reference: string, metadata: PaystackMetadata): Promise<Date> {
  const transaction = await db.query.paymentTransactions.findFirst({ where: eq(paymentTransactions.reference, reference) });
  if (!transaction) throw new Error("Payment not found");

  return db.transaction(async tx => {
    // Serialize payments for this student, including the first entitlement insert.
    await tx.select({ id: profiles.id }).from(profiles).where(eq(profiles.id, transaction.userId)).for("update");
    const [payment] = await tx.select().from(paymentTransactions)
      .where(eq(paymentTransactions.id, transaction.id)).for("update");
    if (payment.status === "success") {
      const [entitlement] = await tx.select().from(subscriptionEntitlements)
        .where(eq(subscriptionEntitlements.userId, payment.userId));
      if (!entitlement) throw new Error("Paid transaction has no entitlement; reconciliation required");
      return entitlement.expiresAt;
    }

    const payload = payment.paystackPayload as { rewardId?: string } | null;
    if (payload?.rewardId) {
      const [reward] = await tx.select().from(referralRewards).where(and(
        eq(referralRewards.id, payload.rewardId), eq(referralRewards.userId, payment.userId)
      )).for("update");
      if (!reward || reward.status !== "available") throw new Error("Referral reward is unavailable; reconciliation required");
      await tx.update(referralRewards).set({ status: "redeemed", redeemedAt: new Date() })
        .where(eq(referralRewards.id, reward.id));
      await tx.insert(subscriptionDiscounts).values({
        userId: payment.userId, rewardId: reward.id, transactionId: payment.id,
        originalAmountKobo: 100000, discountedAmountKobo: payment.amountKobo,
      });
    }

    const now = new Date();
    const [entitlement] = await tx.insert(subscriptionEntitlements).values({
      userId: payment.userId, expiresAt: new Date(now.getTime() + 30 * 86400000),
      planCode: "MONTHLY_1000", autoRenew: true, cancelledAt: null,
      paystackSubscriptionCode: metadata.subscriptionCode || null,
      paystackEmailToken: metadata.emailToken || null,
      paystackAuthorizationCode: metadata.authorizationCode || null,
      paystackCustomerCode: metadata.customerCode || null,
    }).onConflictDoUpdate({
      target: subscriptionEntitlements.userId,
      set: {
        expiresAt: sql`greatest(${subscriptionEntitlements.expiresAt}, now()) + interval '30 days'`,
        autoRenew: true, cancelledAt: null, updatedAt: now,
        ...(metadata.subscriptionCode ? { paystackSubscriptionCode: metadata.subscriptionCode } : {}),
        ...(metadata.emailToken ? { paystackEmailToken: metadata.emailToken } : {}),
        ...(metadata.authorizationCode ? { paystackAuthorizationCode: metadata.authorizationCode } : {}),
        ...(metadata.customerCode ? { paystackCustomerCode: metadata.customerCode } : {}),
      },
    }).returning({ expiresAt: subscriptionEntitlements.expiresAt });
    await tx.update(paymentTransactions).set({
      status: "success", paystackPayload: { ...(payment.paystackPayload as object || {}), ...metadata },
    }).where(eq(paymentTransactions.id, payment.id));
    return entitlement.expiresAt;
  });
}
