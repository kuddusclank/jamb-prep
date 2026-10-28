"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "@/components/pending-link";
import { useBrowserAccount } from "@/components/browser-account-boundary";
import { useApiResource } from "@/lib/api/use-api-resource";
import type { ProfileData } from "@/lib/api/app-dtos";
import {
  ensureWeeklyPackDownloaded,
  getCurrentWeekKey,
  submitPackAnswer,
  flushPendingSync,
} from "@/lib/offline/weekly-pack-client";
import type { StoredWeeklyPack } from "@/lib/offline/idb-storage";
import { getOfflineProfile, isOfflineAccessValid } from "@/lib/offline/offline-profile-cache";
import { OfflineGatedNotice } from "@/app/dashboard/offline-gated-notice";
import { SyncStatusIndicator } from "@/components/sync-status-indicator";
import { PageHeader } from "@/components/page-header";
import { MathRenderer } from "@/components/math-renderer";
import { QuestionDiagram } from "@/components/question-diagram";
import { useWorkspaceFocus } from "@/components/study-workspace-context";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  XCircle,
  BookOpen,
  WifiOff,
  Loader2,
  HelpCircle,
  RotateCcw,
  Layers,
  Award,
  Bookmark,
  Lock,
  Building2,
} from "lucide-react";

interface QuestionOption {
  id: string;
  label: "A" | "B" | "C" | "D";
  content: string;
}

interface QuestionItem {
  id: string;
  subjectCode: string;
  subjectName: string;
  topicTitle: string;
  stem: string;
  difficulty?: string;
  imageUrl?: string | null;
  imageAlt?: string | null;
  options: QuestionOption[];
  passage?: {
    id: string;
    title: string | null;
    content: string;
  } | null;
}

export function WeeklyPracticeClient() {
  const account = useBrowserAccount();
  const profile = useApiResource<ProfileData>("/api/v1/profile");
  const isSchoolAttached = Boolean(profile.data?.subscription?.isSchoolAttached);
  const userId = account.identity?.user.id || account.session.user?.id || "";

  const [pack, setPack] = useState<StoredWeeklyPack | null>(null);
  const [selectedSubjectCode, setSelectedSubjectCode] = useState<string>("");
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [syncedNotice, setSyncedNotice] = useState<string | null>(null);
  const [flaggedIds, setFlaggedIds] = useState<Set<string>>(new Set());
  const [showOverallSummary, setShowOverallSummary] = useState<boolean>(false);

  // Active Session State (just like normal practice)
  const [activeQuestions, setActiveQuestions] = useState<QuestionItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<"A" | "B" | "C" | "D" | null>(null);
  const [answerResult, setAnswerResult] = useState<{
    isCorrect: boolean;
    correctOption: string;
    explanation: string;
  } | null>(null);
  const [sessionAnswers, setSessionAnswers] = useState<
    Record<string, { isCorrect: boolean; selectedOption: string; explanation: string }>
  >({});
  const [isSessionCompleted, setIsSessionCompleted] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const { setFocusMode } = useWorkspaceFocus();

  useEffect(() => {
    const isPracticing = activeQuestions.length > 0;
    setFocusMode(isPracticing);
    return () => {
      setFocusMode(false);
    };
  }, [activeQuestions.length, setFocusMode]);

  // Monitor network status
  useEffect(() => {
    if (typeof navigator !== "undefined") {
      setIsOnline(navigator.onLine);
    }
    const onOnline = () => {
      setIsOnline(true);
      if (userId) {
        void flushPendingSync(userId);
      }
    };
    const onOffline = () => setIsOnline(false);

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [userId]);

  // Load weekly pack from IndexedDB / Server
  useEffect(() => {
    if (!userId) return;
    let active = true;
    setIsLoading(true);
    setErrorMessage(null);

    void ensureWeeklyPackDownloaded(userId)
      .then((data) => {
        if (!active) return;
        setPack(data);
        if (data.subjects?.length) {
          setSelectedSubjectCode(data.subjects[0].code);
        }
      })
      .catch((err: unknown) => {
        if (!active) return;
        setErrorMessage(
          err instanceof Error
            ? err.message
            : "Unable to load weekly pack. Check your connection or set up your subjects."
        );
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [userId]);

  // All questions in the pack for the selected subject
  const subjectQuestions = useMemo(() => {
    if (!pack || !selectedSubjectCode) return [];
    return (pack.questions as unknown as QuestionItem[]).filter(
      (q) => q.subjectCode === selectedSubjectCode
    );
  }, [pack, selectedSubjectCode]);

  // Unanswered questions in the pack for the selected subject
  const unansweredSubjectQuestions = useMemo(() => {
    if (!pack) return [];
    return subjectQuestions.filter((q) => !pack.answers?.[q.id]);
  }, [subjectQuestions, pack]);

  const availableCount = unansweredSubjectQuestions.length > 0
    ? unansweredSubjectQuestions.length
    : subjectQuestions.length;

  const toggleFlag = (qId: string) => {
    setFlaggedIds((prev) => {
      const next = new Set(prev);
      if (next.has(qId)) next.delete(qId);
      else next.add(qId);
      return next;
    });
  };

  // Start a focused practice session (e.g. 5, 10, 15, 20 questions)
  const handleStartSession = () => {
    if (!pack || subjectQuestions.length === 0) return;

    // Prioritize unanswered questions first, or cycle through all if all are answered
    const pool = unansweredSubjectQuestions.length > 0 ? unansweredSubjectQuestions : subjectQuestions;
    const countToPick = Math.min(questionCount, pool.length);
    const picked = pool.slice(0, countToPick);

    setActiveQuestions(picked);
    setCurrentIndex(0);
    setSelectedOption(null);
    setAnswerResult(null);
    setSessionAnswers({});
    setIsSessionCompleted(false);
  };

  const currentQ = activeQuestions[currentIndex] || null;
  const isCurrentFlagged = currentQ ? flaggedIds.has(currentQ.id) : false;

  const handleSelectOption = (label: "A" | "B" | "C" | "D") => {
    if (answerResult || isSubmitting) return;
    setSelectedOption(label);
  };

  const handleSubmitAnswer = async () => {
    if (!pack || !currentQ || !selectedOption || answerResult || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await submitPackAnswer({
        userId,
        packId: pack.packId,
        questionId: currentQ.id,
        selectedOption,
      });

      setAnswerResult(res);
      setSessionAnswers((prev) => ({
        ...prev,
        [currentQ.id]: {
          isCorrect: res.isCorrect,
          selectedOption,
          explanation: res.explanation,
        },
      }));

      // Update answers count in pack
      setPack((prev) => {
        if (!prev) return prev;
        const nextAnswers = {
          ...prev.answers,
          [currentQ.id]: {
            selectedOption,
            answeredAt: new Date().toISOString(),
          },
        };
        const nextAnswered = Object.keys(nextAnswers).length;

        const subProg = prev.progress.bySubject[selectedSubjectCode] || {
          total: subjectQuestions.length,
          answered: 0,
        };
        const nextBySubject = {
          ...prev.progress.bySubject,
          [selectedSubjectCode]: {
            ...subProg,
            answered: subjectQuestions.filter((q) => nextAnswers[q.id]).length,
          },
        };

        return {
          ...prev,
          answers: nextAnswers,
          progress: {
            ...prev.progress,
            answered: nextAnswered,
            bySubject: nextBySubject,
          },
        };
      });
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to record answer locally."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNextQuestion = () => {
    if (currentIndex < activeQuestions.length - 1) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      const nextQ = activeQuestions[nextIdx];
      const saved = sessionAnswers[nextQ?.id || ""];
      if (saved) {
        setSelectedOption(saved.selectedOption as "A" | "B" | "C" | "D");
        setAnswerResult({
          isCorrect: saved.isCorrect,
          correctOption: saved.isCorrect ? saved.selectedOption : (pack?.feedback?.[nextQ.id]?.correctOption || "A"),
          explanation: saved.explanation,
        });
      } else {
        setSelectedOption(null);
        setAnswerResult(null);
      }
    } else {
      setIsSessionCompleted(true);
    }
  };

  const handleJumpToQuestion = (targetIndex: number) => {
    if (targetIndex < 0 || targetIndex >= activeQuestions.length) return;
    setCurrentIndex(targetIndex);
    const targetQ = activeQuestions[targetIndex];
    const saved = sessionAnswers[targetQ?.id || ""];
    if (saved) {
      setSelectedOption(saved.selectedOption as "A" | "B" | "C" | "D");
      setAnswerResult({
        isCorrect: saved.isCorrect,
        correctOption: saved.isCorrect ? saved.selectedOption : (pack?.feedback?.[targetQ.id]?.correctOption || "A"),
        explanation: saved.explanation,
      });
    } else {
      setSelectedOption(null);
      setAnswerResult(null);
    }
  };

  // Offline access verification
  if (!isOnline) {
    const offlineValidity = isOfflineAccessValid(getOfflineProfile(userId));
    if (!offlineValidity.valid) {
      return (
        <OfflineGatedNotice
          reason={offlineValidity.reason}
          profile={offlineValidity.profile}
        />
      );
    }
  }

  // Gated for Pro / Premium subscribers only — no free trials
  if (profile.data && profile.data.subscription.isPremium === false) {
    return (
      <div className="shell section-space max-w-xl mx-auto">
        <div className="rounded-3xl border border-amber-200 bg-gradient-to-b from-amber-50/80 to-white p-8 text-center space-y-5 shadow-sm">
          <div className="size-16 rounded-full bg-amber-100 text-amber-900 border border-amber-200 flex items-center justify-center mx-auto shadow-sm">
            <Lock size={28} />
          </div>

          <div className="space-y-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-900 bg-amber-100 border border-amber-300 px-3 py-1 rounded-full">
              PRO FEATURE
            </span>
            <h2 className="text-2xl font-bold text-[#092E28] pt-1">
              Offline Practice is a Pro Feature
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed max-w-md mx-auto">
              Download 250 reviewed UTME questions every week across your 4 subjects. Practice anywhere without data or internet connection.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
            <Link
              href="/pricing"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-[#116149] text-white text-sm font-bold shadow-md hover:bg-[#0b4936] transition"
            >
              {isSchoolAttached ? (
                <>
                  <Building2 size={16} className="text-[#E7B85A]" />
                  <span>Contact School Admin to Unlock</span>
                </>
              ) : (
                <span>Upgrade to Pro</span>
              )}
              <ArrowRight size={16} />
            </Link>
            <Link
              href="/dashboard"
              className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3.5 rounded-full bg-white border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition"
            >
              Back to Overview
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="shell section-space min-h-[50vh] flex flex-col items-center justify-center gap-4">
        <Loader2 size={36} className="text-[#116149] animate-spin" />
        <p className="text-sm font-medium text-slate-600">
          Loading your weekly offline practice pack...
        </p>
      </div>
    );
  }

  if (errorMessage && !pack) {
    return (
      <div className="shell section-space max-w-xl mx-auto">
        <div className="rounded-3xl border border-rose-200 bg-rose-50/60 p-7 text-center space-y-4">
          <p className="text-base font-semibold text-rose-900">{errorMessage}</p>
          <div className="flex justify-center gap-3">
            <Link
              href="/dashboard"
              className="px-5 py-2.5 rounded-full bg-white border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Back to Overview
            </Link>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 rounded-full bg-[#116149] text-white text-sm font-semibold hover:bg-[#0b4936]"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 1. SESSION COMPLETED SCREEN
  if (isSessionCompleted) {
    const sessionScore = Object.values(sessionAnswers).filter((a) => a.isCorrect).length;
    const sessionTotal = activeQuestions.length;
    const sessionPct = Math.round((sessionScore / sessionTotal) * 100);
    const flaggedInSession = activeQuestions.filter((q) => flaggedIds.has(q.id)).length;

    return (
      <div className="shell section-space max-w-2xl mx-auto space-y-6">
        <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center space-y-6 shadow-sm">
          <div className="size-16 rounded-full bg-emerald-100 text-[#116149] flex items-center justify-center mx-auto">
            <Award size={32} />
          </div>

          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
              Session Finished
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#092E28] pt-2">
              Great Practice Session!
            </h2>
            <p className="text-sm text-slate-500">
              Your answers have been saved and recorded to your account.
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-6 max-w-md mx-auto grid grid-cols-3 gap-3">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Score</div>
              <div className="text-2xl font-bold text-[#092E28]">{sessionScore} / {sessionTotal}</div>
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Accuracy</div>
              <div className="text-2xl font-bold text-emerald-700">{sessionPct}%</div>
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Flagged</div>
              <div className="text-2xl font-bold text-amber-700">{flaggedInSession}</div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setActiveQuestions([]);
                setIsSessionCompleted(false);
              }}
              className="w-full sm:w-auto px-6 py-3.5 rounded-full bg-[#116149] text-white text-sm font-bold shadow-sm hover:bg-[#0b4936] transition flex items-center justify-center gap-2"
            >
              <RotateCcw size={16} />
              <span>Start Another Practice Set</span>
            </button>
            <Link
              href="/dashboard"
              className="w-full sm:w-auto px-6 py-3.5 rounded-full bg-white border border-slate-200 text-slate-700 text-sm font-bold hover:bg-slate-50 transition text-center"
            >
              Return to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 2. ACTIVE PRACTICE RUNNER SCREEN
  if (activeQuestions.length > 0 && currentQ) {
    const isAnswered = Boolean(answerResult);

    return (
      <div className="shell section-space max-w-5xl mx-auto space-y-8 pb-20">
        {/* Top Session Progress Bar & Palette */}
        <div className="space-y-3 border-b border-slate-200 pb-4">
          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => {
                if (confirm("End this practice set and return to weekly practice selection?")) {
                  setActiveQuestions([]);
                }
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
            >
              <ArrowLeft size={15} />
              <span>Quit Set</span>
            </button>

            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              {selectedSubjectCode} · Question {currentIndex + 1} of {activeQuestions.length}
            </span>

            <div className="flex items-center gap-2">
              <span className="hidden sm:inline text-xs text-slate-400 font-medium truncate max-w-[150px]">
                {currentQ.topicTitle}
              </span>
              <SyncStatusIndicator showWhenAllSynced />
            </div>
          </div>

          {/* Quick Question Chips (Palette for this set) */}
          <div className="flex items-center gap-2 overflow-x-auto px-3 sm:px-4 py-2.5 rounded-2xl bg-slate-50/80 border border-slate-100 no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {activeQuestions.map((q, idx) => {
              const isCur = idx === currentIndex;
              const ans = sessionAnswers[q.id];
              const isFlag = flaggedIds.has(q.id);

              let chipStyle = "bg-white border-slate-200 text-slate-600 hover:border-slate-300";
              if (ans) {
                chipStyle = ans.isCorrect
                  ? "bg-emerald-100 border-emerald-400 text-emerald-950 font-bold"
                  : "bg-rose-100 border-rose-400 text-rose-950 font-bold";
              }
              if (isCur) {
                chipStyle += " ring-2 ring-[#116149] ring-offset-1 font-bold";
              }

              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => handleJumpToQuestion(idx)}
                  className={`size-8 rounded-xl border text-xs font-medium flex items-center justify-center shrink-0 relative transition cursor-pointer ${chipStyle}`}
                  title={`Question ${idx + 1}${isFlag ? " (Flagged)" : ""}`}
                >
                  <span>{idx + 1}</span>
                  {isFlag && (
                    <span className="absolute -top-1 -right-1 size-2 rounded-full bg-amber-500 border border-white" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Question Container */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          {/* Header with Question Number and Flag Bookmark Toggle */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Question {currentIndex + 1} of {activeQuestions.length}
            </span>

            <button
              type="button"
              onClick={() => toggleFlag(currentQ.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition ${
                isCurrentFlagged
                  ? "bg-amber-50 text-amber-800 border-amber-300 shadow-xs"
                  : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
              }`}
              title={isCurrentFlagged ? "Remove review flag" : "Flag question for review"}
            >
              <Bookmark
                size={13}
                className={isCurrentFlagged ? "fill-amber-500 text-amber-600" : "text-slate-400"}
              />
              <span>{isCurrentFlagged ? "Flagged for Review" : "Flag for Review"}</span>
            </button>
          </div>

          {/* Passage Container (if applicable for English Comprehension / Cloze) */}
          {currentQ.passage && (
            <div className="rounded-2xl bg-amber-50/70 border border-amber-200/70 p-5 space-y-2 text-slate-800 text-sm leading-relaxed max-h-72 overflow-y-auto">
              {currentQ.passage.title && (
                <div className="font-bold text-[#092E28] flex items-center gap-2">
                  <BookOpen size={16} className="text-amber-800" />
                  <span>{currentQ.passage.title}</span>
                </div>
              )}
              <div className="whitespace-pre-line text-xs sm:text-sm">
                <MathRenderer content={currentQ.passage.content} />
              </div>
            </div>
          )}

          {/* Diagram (if image) */}
          {currentQ.imageUrl && (
            <QuestionDiagram
              url={currentQ.imageUrl}
              alt={currentQ.imageAlt || "Question illustration"}
            />
          )}

          {/* Question Stem */}
          <div className="text-base sm:text-lg font-medium text-slate-900 leading-relaxed">
            <MathRenderer content={currentQ.stem} />
          </div>

          {/* Options List */}
          <div className="space-y-3 pt-2">
            {currentQ.options.map((opt) => {
              const isSelected = selectedOption === opt.label;
              const isCorrectOpt = answerResult?.correctOption === opt.label;

              let optionStyle =
                "bg-white border-slate-200 text-slate-800 hover:border-slate-300 hover:bg-slate-50/50";
              let badgeStyle = "bg-slate-100 text-slate-700 border-slate-200";

              if (isAnswered) {
                if (isSelected && isCorrectOpt) {
                  optionStyle = "bg-emerald-50/90 border-emerald-500 text-emerald-950 font-semibold";
                  badgeStyle = "bg-emerald-600 text-white border-emerald-600";
                } else if (isSelected && !isCorrectOpt) {
                  optionStyle = "bg-rose-50/90 border-rose-400 text-rose-950 font-semibold";
                  badgeStyle = "bg-rose-600 text-white border-rose-600";
                } else if (isCorrectOpt) {
                  optionStyle = "bg-emerald-50/50 border-emerald-400 text-emerald-900 font-semibold";
                  badgeStyle = "bg-emerald-500 text-white border-emerald-500";
                } else {
                  optionStyle = "bg-slate-50/60 border-slate-200 text-slate-400 opacity-60";
                  badgeStyle = "bg-slate-200 text-slate-500 border-slate-300";
                }
              } else if (isSelected) {
                optionStyle = "bg-emerald-50/70 border-[#116149] text-emerald-950 ring-1 ring-[#116149]";
                badgeStyle = "bg-[#116149] text-white border-[#116149]";
              }

              return (
                <button
                  key={opt.id}
                  type="button"
                  disabled={isAnswered || isSubmitting}
                  onClick={() => handleSelectOption(opt.label)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all duration-200 flex items-start gap-3.5 ${optionStyle} ${
                    !isAnswered ? "cursor-pointer active:scale-[0.99]" : "cursor-default"
                  }`}
                >
                  <span
                    className={`size-7 rounded-xl font-bold text-xs flex items-center justify-center shrink-0 border transition ${badgeStyle}`}
                  >
                    {opt.label}
                  </span>
                  <div className="flex-1 text-sm sm:text-base leading-relaxed pt-0.5">
                    <MathRenderer content={opt.content} />
                  </div>
                  {isAnswered && isSelected && isCorrectOpt && (
                    <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-1" />
                  )}
                  {isAnswered && isSelected && !isCorrectOpt && (
                    <XCircle size={18} className="text-rose-500 shrink-0 mt-1" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Explanation Box (Revealed after question is answered) */}
          {answerResult && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 space-y-2 animate-fade-in">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-900">
                <HelpCircle size={15} />
                <span>Explanation · Correct Option: {answerResult.correctOption}</span>
              </div>
              <div className="text-xs sm:text-sm text-emerald-950 leading-relaxed">
                <MathRenderer content={answerResult.explanation} />
              </div>
            </div>
          )}

          {/* Bottom Action Button */}
          <div className="pt-4 border-t border-slate-100 flex justify-end">
            {!isAnswered ? (
              <button
                type="button"
                disabled={!selectedOption || isSubmitting}
                onClick={handleSubmitAnswer}
                className="px-7 py-3 rounded-full bg-[#116149] text-white text-sm font-bold shadow-sm hover:bg-[#0b4936] transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Checking..." : "Submit Answer"}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleNextQuestion}
                className="inline-flex items-center gap-2 px-7 py-3 rounded-full bg-[#116149] text-white text-sm font-bold shadow-sm hover:bg-[#0b4936] transition"
              >
                <span>{currentIndex < activeQuestions.length - 1 ? "Next Question" : "Finish Set"}</span>
                <ArrowRight size={16} />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 3. SELECTION / LOBBY SCREEN (Matches normal practice structure)
  const answeredTotal = pack?.progress?.answered ?? 0;
  const totalQuestions = pack?.progress?.total ?? 250;
  const percentTotal = Math.min(100, Math.round((answeredTotal / totalQuestions) * 100));

  return (
    <div className="shell section-space max-w-5xl mx-auto space-y-8 pb-20">
      <PageHeader
        badge={{ icon: <Layers size={13} />, text: "Offline Weekly Question Pack" }}
        title="Weekly Offline Practice Pack"
        subtitle="250 curated UTME questions downloaded to your device for practice without an active internet connection."
        actions={<SyncStatusIndicator showWhenAllSynced />}
      />

      {/* Overview Progress Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-[#092E28]">
              Select Subject to Practise
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Pick from your downloaded subjects to launch a local practice session.
            </p>
          </div>
          <div className="text-right flex flex-col items-end gap-1">
            <span className="text-sm font-semibold text-slate-600">
              {answeredTotal} of {totalQuestions} answered
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-emerald-700 font-bold">{percentTotal}% completed</span>
              <button
                type="button"
                onClick={() => setShowOverallSummary((prev) => !prev)}
                className="text-xs font-semibold text-[#116149] hover:underline cursor-pointer"
              >
                {showOverallSummary ? "Hide Summary" : "View Summary"}
              </button>
            </div>
          </div>
        </div>

        <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
          <div
            className="h-full bg-[#116149] transition-all duration-500 rounded-full"
            style={{ width: `${percentTotal}%` }}
          />
        </div>
      </div>

      {/* Dedicated Weekly Practice Completion & Summary View */}
      {(showOverallSummary || (answeredTotal > 0 && answeredTotal >= totalQuestions)) && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-sm space-y-5 animate-fade-in">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Award size={20} className="text-amber-500" />
              <h2 className="text-lg font-bold text-[#092E28]">
                {answeredTotal >= totalQuestions
                  ? "🎉 Weekly Practice Pack Completed!"
                  : "Overall Pack Performance Summary"}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setShowOverallSummary(false)}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-3.5 text-center">
              <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">Answered</div>
              <div className="text-xl sm:text-2xl font-bold text-emerald-950 mt-0.5">
                {answeredTotal} / {totalQuestions}
              </div>
              <div className="text-[11px] text-emerald-700">{percentTotal}% done</div>
            </div>

            <div className="rounded-2xl bg-blue-50 border border-blue-200 p-3.5 text-center">
              <div className="text-[11px] font-bold uppercase tracking-wider text-blue-800">Accuracy</div>
              <div className="text-xl sm:text-2xl font-bold text-blue-950 mt-0.5">
                {answeredTotal > 0
                  ? Math.round(
                      (Object.entries(pack?.answers || {}).filter(
                        ([qId, ans]) => pack?.feedback?.[qId]?.correctOption === ans.selectedOption
                      ).length /
                        answeredTotal) *
                        100
                    )
                  : 0}
                %
              </div>
              <div className="text-[11px] text-blue-700">across answered</div>
            </div>

            <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3.5 text-center">
              <div className="text-[11px] font-bold uppercase tracking-wider text-amber-800">Flagged</div>
              <div className="text-xl sm:text-2xl font-bold text-amber-950 mt-0.5">{flaggedIds.size}</div>
              <div className="text-[11px] text-amber-700">for review</div>
            </div>
          </div>

          {/* Subject Breakdown */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Subject Score Breakdown
            </h3>
            <div className="rounded-2xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
              {pack?.subjects?.map((sub) => {
                const subQs = (pack.questions as unknown as QuestionItem[]).filter(
                  (q) => q.subjectCode === sub.code
                );
                const subAnswered = subQs.filter((q) => pack.answers?.[q.id]).length;
                const subCorrect = subQs.filter((q) => {
                  const ans = pack.answers?.[q.id];
                  const fb = pack.feedback?.[q.id];
                  return ans && fb && ans.selectedOption === fb.correctOption;
                }).length;
                const subPct = subQs.length > 0 ? Math.round((subAnswered / subQs.length) * 100) : 0;
                const subAcc = subAnswered > 0 ? Math.round((subCorrect / subAnswered) * 100) : 0;

                return (
                  <div key={sub.code} className="p-3.5 flex items-center justify-between text-xs sm:text-sm">
                    <div>
                      <span className="font-bold text-[#092E28]">{sub.name}</span>
                      <span className="text-xs text-slate-400 ml-1.5">({sub.code})</span>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold text-slate-700">
                        {subAnswered} of {subQs.length} ({subPct}%)
                      </span>
                      <span className="text-xs text-emerald-700 ml-2 font-medium">
                        {subCorrect} correct ({subAcc}%)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Main Selection Form (Just like normal practice, but topic selection disabled) */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        {/* Step 1: Choose Subject */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2.5">
            1. Choose Subject
          </label>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {pack?.subjects?.map((sub) => {
              const isSelected = selectedSubjectCode === sub.code;
              const subProgress = pack.progress?.bySubject?.[sub.code];
              const answered = subProgress?.answered ?? 0;
              const total = subProgress?.total ?? sub.questionCount;

              return (
                <button
                  key={sub.code}
                  type="button"
                  onClick={() => setSelectedSubjectCode(sub.code)}
                  className={`flex items-center justify-between p-4 rounded-2xl border text-left text-sm font-medium transition-all cursor-pointer ${
                    isSelected
                      ? "border-[#116149] bg-emerald-50 text-[#092E28] ring-1 ring-[#116149]"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                  }`}
                >
                  <div>
                    <span className="font-semibold block">{sub.name}</span>
                    <small className="text-xs text-slate-500">
                      {sub.isCompulsory ? "Compulsory" : "Elective"} ({sub.code})
                    </small>
                    <span className="mt-1 block text-xs font-semibold text-emerald-800">
                      {answered} of {total} answered
                    </span>
                  </div>
                  {isSelected && (
                    <span className="flex size-6 items-center justify-center rounded-full bg-[#116149] text-white">
                      <CheckCircle2 size={14} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Topic Selection */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
            2. Topic Selection
          </label>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs sm:text-sm text-slate-600 leading-relaxed flex items-center gap-3">
            <span className="flex size-8 items-center justify-center rounded-xl bg-slate-200 text-slate-600 shrink-0">
              <Layers size={16} />
            </span>
            <div>
              <p className="font-semibold text-slate-800">All Syllabus Topics</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Questions are selected across your syllabus topics for comprehensive revision.
              </p>
            </div>
          </div>
        </div>

        {/* Step 3: Number of Questions */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2.5">
            3. Number of Questions
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
            {[5, 10, 15, 20, 25].map((cnt) => (
              <button
                key={cnt}
                type="button"
                onClick={() => setQuestionCount(cnt)}
                className={`py-3 rounded-2xl border text-sm font-semibold transition-all cursor-pointer ${
                  questionCount === cnt
                    ? "border-[#116149] bg-[#116149] text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                }`}
              >
                {cnt} Qs
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {availableCount > 0
              ? `${availableCount} question${availableCount === 1 ? "" : "s"} ready in this subject.`
              : "All questions in this subject have been answered. You can continue practicing to revise."}
          </p>
        </div>

        {/* Launch Button */}
        <button
          type="button"
          onClick={handleStartSession}
          disabled={subjectQuestions.length === 0}
          className="w-full flex items-center justify-center gap-2 rounded-full bg-[#116149] px-6 py-4 text-sm font-semibold text-white shadow-sm hover:bg-[#0b4936] transition-all cursor-pointer disabled:opacity-50"
        >
          <span>Start Practice Set ({Math.min(questionCount, subjectQuestions.length)} Questions)</span>
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
