"use client";

import { useEffect, useState } from "react";
import { AlertCircle, RefreshCw, Home, Sparkles, WifiOff } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [isRetrying, setIsRetrying] = useState(false);

  const errorMsg = error?.message || "";
  const isChunkError = /Loading chunk|Failed to fetch dynamically imported module|error loading dynamically imported module/i.test(errorMsg);
  const isNetworkError = /Load failed|Failed to fetch|NetworkError|Network request failed/i.test(errorMsg);

  useEffect(() => {
    console.error("Application caught error:", error);

    // Auto-recover once from deployment chunk mismatches seamlessly
    if (isChunkError) {
      const lastReload = Number(sessionStorage.getItem("jambprep_last_chunk_reload") || 0);
      if (Date.now() - lastReload > 12000) {
        sessionStorage.setItem("jambprep_last_chunk_reload", String(Date.now()));
        handleHardReload();
      }
    }
  }, [error, isChunkError]);

  const handleHardReload = async () => {
    setIsRetrying(true);
    if ("caches" in window) {
      try {
        const keys = await caches.keys();
        for (const k of keys) {
          if (k.startsWith("jambprep-public-")) {
            await caches.delete(k);
          }
        }
      } catch {
        // Storage cleanup error ignored
      }
    }
    window.location.reload();
  };

  const handleGoHome = () => {
    window.location.href = "/dashboard";
  };

  return (
    <div className="min-h-screen bg-[#F6F8F5] text-[#092E28] flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-3xl border border-slate-200 bg-white p-8 text-center space-y-6 shadow-sm">
        {/* Icon based on error type */}
        <div
          className={`mx-auto flex size-14 items-center justify-center rounded-2xl ${
            isChunkError
              ? "bg-emerald-50 text-[#116149]"
              : isNetworkError
              ? "bg-amber-50 text-amber-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {isChunkError ? (
            <Sparkles size={28} />
          ) : isNetworkError ? (
            <WifiOff size={28} />
          ) : (
            <AlertCircle size={28} />
          )}
        </div>

        <div>
          <h2 className="text-xl font-bold tracking-tight text-[#092E28]">
            {isChunkError
              ? "JAMBPrep was just updated"
              : isNetworkError
              ? "Connection interrupted"
              : "Something went wrong"}
          </h2>
          <p className="mt-2 text-sm text-slate-500 leading-relaxed">
            {isChunkError
              ? "A fresh version of JAMBPrep was deployed with latest improvements. Reload your page to continue with the latest features."
              : isNetworkError
              ? "A network request was interrupted. Check your internet connection and tap Reload to refresh your session."
              : "We ran into an unexpected problem loading this screen. Tap Reload to restore your session."}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={() => void handleHardReload()}
            disabled={isRetrying}
            className="flex-1 min-h-12 inline-flex items-center justify-center gap-2 rounded-full bg-[#116149] px-5 text-sm font-semibold text-white hover:bg-[#0c4a37] active:scale-[0.98] transition cursor-pointer disabled:opacity-70"
          >
            <RefreshCw size={15} className={isRetrying ? "animate-spin" : ""} />
            <span>{isRetrying ? "Refreshing..." : "Reload & Continue"}</span>
          </button>
          <button
            onClick={handleGoHome}
            className="flex-1 min-h-12 inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50 active:scale-[0.98] transition cursor-pointer"
          >
            <Home size={15} />
            <span>Dashboard</span>
          </button>
        </div>
      </div>
    </div>
  );
}
