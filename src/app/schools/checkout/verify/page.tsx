import { Suspense } from "react";
import { SchoolVerifyClient } from "./verify-client";
import { Loader2 } from "lucide-react";

function VerifyLoadingFallback() {
  return (
    <div className="min-h-screen bg-[#F8FAF7] flex items-center justify-center p-4">
      <div className="flex flex-col items-center gap-3">
        <Loader2 size={32} className="animate-spin text-[#116149]" />
        <span className="text-xs font-semibold text-slate-600">Verifying transaction...</span>
      </div>
    </div>
  );
}

export default function SchoolCheckoutVerifyPage() {
  return (
    <Suspense fallback={<VerifyLoadingFallback />}>
      <SchoolVerifyClient />
    </Suspense>
  );
}
