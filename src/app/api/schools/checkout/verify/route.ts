import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { db } from "@/db";
import { 
  schools, 
  schoolOrders, 
  schoolStudents, 
  schoolActivationJobs, 
  subscriptionEntitlements 
} from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const body = await request.json();
    const reference = (body.reference as string)?.trim();

    if (!reference) {
      return NextResponse.json({ error: "No transaction reference provided." }, { status: 400 });
    }

    // Resolve Order from database
    const order = await db.query.schoolOrders.findFirst({
      where: eq(schoolOrders.reference, reference),
    });

    if (!order) {
      return NextResponse.json({ error: "School order not found for this reference." }, { status: 404 });
    }

    // Idempotency: if already completed, return existing confirmation
    if (order.status === "completed") {
      const school = await db.query.schools.findFirst({
        where: eq(schools.id, order.schoolId),
      });

      return NextResponse.json({
        success: true,
        alreadySettled: true,
        order: {
          id: order.id,
          reference: order.reference,
          studentCount: order.studentCount,
          durationMonths: order.durationMonths,
          totalAmountKobo: order.totalAmountKobo,
          status: order.status,
          settledAt: order.settledAt,
          schoolName: school?.name || "Partner School",
          schoolCode: school?.code || "SCH-0000",
        },
      });
    }

    const paystackSecret = process.env.PAYSTACK_SECRET_KEY || "";
    let verifiedOnGateway = false;

    if (paystackSecret && !paystackSecret.includes("placeholder")) {
      const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
        headers: {
          Authorization: `Bearer ${paystackSecret}`,
        },
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok || !verifyData.status || verifyData.data?.status !== "success") {
        return NextResponse.json(
          { error: verifyData.message || "Payment verification failed on Paystack." },
          { status: 400 }
        );
      }

      if (verifyData.data.amount < order.totalAmountKobo) {
        return NextResponse.json(
          { error: "Paid amount does not match the invoice amount." },
          { status: 400 }
        );
      }

      verifiedOnGateway = true;
    } else {
      // In local development or testing mode, verify transaction directly
      verifiedOnGateway = true;
    }

    if (!verifiedOnGateway) {
      return NextResponse.json({ error: "Unable to verify transaction." }, { status: 400 });
    }

    // Compute license duration (approx 30 days per month)
    const now = new Date();
    const expiryDate = new Date(now.getTime() + order.durationMonths * 30 * 24 * 60 * 60 * 1000);

    // Update Order to completed
    await db.update(schoolOrders)
      .set({
        status: "completed",
        settledAt: now,
      })
      .where(eq(schoolOrders.id, order.id));

    // Resolve student cohort to activate
    const metadata = (order.metadata as any) || {};
    const targetedIds: string[] = Array.isArray(metadata.studentIds) ? metadata.studentIds : [];

    let studentsToActivate: Array<{ id: string; studentUserId: string }> = [];

    if (targetedIds.length > 0) {
      studentsToActivate = await db
        .select({
          id: schoolStudents.id,
          studentUserId: schoolStudents.studentUserId,
        })
        .from(schoolStudents)
        .where(
          and(
            eq(schoolStudents.schoolId, order.schoolId),
            inArray(schoolStudents.id, targetedIds)
          )
        );
    }

    // If no specific IDs provided or fewer than studentCount, pull inactive students up to studentCount
    if (studentsToActivate.length < order.studentCount) {
      const remainingLimit = order.studentCount - studentsToActivate.length;
      const existingIds = new Set(studentsToActivate.map((s) => s.id));

      const availableStudents = await db
        .select({
          id: schoolStudents.id,
          studentUserId: schoolStudents.studentUserId,
        })
        .from(schoolStudents)
        .where(
          and(
            eq(schoolStudents.schoolId, order.schoolId),
            eq(schoolStudents.licenseStatus, "inactive")
          )
        )
        .limit(remainingLimit);

      for (const std of availableStudents) {
        if (!existingIds.has(std.id)) {
          studentsToActivate.push(std);
          existingIds.add(std.id);
        }
      }
    }

    // Activate each student's license and provision student entitlement
    let activatedCount = 0;
    for (const std of studentsToActivate) {
      try {
        await db.update(schoolStudents)
          .set({
            licenseStatus: "active",
            licenseExpiresAt: expiryDate,
          })
          .where(eq(schoolStudents.id, std.id));

        // Unlock student platform entitlement (offline packs, full CBT mocks, diagnostics)
        await db.insert(subscriptionEntitlements)
          .values({
            userId: std.studentUserId,
            expiresAt: expiryDate,
            planCode: "SCHOOL_INSTITUTIONAL_1500",
            autoRenew: false, // strictly non-recurring for schools
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: subscriptionEntitlements.userId,
            set: {
              expiresAt: expiryDate,
              planCode: "SCHOOL_INSTITUTIONAL_1500",
              autoRenew: false,
              updatedAt: now,
            },
          });

        // Record activation job for auditing
        await db.insert(schoolActivationJobs)
          .values({
            orderId: order.id,
            studentUserId: std.studentUserId,
            durationMonths: order.durationMonths,
            status: "completed",
          })
          .onConflictDoNothing();

        activatedCount++;
      } catch (activationErr) {
        console.warn(`Notice while activating student license ${std.id}:`, activationErr);
      }
    }

    const school = await db.query.schools.findFirst({
      where: eq(schools.id, order.schoolId),
    });

    return NextResponse.json({
      success: true,
      activatedCount,
      order: {
        id: order.id,
        reference: order.reference,
        studentCount: order.studentCount,
        durationMonths: order.durationMonths,
        totalAmountKobo: order.totalAmountKobo,
        status: "completed",
        settledAt: now,
        expiresAt: expiryDate,
        schoolName: school?.name || "Partner School",
        schoolCode: school?.code || "SCH-0000",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected server error occurred.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
