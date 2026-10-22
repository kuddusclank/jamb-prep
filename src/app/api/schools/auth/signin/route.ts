import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = (body.email as string)?.trim().toLowerCase();
    const password = body.password as string;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Please enter your administrative email and password." },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      return NextResponse.json(
        { error: error?.message || "Invalid administrator credentials." },
        { status: 401 }
      );
    }

    // STRICT RBAC CHECK: Student accounts cannot access the school portal
    const userMetadataRole = data.user.user_metadata?.role;
    let effectiveRole = userMetadataRole;

    if (!effectiveRole) {
      try {
        const profile = await db.query.profiles.findFirst({
          where: eq(profiles.id, data.user.id),
        });
        if (profile) {
          effectiveRole = profile.role;
        }
      } catch (e) {
        console.warn("Profile check in school signin:", e);
      }
    }

    if (effectiveRole === "student") {
      // Immediately terminate session
      await supabase.auth.signOut();
      return NextResponse.json(
        {
          error: "This account is registered as a student. Students cannot access the School Administrator Portal. Please sign in at the candidate portal.",
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      redirectTo: "/schools/dashboard",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected server error occurred.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
