import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/current-user";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ authenticated: false, error: "Authentication required" }, { status: 401 });
  }

  const role = user.user_metadata?.role;
  if (role !== "admin") {
    return NextResponse.json({ authenticated: false, error: "Administrator privileges required" }, { status: 403 });
  }

  return NextResponse.json({ authenticated: true });
}
