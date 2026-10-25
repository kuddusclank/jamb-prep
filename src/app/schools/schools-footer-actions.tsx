"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, LayoutDashboard, Sparkles } from "lucide-react";
import { useBrowserAccount } from "@/components/browser-account-boundary";

export function SchoolsFooterActions() {
  const [mounted, setMounted] = useState(false);
  const { session, identity } = useBrowserAccount();

  useEffect(() => {
    setMounted(true);
  }, []);

  const isAuthenticated = mounted && session.status === "authenticated";
  const role = identity?.user?.role || session.role;
  const isSchoolAdmin = role === "school_admin";

  if (isAuthenticated) {
    if (isSchoolAdmin) {
      return (
        <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/schools/dashboard"
            className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#116149] px-7 text-xs sm:text-sm font-semibold text-white shadow-md hover:bg-[#0c4a37] transition"
          >
            <LayoutDashboard size={15} /> Go to School Dashboard <ArrowRight size={15} />
          </Link>
        </div>
      );
    }

    return (
      <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/dashboard"
          className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#116149] px-7 text-xs sm:text-sm font-semibold text-white shadow-md hover:bg-[#0c4a37] transition"
        >
          <Sparkles size={15} /> Return to Your Study Space <ArrowRight size={15} />
        </Link>
      </div>
    );
  }

  // Unauthenticated / Default (matches SSR)
  return (
    <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
      <Link
        href="/schools/register"
        className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#116149] px-7 text-xs sm:text-sm font-semibold text-white shadow-md hover:bg-[#0c4a37] transition"
      >
        Register Your School <ArrowRight size={15} />
      </Link>
      <Link
        href="/schools/login"
        className="inline-flex min-h-12 items-center rounded-full border border-emerald-700/60 bg-emerald-950/40 px-6 text-xs sm:text-sm font-semibold text-white hover:bg-emerald-900/60 transition"
      >
        Sign In to School Portal
      </Link>
    </div>
  );
}
