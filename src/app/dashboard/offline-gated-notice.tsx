"use client";

import { useState, useEffect } from "react";
import Link from "@/components/pending-link";
import { Sparkles, WifiOff, Lock, RefreshCw, ArrowRight, ShieldCheck, Download, Smartphone, Building2 } from "lucide-react";
import type { OfflineUserProfile } from "@/lib/offline/offline-profile-cache";

interface OfflineGatedNoticeProps {
  reason: 'free_tier' | 'expired' | 'no_profile' | 'tampered';
  profile?: OfflineUserProfile | null;
  onRetry?: () => void;
}

export function OfflineGatedNotice({ reason, profile, onRetry }: OfflineGatedNoticeProps) {
  const [isSchoolAdmin, setIsSchoolAdmin] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("jambprep_browser_session_v1");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed?.role === "school_admin" || parsed?.user?.user_metadata?.role === "school_admin") {
            setIsSchoolAdmin(true);
          }
        }
      } catch {}
    }
  }, []);

  const isExpired = reason === 'expired';
  const isTampered = reason === 'tampered';

  const formattedExpiry = profile?.subscription?.expiresAt
    ? new Date(profile.subscription.expiresAt).toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null;

  if (isSchoolAdmin) {
    return (
      <div className="shell section-space max-w-2xl mx-auto">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-10 shadow-sm text-center space-y-6">
          <div className="flex flex-col items-center gap-3">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-emerald-50 text-[#116149] border border-emerald-200">
              <Building2 size={26} />
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase bg-emerald-100 text-[#116149]">
              School Administrator Portal
            </span>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-[#092E28]">
              Internet Connection Required
            </h1>
            <p className="text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
              Your institutional school portal requires an active internet connection to synchronize student rosters, computer lab simulations, and syllabus diagnostic heatmaps.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-6 py-3.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                <RefreshCw size={15} /> Check Connection
              </button>
            )}

            <Link
              href="/schools/dashboard"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-[#116149] px-6 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-[#0e523e] transition cursor-pointer"
            >
              Go to School Dashboard <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="shell section-space max-w-2xl mx-auto">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-10 shadow-sm text-center space-y-6">
        
        {/* Icon & Category Pill */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-700 border border-amber-200">
            {isExpired ? <Lock size={26} /> : <WifiOff size={26} />}
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase bg-amber-100 text-amber-900">
            <Sparkles size={12} className="text-amber-700" />
            {isExpired ? "Subscription Expired" : "Pro Offline Feature"}
          </span>
        </div>

        {/* Heading & Subtitle */}
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#092E28]">
            {isExpired
              ? "Your JAMBPrep Pro Access Has Expired"
              : isTampered
              ? "Device Clock Discrepancy Detected"
              : "Offline Study is Exclusive to JAMBPrep Pro"}
          </h1>
          <p className="text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
            {isExpired ? (
              <>
                Your Pro subscription expired {formattedExpiry ? `on ${formattedExpiry}` : "recently"}.
                Offline weekly question packs and study sessions require an active subscription.
                Connect to the internet to renew your plan for ₦2,000/month.
              </>
            ) : isTampered ? (
              <>
                Your device clock appears to have been altered. Please reset your system clock to current
                time and reconnect to the internet to verify your access.
              </>
            ) : (
              <>
                Your device is currently offline. Free accounts require an internet connection for practice.
                Upgrade to JAMBPrep Pro when you are back online to download weekly 250-question packs and
                study anytime with zero data usage.
              </>
            )}
          </p>
        </div>

        {/* Pro Offline Benefits List */}
        {!isExpired && !isTampered && (
          <div className="text-left rounded-2xl bg-[#F6F8F5] border border-slate-200/80 p-5 space-y-3.5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Why Upgrade to JAMBPrep Pro Offline?
            </h2>
            <div className="grid gap-3 text-xs sm:text-sm text-slate-700">
              <div className="flex items-start gap-2.5">
                <Download size={16} className="text-[#116149] shrink-0 mt-0.5" />
                <span>
                  <strong>250-Question Weekly Pack:</strong> Automatically downloaded to your phone or computer every Monday.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <Smartphone size={16} className="text-[#116149] shrink-0 mt-0.5" />
                <span>
                  <strong>Zero Data Required:</strong> Practice in areas with spotty cell reception, power outages, or on transit.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <ShieldCheck size={16} className="text-[#116149] shrink-0 mt-0.5" />
                <span>
                  <strong>Automatic Cloud Sync:</strong> All offline answers and scores safely sync to your profile as soon as you reconnect.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-6 py-3.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              <RefreshCw size={15} /> Check Connection
            </button>
          )}

          <Link
            href="/pricing"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-[#116149] px-6 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-[#0e523e] transition"
          >
            {isExpired ? "Renew Pro Access" : "View Pro Plans (₦2,000/mo)"} <ArrowRight size={15} />
          </Link>
        </div>

        <p className="text-xs text-slate-400">
          Once reconnected, this page will automatically refresh and sync your account.
        </p>
      </div>
    </div>
  );
}
