import { NextRequest, NextResponse } from "next/server";
import { hasValidWebhookSignature, matchesPayment } from "@/lib/payment-security";
import { settleVerifiedPayment } from "@/lib/payment-settlement";
import { db } from "@/db";
import {
  paymentTransactions,
  paymentWebhookEvents,
  subscriptionEntitlements,
  schoolOrders,
  schoolStudents,
  schoolActivationJobs
} from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";

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

      // Check if this is an institutional school cohort order
      if (reference?.startsWith("SCH-") || event.data?.metadata?.orderType === "school_cohort_license") {
        const order = await db.query.schoolOrders.findFirst({
          where: eq(schoolOrders.reference, reference),
        });

        if (order) {
          if (event.data.amount < order.totalAmountKobo) {
            return NextResponse.json({ error: "Payment amount does not match school order total." }, { status: 400 });
          }

          const now = new Date();
          const expiryDate = new Date(now.getTime() + order.durationMonths * 30 * 24 * 60 * 60 * 1000);

          await db.update(schoolOrders)
            .set({
              status: "completed",
              settledAt: now,
              paystackPayload: event.data,
            })
            .where(eq(schoolOrders.id, order.id));

          // Resolve and activate target students
          const metadata = (order.metadata as any) || {};
          const targetedIds: string[] = Array.isArray(metadata.studentIds) ? metadata.studentIds : [];

          let studentsToActivate: Array<{ id: string; studentUserId: string; licenseExpiresAt: Date | null }> = [];

          if (targetedIds.length > 0) {
            studentsToActivate = await db
              .select({
                id: schoolStudents.id,
                studentUserId: schoolStudents.studentUserId,
                licenseExpiresAt: schoolStudents.licenseExpiresAt,
              })
              .from(schoolStudents)
              .where(
                and(
                  eq(schoolStudents.schoolId, order.schoolId),
                  inArray(schoolStudents.id, targetedIds)
                )
              );
          }

          // Only legacy orders without a selection fall back to unlicensed candidates.
          if (targetedIds.length === 0 && studentsToActivate.length < order.studentCount) {
            const remainingLimit = order.studentCount - studentsToActivate.length;
            const existingIds = new Set(studentsToActivate.map((s) => s.id));

            const available = await db
              .select({
                id: schoolStudents.id,
                studentUserId: schoolStudents.studentUserId,
                licenseExpiresAt: schoolStudents.licenseExpiresAt,
              })
              .from(schoolStudents)
              .where(
                and(
                  eq(schoolStudents.schoolId, order.schoolId),
                  eq(schoolStudents.licenseStatus, "inactive")
                )
              )
              .limit(remainingLimit);

            for (const std of available) {
              if (!existingIds.has(std.id)) {
                studentsToActivate.push(std);
                existingIds.add(std.id);
              }
            }
          }

          const durationMs = order.durationMonths * 30 * 24 * 60 * 60 * 1000;
          for (const std of studentsToActivate) {
            try {
              const baseTime = std.licenseExpiresAt
                ? Math.max(now.getTime(), new Date(std.licenseExpiresAt).getTime())
                : now.getTime();
              const studentExpiryDate = new Date(baseTime + durationMs);

              await db.update(schoolStudents)
                .set({
                  licenseStatus: "active",
                  licenseExpiresAt: studentExpiryDate,
                })
                .where(eq(schoolStudents.id, std.id));

              await db.insert(subscriptionEntitlements)
                .values({
                  userId: std.studentUserId,
                  expiresAt: studentExpiryDate,
                  planCode: "SCHOOL_INSTITUTIONAL_1500",
                  autoRenew: false,
                  updatedAt: now,
                })
                .onConflictDoUpdate({
                  target: subscriptionEntitlements.userId,
                  set: {
                    expiresAt: studentExpiryDate,
                    planCode: "SCHOOL_INSTITUTIONAL_1500",
                    autoRenew: false,
                    updatedAt: now,
                  },
                });

              await db.insert(schoolActivationJobs)
                .values({
                  orderId: order.id,
                  studentUserId: std.studentUserId,
                  durationMonths: order.durationMonths,
                  status: "completed",
                })
                .onConflictDoNothing();
            } catch (err) {
              console.warn("Error during webhook student activation:", err);
            }
          }

          await db.insert(paymentWebhookEvents).values({
            eventId,
            eventType: event.event,
            payload: event,
          }).onConflictDoNothing();

          return NextResponse.json({ received: true, schoolOrderSettled: true }, { status: 200 });
        }
      }

      // Default: individual student candidate transaction
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
    } else if (
      event.event === "subscription.disable" ||
      event.event === "subscription.not_renew" ||
      event.event === "invoice.payment_failed"
    ) {
      // User or merchant disabled subscription or renewal failed on Paystack
      const subCode = event.data?.subscription?.subscription_code || event.data?.subscription_code;
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
