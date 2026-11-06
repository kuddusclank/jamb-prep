import React from "react";

export default function StudySkeleton() {
  return (
    <section
      className="space-y-6 max-w-5xl mx-auto py-2"
      role="status"
      aria-label="Loading study summaries"
      aria-busy="true"
    >
      {/* Header Shimmer */}
      <div className="space-y-3 pb-6 border-b border-slate-200">
        <div className="h-5 w-44 rounded-full bg-emerald-100/60 animate-pulse" />
        <div className="h-8 sm:h-9 w-72 sm:w-80 rounded-xl bg-slate-200 animate-pulse" />
        <div className="h-4 w-full max-w-lg rounded-lg bg-slate-200/80 animate-pulse" />
      </div>

      {/* Search Input Shimmer */}
      <div className="h-12 w-full rounded-2xl bg-slate-100 border border-slate-200 animate-pulse" />

      {/* Tab Pills Shimmer */}
      <div className="flex items-center gap-3">
        <div className="h-9 w-44 rounded-xl bg-slate-200 animate-pulse" />
        <div className="h-9 w-40 rounded-xl bg-slate-100 border border-slate-200 animate-pulse" />
      </div>

      {/* Grid of 4 Subject Cards Shimmer */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
        {[0, 1, 2, 3].map((idx) => (
          <div
            key={idx}
            className="p-5 rounded-2xl border border-slate-200 bg-white space-y-4 shadow-xs"
          >
            <div className="flex items-center justify-between">
              <div className="h-6 w-12 rounded-md bg-slate-100 animate-pulse" />
              <div className="h-5 w-20 rounded-full bg-slate-100 animate-pulse" />
            </div>
            <div className="space-y-2">
              <div className="h-6 w-36 rounded-lg bg-slate-200 animate-pulse" />
              <div className="h-3.5 w-full rounded bg-slate-100 animate-pulse" />
              <div className="h-3.5 w-3/4 rounded bg-slate-100 animate-pulse" />
            </div>
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <div className="h-4 w-28 rounded bg-slate-100 animate-pulse" />
              <div className="h-4 w-24 rounded bg-slate-100 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
