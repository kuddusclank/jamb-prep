"use client";
import { ResultShare } from '@/components/result-share';
import { mockShareText } from '@/lib/share';
import { Suspense, useEffect, useState } from 'react';
import { useRouter,useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { StudyWorkspace } from '@/components/study-workspace';
import { ResourceStatus,useApiResource } from '@/lib/api/use-api-resource';
import { parseAttemptIdFromSearch } from '@/lib/routing/deep-links';
import { MathRenderer } from '@/components/math-renderer';
import { isArabicText } from '@/lib/utils';
import { MockResultRatingPrompt } from '@/components/mock-result-rating-prompt';
interface ResultData {subjectScores?:{code:string;name:string;count:number;score:number}[];totalScore:number;englishScore:number;subject2Score:number;subject3Score:number;subject4Score:number;timeSpentSeconds:number;completedAt:string;}
import { CheckCircle2, XCircle, AlertCircle, HelpCircle, ChevronDown, ChevronUp, BookOpen, Filter, Bookmark, BookA, Lock, ArrowRight, Building2, Award } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { ReportQuestionDialog } from '@/components/report-question-dialog';
import { QuestionDiagram } from '@/components/question-diagram';
import { InspectableText } from '@/components/dictionary/inspectable-text';
import type { ProfileData } from '@/lib/api/app-dtos';

interface ReviewQuestion {
  id: string;
  position?: number;
  subjectCode?: string;
  subjectName?: string;
  stem: string;
  explanation: string | null;
  correctOption: string;
  selectedOption: string | null;
  options?: { id: string; label: string; content: string }[];
  passage?: { title?: string | null; content: string } | null;
  imageUrl?: string | null;
  imageAlt?: string | null;
  difficulty?: string;
  examYear?: number | null;
}

interface ReviewData {
  questions: ReviewQuestion[];
}

function Review({ attemptId }: { attemptId: string }) {
  const resource = useApiResource<ReviewData>(`/api/v1/exams/attempts/${attemptId}/review`);
  const profile = useApiResource<ProfileData>("/api/v1/profile");
  const isPremium = profile.data?.subscription.isPremium ?? false;
  const isSchoolAttached = Boolean(profile.data?.subscription.isSchoolAttached);
  const schoolName = profile.data?.subscription.school?.schoolName || "your school";
  const [statusFilter, setStatusFilter] = useState<'all' | 'incorrect' | 'unanswered' | 'correct'>('all');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [showPalette, setShowPalette] = useState(false);
  const [visibleLimit, setVisibleLimit] = useState(30);

  if (!resource.data) {
    const isSchoolAttached = Boolean(profile.data?.subscription?.isSchoolAttached);
    const schoolName = profile.data?.subscription?.school?.schoolName || "your school";

    const isPremiumError = Boolean(
      resource.error && (
        resource.error.toLowerCase().includes('premium') ||
        resource.error.toLowerCase().includes('upgrade') ||
        resource.error.toLowerCase().includes('entitlement') ||
        resource.error.toLowerCase().includes('school')
      )
    );

    if (isPremiumError) {
      return (
        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xs">
          <div className="py-4 space-y-4 max-w-md mx-auto">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-[#116149]">
              {isSchoolAttached ? <Building2 size={26} /> : <Lock size={26} />}
            </div>
            <div className="space-y-1.5">
              <h3 className="text-xl font-bold text-slate-900">
                {isSchoolAttached ? "School License Required for Detailed Review" : "Premium is required for detailed review"}
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                {isSchoolAttached
                  ? `Full question-by-question review, step-by-step diagnostic solutions, and detailed explanations are unlocked through ${schoolName}. Contact your school administrator to activate your candidate license.`
                  : "Unlock full question-by-question review, step-by-step diagnostic solutions, and detailed explanations."}
              </p>
            </div>
            <div className="pt-2">
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center rounded-full bg-[#116149] px-7 py-3.5 text-base font-semibold text-white shadow-md hover:bg-[#0e4e3a] transition-all cursor-pointer"
              >
                {isSchoolAttached ? "Contact School Admin" : "Upgrade to Pro"}
              </Link>
            </div>
          </div>
        </section>
      );
    }

    return (
      <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 text-center">
        <ResourceStatus error={resource.error} retry={resource.retry} />
        <p className="mt-2 text-sm text-slate-600">
          Want detailed diagnostic solutions and step-by-step explanations?{" "}
          <Link href="/pricing" className="font-semibold text-[#116149] hover:underline">
            {isSchoolAttached ? "Contact School Admin" : "Upgrade to Pro"}
          </Link>
        </p>
      </section>
    );
  }

  const questions = resource.data.questions;
  const totalCount = questions.length;

  const correctCount = questions.filter((q) => q.selectedOption === q.correctOption).length;
  const unansweredCount = questions.filter((q) => !q.selectedOption).length;
  const incorrectCount = totalCount - correctCount - unansweredCount;

  // Derive subjects list
  const subjectsMap = new Map<string, { code: string; name: string; count: number }>();
  questions.forEach((q) => {
    const code = q.subjectCode || "GENERAL";
    const name = q.subjectName || code;
    const existing = subjectsMap.get(code);
    if (existing) {
      existing.count++;
    } else {
      subjectsMap.set(code, { code, name, count: 1 });
    }
  });
  const subjects = Array.from(subjectsMap.values());

  // Filter questions
  const filteredQuestions = questions
    .map((q, originalIndex) => ({ ...q, originalIndex }))
    .filter((q) => {
      if (subjectFilter !== 'all' && (q.subjectCode || 'GENERAL') !== subjectFilter) {
        return false;
      }
      const isCorrect = q.selectedOption === q.correctOption;
      const isUnanswered = !q.selectedOption;
      const isIncorrect = q.selectedOption && !isCorrect;

      if (statusFilter === 'incorrect') return isIncorrect;
      if (statusFilter === 'unanswered') return isUnanswered;
      if (statusFilter === 'correct') return isCorrect;
      return true;
    });

  const displayedQuestions = filteredQuestions.slice(0, visibleLimit);

  const jumpToQuestion = (index: number, questionId: string) => {
    // If hidden by filters, reset filter so user can see it
    if (statusFilter !== 'all' || subjectFilter !== 'all') {
      setStatusFilter('all');
      setSubjectFilter('all');
    }
    if (index >= visibleLimit) {
      setVisibleLimit(index + 20);
    }
    setTimeout(() => {
      const el = document.getElementById(`review-q-${questionId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  return (
    <section className="mt-10 space-y-5">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-slate-200/80 pb-4">
        <div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-[#116149] border border-emerald-200/80 uppercase tracking-wide">
            <BookOpen size={12} /> Diagnostic Solutions
          </span>
          <h2 className="mt-1.5 text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Answer Explanations & Solutions
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Step-by-step rationales, core concepts, and mistake breakdowns for each question.
          </p>
        </div>

        {/* Question Palette Toggle */}
        <button
          type="button"
          onClick={() => setShowPalette(!showPalette)}
          className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs transition-all cursor-pointer"
        >
          {showPalette ? (
            <>Hide Palette <ChevronUp size={13} /></>
          ) : (
            <>Jump to Question ({totalCount}) <ChevronDown size={13} /></>
          )}
        </button>
      </div>

      {/* Unified Minimalist Filter Bar */}
      <div className="space-y-2.5 rounded-2xl border border-slate-200/90 bg-white p-3 sm:p-4 shadow-xs">
        {/* Status Filter Tabs (Unified & Responsive Horizontal Scroll) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={() => { setStatusFilter('all'); setVisibleLimit(30); }}
            className={`shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
            }`}
          >
            All <span className="font-normal opacity-75">({totalCount})</span>
          </button>
          <button
            type="button"
            onClick={() => { setStatusFilter('incorrect'); setVisibleLimit(30); }}
            className={`shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'incorrect'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 text-rose-800 border border-rose-200/80 hover:bg-rose-100'
            }`}
          >
            <XCircle size={12} /> Incorrect <span className="font-normal opacity-75">({incorrectCount})</span>
          </button>
          <button
            type="button"
            onClick={() => { setStatusFilter('unanswered'); setVisibleLimit(30); }}
            className={`shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'unanswered'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 text-amber-900 border border-amber-200/80 hover:bg-amber-100'
            }`}
          >
            <AlertCircle size={12} /> Unanswered <span className="font-normal opacity-75">({unansweredCount})</span>
          </button>
          <button
            type="button"
            onClick={() => { setStatusFilter('correct'); setVisibleLimit(30); }}
            className={`shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'correct'
                ? 'bg-[#116149] text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-800 border border-emerald-200/80 hover:bg-emerald-100'
            }`}
          >
            <CheckCircle2 size={12} /> Correct <span className="font-normal opacity-75">({correctCount})</span>
          </button>
        </div>

        {/* Subject Filter Chips (Smooth Horizontal Scroll on Mobile) */}
        {subjects.length > 1 && (
          <div className="flex items-center gap-1.5 pt-2.5 border-t border-slate-100 overflow-x-auto pb-1 scrollbar-none no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              onClick={() => { setSubjectFilter('all'); setVisibleLimit(30); }}
              className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                subjectFilter === 'all'
                  ? 'bg-emerald-800 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
              }`}
            >
              All Subjects
            </button>
            {subjects.map((sub) => (
              <button
                key={sub.code}
                type="button"
                onClick={() => { setSubjectFilter(sub.code); setVisibleLimit(30); }}
                className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  subjectFilter === sub.code
                    ? 'bg-emerald-800 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
                }`}
              >
                {sub.name} <span className="text-[10px] opacity-75">({sub.count})</span>
              </button>
            ))}
          </div>
        )}

        {/* Collapsible Question Number Pill Grid / Matrix */}
        {showPalette && (
          <div className="pt-3 border-t border-slate-100">
            <p className="text-xs text-slate-500 mb-2">Click any question pill to jump directly to its explanation:</p>
            <div className="flex flex-wrap gap-1.5 max-h-56 overflow-y-auto p-1 bg-slate-50 rounded-xl border border-slate-200">
              {questions.map((q, idx) => {
                const isCorrect = q.selectedOption === q.correctOption;
                const isUnanswered = !q.selectedOption;
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => jumpToQuestion(idx, q.id)}
                    className={`inline-flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      isCorrect
                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 hover:bg-emerald-200'
                        : isUnanswered
                        ? 'bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200'
                        : 'bg-rose-100 text-rose-900 border border-rose-300 hover:bg-rose-200'
                    }`}
                    title={`Question ${idx + 1}: ${isCorrect ? 'Correct' : isUnanswered ? 'Unanswered' : 'Incorrect'}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Showing count indicator */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <span>
          Showing <span className="font-semibold text-slate-800">{displayedQuestions.length}</span> of{" "}
          <span className="font-semibold text-slate-800">{filteredQuestions.length}</span> questions
          {filteredQuestions.length !== totalCount && ` (filtered from ${totalCount})`}
        </span>
        {displayedQuestions.length < filteredQuestions.length && (
          <button
            type="button"
            onClick={() => setVisibleLimit(filteredQuestions.length)}
            className="font-semibold text-[#116149] hover:underline cursor-pointer"
          >
            Show all {filteredQuestions.length}
          </button>
        )}
      </div>

      {/* Empty State for Filters */}
      {filteredQuestions.length === 0 && (
        <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center">
          <p className="text-base font-semibold text-slate-900">No questions found</p>
          <p className="mt-1 text-sm text-slate-500">There are no questions matching this specific filter.</p>
          <button
            type="button"
            onClick={() => { setStatusFilter('all'); setSubjectFilter('all'); }}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#116149] px-5 py-2 text-xs font-semibold text-white cursor-pointer"
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* Open Question Cards (No Accordion Dropdowns!) */}
      <div className="space-y-5">
        {displayedQuestions.map((question) => {
          const isCorrect = question.selectedOption === question.correctOption;
          const isUnanswered = !question.selectedOption;
          const isQArabic = isArabicText(question.stem) || isArabicText(question.explanation);

          return (
            <article
              key={question.id}
              id={`review-q-${question.id}`}
              dir={isQArabic ? "rtl" : undefined}
              className={`rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs scroll-mt-24 transition-all ${
                isQArabic ? "text-right [direction:rtl]" : ""
              }`}
            >
              {/* Question Header Pill Tags */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3 border-b border-slate-100">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800">
                    Question {question.originalIndex + 1}
                  </span>
                  {question.subjectName && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200/60">
                      {question.subjectName}
                    </span>
                  )}
                  {question.difficulty && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-50 text-slate-600 border border-slate-200 capitalize">
                      {question.difficulty}
                    </span>
                  )}
                  {question.examYear && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-50 text-slate-600 border border-slate-200">
                      UTME {question.examYear}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {isCorrect ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                      <CheckCircle2 size={13} className="text-emerald-700" /> Correct
                    </span>
                  ) : isUnanswered ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                      <AlertCircle size={13} className="text-amber-700" /> Unanswered
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-900 border border-rose-300">
                      <XCircle size={13} className="text-rose-700" /> Incorrect
                    </span>
                  )}

                  {/* Report question problem flag button */}
                  <ReportQuestionDialog questionId={question.id} attemptId={attemptId} variant="icon" />
                </div>
              </div>

              {/* Comprehension / Reading Passage (if applicable) */}
              {question.passage?.content && (
                <div className="my-3.5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 leading-relaxed">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    {question.passage.title ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-slate-200 text-slate-800">
                        {question.passage.title}
                      </span>
                    ) : <span />}
                    {!isQArabic && (
                      isPremium ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-full">
                          <BookA size={11} /> Tap words to inspect
                        </span>
                      ) : (
                        <Link
                          href="/pricing"
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-900 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-full hover:bg-amber-200 transition-colors cursor-pointer"
                          title={isSchoolAttached ? `Vocabulary Inspector is unlocked through your school license with ${schoolName}` : "Vocabulary Inspector is a Pro feature — click to unlock"}
                        >
                          {isSchoolAttached ? <Building2 size={10} /> : <Lock size={10} />}
                          <span>Tap to inspect</span>
                          <span className="text-[9px] font-extrabold uppercase bg-amber-200/90 text-amber-950 px-1 rounded">
                            {isSchoolAttached ? "SCHOOL" : "PRO"}
                          </span>
                        </Link>
                      )
                    )}
                  </div>
                  <div className="text-slate-800 whitespace-pre-wrap">
                    {!isQArabic ? (
                      <InspectableText content={question.passage.content} isPremium={isPremium} />
                    ) : (
                      <MathRenderer content={question.passage.content} />
                    )}
                  </div>
                </div>
              )}

              {/* Question Diagram (if applicable) */}
              {question.imageUrl && (
                <QuestionDiagram url={question.imageUrl} alt={question.imageAlt} />
              )}

              {/* Question Stem */}
              <div className="mt-3 text-base font-medium text-slate-900 leading-relaxed">
                <MathRenderer content={question.stem} />
              </div>

              {/* Options with Pill Highlights (if available) */}
              {question.options && question.options.length > 0 ? (
                <div className="mt-4 space-y-2">
                  {question.options.map((opt) => {
                    const isThisCorrect = opt.label === question.correctOption;
                    const isThisSelected = opt.label === question.selectedOption;

                    let optBorderBg = "border-slate-200 bg-slate-50/60 text-slate-800";
                    let badgePill = "bg-slate-200 text-slate-700";

                    if (isThisCorrect) {
                      optBorderBg = "border-emerald-400 bg-emerald-50/70 text-emerald-950 font-medium";
                      badgePill = "bg-emerald-600 text-white font-bold";
                    } else if (isThisSelected && !isThisCorrect) {
                      optBorderBg = "border-rose-400 bg-rose-50/70 text-rose-950";
                      badgePill = "bg-rose-600 text-white font-bold";
                    }

                    return (
                      <div
                        key={opt.id}
                        className={`flex items-start justify-between gap-3 rounded-xl border p-3 text-sm transition-all ${optBorderBg}`}
                      >
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <span
                            className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${badgePill}`}
                          >
                            {opt.label}
                          </span>
                          <div className="pt-0.5 leading-relaxed break-words flex-1 min-w-0">
                            <MathRenderer content={opt.content} />
                          </div>
                        </div>

                        {/* Status badge pill for option */}
                        <div className="shrink-0 self-center">
                          {isThisCorrect && isThisSelected && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-200 text-emerald-900">
                              ✓ Your Choice (Correct)
                            </span>
                          )}
                          {isThisCorrect && !isThisSelected && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-200 text-emerald-900">
                              ✓ Correct Answer
                            </span>
                          )}
                          {!isThisCorrect && isThisSelected && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-200 text-rose-900">
                              ✕ Your Choice
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Compact Answer Pill Bar (fallback when options array not provided) */
                <div className="mt-3.5 flex flex-wrap items-center gap-3 rounded-xl bg-slate-50 p-3 border border-slate-100">
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="font-semibold text-slate-500">Your answer:</span>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        isCorrect
                          ? 'bg-emerald-100 text-emerald-900'
                          : isUnanswered
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-rose-100 text-rose-900'
                      }`}
                    >
                      {question.selectedOption || "Unanswered"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="font-semibold text-slate-500">Correct:</span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900">
                      Option {question.correctOption}
                    </span>
                  </div>
                </div>
              )}

              {/* Explanation Box (Always Open, zero fatigue!) */}
              <div className="mt-4 rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-200/80 text-emerald-900">
                    💡 Explanation & Core Concept
                  </span>
                </div>
                <div className="text-sm leading-relaxed text-slate-800">
                  <MathRenderer content={question.explanation || "No written explanation provided for this question."} />
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* Load More Button if filtered set is larger than visibleLimit */}
      {displayedQuestions.length < filteredQuestions.length && (
        <div className="pt-4 text-center">
          <button
            type="button"
            onClick={() => setVisibleLimit((v) => Math.min(v + 30, filteredQuestions.length))}
            className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-6 py-2.5 text-sm font-semibold text-slate-800 shadow-xs hover:bg-slate-50 transition-all cursor-pointer"
          >
            Show next 30 questions ({filteredQuestions.length - displayedQuestions.length} remaining)
          </button>
        </div>
      )}
    </section>
  );
}
function Scorecard({attemptId}:{attemptId:string}) {
  const resource=useApiResource<ResultData>(`/api/v1/exams/attempts/${attemptId}/results`);
  if(!resource.data)return <ResourceStatus error={resource.error} retry={resource.retry}/>;
  const result=resource.data;
  const subjects=result.subjectScores?.length ? result.subjectScores : [result.englishScore,result.subject2Score,result.subject3Score,result.subject4Score].map((score,index)=>({code:String(index),name:index===0?'Use of English':`Subject ${index+1}`,score}));

  const mins = Math.floor(result.timeSpentSeconds / 60);
  const timeFormatted = result.timeSpentSeconds < 60 ? "< 1 min" : `${mins} mins`;

  return (
    <main className="shell section-space">
      <div className="mx-auto max-w-4xl space-y-6">
        <PageHeader
          badge={{ icon: <Award size={13} />, text: "Performance Breakdown" }}
          extraTag="UTME 4-Subject CBT Simulation"
          title="Your Mock Result"
          subtitle="Comprehensive score analysis, accuracy metrics, and question-by-question diagnostic review."
        />

        {/* Minimalist Scorecard Card */}
        <section className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-7 shadow-xs">
          {/* Top Row: Score Badge + Metadata + Share Button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 pb-6 border-b border-slate-100">
            <div className="flex items-center gap-4 sm:gap-5">
              <div
                className={`flex flex-col items-center justify-center size-20 sm:size-22 rounded-2xl shrink-0 border transition-all ${
                  result.totalScore >= 250
                    ? "bg-emerald-50 border-emerald-200 text-[#116149]"
                    : result.totalScore >= 180
                      ? "bg-teal-50 border-teal-200 text-teal-800"
                      : result.totalScore > 0
                        ? "bg-amber-50 border-amber-200 text-amber-900"
                        : "bg-slate-50 border-slate-200 text-slate-600"
                }`}
              >
                <span className="text-3xl sm:text-4xl font-black tracking-tight leading-none">
                  {result.totalScore}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">
                  / 400
                </span>
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-[#116149]">
                    Completed Mock
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    • {timeFormatted} spent
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-[#092E28] tracking-tight mt-1">
                  {result.totalScore >= 250
                    ? "Outstanding Performance!"
                    : result.totalScore >= 180
                      ? "Good Progress! Keep Practicing"
                      : "Diagnostic Recorded"}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Review subject scores and step-by-step diagnostic solutions below.
                </p>
              </div>
            </div>

            {/* Quick Share Result Button */}
            <div className="shrink-0 self-start sm:self-auto">
              <ResultShare
                type="mock"
                totalScore={result.totalScore}
                timeSpentMinutes={mins}
                subjects={subjects}
                className="my-0 flex flex-col items-start sm:items-end"
                buttonClassName="inline-flex items-center justify-center gap-2 rounded-full bg-[#116149] px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-[#0e523e] transition-all cursor-pointer"
              />
            </div>
          </div>

          {/* 4 Subjects Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-5">
            {subjects.map((subject) => {
              const pct = Math.min(100, Math.max(0, subject.score));
              return (
                <div
                  key={subject.code}
                  className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3.5 sm:p-4 hover:border-emerald-200 transition-all flex flex-col justify-between"
                >
                  <div>
                    <p className="text-xs font-bold text-slate-700 truncate" title={subject.name}>
                      {subject.name}
                    </p>
                    <div className="mt-1.5 flex items-baseline gap-1">
                      <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                        {subject.score}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">/ 100</span>
                    </div>
                  </div>

                  {/* Micro Progress Track */}
                  <div className="mt-3 h-1.5 w-full rounded-full bg-slate-200/80 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        pct >= 70
                          ? "bg-emerald-500"
                          : pct >= 50
                            ? "bg-teal-500"
                            : pct > 0
                              ? "bg-amber-500"
                              : "bg-slate-300"
                      }`}
                      style={{ width: `${Math.max(pct > 0 ? 8 : 0, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Row */}
          <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <Link
                href="/practice"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-full bg-[#116149] hover:bg-[#0b4936] text-white text-xs sm:text-sm font-bold shadow-xs hover:-translate-y-0.5 transition-all"
              >
                Practise a Topic <ArrowRight size={14} />
              </Link>
              <Link
                href="/dashboard"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold transition-all"
              >
                Back to Dashboard
              </Link>
            </div>

            <Link
              href="/mock"
              className="text-xs font-bold text-[#116149] hover:underline self-start sm:self-auto"
            >
              Take Another Mock →
            </Link>
          </div>
        </section>

        {/* Detailed Solutions Section */}
        <Review attemptId={attemptId} />
      </div>

      <MockResultRatingPrompt attemptId={attemptId} />
    </main>
  );
}
function ResultContent(){const params=useSearchParams();const parsed=parseAttemptIdFromSearch(params);const router=useRouter();const redirectReason=parsed.valid?null:parsed.reason;useEffect(()=>{if(redirectReason)router.replace(`/mock?error=${redirectReason}`);},[redirectReason,router]);return parsed.valid?<Scorecard attemptId={parsed.attemptId}/>:<p role="status">Checking result link…</p>;}
export default function ResultPage(){return <StudyWorkspace><Suspense fallback={<p role="status">Loading result…</p>}><ResultContent/></Suspense></StudyWorkspace>;}
