"use client";

import { useEffect, useState } from "react";

export default function StudyLoading() {
  const [showRetry, setShowRetry] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowRetry(true), 5000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      className="max-w-3xl w-full mx-auto my-10 p-6 bg-white border border-slate-200 rounded-3xl shadow-sm"
    >
      <div className="flex items-center justify-between mb-6">
        <p className="font-semibold text-[#116149] text-sm">Loading your study space…</p>
        {showRetry && (
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="text-xs text-emerald-800 underline font-medium hover:text-emerald-950 cursor-pointer"
          >
            Taking longer than usual? Click to reload
          </button>
        )}
      </div>
      <div aria-hidden="true" className="space-y-4 animate-pulse">
        <div className="w-[55%] h-6 rounded-xl bg-slate-100" />
        <div className="w-full h-24 rounded-2xl bg-slate-100" />
        <div className="w-full h-24 rounded-2xl bg-slate-100" />
      </div>
    </div>
  );
}
