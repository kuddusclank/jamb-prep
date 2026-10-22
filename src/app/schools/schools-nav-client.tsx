"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";

export function SchoolsNavClient() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 inset-x-0 z-40 transition-all duration-300 ${
        isScrolled
          ? "border-b border-white/10 bg-[#0b100e]/95 backdrop-blur-md shadow-lg py-0"
          : "border-b border-transparent bg-transparent py-1 sm:py-2"
      }`}
    >
      <div className="shell flex h-20 items-center justify-between gap-4">
        {/* Brand + Segmented Toggle */}
        <div className="flex items-center gap-4 shrink-0">
          <Link
            href="/"
            aria-label="JAMBPrep home"
            className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-[#f2f3eb]"
          >
            <span className="flex size-9 items-center justify-center rounded-xl bg-[#116149] text-white shadow-xs">
              <BrandMark size={30} />
            </span>
            <span className="font-bold tracking-tight">JAMBPrep</span>
          </Link>

          {/* Segmented Toggle Pill */}
          <div className="hidden sm:inline-flex items-center rounded-full bg-[#17231b]/80 backdrop-blur-xs p-1 border border-white/10 text-xs font-semibold">
            <Link
              href="/"
              className="px-3.5 py-1 rounded-full text-[#d8dfd5] hover:text-white transition whitespace-nowrap"
            >
              Candidates
            </Link>
            <span className="px-3.5 py-1 rounded-full bg-white/15 text-[#f2f3eb] shadow-xs font-bold whitespace-nowrap">
              For Schools
            </span>
          </div>
        </div>

        {/* Right Action Button */}
        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/schools/register"
            className="rounded-full bg-[#d6ed9f] px-5 py-2.5 text-xs sm:text-sm font-semibold text-[#182518] shadow-xs hover:bg-[#e4f5bb] transition-colors whitespace-nowrap"
          >
            Register School
          </Link>
        </div>
      </div>
    </header>
  );
}
