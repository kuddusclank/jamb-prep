import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/current-user";

export async function POST() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { authenticated: false, error: "Authentication required" },
      { status: 401 }
    );
  }

  const role = user.user_metadata?.role || "student";
  if (role === "student") {
    return NextResponse.json(
      { authenticated: false, role: "student", error: "Students cannot access school administrative endpoints" },
      { status: 403 }
    );
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      id: user.id,
      email: user.email,
      role,
      user_metadata: user.user_metadata,
    },
  });
}
