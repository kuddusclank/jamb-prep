"use client";
import { BrandMark } from "@/components/brand-mark";
import { subjectPalette } from "@/lib/exam-palette";

import { ExamCalculator } from "./exam-calculator";
import { ExamConditions } from "./exam-conditions";
import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useExamEngine } from "@/features/exam-engine/reactive/use-exam-engine";
import { ExamQuestion } from "@/features/exam-engine/domain/types";
import { syncExamAnswer, submitMockExam } from "@/lib/client-actions";
import { buildCanonicalResultUrl } from "@/lib/routing/deep-links";
import { ReportQuestionDialog } from "@/components/report-question-dialog";
import { QuestionDiagram } from "@/components/question-diagram";
import { MathRenderer } from "@/components/math-renderer";
import {
  Clock,
  Flag,
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  AlertTriangle,
  Send,
  Loader2,

  Wifi,
  WifiOff
} from "lucide-react";

interface ExamSimulatorProps {
  initialPayload: {
    selectionWarnings?:string[];
    examConditions: boolean;
    attemptId: string;
    questions: ExamQuestion[];
    expiresAtTimestamp: number;
    initialRevisions?: Record<string, number>;
    initialAnswers?: Record<string, string>;
    initialLabels?: Record<string, 'A' | 'B' | 'C' | 'D'>;
  };
  studentName: string;
}

export function ExamSimulator({ initialPayload, studentName }: ExamSimulatorProps) {
  const router = useRouter();
  const [submitError,setSubmitError]=useState<string|null>(null);
  const [isPending, startTransition] = useTransition();

  const {
    state,
    engine,
    engineError,
    flagError,
    selectOption,
    reverseOption,
    toggleFlag,
    goToNext,
    goToPrevious,
    goToIndex,
    switchSubject,
    setSubmitModalOpen,
  } = useExamEngine(initialPayload, syncExamAnswer);

  const {
    attemptId,
    questions,
    subjectTabs,
    currentIndex,
    answers,
    flaggedQuestionIds,
    timeRemainingSeconds,
    canGoPrevious,
    canGoNext,
    previousPosition,
    nextPosition,
    isSubmitModalOpen,
    syncStatus,
    isOnline,
    status,
  } = state;

  // 1. Reactive 8-Key Desktop Hotkeys (A, B, C, D, P, N, R, S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || (e.target instanceof Element && e.target.closest('[data-calculator]'))) return;
      // Ignore key events when modal is open or typing in input
      if (isSubmitModalOpen) {
        if (e.key === 'Escape') setSubmitModalOpen(false);
        return;
      }

      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
        return;
      }

      const key = e.key.toUpperCase();
      const currentQ = questions[currentIndex];

      if (key === 'A' || key === 'B' || key === 'C' || key === 'D') {
        e.preventDefault();
        if (currentQ) {
          const targetOpt = currentQ.options.find((o) => o.label === key);
          if (targetOpt) {
            selectOption(targetOpt.id, key as 'A' | 'B' | 'C' | 'D');
          }
        }
      } else if (key === 'P') {
        e.preventDefault();
        if (canGoPrevious) goToPrevious();
      } else if (key === 'N') {
        e.preventDefault();
        if (canGoNext) goToNext();
      } else if (key === 'R') {
        e.preventDefault();
        reverseOption();
      } else if (key === 'S') {
        e.preventDefault();
        setSubmitModalOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isSubmitModalOpen,
    questions,
    currentIndex,
    canGoPrevious,
    canGoNext,
    selectOption,
    goToPrevious,
    goToNext,
    reverseOption,
    setSubmitModalOpen,
  ]);

  const handleFinalSubmit = useCallback(() => {
    startTransition(async () => {
      try {
        setSubmitError(null);
        await engine.flushOutbox();
        await submitMockExam(attemptId);
        if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
        router.push(buildCanonicalResultUrl(attemptId));
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : "Submission failed. Please retry.");
      }
    });
  }, [attemptId, router, engine]);

  // 2. Auto-Submit on Expiration
  useEffect(() => {
    if (status === 'expired' && questions.length > 0 && !submitError && !isPending) {
      handleFinalSubmit();
    }
  }, [status, questions.length, handleFinalSubmit, submitError, isPending]);

  if(engineError) return <section role="alert" className="shell section-space"><p>{engineError}</p><button type="button" onClick={()=>window.location.reload()}>Reload</button></section>;
  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-[#F6F8F5] flex items-center justify-center p-6 text-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="animate-spin text-[#116149]" />
          <p className="text-sm font-semibold text-slate-700">Loading Exam Hall Simulation...</p>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentIndex];
  const palette = subjectPalette(questions,currentIndex);
  const subjectAnswered = palette.filter(({question})=>Boolean(answers[question.id])).length;
  const subjectPosition = palette.find(item=>item.globalIndex===currentIndex)?.number ?? 1;
  const isFlagged = flaggedQuestionIds.has(currentQ?.id);
  const selectedOptId = answers[currentQ?.id];

  // Timer format (HH:MM:SS)
  const hours = Math.floor(timeRemainingSeconds / 3600);
  const minutes = Math.floor((timeRemainingSeconds % 3600) / 60);
  const seconds = timeRemainingSeconds % 60;
  const timerString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  const isLowTime = timeRemainingSeconds < 900; // Under 15 mins
  const isCriticalTime = timeRemainingSeconds < 300; // Under 5 mins

  // Question counts
  const totalAnsweredCount = Object.keys(answers).length;
  const totalQuestionsCount = questions.length;
  const unansweredCount = totalQuestionsCount - totalAnsweredCount;

  return (
    <div className="min-h-screen bg-[#F4F5F7] text-slate-900 flex flex-col">

      {/* 1. TOP EXAM HEADER */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 sm:px-8 py-3.5 flex flex-wrap gap-3 items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex size-8 items-center justify-center rounded-xl bg-[#116149] text-white">
            <BrandMark size={32}/>
          </span>
          <div>
            <div className="text-xs font-bold tracking-wider text-[#116149] uppercase">
              JAMB UTME CBT SIMULATOR
            </div>
            <div className="text-sm font-semibold text-slate-800">
              Candidate: <span className="text-slate-700">{studentName}</span>
            </div>
          </div>
        </div>

        {/* Synchronized Timer & Connectivity */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Network status */}
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200">
            {isOnline ? (
              <>
                <Wifi size={12} className="text-[#116149]" />
                <span className="text-slate-600">
                  {syncStatus === 'syncing' ? 'Saving…' : syncStatus === 'error' ? 'Save needs retry' : 'Answers saved'}
                </span>
              </>
            ) : (
              <>
                <WifiOff size={12} className="text-amber-700" />
                <span className="text-amber-800">Offline (Outbox queued)</span>
              </>
            )}
          </div>

          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl border font-mono font-bold text-base transition-colors ${
              isCriticalTime
                ? "bg-red-50 border-red-300 text-red-700"
                : isLowTime
                ? "bg-amber-50 border-amber-300 text-amber-800"
                : "bg-slate-100 border-slate-200 text-slate-900"
            }`}
          >
            <Clock size={16} />
            <span className="tabular-nums" role="timer" aria-label="Time remaining"><span className="block text-[10px] font-sans uppercase tracking-wider">Time left</span>{timerString}</span>
          </div>

          <button
            type="button"
            onClick={() => setSubmitModalOpen(true)}
            className="inline-flex min-h-11 items-center gap-1.5 px-5 py-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs tracking-wider uppercase transition-colors cursor-pointer shadow-sm"
          >
            <Send size={14} /> Submit (S)
          </button>
        </div>
      </header>

      {submitError && <div role="alert" className="bg-red-50 p-4 text-red-800"><p>{submitError}</p><button type="button" disabled={isPending} onClick={handleFinalSubmit}>Retry submission</button></div>}
      {flagError && <p role="status" className="rounded-xl bg-amber-50 p-3 text-amber-900">{flagError}</p>}
      <ExamConditions attemptId={initialPayload.attemptId} enabled={initialPayload.examConditions} active={!isPending && status !== "expired"} />
      <ExamCalculator />
      {/* 2. SUBJECT TABS BAR */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center gap-2 overflow-x-auto py-2">
        {subjectTabs.map((tab) => {
          const isTabActive = currentQ.subjectCode === tab.code;
          const subjectQuestions = questions.slice(tab.startIndex, tab.startIndex + tab.count);
          const answeredInTab = subjectQuestions.filter((q) => Boolean(answers[q.id])).length;

          return (
            <button
              key={tab.code}
              type="button"
              aria-pressed={isTabActive}
              onClick={() => switchSubject(tab.code)}
              className={`flex items-center gap-2.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                isTabActive
                  ? "bg-[#116149] text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-100"
              }`}
            >
              <span>{tab.name}</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full ${
                  isTabActive
                    ? "bg-white/20 text-white"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {answeredInTab}/{tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 3. MAIN EXAM HALL BODY (Two Columns on Desktop) */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT / CENTER: Question Pane (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          {/* Question Meta Header */}
          <div className="flex flex-wrap gap-3 items-center justify-between text-xs text-slate-600 bg-white px-4 py-3 rounded-2xl border border-slate-200">
            <span className="font-bold tracking-wider uppercase text-slate-800">
              {currentQ.subjectName} · Question {subjectPosition} of {palette.length}
            </span>
            <div className="flex flex-wrap items-center gap-3">
              <ReportQuestionDialog key={currentQ.id} questionId={currentQ.id} attemptId={initialPayload.attemptId} />
              <span className="text-slate-500 font-mono text-[11px]">
                {syncStatus === 'syncing' ? 'Syncing...' : syncStatus === 'offline' ? 'Saved on device' : syncStatus === 'error' ? 'Save needs retry' : 'Saved'}
              </span>
              <button
                type="button"
                onClick={toggleFlag}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  isFlagged
                    ? "bg-amber-400 text-slate-900"
                    : "bg-slate-100 text-slate-600 hover:text-slate-900"
                }`}
              >
                <Flag size={13} /> {isFlagged ? "Flagged for Review" : "Flag"}
              </button>
            </div>
          </div>

          {/* Reading Comprehension Passage (if applicable) */}
          {currentQ.passage && (
            <div className="bg-slate-50 p-5 sm:p-6 rounded-2xl border border-slate-200 text-slate-800 text-xs sm:text-sm leading-relaxed max-h-56 overflow-y-auto">
              {currentQ.passage.title && (
                <div className="font-bold text-slate-600 uppercase tracking-wider mb-2 text-xs">
                  Passage: {currentQ.passage.title}
                </div>
              )}
              <div className="text-slate-700 whitespace-pre-wrap">
                <MathRenderer content={currentQ.passage.content} />
              </div>
            </div>
          )}

          {/* Question Stem Card */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="text-base sm:text-lg font-medium text-slate-900 leading-relaxed">
              <MathRenderer content={currentQ.stem} />
            </div>

<QuestionDiagram url={currentQ.imageUrl} alt={currentQ.imageAlt} />
            {/* Options List A, B, C, D */}
            <div className="space-y-3 pt-2">
              {currentQ.options.map((opt) => {
                const isSelected = selectedOptId === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => selectOption(opt.id, opt.label)}
                    className={`w-full flex items-start gap-3.5 p-4 rounded-2xl border text-left text-sm sm:text-base font-medium transition-all cursor-pointer ${
                      isSelected
                        ? "bg-[#116149] border-emerald-400 text-white ring-2 ring-emerald-400 shadow-md"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:border-emerald-700 hover:bg-slate-100"
                    }`}
                  >
                    <span
                      className={`flex size-7 shrink-0 items-center justify-center rounded-xl border text-xs font-bold transition-colors ${
                        isSelected
                          ? "bg-white text-[#116149] border-white"
                          : "bg-slate-100 text-slate-600 border-slate-300"
                      }`}
                    >
                      {opt.label}
                    </span>
                    <span className="flex-1 pt-0.5">
                      <MathRenderer content={opt.content} />
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. REACTIVE BOTTOM NAVIGATION BAR */}
          <div className="bg-white px-4 py-3 rounded-2xl border border-slate-200 flex flex-wrap gap-2 items-center justify-between">
            {/* Previous Button (P) */}
            <button
              type="button"
              onClick={goToPrevious}
              disabled={!canGoPrevious}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold transition-all ${
                canGoPrevious
                  ? "bg-emerald-800 hover:bg-emerald-700 text-white cursor-pointer"
                  : "bg-slate-100 text-slate-500 cursor-not-allowed opacity-40"
              }`}
            >
              <ArrowLeft size={14} /> Previous (P)
            </button>

            {/* Reverse / Deselect Button (R) */}
            <button
              type="button"
              onClick={reverseOption}
              disabled={!selectedOptId}
              className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-semibold transition-all ${
                selectedOptId
                  ? "text-amber-800 hover:text-amber-900 hover:bg-slate-100 cursor-pointer"
                  : "text-slate-500 cursor-not-allowed opacity-40"
              }`}
              title="Reverse / Deselect chosen answer (Hot key: R)"
            >
              <RotateCcw size={13} /> Deselect (R)
            </button>

            {/* Next Button (N) */}
            <button
              type="button"
              onClick={goToNext}
              disabled={!canGoNext}
              className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-semibold transition-all ${
                canGoNext
                  ? "bg-[#116149] hover:bg-emerald-600 text-white cursor-pointer shadow-sm"
                  : "bg-slate-100 text-slate-500 cursor-not-allowed opacity-40"
              }`}
            >
              Next (N) <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* RIGHT: 180-Question Grid Palette (4 cols) */}
        <div className="lg:col-span-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              {currentQ.subjectCode} questions ({subjectAnswered}/{palette.length})
            </h3>
            <span className="text-[11px] font-mono text-[#116149]">
              {Math.round((subjectAnswered / Math.max(1,palette.length)) * 100)}% Done
            </span>
          </div>

          {/* Palette Legend */}
          <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-600 border-b border-slate-200 pb-3 font-medium">
            <div className="flex items-center gap-1.5">
              <span className="size-3 rounded-full bg-[#116149] border border-emerald-400" />
              <span>Answered</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-3 rounded-full bg-slate-50 border border-slate-300" />
              <span>Unanswered</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-3 rounded-full bg-amber-400" />
              <span>Flagged</span>
            </div>
          </div>

          {/* Interactive Palette Grid */}
          <div className="grid grid-cols-5 sm:grid-cols-8 lg:grid-cols-5 gap-2 max-h-96 overflow-y-auto p-1">
            {palette.map(({question:q,globalIndex:idx,number}) => {
              const isCurrent = idx === currentIndex;
              const isAnswered = Boolean(answers[q.id]);
              const qFlagged = flaggedQuestionIds.has(q.id);

              let itemBg = "bg-slate-50 text-slate-400 border-slate-200";
              if (isAnswered) {
                itemBg = "bg-[#116149] text-white border-emerald-400 font-bold";
              }
              if (qFlagged) {
                itemBg = "bg-amber-400 text-slate-900 font-bold border-amber-300";
              }

              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => goToIndex(idx)}
                  className={`size-11 rounded-xl border text-xs font-semibold flex items-center justify-center transition-all cursor-pointer ${itemBg} ${
                    isCurrent ? "ring-2 ring-slate-900 scale-105" : "hover:border-emerald-600"
                  }`}
                  aria-current={idx === currentIndex ? "step" : undefined}
                  title={`Question ${number} (${q.subjectCode})`}
                >
                  {number}
                </button>
              );
            })}
          </div>

          {/* Hotkey Helper Guidance */}
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-[11px] text-slate-600 space-y-1">
            <div className="font-bold text-slate-600">8-Key Desktop Hotkeys:</div>
            <div><strong className="text-slate-800">A, B, C, D</strong> — Choose Option</div>
            <div><strong className="text-slate-800">P</strong> — Previous · <strong className="text-slate-800">N</strong> — Next</div>
            <div><strong className="text-slate-800">R</strong> — Reverse/Deselect · <strong className="text-slate-800">S</strong> — Submit Exam</div>
          </div>
        </div>
      </main>

      {/* 5. SUBMIT CONFIRMATION MODAL */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="max-w-md w-full rounded-3xl bg-white border border-emerald-700/60 p-6 sm:p-8 text-center text-slate-900 shadow-2xl space-y-6">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
              <AlertTriangle size={28} />
            </div>

            <div>
              <h3 className="text-xl font-bold tracking-tight">Submit Examination?</h3>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                Once submitted, your responses will be server-graded and your official 400-point diagnostic scorecard will be generated.
              </p>
            </div>

            {/* Reactive Summary Statistics */}
            <div className="grid grid-cols-3 gap-2 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center">
              <div>
                <span className="text-xl font-bold text-[#116149]">{totalAnsweredCount}</span>
                <span className="block text-[10px] text-slate-400 font-semibold uppercase mt-0.5">Answered</span>
              </div>
              <div>
                <span className="text-xl font-bold text-amber-700">{unansweredCount}</span>
                <span className="block text-[10px] text-slate-400 font-semibold uppercase mt-0.5">Unanswered</span>
              </div>
              <div>
                <span className="text-xl font-bold text-amber-700">{flaggedQuestionIds.size}</span>
                <span className="block text-[10px] text-slate-400 font-semibold uppercase mt-0.5">Flagged</span>
              </div>
            </div>

            <div className="text-xs text-slate-600 font-mono">
              Time Remaining: {timerString}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSubmitModalOpen(false)}
                disabled={isPending}
                className="flex-1 py-3 rounded-full border border-slate-600 bg-transparent text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Return to Exam
              </button>
              <button
                type="button"
                onClick={handleFinalSubmit}
                disabled={isPending}
                className="flex-1 py-3 rounded-full bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white shadow-lg transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5"
              >
                {isPending ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Grading...
                  </>
                ) : (
                  "Yes, Submit Exam"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
