import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/db";
import { 
  paymentTransactions, 
  paymentWebhookEvents, 
  referralRewards, 
  subscriptionDiscounts,
  subscriptionEntitlements 
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { activateUserSubscription } from "@/lib/subscription";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-paystack-signature");
    const secret = process.env.PAYSTACK_WEBHOOK_SECRET || process.env.PAYSTACK_SECRET_KEY || "";

    // In production with real keys, verify HMAC-SHA512 signature
    if (secret && !secret.includes("placeholder") && signature) {
      const hash = crypto
        .createHmac("sha512", secret)
        .update(rawBody)
        .digest("hex");

      if (hash !== signature) {
        return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
      }
    }

    const event = JSON.parse(rawBody);

    if (event.event === "charge.success") {
      const eventId = String(event.data.id);
      const reference = event.data.reference;

      // Idempotency check: don't process the same webhook event twice
      const existingEvent = await db.query.paymentWebhookEvents.findFirst({
        where: eq(paymentWebhookEvents.eventId, eventId),
      });

      if (existingEvent) {
        return NextResponse.json({ received: true, duplicate: true }, { status: 200 });
      }

      await db.insert(paymentWebhookEvents).values({
        eventId,
        eventType: event.event,
        payload: event,
      }).onConflictDoNothing();

      // Find transaction
      const txn = await db.query.paymentTransactions.findFirst({
        where: eq(paymentTransactions.reference, reference),
      });

      if (txn && txn.status !== "success") {
        await db.update(paymentTransactions)
          .set({ status: "success" })
          .where(eq(paymentTransactions.id, txn.id));

        // Activate 30-day Premium Entitlement
        const paystackMeta = {
          authorizationCode: event.data.authorization?.authorization_code || null,
          customerCode: event.data.customer?.customer_code || null,
          subscriptionCode: event.data.subscription?.subscription_code || null,
          emailToken: event.data.subscription?.email_token || null,
        };
        await activateUserSubscription(txn.userId, 30, "MONTHLY_1000", paystackMeta);

        // Redeem referral reward if attached
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
          } catch (rwErr) {
            console.warn("Notice updating referral reward in webhook:", rwErr);
          }
        }
      }
    } else if (event.event === "subscription.disable") {
      // User or merchant disabled subscription directly on Paystack
      const subCode = event.data?.subscription_code;
      const customerCode = event.data?.customer?.customer_code;

      if (subCode || customerCode) {
        await db.update(subscriptionEntitlements)
          .set({
            autoRenew: false,
            cancelledAt: new Date(),
            updatedAt: new Date(),
          })
          .where(
            subCode 
              ? eq(subscriptionEntitlements.paystackSubscriptionCode, subCode)
              : eq(subscriptionEntitlements.paystackCustomerCode, customerCode)
          );
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err: any) {
    console.error("Paystack webhook error:", err);
    return NextResponse.json({ error: err.message || "Webhook processing failed." }, { status: 500 });
  }
}
