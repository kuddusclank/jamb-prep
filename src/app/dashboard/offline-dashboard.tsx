"use client";

import { useEffect, useState } from "react";
import Link from "@/components/pending-link";
import {
  Sparkles,
  BookOpen,
  CheckCircle2,
  Clock,
  ArrowRight,
  Flame,
  ShieldCheck,
  Smartphone,
  HardDrive,
  Layers,
  Award,
} from "lucide-react";
import type { OfflineUserProfile } from "@/lib/offline/offline-profile-cache";
import { getWeeklyPackFromIdb, getOutboxItems, type StoredWeeklyPack } from "@/lib/offline/idb-storage";
import { getCurrentWeekKey } from "@/lib/offline/weekly-pack-client";

interface OfflineDashboardProps {
  profile: OfflineUserProfile;
}

export function OfflineDashboard({ profile }: OfflineDashboardProps) {
  const [pack, setPack] = useState<StoredWeeklyPack | null>(null);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);
  const [isLoadingPack, setIsLoadingPack] = useState<boolean>(true);

  const weekKey = getCurrentWeekKey();

  useEffect(() => {
    let active = true;
    const loadLocalData = async () => {
      try {
        const [storedPack, pendingItems] = await Promise.all([
          getWeeklyPackFromIdb(profile.userId, weekKey),
          getOutboxItems(profile.userId),
        ]);
        if (!active) return;
        setPack(storedPack);
        setPendingSyncCount(pendingItems.length);
      } catch (err) {
        console.warn("[OfflineDashboard] Failed to read local storage", err);
      } finally {
        if (active) setIsLoadingPack(false);
      }
    };

    void loadLocalData();
    return () => {
      active = false;
    };
  }, [profile.userId, weekKey]);

  const totalQuestions = pack?.progress?.total ?? (pack?.questions?.length || 250);
  const answeredTotal = pack?.progress?.answered ?? Object.keys(pack?.answers || {}).length;
  const percentTotal = totalQuestions > 0 ? Math.min(100, Math.round((answeredTotal / totalQuestions) * 100)) : 0;

  // Calculate overall accuracy across answered questions
  const correctCount = Object.entries(pack?.answers || {}).filter(
    ([qId, ans]) => pack?.feedback?.[qId]?.correctOption === ans.selectedOption
  ).length;
  const accuracyPercent = answeredTotal > 0 ? Math.round((correctCount / answeredTotal) * 100) : 0;

  const formattedExpiry = profile.subscription.expiresAt
    ? new Date(profile.subscription.expiresAt).toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <div className="shell section-space">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Welcome & Pro Status Strip */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-100 text-[#116149] text-xs font-bold uppercase tracking-wider">
                <Sparkles size={12} className="text-amber-600" /> Pro Offline Active
              </span>
              {formattedExpiry && (
                <span className="text-xs text-slate-500 font-medium">
                  Subscribed until {formattedExpiry}
                </span>
              )}
            </div>
            <h1 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-[#092E28]">
              Welcome back, {profile.displayName || "Student"}! 👋
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              You are in <strong>Offline Study Mode</strong>. Practice questions, review solutions, and reinforce topics with zero internet connection.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/practice"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#116149] px-6 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-[#0e523e] transition"
            >
              Resume Practice <ArrowRight size={16} />
            </Link>
          </div>
        </div>

        {/* 250-Question Weekly Pack Spotlight Card */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#116149]">
                THIS WEEK&apos;S SYLLABUS SET
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-[#092E28] mt-0.5">
                250-Question Practice Pack
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Curated across your 4 registered examination subjects. Fresh set available every Monday.
              </p>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-2xl font-bold text-[#092E28]">
                {answeredTotal} <span className="text-sm font-normal text-slate-500">/ {totalQuestions}</span>
              </span>
              <div className="text-xs text-slate-500">
                {percentTotal}% completed · {accuracyPercent}% accuracy
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1.5">
            <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
              <div
                className="h-full bg-[#116149] transition-all duration-500 rounded-full"
                style={{ width: `${percentTotal}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] font-medium text-slate-500">
              <span>{answeredTotal} answered</span>
              <span>{Math.max(0, totalQuestions - answeredTotal)} questions remaining</span>
            </div>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="p-4 rounded-2xl bg-[#F6F8F5] border border-slate-200/70">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Total Questions</span>
              <span className="text-xl font-bold text-[#092E28] mt-0.5 block">{totalQuestions}</span>
              <span className="text-[11px] text-slate-500">Stored on device</span>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/70">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 block">Answered</span>
              <span className="text-xl font-bold text-emerald-950 mt-0.5 block">{answeredTotal}</span>
              <span className="text-[11px] text-emerald-700">{percentTotal}% completed</span>
            </div>

            <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200/70">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-800 block">Accuracy</span>
              <span className="text-xl font-bold text-blue-950 mt-0.5 block">{accuracyPercent}%</span>
              <span className="text-[11px] text-blue-700">{correctCount} correct answers</span>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/70">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 block">Study Streak</span>
              <span className="text-xl font-bold text-amber-950 mt-0.5 block">
                {profile.streak?.currentStreak || 0} {profile.streak?.currentStreak === 1 ? "day" : "days"}
              </span>
              <span className="text-[11px] text-amber-700">Protected offline</span>
            </div>
          </div>

          {/* CTA Bar */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100">
            <div className="text-xs text-slate-500 flex items-center gap-2">
              <ShieldCheck size={16} className="text-[#116149] shrink-0" />
              <span>Answers are automatically recorded to local storage and sync when reconnected.</span>
            </div>

            <Link
              href="/practice"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-[#116149] px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#0e523e] transition"
            >
              Continue Practice <ArrowRight size={15} />
            </Link>
          </div>
        </div>

        {/* Registered Subjects Breakdown */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#092E28]">
              Your Registered Subjects ({profile.enrolledSubjects?.length || 4})
            </h2>
            <span className="text-xs text-slate-500">All 4 available for offline practice</span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {(pack?.subjects || profile.enrolledSubjects || []).map((sub) => {
              const subCode = 'code' in sub ? sub.code : (sub as { subject_code?: string }).subject_code || '';
              const subName = 'name' in sub ? sub.name : (sub as { subject_name?: string }).subject_name || subCode;
              const isCompulsory = 'isCompulsory' in sub ? sub.isCompulsory : false;

              const progress = pack?.progress?.bySubject?.[subCode];
              const subAnswered = progress?.answered ?? 0;
              const subTotal = progress?.total ?? (subCode === 'ENG' ? 85 : 55);
              const subPct = subTotal > 0 ? Math.round((subAnswered / subTotal) * 100) : 0;

              return (
                <div
                  key={subCode}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3.5 flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#092E28] text-base">{subName}</span>
                        {isCompulsory && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 uppercase">
                            Compulsory
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-400 font-mono font-semibold">{subCode}</span>
                    </div>

                    <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/60">
                      {subAnswered} / {subTotal} done
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                      <div
                        className="h-full bg-[#116149] transition-all rounded-full"
                        style={{ width: `${subPct}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-500">
                      <span>{subPct}% answered</span>
                      <span>{subTotal} questions</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-500">Mixed syllabus coverage</span>
                    <Link
                      href={`/practice?subject=${subCode}`}
                      className="text-xs font-bold text-[#116149] hover:underline inline-flex items-center gap-1"
                    >
                      Practise {subCode} <ArrowRight size={13} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Offline Durability & Sync Status Banner */}
        <div className="rounded-3xl border border-emerald-950/10 bg-[#EDF2E9]/70 p-6 sm:p-7 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-[#092E28]">
            <HardDrive size={18} className="text-[#116149]" />
            <span>Local Storage & Synchronization Status</span>
          </div>

          <div className="grid sm:grid-cols-3 gap-3 text-xs sm:text-sm">
            <div className="p-3.5 rounded-xl bg-white border border-slate-200/80">
              <span className="font-semibold text-slate-800 block">Weekly Questions</span>
              <span className="text-emerald-700 font-bold block mt-0.5">250 Cached Locally</span>
              <span className="text-[11px] text-slate-500">Zero network needed</span>
            </div>

            <div className="p-3.5 rounded-xl bg-white border border-slate-200/80">
              <span className="font-semibold text-slate-800 block">Outbox Queue</span>
              <span className="text-slate-800 font-bold block mt-0.5">
                {pendingSyncCount > 0 ? `${pendingSyncCount} answers pending sync` : "All local answers synced"}
              </span>
              <span className="text-[11px] text-slate-500">Drains automatically on reconnect</span>
            </div>

            <div className="p-3.5 rounded-xl bg-white border border-slate-200/80">
              <span className="font-semibold text-slate-800 block">Online-Only Features</span>
              <span className="text-amber-800 font-bold block mt-0.5">Full CBT Mock & Analytics</span>
              <span className="text-[11px] text-slate-500">Resumes once online</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
