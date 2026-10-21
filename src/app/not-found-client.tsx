"use client";

import { BrandMark } from "@/components/brand-mark";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Compass, Loader2 } from "lucide-react";
import { resolveLegacyDeepLinkRedirect } from "@/lib/routing/deep-links";

export default function NotFoundPage() {
  const [redirectTarget, setRedirectTarget] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const resolved = resolveLegacyDeepLinkRedirect(
      window.location.pathname,
      window.location.search
    );
    if (resolved) {
      setRedirectTarget(resolved.target);
      window.location.replace(resolved.target);
    }
  }, []);

  if (redirectTarget) {
    return (
      <div className="min-h-screen bg-[#F6F8F5] text-[#092E28] flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-3xl border border-emerald-950/10 bg-white p-8 text-center shadow-sm space-y-4">
          <Loader2 size={28} className="animate-spin text-[#116149] mx-auto" />
          <h1 className="text-lg font-semibold">Redirecting to updated route...</h1>
          <p className="text-xs text-slate-600">
            Navigating to{" "}
            <a href={redirectTarget} className="font-mono text-[#116149] underline">
              {redirectTarget}
            </a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F8F5] text-[#092E28] flex flex-col justify-between">
      <header className="shell py-6 flex items-center justify-between">
        <Link href="/" aria-label="JAMBPrep home" className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-[#116149] text-white">
            <BrandMark size={36}/>
          </span>
          <span className="text-lg font-bold tracking-tight">
            JAMBPrep
          </span>
        </Link>
        <Link
          href="/dashboard"
          className="text-xs font-semibold text-[#116149] hover:underline"
        >
          Go to Dashboard →
        </Link>
      </header>

      <main className="shell flex-1 flex items-center justify-center py-12">
        <div className="max-w-lg w-full rounded-3xl border border-emerald-950/10 bg-white p-8 sm:p-10 text-center shadow-sm space-y-5">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-emerald-100 text-[#116149]">
            <Compass size={28} />
          </div>
          <span className="inline-block rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-600">
            404 · Page Not Found
          </span>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            We couldn&apos;t find that study page.
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            The link may be mistyped, expired, or moved to our updated exam and scorecard routes. Choose a destination below to continue your UTME preparation.
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#116149] px-6 text-xs font-semibold text-white hover:bg-[#0b4936]"
            >
              <ArrowLeft size={14} /> Study Dashboard
            </Link>
            <Link
              href="/mock"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 px-6 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Mock Exam Lobby
            </Link>
            <Link
              href="/"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 px-6 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Home
            </Link>
          </div>
        </div>
      </main>

      <footer className="shell py-6 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} JAMBPrep Nigeria · Independent UTME preparation by LecternIQ
      </footer>
    </div>
  );
}
