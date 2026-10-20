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
import { CheckCircle2, XCircle, AlertCircle, HelpCircle, ChevronDown, ChevronUp, Sparkles, Filter, Bookmark, BookA } from 'lucide-react';
import { ReportQuestionDialog } from '@/components/report-question-dialog';
import { QuestionDiagram } from '@/components/question-diagram';
import { InspectableText } from '@/components/dictionary/inspectable-text';

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
  const [statusFilter, setStatusFilter] = useState<'all' | 'incorrect' | 'unanswered' | 'correct'>('all');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [showPalette, setShowPalette] = useState(false);
  const [visibleLimit, setVisibleLimit] = useState(30);

  if (!resource.data) {
    return (
      <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 text-center">
        <ResourceStatus error={resource.error} retry={resource.retry} />
        <p className="mt-2 text-sm text-slate-600">
          Want detailed diagnostic solutions and step-by-step explanations?{" "}
          <Link href="/pricing" className="font-semibold text-[#116149] hover:underline">
            Upgrade to Pro
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
    <section className="mt-10 space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-[#116149] border border-emerald-200/80">
            <Sparkles size={13} /> Detailed Diagnostic Review
          </span>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">Answer Explanations & Solutions</h2>
          <p className="mt-1 text-sm text-slate-500">
            Open explanations with question breakdown. Review mistakes and understand every step.
          </p>
        </div>

        {/* Quick status pill summary */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
            {totalCount} Total
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-900 border border-emerald-200">
            <CheckCircle2 size={12} className="text-emerald-700" /> {correctCount} Correct
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-900 border border-rose-200">
            <XCircle size={12} className="text-rose-700" /> {incorrectCount} Incorrect
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-200">
            <AlertCircle size={12} className="text-amber-700" /> {unansweredCount} Unanswered
          </span>
        </div>
      </div>

      {/* Filter Tag / Pill Navigation Bar */}
      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Status Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1 flex items-center gap-1">
              <Filter size={12} /> Status:
            </span>
            <button
              type="button"
              onClick={() => { setStatusFilter('all'); setVisibleLimit(30); }}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              All ({totalCount})
            </button>
            <button
              type="button"
              onClick={() => { setStatusFilter('incorrect'); setVisibleLimit(30); }}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                statusFilter === 'incorrect'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100'
              }`}
            >
              <XCircle size={13} /> Incorrect ({incorrectCount})
            </button>
            <button
              type="button"
              onClick={() => { setStatusFilter('unanswered'); setVisibleLimit(30); }}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                statusFilter === 'unanswered'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
              }`}
            >
              <AlertCircle size={13} /> Unanswered ({unansweredCount})
            </button>
            <button
              type="button"
              onClick={() => { setStatusFilter('correct'); setVisibleLimit(30); }}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                statusFilter === 'correct'
                  ? 'bg-[#116149] text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              <CheckCircle2 size={13} /> Correct ({correctCount})
            </button>
          </div>

          {/* Toggle Question Number Palette */}
          <button
            type="button"
            onClick={() => setShowPalette(!showPalette)}
            className="inline-flex items-center gap-1.5 self-start sm:self-auto text-xs font-semibold text-[#116149] hover:text-[#0e523e] cursor-pointer"
          >
            {showPalette ? (
              <>
                Hide Palette <ChevronUp size={14} />
              </>
            ) : (
              <>
                Jump to Question <ChevronDown size={14} />
              </>
            )}
          </button>
        </div>

        {/* Subject Filter Pills (if multiple subjects exist) */}
        {subjects.length > 1 && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">Subject:</span>
            <button
              type="button"
              onClick={() => { setSubjectFilter('all'); setVisibleLimit(30); }}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                subjectFilter === 'all'
                  ? 'bg-emerald-800 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              All Subjects
            </button>
            {subjects.map((sub) => (
              <button
                key={sub.code}
                type="button"
                onClick={() => { setSubjectFilter(sub.code); setVisibleLimit(30); }}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  subjectFilter === sub.code
                    ? 'bg-emerald-800 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {sub.name} ({sub.count})
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
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-full">
                        <BookA size={11} /> Tap words to inspect
                      </span>
                    )}
                  </div>
                  <div className="text-slate-800 whitespace-pre-wrap">
                    {!isQArabic ? (
                      <InspectableText content={question.passage.content} />
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
 return <main className="shell section-space"><div className="mx-auto max-w-4xl"><p className="text-xs font-semibold uppercase tracking-widest text-emerald-800">Your progress, one session at a time</p><h1 className="mt-3 text-3xl font-semibold tracking-tight">Your mock result</h1><section className="my-6 rounded-3xl border border-slate-200 bg-white p-6 sm:p-8"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm text-slate-500">Total score</p><p className="mt-2 text-6xl font-semibold text-[#116149]">{result.totalScore}<span className="text-xl text-slate-400"> / 400</span></p></div><p className="text-sm text-slate-500">{Math.floor(result.timeSpentSeconds/60)} minutes of practice</p></div><div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">{subjects.map(subject=><div key={subject.code} className="rounded-2xl bg-slate-50 p-4"><p className="text-sm text-slate-600">{subject.name}</p><p className="mt-2 text-2xl font-semibold">{subject.score}<span className="text-sm font-normal text-slate-400"> / 100</span></p></div>)}</div><ResultShare
  type="mock"
  totalScore={result.totalScore}
  timeSpentMinutes={Math.floor(result.timeSpentSeconds/60)}
  subjects={subjects}
/></section><div className="flex flex-wrap gap-3"><Link className="inline-flex min-h-11 items-center rounded-full bg-[#116149] px-5 text-sm font-semibold text-white" href="/practice/">Practise a topic</Link><Link className="inline-flex min-h-11 items-center rounded-full border border-slate-200 bg-white px-5 text-sm font-semibold" href="/dashboard/">Back to dashboard</Link></div><Review attemptId={attemptId}/></div><MockResultRatingPrompt attemptId={attemptId}/></main>;

}
function ResultContent(){const params=useSearchParams();const parsed=parseAttemptIdFromSearch(params);const router=useRouter();const redirectReason=parsed.valid?null:parsed.reason;useEffect(()=>{if(redirectReason)router.replace(`/mock?error=${redirectReason}`);},[redirectReason,router]);return parsed.valid?<Scorecard attemptId={parsed.attemptId}/>:<p role="status">Checking result link…</p>;}
export default function ResultPage(){return <StudyWorkspace><Suspense fallback={<p role="status">Loading result…</p>}><ResultContent/></Suspense></StudyWorkspace>;}
