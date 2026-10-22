import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch (e) {
    console.warn("Sign out notice:", e);
  }

  const origin = new URL(request.url).origin;
  const acceptHeader = request.headers.get("accept") || "";

  if (acceptHeader.includes("application/json")) {
    return NextResponse.json({ success: true, redirectTo: "/schools" });
  }

  return NextResponse.redirect(new URL("/schools", origin), 303);
}
