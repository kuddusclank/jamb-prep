"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { 
  User, 
  Settings, 
  CreditCard, 
  LogOut, 
  ChevronDown, 
  ShieldCheck, 
  LayoutDashboard,
  Building2
} from "lucide-react";
import { signOutAction } from "@/lib/client-actions";
import { useAccountTier } from "@/lib/auth/use-account-tier";

interface UserDropdownProps {
  user: {
    email?: string | null;
    name?: string | null;
  };
  isPremium?: boolean;
  expiresAt?: string | Date | null;
}

export function UserDropdown({ user, isPremium = false, expiresAt }: UserDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const tier = useAccountTier();

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const displayName = user.name || user.email?.split("@")[0] || "Candidate";
  const initials = displayName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const formattedExpiry = expiresAt
    ? new Date(expiresAt).toLocaleDateString("en-NG", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className="flex items-center gap-2.5 p-1 sm:pr-3 rounded-full border border-slate-200/90 bg-white hover:border-[#116149]/40 hover:bg-emerald-50/30 transition-all cursor-pointer shadow-xs"
      >
        {/* Avatar Circle */}
        <span className="flex size-8 items-center justify-center rounded-full bg-[#116149] text-white text-xs font-bold tracking-tight shadow-sm">
          {initials}
        </span>

        {/* Name and Badge (Hidden on very small screens) */}
        <div className="hidden sm:flex items-center gap-2 text-left">
          <span className="text-xs font-bold text-[#092E28] max-w-[120px] truncate">
            {displayName}
          </span>
          {isPremium ? (
            <span className="bg-[#116149] text-white text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
              PRO
            </span>
          ) : (
            <span className="bg-slate-100 text-slate-600 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
              FREE
            </span>
          )}
        </div>

        <ChevronDown 
          size={14} 
          className={`text-slate-500 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} 
        />
      </button>

      {/* Floating Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 origin-top-right rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10 focus:outline-hidden z-50 overflow-hidden divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-100">
          
          {/* User Profile Summary */}
          <div className="p-4 bg-slate-50/70">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Candidate Account
            </p>
            <p className="mt-1 text-sm font-bold text-[#092E28] truncate">
              {displayName}
            </p>
            <p className="text-xs text-slate-500 truncate">
              {user.email}
            </p>

            <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
              <span className="text-slate-600">Plan Status</span>
              {isPremium ? (
                <span className="inline-flex items-center gap-1 font-bold text-[#116149]">
                  <ShieldCheck size={13} /> Premium
                </span>
              ) : (
                <span className="font-semibold text-slate-500">
                  Free Tier
                </span>
              )}
            </div>

            {isPremium && formattedExpiry && (
              <p className="mt-1 text-[11px] text-emerald-800/80">
                Active until {formattedExpiry}
              </p>
            )}
          </div>

          {/* Nav Links */}
          <div className="p-1.5 space-y-0.5">
            <Link
              href="/profile"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:text-[#116149] hover:bg-emerald-50/50 transition-colors"
            >
              <User size={15} className="text-slate-500" />
              <span>Profile & Target Score</span>
            </Link>

            <Link
              href="/dashboard"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:text-[#116149] hover:bg-emerald-50/50 transition-colors"
            >
              <LayoutDashboard size={15} className="text-slate-500" />
              <span>Study Dashboard</span>
            </Link>

            <Link
              href="/profile#subscription"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:text-[#116149] hover:bg-emerald-50/50 transition-colors"
            >
              <CreditCard size={15} className="text-slate-500" />
              <span>Subscription & Billing</span>
            </Link>

            {!isPremium && (
              <Link
                href="/pricing"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-[#116149] bg-emerald-50/70 hover:bg-emerald-100/70 transition-colors"
              >
                {tier.isSchoolAttached ? (
                  <>
                    <Building2 size={14} className="text-[#116149]" />
                    <span>School License (Contact Admin)</span>
                  </>
                ) : (
                  <span>Upgrade to Unlimited</span>
                )}
              </Link>
            )}
          </div>

          {/* Sign Out Form */}
          <div className="p-1.5">
            <form
              action={signOutAction}
            >
              <button
                type="submit"
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-red-600 hover:bg-red-50 transition-colors cursor-pointer text-left"
              >
                <LogOut size={15} />
                <span>Sign Out</span>
              </button>
            </form>
          </div>

        </div>
      )}
    </div>
  );
}
