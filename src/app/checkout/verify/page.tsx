import { StudyWorkspace } from "@/components/study-workspace";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { redirect } from "next/navigation";
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

  const user = await getCurrentUser();

  if (!user) {
    redirect(`/login?redirectTo=/checkout/verify?reference=${encodeURIComponent(activeRef)}`);
  }

  return (
    <StudyWorkspace>
      {/* Header */}


      {/* Main Container */}
      <main className="shell section-space">
        <VerifyClient reference={activeRef} />
      </main>

      {/* Footer */}

    </StudyWorkspace>
  );
}
