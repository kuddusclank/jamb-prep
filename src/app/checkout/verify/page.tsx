"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { StudyWorkspace } from "@/components/study-workspace";
import { VerifyClient } from "./verify-client";

function cleanReferenceParam(raw: string | null): string {
  if (!raw) {
    return "";
  }
  let cleaned = raw;
  if (cleaned.includes("?")) {
    cleaned = cleaned.split("?")[0];
  }
  if (cleaned.includes("&")) {
    cleaned = cleaned.split("&")[0];
  }
  return cleaned.trim();
}

function VerifyPageContent() {
  const searchParams = useSearchParams();
  const rawCandidate =
    searchParams.get("reference") || searchParams.get("trxref") || "";
  const activeRef = cleanReferenceParam(rawCandidate);

  return <VerifyClient reference={activeRef} />;
}

export default function VerifyPage() {
  return (
    <StudyWorkspace>
      <main className="shell section-space">
        <Suspense
          fallback={
            <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500 max-w-lg mx-auto">
              Confirming payment session...
            </div>
          }
        >
          <VerifyPageContent />
        </Suspense>
      </main>
    </StudyWorkspace>
  );
}
