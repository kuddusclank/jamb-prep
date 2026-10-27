"use client";

import { useEffect, useState } from "react";
import Link from "@/components/pending-link";
import {
  User,
  Target,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  HardDrive,
  LogOut,
  Calendar,
  CheckCircle2,
  Clock,
  WifiOff,
} from "lucide-react";
import type { OfflineUserProfile } from "@/lib/offline/offline-profile-cache";
import { getWeeklyPackFromIdb, getOutboxItems, purgeAllActorOfflineData, type StoredWeeklyPack } from "@/lib/offline/idb-storage";
import { getCurrentWeekKey } from "@/lib/offline/weekly-pack-client";
import { signOutAction } from "@/lib/client-actions";

interface OfflineProfileViewProps {
  profile: OfflineUserProfile;
}

export function OfflineProfileView({ profile }: OfflineProfileViewProps) {
  const [pack, setPack] = useState<StoredWeeklyPack | null>(null);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);
  const weekKey = getCurrentWeekKey();

  useEffect(() => {
    let active = true;
    void Promise.all([
      getWeeklyPackFromIdb(profile.userId, weekKey),
      getOutboxItems(profile.userId),
    ]).then(([storedPack, outbox]) => {
      if (!active) return;
      setPack(storedPack);
      setPendingSyncCount(outbox.length);
    }).catch(() => {});

    return () => {
      active = false;
    };
  }, [profile.userId, weekKey]);

  const formattedExpiry = profile.subscription.expiresAt
    ? new Date(profile.subscription.expiresAt).toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  const subjects = profile.enrolledSubjects?.length
    ? profile.enrolledSubjects
    : pack?.subjects || [];

  const handleSignOut = async () => {
    try {
      await purgeAllActorOfflineData();
    } catch {}
  };

  return (
    <div className="shell section-space max-w-5xl mx-auto space-y-8">
      {/* Header Strip */}
      <div className="border-b border-slate-200 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-[#116149]">
              Pro Profile (Offline View)
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-slate-500 font-medium">
              <WifiOff size={13} className="text-amber-600" />
              Saved on Device
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#092E28] mt-2">
            Candidate Profile
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Viewing your saved student credentials, targets, and registered subjects.
          </p>
        </div>

        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
        >
          Return to Dashboard
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Card 1: Student Identity */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 shadow-sm space-y-5">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="size-12 rounded-2xl bg-[#EDF2E9] text-[#116149] flex items-center justify-center shrink-0">
              <User size={22} />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Student Account</span>
              <h2 className="text-lg font-bold text-[#092E28]">{profile.displayName || "Student"}</h2>
              <span className="text-xs text-slate-500 block truncate max-w-[220px]">{profile.email}</span>
            </div>
          </div>

          <div className="space-y-3.5 text-xs sm:text-sm">
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200/60">
              <div className="flex items-center gap-2 text-slate-700">
                <Target size={16} className="text-[#116149]" />
                <span className="font-semibold">Target UTME Score:</span>
              </div>
              <span className="font-bold text-[#092E28] text-base">{profile.targetScore} / 400</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200/60">
              <div className="flex items-center gap-2 text-slate-700">
                <Calendar size={16} className="text-[#116149]" />
                <span className="font-semibold">Examination Year:</span>
              </div>
              <span className="font-bold text-[#092E28]">{new Date().getFullYear()} UTME</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed italic">
            Note: Updating your display name or target score requires an internet connection and will resume once reconnected.
          </p>
        </div>

        {/* Card 2: Pro Subscription Entitlement */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 shadow-sm space-y-5">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="size-12 rounded-2xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center shrink-0">
              <ShieldCheck size={22} />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-900">Subscription Entitlement</span>
              <h2 className="text-lg font-bold text-[#092E28]">JAMBPrep Pro</h2>
              <span className="text-xs font-semibold text-emerald-700">Active Paid Plan</span>
            </div>
          </div>

          <div className="space-y-3 text-xs sm:text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Access Expiry:</span>
              <strong className="text-[#092E28]">
                {formattedExpiry ? `Valid until ${formattedExpiry}` : "Active Pro Member"}
              </strong>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-600">Weekly Offline Pack:</span>
              <span className="font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded text-xs">
                250 Questions Ready
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-600">Sync Status:</span>
              <span className="text-slate-700 font-medium">
                {pendingSyncCount > 0 ? `${pendingSyncCount} answers pending sync` : "Up to date"}
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <Link
              href="/practice"
              className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#116149] px-5 py-3 text-xs font-bold text-white hover:bg-[#0e523e] transition"
            >
              Go to Offline Practice <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>

      {/* Card 3: Registered Subjects */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#092E28]">
              Your 4 Registered Examination Subjects
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Subject combinations are cached on this device for offline practice questions.
            </p>
          </div>
          <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200/60">
            {subjects.length} Subjects
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {subjects.map((sub) => {
            const code = 'code' in sub ? sub.code : (sub as { subject_code?: string }).subject_code || '';
            const name = 'name' in sub ? sub.name : (sub as { subject_name?: string }).subject_name || code;
            const isCompulsory = 'isCompulsory' in sub ? sub.isCompulsory : false;

            return (
              <div
                key={code}
                className="flex items-center justify-between p-4 rounded-2xl bg-[#F6F8F5] border border-slate-200/80"
              >
                <div>
                  <span className="font-semibold text-sm text-[#092E28] block">{name}</span>
                  <span className="text-xs text-slate-500">
                    {isCompulsory ? "Compulsory Paper" : "Elective Paper"}
                  </span>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-950/5 font-mono text-xs font-bold text-[#116149]">
                  {code}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Card 4: Device Outbox & Safe Sign Out */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm font-bold text-[#092E28]">
            <HardDrive size={16} className="text-[#116149]" />
            <span>Local Device Storage</span>
          </div>
          <p className="text-xs text-slate-500 max-w-md leading-relaxed">
            All your offline answers and progress are preserved in local storage. Signing out will purge local caches to protect your account.
          </p>
        </div>

        <form action={signOutAction} onSubmit={handleSignOut}>
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-rose-200 bg-rose-50 text-rose-700 text-xs font-bold hover:bg-rose-100 transition cursor-pointer"
          >
            <LogOut size={14} /> Sign out of device
          </button>
        </form>
      </div>
    </div>
  );
}
