"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RefreshCw, Home } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application caught error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#F6F8F5] text-[#092E28] flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-3xl border border-slate-200 bg-white p-8 text-center space-y-6 shadow-sm">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
          <AlertCircle size={28} />
        </div>

        <div>
          <h2 className="text-xl font-bold tracking-tight text-[#092E28]">
            Something unexpected occurred
          </h2>
          <p className="mt-2 text-xs text-slate-500 leading-relaxed">
            {error?.message === "Load failed"
              ? "A network request was interrupted by the browser. Please tap Try again to refresh your session."
              : error?.message || "An issue occurred while processing your request. Please try again."}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={() => reset()}
            className="flex-1 min-h-11 inline-flex items-center justify-center gap-2 rounded-full bg-[#116149] px-5 text-xs font-semibold text-white hover:bg-[#0c4a37] transition cursor-pointer"
          >
            <RefreshCw size={14} /> Try again
          </button>
          <Link
            href="/dashboard"
            className="flex-1 min-h-11 inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            <Home size={14} /> Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
