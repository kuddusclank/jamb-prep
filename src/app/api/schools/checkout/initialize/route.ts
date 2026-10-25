import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { db } from "@/db";
import { schools, schoolMembers, schoolOrders } from "@/db/schema";
import { eq } from "drizzle-orm";
import { calculateSchoolQuote } from "@/lib/schools/school-pricing";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const role = user.user_metadata?.role;
    if (role === "student") {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 403 });
    }

    const body = await request.json();
    const durationMonths = Number(body.durationMonths || 3);
    const studentIds: string[] = Array.isArray(body.studentIds)
      ? body.studentIds.filter((id: unknown): id is string => typeof id === "string" && /^[0-9a-fA-F-]{36}$/.test(id))
      : [];
    // A selection fixes the paid count to exactly the selected candidates.
    const studentCount = studentIds.length > 0 ? studentIds.length : Number(body.studentCount);

    if (!Number.isInteger(studentCount) || studentCount < 1) {
      return NextResponse.json({ error: "Please provide a valid student count (minimum 1)." }, { status: 400 });
    }
    if (!Number.isInteger(durationMonths) || durationMonths < 1 || durationMonths > 12) {
      return NextResponse.json({ error: "Duration must be between 1 and 12 calendar months." }, { status: 400 });
    }

    // Resolve School Tenant
    let school = await db.query.schools.findFirst({
      where: eq(schools.adminId, user.id),
    });

    if (!school) {
      const membership = await db.query.schoolMembers.findFirst({
        where: eq(schoolMembers.userId, user.id),
      });
      if (membership) {
        school = await db.query.schools.findFirst({
          where: eq(schools.id, membership.schoolId),
        });
      }
    }

    if (!school) {
      return NextResponse.json(
        { error: "No school partnership profile found for your account." },
        { status: 404 }
      );
    }

    const schoolId = school.id;

    // Calculate deterministic integer-kobo quote
    const quote = calculateSchoolQuote(studentCount, durationMonths);
    const reference = `SCH-ORD-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Create pending school order record in database
    await db.insert(schoolOrders).values({
      schoolId,
      reference,
      studentCount: quote.studentCount,
      durationMonths: quote.durationMonths,
      ratePerStudentKobo: quote.ratePerStudentKobo,
      totalAmountKobo: quote.totalAmountKobo,
      status: "pending",
      metadata: {
        studentIds,
        adminEmail: user.email,
        schoolName: school.name,
        schoolCode: school.code,
        orderType: "school_cohort_license",
      },
    });

    const paystackSecret = process.env.PAYSTACK_SECRET_KEY || "";
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const callbackUrl = `${appUrl}/schools/checkout/verify?reference=${reference}`;

    // If Paystack Secret Key is configured and valid, initialize real transaction
    if (paystackSecret && !paystackSecret.includes("placeholder")) {
      const paystackRes = await fetch("https://api.paystack.co/transaction/initialize", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${paystackSecret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: user.email,
          amount: quote.totalAmountKobo,
          reference,
          callback_url: callbackUrl,
          metadata: {
            schoolId,
            schoolName: school.name,
            schoolCode: school.code,
            studentCount: quote.studentCount,
            durationMonths: quote.durationMonths,
            orderType: "school_cohort_license",
            custom_fields: [
              { display_name: "School Name", variable_name: "school_name", value: school.name },
              { display_name: "School Code", variable_name: "school_code", value: school.code },
              { display_name: "Candidates", variable_name: "student_count", value: String(quote.studentCount) },
              { display_name: "Duration", variable_name: "duration_months", value: `${quote.durationMonths} months` },
            ],
          },
        }),
      });

      const paystackData = await paystackRes.json();
      if (paystackRes.ok && paystackData.status && paystackData.data?.authorization_url) {
        return NextResponse.json({
          success: true,
          reference,
          authorizationUrl: paystackData.data.authorization_url,
          accessCode: paystackData.data.access_code,
          quote,
        });
      }
    }

    // Fallback in local/development/unconfigured test environment
    return NextResponse.json({
      success: true,
      reference,
      authorizationUrl: callbackUrl,
      quote,
      isDemo: true,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected server error occurred.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
