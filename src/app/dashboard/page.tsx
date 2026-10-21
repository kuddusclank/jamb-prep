"use client";
import { SUBJECT_COMBINATION_EDIT_URL } from "@/lib/auth/redirect";
import styles from "./dashboard.module.css";
import { StudyWorkspace } from "@/components/study-workspace";
import { buildCanonicalResultUrl } from "@/lib/routing/deep-links";
import {
AlertCircle,
ArrowRight,
ArrowUpRight,
Award,
Calendar,
Flame,
Lock,
Target,
TrendingUp,
Users,
BookA,
BookOpen,
Gamepad2,
Sparkles,
X
} from "lucide-react";
import Link from "@/components/pending-link";

interface StaticTopicDiagnostic {
  topicId: string;
  topicTitle: string;
  topicSlug: string;
  subjectCode: string;
  subjectName: string;
  accuracyPercent: number;
  totalAttempted: number;
  totalCorrect: number;
  priority: "critical" | "moderate" | "strong";
}

interface StaticSubjectSummary {
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  isCompulsory: boolean;
  questionsAttempted: number;
  questionsCorrect: number;
  accuracyPercent: number;
  estimatedScore: number | null;
  weakTopicsCount: number;
  masteredTopicsCount: number;
}

interface StaticMockHistoryItem {
  attemptId: string;
  completedAt: string | Date;
  timeSpentSeconds: number;
  totalScore: number;
  englishScore: number;
  subject2Score: number;
  subject3Score: number;
  subject4Score: number;
}

import { useState, useEffect, useRef } from "react";
import { useApiResource, ResourceStatus } from "@/lib/api/use-api-resource";
import StudyLoading from "@/components/study-loading";
import { BrowserAccountBoundary, useBrowserAccount } from "@/components/browser-account-boundary";
import type { DashboardData } from "@/lib/api/app-dtos";

export default function DashboardPage() {
  const resource = useApiResource<DashboardData>('/api/v1/dashboard');
  const account = useBrowserAccount();
  const flameScrollRef = useRef<HTMLDivElement>(null);
  const [showLexisModal, setShowLexisModal] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const dismissed = localStorage.getItem("jambprep_lexis_modal_dismissed");
      if (!dismissed) {
        setShowLexisModal(true);
      }
    }
  }, []);

  const handleDismissLexisModal = () => {
    setShowLexisModal(false);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("jambprep_lexis_modal_dismissed", "true");
      } catch (err) {
        console.error("Failed to dismiss modal in localStorage:", err);
      }
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && showLexisModal) {
        handleDismissLexisModal();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showLexisModal]);

  useEffect(() => {
    const scrollToLast = () => {
      if (flameScrollRef.current) {
        flameScrollRef.current.scrollLeft = flameScrollRef.current.scrollWidth;
      }
    };
    scrollToLast();
    const t1 = setTimeout(scrollToLast, 50);
    const t2 = setTimeout(scrollToLast, 200);
    const t3 = setTimeout(scrollToLast, 500);
    const t4 = setTimeout(scrollToLast, 1000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [resource.data?.studyStreak]);
  if (!resource.data && !resource.error) return <BrowserAccountBoundary><StudyLoading /></BrowserAccountBoundary>;
  if (!resource.data) return <StudyWorkspace><ResourceStatus error={resource.error} retry={resource.retry} /></StudyWorkspace>;
  const { subscription, coach, qualifiedReferrals, has50PercentReward } = resource.data;
  const isPremium = subscription.isPremium;
  const studentName = account.identity?.user.displayName ?? account.session.user?.displayName ?? '';
  const { targetScore, latestScore, gapToTarget, coachRecommendation, weakestTopics, subjectSummaries, recentMockHistory, totalMocksCompleted } = coach;

  // Percentage to target score
  const scorePercent = latestScore ? Math.min(100, Math.round((latestScore / targetScore) * 100)) : 0;

  return (
    <StudyWorkspace>
      {/* Navigation Header */}


      {/* Main Content Area */}
      <main className="shell section-space">
        <div className="max-w-5xl mx-auto space-y-8">

          {/* Welcome & Target Strip */}
          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6 border-b border-slate-200 pb-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-[#116149] text-[11px] font-bold uppercase tracking-wider">
                  <Flame size={12} /> STUDY COACH ACTIVE
                </span>
                <span className="text-xs text-slate-400 font-medium">2027 UTME</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight mt-1.5">
                Let’s make progress, {studentName}
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                Your preparation is personalized to your target of <strong className="text-[#092E28]">{targetScore} / 400</strong>.
              </p>
            </div>

            {/* Target and Progress Gauges */}
            <div className={styles.scoreRow}>
              <div className="rounded-2xl border border-slate-200 bg-white p-3.5 flex items-center gap-3 shadow-sm min-w-0 flex-1">
                <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-100 text-[#116149]">
                  <Target size={20} />
                </span>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Target Score</div>
                  <div className="text-xl font-bold text-[#092E28]">{targetScore} <span className="text-xs font-normal text-slate-400">/ 400</span></div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-3.5 flex items-center gap-3 shadow-sm min-w-0 flex-1">
                <span className="flex size-10 items-center justify-center rounded-xl bg-blue-100 text-blue-800">
                  <TrendingUp size={20} />
                </span>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Latest Score</div>
                  <div className="text-xl font-bold text-[#092E28]">
                    {latestScore !== null ? (
                      <>
                        {latestScore} <span className="text-xs font-normal text-slate-400">/ 400</span>
                      </>
                    ) : (
                      <span className="text-sm font-semibold text-slate-400">Pending</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Daily Study Streak Fire Motivation Card */}
          {resource.data.studyStreak && (
            <div className="rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50/80 via-white to-emerald-50/50 p-6 sm:p-7 shadow-sm relative overflow-hidden">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-3 max-w-2xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500 text-white text-xs font-extrabold uppercase tracking-wider shadow-sm shadow-amber-500/25">
                      <Flame size={14} className="fill-current" />
                      {resource.data.studyStreak.streak.qualifiedToday
                        ? "Today's Streak Locked In"
                        : resource.data.studyStreak.streak.currentStreak > 0
                          ? `Keep Your ${resource.data.studyStreak.streak.currentStreak}-Day Fire Burning`
                          : "Start Your Day 1 Streak Today"}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      Best Streak: <strong className="text-[#092E28]">{resource.data.studyStreak.streak.bestStreak} {resource.data.studyStreak.streak.bestStreak === 1 ? 'day' : 'days'}</strong>
                    </span>
                  </div>

                  <p className="text-sm sm:text-base text-slate-700 font-medium leading-relaxed">
                    {resource.data.studyStreak.streak.qualifiedToday ? (
                      <>
                        Awesome work! You’ve secured today’s streak. <strong className="text-[#116149]">Practice at least once or take a mock exam tomorrow</strong> to extend your streak to {resource.data.studyStreak.streak.currentStreak + 1} days!
                      </>
                    ) : resource.data.studyStreak.streak.currentStreak > 0 ? (
                      <>
                        You are on a <strong className="text-[#092E28]">{resource.data.studyStreak.streak.currentStreak}-day streak</strong>! Complete at least one practice session or a mock exam today before midnight to reach <strong className="text-[#116149]">{resource.data.studyStreak.streak.currentStreak + 1} days</strong>.
                      </>
                    ) : (
                      <>
                        Build your daily UTME habit. <strong className="text-[#092E28]">Any completed practice session or mock exam</strong> counts toward today’s streak and keeps your fire burning!
                      </>
                    )}
                  </p>

                  {/* Flame Calendar Strip (Scrollable from registration date to today) */}
                  <div
                    ref={flameScrollRef}
                    className="flex items-center gap-2 sm:gap-3 pt-1 overflow-x-auto pb-1 max-w-full flex-nowrap"
                    tabIndex={0}
                    aria-label="Daily study streak calendar"
                  >
                    {resource.data.studyStreak.streak.recentDays.map((day) => (
                      <div
                        key={day.localDate}
                        className={`flex flex-col items-center justify-center p-2 rounded-xl text-center shrink-0 min-w-11 sm:min-w-12 transition ${
                          day.isToday
                            ? day.qualified
                              ? 'bg-amber-100/90 border-2 border-amber-500 text-amber-950 font-bold shadow-sm'
                              : 'bg-white border-2 border-dashed border-amber-400 text-amber-900 font-bold'
                            : day.qualified
                              ? 'bg-amber-50/80 border border-amber-200 text-amber-900'
                              : 'bg-slate-100/70 border border-slate-200 text-slate-400'
                        }`}
                        title={`${day.localDate}: ${day.qualified ? 'Qualified streak day' : 'No study recorded'}`}
                      >
                        <span className="text-[10px] uppercase tracking-wider font-semibold">
                          {day.dayShort}
                        </span>
                        <span className="text-lg mt-0.5" aria-hidden="true">
                          {day.qualified ? '🔥' : '⚪'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Fire Card Actions */}
                <div className="shrink-0 flex flex-col sm:flex-row lg:flex-col gap-2.5">
                  {!resource.data.studyStreak.streak.qualifiedToday ? (
                    <>
                      <Link
                        href="/practice"
                        className="min-h-11 inline-flex items-center justify-center gap-2 rounded-full bg-[#116149] px-6 text-xs font-bold text-white hover:bg-[#0b4936] transition shadow-md shadow-[#116149]/20"
                      >
                        Practice Now (5 Qs) <ArrowRight size={14} />
                      </Link>
                      <Link
                        href="/mock"
                        className="min-h-11 inline-flex items-center justify-center gap-2 rounded-full border border-emerald-900/20 bg-white px-6 text-xs font-semibold text-[#092E28] hover:bg-emerald-50 transition"
                      >
                        Take Mock Exam
                      </Link>
                    </>
                  ) : (
                    <Link
                      href="/practice"
                      className="min-h-11 inline-flex items-center justify-center gap-2 rounded-full bg-[#116149] px-6 text-xs font-bold text-white hover:bg-[#0b4936] transition shadow-md shadow-[#116149]/20"
                    >
                      Keep Practicing <ArrowRight size={14} />
                    </Link>
                  )}
                  <Link
                    href="/profile#schedule"
                    className="text-[11px] font-semibold text-slate-500 hover:text-[#116149] text-center underline decoration-slate-300 underline-offset-4"
                  >
                    Reminder & Goal Settings
                  </Link>
                </div>
              </div>
            </div>
          )}


          {/* Your next revision priorities Section */}
          <div>
            <div className="flex flex-wrap gap-3 items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-[#092E28] flex flex-wrap items-center gap-2">
                  <AlertCircle size={18} className="text-amber-700" />
                  Your next revision priorities
                  {!isPremium && (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full">
                      <Lock size={10} /> PRO ONLY
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-500">
                  Topics where your recorded answers suggest more practice would help.
                </p>
              </div>

              <Link
                href="/practice/"
                className="text-xs font-semibold text-[#116149] hover:underline flex items-center gap-1"
              >
                Choose a practice topic <ArrowRight size={12} />
              </Link>
            </div>

            {!isPremium ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
                <div className="flex flex-wrap items-start justify-between gap-5">
                  <div className="max-w-xl">
                    <h4 className="text-lg font-semibold">Build a more focused revision plan</h4>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">Premium highlights the topics to revisit using your practice and mock results. Your free daily practice and diagnostic mock are still available.</p>
                  </div>
                  <Link href="/pricing" className="inline-flex min-h-12 items-center rounded-full border border-slate-300 px-5 text-sm font-semibold">Explore Premium <ArrowRight size={16} className="ml-2" /></Link>
                </div>
              </div>
            ) : (
              /* Premium Tier Unlocked View */
              weakestTopics.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5">
                  {weakestTopics.map((item) => (
                    <div
                      key={item.topicId}
                      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-emerald-300 transition-colors flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-mono text-[11px] font-bold text-[#116149] bg-emerald-50 px-2 py-0.5 rounded">
                            {item.subjectCode}
                          </span>
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                            item.priority === 'critical' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {item.priority === 'critical' ? 'Needs Attention' : 'Review'}
                          </span>
                        </div>

                        <h4 className="font-semibold text-sm text-[#092E28] line-clamp-1">{item.topicTitle}</h4>
                        <p className="text-xs text-slate-500 mt-0.5">{item.subjectName}</p>

                        <div className="mt-3 flex items-center justify-between text-xs font-medium text-slate-600">
                          <span>Accuracy: <strong>{item.accuracyPercent}%</strong></span>
                          <span className="text-slate-400">{item.totalCorrect}/{item.totalAttempted} correct</span>
                        </div>

                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden mt-1.5">
                          <div
                            className={`h-full rounded-full ${item.priority === 'critical' ? 'bg-red-500' : 'bg-amber-500'}`}
                            style={{ width: `${item.accuracyPercent}%` }}
                          />
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100">
                        <Link
                          href={`/practice?subject=${item.subjectCode}&topic=${item.topicSlug}`}
                          className="text-xs font-semibold text-[#116149] hover:text-[#0b4936] flex items-center justify-between group"
                        >
                          <span>Practice this topic</span>
                          <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center">
                  <p className="text-sm text-slate-600">
                    {totalMocksCompleted === 0
                      ? "Complete your first diagnostic mock exam or topic practice session to generate your weak-topic breakdown."
                      : "🎉 Great job! More distinct answers across sessions are needed to establish reliable topic strengths."}
                  </p>
                  <Link
                    href="/mock"
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#116149] hover:underline"
                  >
                    Start Diagnostic Mock <ArrowRight size={12} />
                  </Link>
                </div>
              )
            )}
          </div>

          {/* Enrolled Subjects Cards */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-[#092E28] tracking-tight">Your 4 UTME Subjects</h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100/90 text-[#116149] text-[11px] font-extrabold uppercase tracking-wide">
                    400 Pts Total
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Target mastery breakdown and diagnostic performance across your registered subjects.
                </p>
              </div>

              <Link
                href={SUBJECT_COMBINATION_EDIT_URL}
                className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:text-[#116149] hover:border-emerald-300 hover:bg-emerald-50/50 transition-all shadow-2xs"
              >
                Change combination <ArrowUpRight size={13} />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {subjectSummaries.map((sub) => {
                const hasScore = sub.estimatedScore !== null && sub.estimatedScore > 0;
                const scoreValue = sub.estimatedScore ?? 0;

                return (
                  <div
                    key={sub.subjectCode}
                    className="group relative rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs hover:shadow-md hover:border-emerald-300 transition-all duration-200 flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-black tracking-wider text-[#116149] bg-emerald-50 border border-emerald-200/70 px-2.5 py-1 rounded-xl">
                          {sub.subjectCode}
                        </span>

                        {sub.isCompulsory ? (
                          <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-full uppercase tracking-wider">
                            Compulsory
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                            Elective
                          </span>
                        )}
                      </div>

                      {/* Subject Name */}
                      <h4 className="mt-3.5 font-bold text-base text-[#092E28] tracking-tight group-hover:text-[#116149] transition-colors truncate" title={sub.subjectName}>
                        {sub.subjectName}
                      </h4>

                      {/* Performance / Score Section */}
                      <div className="mt-4 pt-3.5 border-t border-slate-100 space-y-2">
                        <div className="flex items-baseline justify-between">
                          <span className="text-[11px] font-medium text-slate-500">
                            {hasScore ? "Estimated Score" : "Diagnostic Status"}
                          </span>
                          <div>
                            {hasScore ? (
                              <span className="text-xl font-extrabold text-[#092E28] tracking-tight">
                                {scoreValue} <span className="text-xs font-normal text-slate-400">/ 100</span>
                              </span>
                            ) : (
                              <span className="text-[11px] font-semibold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200/70">
                                {sub.questionsAttempted > 0 ? "Calibrating..." : "Pending Mock"}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Visual Progress Gauge */}
                        <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              hasScore && scoreValue >= 70
                                ? "bg-gradient-to-r from-emerald-500 to-[#116149]"
                                : hasScore && scoreValue >= 50
                                  ? "bg-gradient-to-r from-teal-500 to-emerald-600"
                                  : hasScore
                                    ? "bg-gradient-to-r from-amber-400 to-amber-500"
                                    : sub.questionsAttempted > 0
                                      ? "bg-emerald-400"
                                      : "bg-slate-200"
                            }`}
                            style={{
                              width: `${hasScore ? Math.min(100, Math.max(6, scoreValue)) : sub.questionsAttempted > 0 ? 15 : 0}%`,
                            }}
                          />
                        </div>

                        {/* Practice Activity Micro-stats */}
                        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                          <span>
                            {sub.questionsAttempted > 0 ? (
                              <span><strong>{sub.questionsAttempted}</strong> Qs solved</span>
                            ) : (
                              <span className="text-slate-400">0 questions answered</span>
                            )}
                          </span>
                          <span>
                            {sub.questionsAttempted > 0 ? (
                              <span className="font-semibold text-emerald-800">{sub.accuracyPercent}% accuracy</span>
                            ) : (
                              <span className="text-slate-400">Untested</span>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <Link
                      href={`/practice?subject=${sub.subjectCode}`}
                      className="mt-4 flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-emerald-50 text-[#116149] font-bold text-xs border border-emerald-200/80 hover:bg-[#116149] hover:text-white hover:border-transparent transition-all shadow-2xs group-hover:bg-[#116149] group-hover:text-white"
                    >
                      Practice {sub.subjectCode} <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Past CBT Mock History */}
          {recentMockHistory.length > 0 && (
            <div>
              <div className="flex flex-wrap gap-3 items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-[#092E28] flex flex-wrap items-center gap-2">
                    <Calendar size={18} className="text-[#116149]" />
                    Mock Simulation History
                  </h3>
                  <p className="text-xs text-slate-500">
                    Review your completed simulations and question solutions.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                <div className="divide-y divide-slate-100">
                  {recentMockHistory.map((mock, idx) => {
                    const mins = Math.floor(mock.timeSpentSeconds / 60);
                    const formattedDate = new Date(mock.completedAt).toLocaleDateString("en-NG", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    });

                    return (
                      <div
                        key={mock.attemptId}
                        className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
                      >
                        <div>
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="text-xs font-bold uppercase tracking-wider text-[#116149]">
                              Mock Attempt #{recentMockHistory.length - idx}
                            </span>
                            <span className="text-xs text-slate-400">• {formattedDate}</span>
                            <span className="text-xs text-slate-400">• {mins} mins spent</span>
                          </div>

                          <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-[#092E28]">
                              {mock.totalScore}
                            </span>
                            <span className="text-xs text-slate-400">/ 400 points</span>
                          </div>

                          {/* Quick 4-subject breakdown pills */}
                          <div className="flex flex-wrap gap-2 mt-2">
                            <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                              ENG: {mock.englishScore}/100
                            </span>
                            <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                              Sub 2: {mock.subject2Score}/100
                            </span>
                            <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                              Sub 3: {mock.subject3Score}/100
                            </span>
                            <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                              Sub 4: {mock.subject4Score}/100
                            </span>
                          </div>
                        </div>

                        <div className="shrink-0">
                          <Link
                            href={buildCanonicalResultUrl(mock.attemptId)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-slate-200 text-xs font-semibold text-[#092E28] hover:bg-emerald-50 hover:border-emerald-200 hover:text-[#116149] transition-all"
                          >
                            Review Solutions <ArrowUpRight size={13} />
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Viral Referral Milestone Widget */}
          {!isPremium && (
            <div className="rounded-3xl border border-amber-300/50 bg-[#F8F2DF] p-6 text-[#092E28] flex flex-col sm:flex-row sm:items-center justify-between gap-5">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-900">
                  <Users size={14} /> REFER-AND-EARN PROGRESS
                </div>
                <h4 className="text-lg font-bold mt-1">
                  {has50PercentReward
                    ? "🎉 50% Discount Voucher Ready!"
                    : `[ ${qualifiedReferrals} / 2 ] Verified Friends Invited`}
                </h4>
                <p className="mt-1 text-xs text-amber-950/80 max-w-lg">
                  {has50PercentReward
                    ? "You unlocked 50% off! Pay ₦500 instead of ₦1,000 when you start your first monthly access."
                    : "Invite 2 classmates with your link. Once both verify, you get 50% off your first 30 days of unlimited access."}
                </p>
              </div>

              <Link
                href="/referrals"
                className="shrink-0 min-h-11 inline-flex items-center justify-center gap-2 rounded-full bg-[#116149] px-5 text-xs font-semibold text-white hover:bg-[#0b4936] transition-all hover:-translate-y-0.5"
              >
                View Invite Link & Progress <ArrowRight size={14} />
              </Link>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}

      {/* Lexis & Word Games Pop-up Modal */}
      {showLexisModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="lexis-modal-title"
          onClick={handleDismissLexisModal}
        >
          <div
            className="relative w-full max-w-lg rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950 via-[#092E28] to-emerald-900 p-6 sm:p-8 text-white shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Background ambient glow */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10">
              {/* Header: Badge on left, Close button on right */}
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-200 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider border border-emerald-400/20 min-w-0">
                  {isPremium ? (
                    <>
                      <BookOpen size={12} className="shrink-0 text-emerald-300" />
                      <span className="truncate">UTME Lexis & Oral English</span>
                    </>
                  ) : (
                    <>
                      <Lock size={12} className="shrink-0 text-amber-300" />
                      <span className="truncate">Pro · UTME Lexis & Oral English</span>
                    </>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleDismissLexisModal}
                  className="shrink-0 flex size-8 sm:size-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-emerald-100 hover:text-white transition cursor-pointer active:scale-95 border border-white/10"
                  aria-label="Close modal"
                >
                  <X size={18} />
                </button>
              </div>

              <h2 id="lexis-modal-title" className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                Master Vocabulary & Speech Sounds
              </h2>

              <p className="mt-2 text-xs sm:text-sm text-emerald-100/90 leading-relaxed">
                Boost your Use of English score with high-yield UTME words, syllable stress drills, silent letter hunting, and rhyme rush games.
              </p>

              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <span className="px-3 py-1 rounded-lg bg-white/10 text-emerald-100 font-medium">📖 680+ Words & Free Dictionary</span>
                <span className="px-3 py-1 rounded-lg bg-white/10 text-emerald-100 font-medium">🔊 IPA & Native Audio</span>
                <span className="px-3 py-1 rounded-lg bg-white/10 text-emerald-100 font-medium">🎮 4 Games (300 Words Each)</span>
              </div>

              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                {isPremium ? (
                  <>
                    <Link
                      href="/dictionary"
                      onClick={handleDismissLexisModal}
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-xs sm:text-sm font-bold text-[#092E28] hover:bg-emerald-50 transition shadow-md flex-1 text-center"
                    >
                      <BookA size={16} /> Open Dictionary Hub
                    </Link>
                    <Link
                      href="/dictionary?tab=games"
                      onClick={handleDismissLexisModal}
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-800/40 px-5 py-3 text-xs sm:text-sm font-semibold text-emerald-100 hover:bg-emerald-800/70 transition flex-1 text-center"
                    >
                      <Gamepad2 size={16} /> Play Word Games <ArrowRight size={16} />
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      href="/pricing"
                      onClick={handleDismissLexisModal}
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-amber-400 text-amber-950 px-5 py-3 text-xs sm:text-sm font-bold hover:bg-amber-300 transition shadow-md flex-1 text-center cursor-pointer"
                    >
                      <Lock size={16} /> Unlock with Pro (₦1,000)
                    </Link>
                    <Link
                      href="/pricing"
                      onClick={handleDismissLexisModal}
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-800/40 px-5 py-3 text-xs sm:text-sm font-semibold text-emerald-100 hover:bg-emerald-800/70 transition flex-1 text-center cursor-pointer"
                    >
                      View Pro Plans <ArrowRight size={16} />
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </StudyWorkspace>
  );
}
