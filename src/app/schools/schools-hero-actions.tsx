"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, LayoutDashboard, Sparkles } from "lucide-react";
import { useBrowserAccount } from "@/components/browser-account-boundary";

export function SchoolsHeroActions() {
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
        <div className="animate-hero-actions pt-2 flex flex-wrap items-center justify-center gap-3.5">
          <Link
            href="/schools/dashboard"
            className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#d6ed9f] px-8 text-sm font-semibold text-[#182518] shadow-md hover:bg-[#e4f5bb] transition whitespace-nowrap"
          >
            <LayoutDashboard size={16} /> Open School Dashboard <ArrowRight size={15} />
          </Link>
          <a
            href="#lab-simulator"
            className="inline-flex min-h-12 items-center rounded-full border border-white/20 bg-white/10 backdrop-blur-md px-7 text-sm font-semibold text-[#f2f3eb] hover:bg-white/20 transition shadow-xs whitespace-nowrap"
          >
            Explore CBT Simulator
          </a>
        </div>
      );
    }

    // Student Candidate logged in:
    return (
      <div className="animate-hero-actions pt-2 flex flex-wrap items-center justify-center gap-3.5">
        <Link
          href="/dashboard"
          className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#d6ed9f] px-8 text-sm font-semibold text-[#182518] shadow-md hover:bg-[#e4f5bb] transition whitespace-nowrap"
        >
          <Sparkles size={16} /> Go to Student Dashboard <ArrowRight size={15} />
        </Link>
        <Link
          href="/mock"
          className="inline-flex min-h-12 items-center rounded-full border border-white/20 bg-white/10 backdrop-blur-md px-7 text-sm font-semibold text-[#f2f3eb] hover:bg-white/20 transition shadow-xs whitespace-nowrap"
        >
          Take UTME Mock
        </Link>
      </div>
    );
  }

  // Unauthenticated / Default (matches SSR)
  return (
    <div className="animate-hero-actions pt-2 flex flex-wrap items-center justify-center gap-3.5">
      <Link
        href="/schools/register"
        className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#d6ed9f] px-8 text-sm font-semibold text-[#182518] shadow-md hover:bg-[#e4f5bb] transition whitespace-nowrap"
      >
        Register your school today! <ArrowRight size={15} />
      </Link>
      <Link
        href="/schools/login"
        className="inline-flex min-h-12 items-center rounded-full border border-white/20 bg-white/10 backdrop-blur-md px-7 text-sm font-semibold text-[#f2f3eb] hover:bg-white/20 transition shadow-xs whitespace-nowrap"
      >
        School portal sign in
      </Link>
    </div>
  );
}
