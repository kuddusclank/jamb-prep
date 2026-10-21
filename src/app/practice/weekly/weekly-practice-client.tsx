"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "@/components/pending-link";
import { useBrowserAccount } from "@/components/browser-account-boundary";
import {
  ensureWeeklyPackDownloaded,
  getCurrentWeekKey,
  submitPackAnswer,
  flushPendingSync,
} from "@/lib/offline/weekly-pack-client";
import type { StoredWeeklyPack } from "@/lib/offline/idb-storage";
import { MathRenderer } from "@/components/math-renderer";
import { QuestionDiagram } from "@/components/question-diagram";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  XCircle,
  BookOpen,
  WifiOff,
  Loader2,
  HelpCircle,
  Sparkles,
  Bookmark,
  Grid,
  X,
  Award,
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
  const userId = account.identity?.user.id || account.session.user?.id || "";

  const [pack, setPack] = useState<StoredWeeklyPack | null>(null);
  const [selectedSubjectCode, setSelectedSubjectCode] = useState<string>("");
  const [questionIndexInSubject, setQuestionIndexInSubject] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [syncedNotice, setSyncedNotice] = useState<string | null>(null);
  const [isGridOpen, setIsGridOpen] = useState<boolean>(false);
  const [flaggedIds, setFlaggedIds] = useState<Set<string>>(new Set());
  const [showSummary, setShowSummary] = useState<boolean>(false);

  // Monitor network status
  useEffect(() => {
    if (typeof navigator !== "undefined") {
      setIsOnline(navigator.onLine);
    }
    const onOnline = () => {
      setIsOnline(true);
      if (userId) {
        void flushPendingSync(userId).then((count) => {
          if (count > 0) {
            setSyncedNotice(`Synced ${count} offline answers`);
            setTimeout(() => setSyncedNotice(null), 4000);
          }
        });
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

  // Load or download weekly pack
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

  // Questions filtered by the currently selected subject
  const subjectQuestions = useMemo(() => {
    if (!pack || !selectedSubjectCode) return [];
    return (pack.questions as unknown as QuestionItem[]).filter(
      (q) => q.subjectCode === selectedSubjectCode
    );
  }, [pack, selectedSubjectCode]);

  const currentQuestion = subjectQuestions[questionIndexInSubject] || null;

  // Selected answer from saved answers
  const currentAnswer = currentQuestion && pack?.answers?.[currentQuestion.id]
    ? pack.answers[currentQuestion.id].selectedOption
    : null;

  const currentFeedback = currentQuestion && pack?.feedback?.[currentQuestion.id]
    ? pack.feedback[currentQuestion.id]
    : null;

  const isCurrentFlagged = currentQuestion ? flaggedIds.has(currentQuestion.id) : false;

  const toggleFlag = (qId: string) => {
    setFlaggedIds((prev) => {
      const next = new Set(prev);
      if (next.has(qId)) next.delete(qId);
      else next.add(qId);
      return next;
    });
  };

  const handleSelectOption = async (optionLabel: "A" | "B" | "C" | "D") => {
    if (!pack || !currentQuestion || currentAnswer || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await submitPackAnswer({
        userId,
        packId: pack.packId,
        questionId: currentQuestion.id,
        selectedOption: optionLabel,
      });

      // Update pack in local React state
      setPack((prev) => {
        if (!prev) return prev;
        const nextAnswers = {
          ...prev.answers,
          [currentQuestion.id]: {
            selectedOption: optionLabel,
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

  const handleNextUnanswered = () => {
    if (!pack) return;
    const nextIdx = subjectQuestions.findIndex((q) => !pack.answers?.[q.id]);
    if (nextIdx >= 0) {
      setQuestionIndexInSubject(nextIdx);
    } else {
      // Look across other subjects
      for (const sub of pack.subjects) {
        if (sub.code === selectedSubjectCode) continue;
        const subQs = (pack.questions as unknown as QuestionItem[]).filter(
          (q) => q.subjectCode === sub.code
        );
        const subUnanswered = subQs.findIndex((q) => !pack.answers?.[q.id]);
        if (subUnanswered >= 0) {
          setSelectedSubjectCode(sub.code);
          setQuestionIndexInSubject(subUnanswered);
          return;
        }
      }
    }
  };

  if (isLoading) {
    return (
      <div className="shell section-space min-h-[50vh] flex flex-col items-center justify-center gap-4">
        <Loader2 size={36} className="text-[#116149] animate-spin" />
        <p className="text-sm font-medium text-slate-600">
          Preparing your 250-question weekly practice pack...
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

  const answeredTotal = pack?.progress?.answered ?? 0;
  const totalQuestions = pack?.progress?.total ?? 250;
  const percentTotal = Math.min(100, Math.round((answeredTotal / totalQuestions) * 100));

  // Compute accuracy across answered questions
  const totalCorrect = pack
    ? Object.entries(pack.answers || {}).filter(([qId, ans]) => {
        const fb = pack.feedback?.[qId];
        return fb && fb.correctOption === ans.selectedOption;
      }).length
    : 0;

  return (
    <div className="shell section-space max-w-4xl mx-auto space-y-6 pb-20">
      {/* Top Bar: Back Link, Network Status, and Week Key */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-[#116149] transition"
          >
            <ArrowLeft size={16} />
            <span>Dashboard</span>
          </Link>
          <span className="text-slate-300">/</span>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {pack?.weekKey || getCurrentWeekKey()} Weekly Practice
          </span>
        </div>

        <div className="flex items-center gap-2">
          {!isOnline ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
              <WifiOff size={12} className="text-amber-600" />
              <span>Offline Mode</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              <span>Online & Synced</span>
            </span>
          )}

          {syncedNotice && (
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
              {syncedNotice}
            </span>
          )}
        </div>
      </div>

      {/* Summary View Modal / Toggle */}
      {showSummary ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6 animate-fade-in">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <Award size={22} className="text-amber-500" />
              <h2 className="text-xl font-bold text-[#092E28]">Weekly Pack Progress Summary</h2>
            </div>
            <button
              type="button"
              onClick={() => setShowSummary(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              aria-label="Close summary"
            >
              <X size={20} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-center">
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-800">Answered</div>
              <div className="text-2xl font-bold text-emerald-950 mt-1">{answeredTotal} / {totalQuestions}</div>
              <div className="text-xs text-emerald-700 mt-0.5">{percentTotal}% completed</div>
            </div>

            <div className="rounded-2xl bg-blue-50 border border-blue-200 p-4 text-center">
              <div className="text-xs font-bold uppercase tracking-wider text-blue-800">Correct Answers</div>
              <div className="text-2xl font-bold text-blue-950 mt-1">{totalCorrect}</div>
              <div className="text-xs text-blue-700 mt-0.5">
                {answeredTotal > 0 ? Math.round((totalCorrect / answeredTotal) * 100) : 0}% accuracy
              </div>
            </div>

            <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-center">
              <div className="text-xs font-bold uppercase tracking-wider text-amber-800">Flagged For Review</div>
              <div className="text-2xl font-bold text-amber-950 mt-1">{flaggedIds.size}</div>
              <div className="text-xs text-amber-700 mt-0.5">Questions marked</div>
            </div>
          </div>

          {/* Subject Breakdown Table */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Subject Breakdown</h3>
            <div className="rounded-2xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
              {pack?.subjects?.map((sub) => {
                const subQs = (pack.questions as unknown as QuestionItem[]).filter(q => q.subjectCode === sub.code);
                const subAnswered = subQs.filter(q => pack.answers?.[q.id]).length;
                const subCorrect = subQs.filter(q => {
                  const ans = pack.answers?.[q.id];
                  const fb = pack.feedback?.[q.id];
                  return ans && fb && ans.selectedOption === fb.correctOption;
                }).length;
                const subPct = subQs.length > 0 ? Math.round((subAnswered / subQs.length) * 100) : 0;

                return (
                  <div key={sub.code} className="p-4 flex items-center justify-between text-sm">
                    <div>
                      <span className="font-bold text-[#092E28]">{sub.name}</span>
                      <span className="text-xs text-slate-400 ml-2">({sub.code})</span>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold text-slate-700">{subAnswered} of {subQs.length}</span>
                      <span className="text-xs text-slate-400 ml-2">({subCorrect} correct · {subPct}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => setShowSummary(false)}
              className="px-6 py-2.5 rounded-xl bg-[#116149] text-white text-sm font-bold hover:bg-[#0b4936] transition"
            >
              Continue Practice
            </button>
          </div>
        </div>
      ) : null}

      {/* Overall Progress Ribbon */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Weekly Progress
          </div>
          <div className="text-xl font-bold text-[#092E28]">
            {answeredTotal} of {totalQuestions} answered{" "}
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
              {percentTotal}%
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => setShowSummary(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition active:scale-95"
          >
            <Award size={14} className="text-amber-500" />
            <span>Summary</span>
          </button>

          <button
            type="button"
            onClick={handleNextUnanswered}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition active:scale-95"
          >
            <Sparkles size={14} className="text-amber-600" />
            <span>Next Unanswered</span>
          </button>
        </div>
      </div>

      {/* Subject Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 max-w-full">
        {pack?.subjects?.map((sub) => {
          const isSelected = sub.code === selectedSubjectCode;
          const subProgress = pack.progress?.bySubject?.[sub.code];
          const answered = subProgress?.answered ?? 0;
          const total = subProgress?.total ?? sub.questionCount;
          return (
            <button
              key={sub.code}
              type="button"
              onClick={() => {
                setSelectedSubjectCode(sub.code);
                setQuestionIndexInSubject(0);
                setIsGridOpen(false);
              }}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold tracking-tight shrink-0 transition flex items-center gap-2 ${
                isSelected
                  ? "bg-[#116149] text-white shadow-sm"
                  : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              <span>{sub.name}</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  isSelected
                    ? "bg-emerald-950/40 text-emerald-200"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {answered}/{total}
              </span>
            </button>
          );
        })}
      </div>

      {/* Question Palette / Quick Jump Grid (Collapsible) */}
      {isGridOpen && (
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4 animate-fade-in">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Jump to Question in {selectedSubjectCode} ({subjectQuestions.length} Total)
            </span>
            <button
              type="button"
              onClick={() => setIsGridOpen(false)}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              aria-label="Close question grid"
            >
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-6 sm:grid-cols-10 md:grid-cols-12 gap-2 max-h-60 overflow-y-auto p-1">
            {subjectQuestions.map((q, idx) => {
              const isCur = idx === questionIndexInSubject;
              const ans = pack?.answers?.[q.id];
              const fb = pack?.feedback?.[q.id];
              const isFlag = flaggedIds.has(q.id);

              let chipStyle = "bg-white border-slate-200 text-slate-700 hover:border-slate-400";
              if (ans && fb) {
                if (ans.selectedOption === fb.correctOption) {
                  chipStyle = "bg-emerald-100 border-emerald-400 text-emerald-950 font-bold";
                } else {
                  chipStyle = "bg-rose-100 border-rose-400 text-rose-950 font-bold";
                }
              }

              if (isCur) {
                chipStyle += " ring-2 ring-[#116149] ring-offset-1";
              }

              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => {
                    setQuestionIndexInSubject(idx);
                    setIsGridOpen(false);
                  }}
                  className={`size-9 rounded-xl border text-xs font-semibold flex items-center justify-center relative transition ${chipStyle}`}
                >
                  <span>{idx + 1}</span>
                  {isFlag && (
                    <span className="absolute -top-1 -right-1 size-2.5 rounded-full bg-amber-500 border border-white" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-4 text-[11px] text-slate-500 pt-2 border-t border-slate-100">
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-full bg-emerald-500" /> Correct
            </span>
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-full bg-rose-500" /> Incorrect
            </span>
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-full bg-amber-500" /> Flagged
            </span>
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-full bg-slate-300" /> Unanswered
            </span>
          </div>
        </div>
      )}

      {/* Main Question Runner Card */}
      {currentQuestion ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          {/* Question Metadata Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsGridOpen((prev) => !prev)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition"
                title="Click to view all questions"
              >
                <Grid size={13} />
                <span>Q {questionIndexInSubject + 1} of {subjectQuestions.length}</span>
              </button>
              <span className="text-slate-300">·</span>
              <span className="text-xs font-semibold text-slate-600">
                {currentQuestion.topicTitle}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => toggleFlag(currentQuestion.id)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border transition ${
                  isCurrentFlagged
                    ? "bg-amber-50 text-amber-800 border-amber-300"
                    : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                }`}
                title={isCurrentFlagged ? "Remove review flag" : "Flag question for review"}
              >
                <Bookmark size={12} className={isCurrentFlagged ? "fill-current text-amber-500" : ""} />
                <span>{isCurrentFlagged ? "Flagged" : "Flag"}</span>
              </button>

              {currentAnswer && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                  <CheckCircle2 size={13} className="text-emerald-600" />
                  <span>Answered</span>
                </span>
              )}
            </div>
          </div>

          {/* Passage Container (if applicable for English Comprehension / Cloze) */}
          {currentQuestion.passage && (
            <div className="rounded-2xl bg-amber-50/70 border border-amber-200/70 p-5 space-y-2 text-slate-800 text-sm leading-relaxed max-h-72 overflow-y-auto">
              {currentQuestion.passage.title && (
                <div className="font-bold text-[#092E28] flex items-center gap-2">
                  <BookOpen size={16} className="text-amber-800" />
                  <span>{currentQuestion.passage.title}</span>
                </div>
              )}
              <div className="whitespace-pre-line text-xs sm:text-sm">
                {currentQuestion.passage.content}
              </div>
            </div>
          )}

          {/* Diagram (if question has an image) */}
          {currentQuestion.imageUrl && (
            <QuestionDiagram
              url={currentQuestion.imageUrl}
              alt={currentQuestion.imageAlt || "Question illustration"}
            />
          )}

          {/* Question Stem */}
          <div className="text-base sm:text-lg font-medium text-slate-900 leading-relaxed">
            <MathRenderer content={currentQuestion.stem} />
          </div>

          {/* Options List */}
          <div className="space-y-3 pt-2">
            {currentQuestion.options.map((opt) => {
              const isSelected = currentAnswer === opt.label;
              const isCorrectOpt = currentFeedback?.correctOption === opt.label;
              const isAnswered = Boolean(currentAnswer);

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
              }

              return (
                <button
                  key={opt.id}
                  type="button"
                  disabled={isAnswered || isSubmitting}
                  onClick={() => handleSelectOption(opt.label)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all duration-200 flex items-start gap-3.5 group ${optionStyle} ${
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
          {currentAnswer && currentFeedback && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 space-y-2 animate-fade-in">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-900">
                <HelpCircle size={15} />
                <span>Explanation · Correct Option: {currentFeedback.correctOption}</span>
              </div>
              <div className="text-xs sm:text-sm text-emerald-950 leading-relaxed">
                <MathRenderer content={currentFeedback.explanation} />
              </div>
            </div>
          )}

          {/* Bottom Navigation Toolbar */}
          <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              disabled={questionIndexInSubject === 0}
              onClick={() => setQuestionIndexInSubject((prev) => Math.max(0, prev - 1))}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous
            </button>

            <button
              type="button"
              onClick={() => setIsGridOpen((prev) => !prev)}
              className="text-xs text-slate-500 font-medium hover:text-[#116149] transition inline-flex items-center gap-1"
            >
              <Grid size={13} />
              <span>{questionIndexInSubject + 1} / {subjectQuestions.length}</span>
            </button>

            <button
              type="button"
              disabled={questionIndexInSubject >= subjectQuestions.length - 1}
              onClick={() =>
                setQuestionIndexInSubject((prev) =>
                  Math.min(subjectQuestions.length - 1, prev + 1)
                )
              }
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#116149] text-white text-xs font-bold hover:bg-[#0b4936] transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span>Next</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center space-y-3">
          <p className="text-slate-600 font-medium">No questions found for this subject.</p>
        </div>
      )}
    </div>
  );
}
