import { NextRequest, NextResponse } from "next/server";
import { hasValidWebhookSignature, matchesPayment } from "@/lib/payment-security";
import { settleVerifiedPayment } from "@/lib/payment-settlement";
import { db } from "@/db";
import {
  paymentTransactions,
  paymentWebhookEvents,
  subscriptionEntitlements
} from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-paystack-signature");
    const secret = process.env.PAYSTACK_WEBHOOK_SECRET || process.env.PAYSTACK_SECRET_KEY || "";

    if (!secret || secret.includes("placeholder")) {
      return NextResponse.json({ error: "Webhook is not configured." }, { status: 503 });
    }
    if (!hasValidWebhookSignature(rawBody, signature, secret)) {
      return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
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

      const txn = await db.query.paymentTransactions.findFirst({
        where: eq(paymentTransactions.reference, reference),
      });
      if (!txn || !matchesPayment(event.data, txn.reference, txn.amountKobo)) {
        return NextResponse.json({ error: "Payment does not match a pending transaction." }, { status: 400 });
      }
      await settleVerifiedPayment(txn.reference, {
        authorizationCode: event.data.authorization?.authorization_code || null,
        customerCode: event.data.customer?.customer_code || null,
        subscriptionCode: event.data.subscription?.subscription_code || null,
        emailToken: event.data.subscription?.email_token || null,
      });
      // Record only after successful settlement; retries recover failed settlements.
      await db.insert(paymentWebhookEvents).values({
        eventId, eventType: event.event, payload: event,
      }).onConflictDoNothing();
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
  } catch (err: unknown) {
    console.error("Paystack webhook error:", err);
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
