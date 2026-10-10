import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import { VerifyClient } from "./verify-client";

export const metadata = {
  title: "Verifying Subscription — JAMBPrep",
  description: "Confirming your Paystack subscription and activating unlimited UTME study access.",
};

interface VerifyPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function VerifyPage({ searchParams }: VerifyPageProps) {
  const params = await searchParams;
  
  // Extract reference or trxref, handling string, array, or duplicated query params
  let rawRef: string = "";
  const candidate = params.reference || params.trxref;
  if (Array.isArray(candidate)) {
    rawRef = candidate.find((c) => typeof c === "string" && c.startsWith("JAMB_SUB_")) || candidate[0] || "";
  } else if (typeof candidate === "string") {
    rawRef = candidate;
  }

  // Clean any Paystack artifacts (e.g. 'JAMB_SUB_123?trxref=JAMB_SUB_123')
  if (rawRef.includes("?")) {
    rawRef = rawRef.split("?")[0];
  }
  if (rawRef.includes("&")) {
    rawRef = rawRef.split("&")[0];
  }
  const activeRef = rawRef.trim();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirectTo=/checkout/verify?reference=${encodeURIComponent(activeRef)}`);
  }

  return (
    <div className="min-h-screen bg-[#F6F8F5] text-[#092E28] flex flex-col justify-between">
      {/* Header */}
      <header className="border-b border-emerald-950/10 bg-[#FAFBF7]">
        <div className="shell flex h-20 items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 text-xl font-bold tracking-tight">
            <span className="flex size-9 items-center justify-center rounded-xl bg-[#116149] text-white">
              <BookOpen size={20} />
            </span>
            <span>jambprep<span className="text-[#116149]">.</span></span>
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="shell section-space">
        <VerifyClient reference={activeRef} />
      </main>

      {/* Footer */}
      <footer className="shell py-8 border-t border-emerald-950/10 text-xs text-slate-500 text-center">
        © 2026 JAMBPrep. Know what to study next.
      </footer>
    </div>
  );
}
