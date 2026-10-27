"use client";

import { useEffect, useState } from "react";
import { StudyWorkspace } from "@/components/study-workspace";
import {
  ArrowRight,
  BarChart3,
  Clock,
  WifiOff,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import Link from "@/components/pending-link";
import { useBrowserAccount } from "@/components/browser-account-boundary";
import { useNetworkStatus, isNetworkOrTimeoutError } from "@/lib/offline/network-state";
import { useApiResource, ResourceStatus } from "@/lib/api/use-api-resource";
import type { CoachInsights } from "@/lib/api/app-dtos";

const ANALYTICS_CACHE_KEY = "jambprep_analytics_cache:";

export default function AnalyticsPage() {
  const resource = useApiResource<CoachInsights>('/api/v1/coach');
  const account = useBrowserAccount();
  const { isOffline, isOnline } = useNetworkStatus();
  const userId = account.identity?.user?.id || account.session.user?.id || "guest";

  const [cachedInsights, setCachedInsights] = useState<CoachInsights | null>(null);

  // Cache insights whenever live data is received
  useEffect(() => {
    if (resource.data && typeof window !== "undefined") {
      try {
        localStorage.setItem(`${ANALYTICS_CACHE_KEY}${userId}`, JSON.stringify(resource.data));
      } catch {}
    }
  }, [resource.data, userId]);

  // Read cached insights on mount or when network fails
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(`${ANALYTICS_CACHE_KEY}${userId}`);
        if (stored) {
          setCachedInsights(JSON.parse(stored) as CoachInsights);
        }
      } catch {}
    }
  }, [userId]);

  const isNetworkFailure = resource.error ? isNetworkOrTimeoutError(resource.error) : false;

  // Auto-retry when connectivity returns
  useEffect(() => {
    if (isOnline && isNetworkFailure) {
      resource.retry();
    }
  }, [isOnline, isNetworkFailure, resource.retry]);

  const effectiveData = resource.data || cachedInsights;
  const isViewingCached = !resource.data && Boolean(cachedInsights);

  if (!effectiveData) {
    if (isOffline || isNetworkFailure) {
      return (
        <StudyWorkspace>
          <main className="shell section-space">
            <div className="max-w-2xl mx-auto rounded-3xl border border-slate-200 bg-white p-6 sm:p-10 shadow-sm text-center space-y-6">
              <div className="flex flex-col items-center gap-3">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-700 border border-amber-200">
                  <WifiOff size={26} />
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase bg-amber-100 text-amber-900">
                  Performance Analytics
                </span>
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-[#092E28]">
                  Diagnostics Available Once Reconnected
                </h1>
                <p className="text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
                  Your topic mastery and diagnostic coach analysis synchronize when connected to the internet. Continue practicing offline to bank new question data.
                </p>
              </div>
              <div className="pt-2">
                <Link
                  href="/practice"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#116149] text-white text-xs font-bold hover:bg-[#0e523e] transition"
                >
                  Practice Offline Questions <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </main>
        </StudyWorkspace>
      );
    }

    return (
      <StudyWorkspace>
        <ResourceStatus error={resource.error} retry={resource.retry} />
      </StudyWorkspace>
    );
  }

  const { targetScore, latestScore, bestScore, gapToTarget, weakestTopics, masteredTopics, subjectSummaries, totalMocksCompleted, coachRecommendation } = effectiveData;

  return (
    <StudyWorkspace>
      {/* Header */}


      {/* Main Content */}
      <main className="shell section-space">
        <div className="max-w-5xl mx-auto space-y-8">

          {/* Header Bar */}
          <PageHeader
            badge={{ icon: <BarChart3 size={14} />, text: "Diagnostic Coach Analysis" }}
            title="Performance Analytics & Topic Mastery"
            subtitle="Data-driven diagnosis to identify which topics will recover the most marks on exam day."
          />

          {isViewingCached && (
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
              <div className="flex items-center gap-2">
                <WifiOff size={15} className="text-amber-700 shrink-0" />
                <span>
                  <strong>Offline Mode Active</strong> — Displaying diagnostic analysis from your last online session.
                </span>
              </div>
              <button
                type="button"
                onClick={() => resource.retry()}
                className="font-bold underline hover:no-underline cursor-pointer"
              >
                Refresh
              </button>
            </div>
          )}

          {/* Metric Overview Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Target Score</span>
              <div className="text-2xl font-bold text-[#092E28] mt-1">
                {targetScore} <span className="text-xs font-normal text-slate-400">/ 400</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {gapToTarget === 0 ? "Goal Met! 🎉" : `${gapToTarget} pts to target`}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Latest Score</span>
              <div className="text-2xl font-bold text-[#092E28] mt-1">
                {latestScore !== null ? (
                  <>
                    {latestScore} <span className="text-xs font-normal text-slate-400">/ 400</span>
                  </>
                ) : (
                  <span className="text-base font-semibold text-slate-400">No mock yet</span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {bestScore ? `Best: ${bestScore} pts` : "Take 1st simulation"}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Mastered Topics</span>
              <div className="text-2xl font-bold text-emerald-700 mt-1">
                {masteredTopics.length}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Accuracy &ge; 75%
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Topics to Review</span>
              <div className="text-2xl font-bold text-amber-700 mt-1">
                {weakestTopics.length}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Topics to revisit
              </p>
            </div>
          </div>

          {/* Coach Advice Hero Card */}
          <div className="rounded-3xl bg-[#EDF2E9] border border-emerald-950/10 p-6 sm:p-7 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="max-w-2xl">
              <span className="text-xs font-bold uppercase tracking-wider text-[#116149] bg-emerald-200/60 px-2.5 py-0.5 rounded-full inline-block mb-2">
                {coachRecommendation.badge}
              </span>
              <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#092E28]">
                {coachRecommendation.headline}
              </h2>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                {coachRecommendation.explanation}
              </p>
            </div>

            {coachRecommendation.suggestedTopicSlug ? (
              <Link
                href={`/practice?${new URLSearchParams({subject:coachRecommendation.suggestedSubjectCode,...(coachRecommendation.suggestedTopicSlug?{topic:coachRecommendation.suggestedTopicSlug}:{})})}`}
                className="shrink-0 min-h-12 inline-flex items-center justify-center gap-2 rounded-full bg-[#116149] px-6 text-sm font-semibold text-white hover:bg-[#0b4936] transition-all"
              >
                Practice Weak Topic Now <ArrowRight size={15} />
              </Link>
            ) : (
              <Link
                href="/mock"
                className="shrink-0 min-h-12 inline-flex items-center justify-center gap-2 rounded-full bg-[#116149] px-6 text-sm font-semibold text-white hover:bg-[#0b4936] transition-all"
              >
                Take Diagnostic Mock <ArrowRight size={15} />
              </Link>
            )}
          </div>

          {/* 4-Subject Performance Deep Dive */}
          <div>
            <h3 className="text-lg font-semibold text-[#092E28] mb-4">
              Subject Accuracy & Readiness
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {subjectSummaries.map((sub) => (
                <div
                  key={sub.subjectCode}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-mono text-xs font-bold text-[#116149] bg-emerald-50 px-2 py-0.5 rounded mr-2">
                        {sub.subjectCode}
                      </span>
                      <strong className="text-base font-semibold text-[#092E28]">{sub.subjectName}</strong>
                    </div>
                    <span className="text-xs font-bold text-[#116149]">
                      {sub.estimatedScore===null?"No mock score":`Mock average ${sub.estimatedScore} / 100`}
                    </span>
                  </div>

                  {/* Accuracy Bar */}
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                      <span>Subject Accuracy</span>
                      <span className="font-semibold text-slate-700">{sub.questionsAttempted?`${sub.accuracyPercent}% · ${sub.questionsAttempted} answered`:"Not assessed"}</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#116149] rounded-full transition-all"
                        style={{ width: `${sub.questionsAttempted?`${sub.accuracyPercent}% · ${sub.questionsAttempted} answered`:"Not assessed"}` }}
                      />
                    </div>
                  </div>

                  {/* Counts */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center text-xs">
                    <div>
                      <div className="text-slate-400 text-[10px] uppercase font-bold">Attempted</div>
                      <div className="font-semibold text-slate-700 mt-0.5">{sub.questionsAttempted} Qs</div>
                    </div>
                    <div>
                      <div className="text-slate-400 text-[10px] uppercase font-bold">Mastered</div>
                      <div className="font-semibold text-emerald-700 mt-0.5">{sub.masteredTopicsCount} Topics</div>
                    </div>
                    <div>
                      <div className="text-slate-400 text-[10px] uppercase font-bold">To Review</div>
                      <div className="font-semibold text-amber-700 mt-0.5">{sub.weakTopicsCount} Topics</div>
                    </div>
                  </div>

                  <Link
                    href={`/practice?subject=${sub.subjectCode}`}
                    className="block text-center py-2 rounded-xl border border-emerald-900/10 text-xs font-semibold text-[#116149] hover:bg-emerald-50 transition-colors"
                  >
                    Practice {sub.subjectName} Questions
                  </Link>
                </div>
              ))}
            </div>
          </div>

          {/* Topic Diagnostic Matrix */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-[#092E28]">
                  Detailed Topic Diagnostics
                </h3>
                <p className="text-xs text-slate-500">
                  Prioritized by accuracy to guide focused practice.
                </p>
              </div>
            </div>

            {weakestTopics.length > 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="py-3 px-4">Subject</th>
                        <th className="py-3 px-4">Topic</th>
                        <th className="py-3 px-4">Accuracy</th>
                        <th className="py-3 px-4">Score / Attempted</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {weakestTopics.map((topic) => (
                        <tr key={topic.topicId} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-[#116149]">
                            {topic.subjectCode}
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-[#092E28]">
                            {topic.topicTitle}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-bold w-9">{topic.accuracyPercent}%</span>
                              <div className="h-1.5 w-16 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${topic.priority === 'critical' ? 'bg-red-500' : 'bg-amber-500'}`}
                                  style={{ width: `${topic.accuracyPercent}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-slate-500">
                            {topic.totalCorrect} / {topic.totalAttempted}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              topic.priority === 'critical' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {topic.priority === 'critical' ? 'Critical' : 'Needs Review'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <Link
                              href={`/practice?subject=${topic.subjectCode}&topic=${topic.topicSlug}`}
                              className="inline-flex items-center gap-1 font-semibold text-[#116149] hover:underline"
                            >
                              Practice <ArrowRight size={11} />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
                <p className="text-sm text-slate-600">
                  {totalMocksCompleted === 0
                    ? "No topic diagnostic data yet. Take your first mock exam or practice session to populate this matrix."
                    : "All tested topics are currently above 65% accuracy! Great work."}
                </p>
                <div className="mt-4 flex justify-center gap-3">
                  <Link
                    href="/practice"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#116149] text-xs font-semibold text-white hover:bg-[#0b4936]"
                  >
                    Start Topic Practice
                  </Link>
                  <Link
                    href="/mock"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Take Mock Simulation
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Exam Hall Pacing & Strategy Card */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <span className="flex size-8 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
                <Clock size={16} />
              </span>
              <h3 className="text-base font-semibold text-[#092E28]">
                UTME Exam Hall Pacing Guideline
              </h3>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-3xl">
              Official JAMB UTME tests <strong>180 questions across 4 subjects in 120 minutes (7,200 seconds)</strong>. That gives an average of exactly <strong>40 seconds per question</strong>.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 mt-5">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                <div className="font-semibold text-xs text-[#092E28]">1. English First (Pacing: 35s/Q)</div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Answer 60 English questions in ~35 minutes. Read passages once with full focus; do not linger on idioms.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                <div className="font-semibold text-xs text-[#092E28]">2. Calculations (Pacing: 50s/Q)</div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Mathematics and Physics require ~50s per question. Skip complex multi-step calculations on the first pass using key &lsquo;N&rsquo;.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                <div className="font-semibold text-xs text-[#092E28]">3. The 10-Minute Buffer</div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Aim to complete all 4 subjects with 10 minutes remaining. Use hotkey &lsquo;R&rsquo; to review unanswered and flagged questions.
                </p>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}

    </StudyWorkspace>
  );
}
