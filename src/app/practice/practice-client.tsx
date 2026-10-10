"use client";

import { useState } from "react";
import { MathRenderer } from "@/components/math-renderer";
import { 
  getPracticeQuestions, 
  checkPracticeAnswer, 
  PracticeQuestionItem, 
  PracticeAnswerResult 
} from "@/app/actions/practice";
import { 
  BookOpen, 
  CheckCircle2, 
  XCircle, 
  ArrowRight, 
  RotateCcw, 
  Sparkles, 
  Loader2, 
  Layers, 
  HelpCircle,
  Award,
  Lock
} from "lucide-react";
import Link from "next/link";

interface SubjectOption {
  code: string;
  name: string;
  isCompulsory: boolean;
}

interface PracticeClientProps {
  enrolledSubjects: SubjectOption[];
  initialSubjectCode?: string;
  initialTopicSlug?: string;
  isPremium?: boolean;
}

export function PracticeClient({ 
  enrolledSubjects, 
  initialSubjectCode,
  initialTopicSlug,
  isPremium = false
}: PracticeClientProps) {

  const initialSub = enrolledSubjects.find((s) => s.code === initialSubjectCode)?.code || enrolledSubjects[0]?.code || "ENG";
  const [selectedSubject, setSelectedSubject] = useState<string>(initialSub);
  const [selectedTopicSlug, setSelectedTopicSlug] = useState<string | undefined>(initialTopicSlug);
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [questions, setQuestions] = useState<PracticeQuestionItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [answerResult, setAnswerResult] = useState<PracticeAnswerResult | null>(null);
  const [score, setScore] = useState<number>(0);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const startPractice = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const qList = await getPracticeQuestions(selectedSubject, selectedTopicSlug, questionCount);
      if (qList.length === 0) {
        setErrorMessage("No questions available for this selection yet. Try all topics for this subject.");
        setIsLoading(false);
        return;
      }
      setQuestions(qList);
      setCurrentIndex(0);
      setSelectedOption(null);
      setAnswerResult(null);
      setScore(0);
      setIsCompleted(false);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load practice questions.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectOption = (label: string) => {
    if (answerResult) return; // Prevent changing after answer is revealed
    setSelectedOption(label);
  };

  const handleSubmitAnswer = async () => {
    if (!selectedOption || answerResult || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const currentQ = questions[currentIndex];
      const result = await checkPracticeAnswer(currentQ.id, selectedOption);
      setAnswerResult(result);
      if (result.isCorrect) {
        setScore((prev) => prev + 1);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNextQuestion = () => {
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
      setAnswerResult(null);
    } else {
      setIsCompleted(true);
    }
  };

  const currentQ = questions[currentIndex];

  // 1. PRACTICE SETUP SCREEN
  if (questions.length === 0 || isCompleted) {
    if (isCompleted) {
      const percentage = Math.round((score / questions.length) * 100);
      return (
        <div className="rounded-3xl border border-emerald-950/10 bg-white p-6 sm:p-10 shadow-sm text-center max-w-2xl mx-auto">
          <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-emerald-50 text-[#116149] mb-4">
            <Award size={32} />
          </div>
          <span className="text-[10px] font-bold tracking-[0.14em] text-[#116149] uppercase">
            PRACTICE COMPLETE
          </span>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-[#092E28]">
            Practice Session <span className="serif-accent text-[#116149]">Summary</span>
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            You completed {questions.length} questions in {currentQ?.subjectName || "Practice Mode"}.
          </p>

          <div className="my-8 p-6 rounded-2xl bg-[#F6F8F5] border border-slate-200/80 flex items-center justify-around">
            <div>
              <span className="text-3xl font-bold text-[#092E28]">{score} / {questions.length}</span>
              <span className="block text-xs text-slate-500 mt-1 font-medium">Correct Answers</span>
            </div>
            <div className="h-10 w-px bg-slate-300" />
            <div>
              <span className={`text-3xl font-bold ${percentage >= 70 ? 'text-[#116149]' : 'text-amber-600'}`}>
                {percentage}%
              </span>
              <span className="block text-xs text-slate-500 mt-1 font-medium">Accuracy</span>
            </div>
          </div>

          <p className="text-sm text-slate-600 mb-8 max-w-md mx-auto leading-relaxed">
            {percentage >= 75
              ? "Excellent performance! Keep reinforcing your mastery with consistent daily revision."
              : "Good effort. Review the diagnostic explanations carefully to turn mistakes into points."}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => {
                setQuestions([]);
                setIsCompleted(false);
              }}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <RotateCcw size={16} /> Choose Another Topic
            </button>
            <Link
              href="/dashboard"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-[#116149] px-6 py-3.5 text-sm font-semibold text-white hover:bg-[#0e523e] transition-colors"
            >
              Return to Dashboard <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      );
    }

    return (
      <div className="rounded-3xl border border-emerald-950/10 bg-white p-6 sm:p-10 shadow-sm max-w-2xl mx-auto">
        <div className="mb-6">
          <p className="text-[10px] font-bold tracking-[0.14em] text-[#116149] uppercase">
            SELF-PACED PRACTICE
          </p>
          <h1 className="mt-2 text-2xl sm:text-3xl font-semibold tracking-tight text-[#092E28]">
            Select a subject to <span className="serif-accent text-[#116149]">practice</span>
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Work through verified questions with step-by-step diagnostic solutions and formulas.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800 flex items-start gap-2.5">
            <HelpCircle size={16} className="shrink-0 mt-0.5 text-amber-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="space-y-6">
          {/* Subject Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2.5">
              1. Choose Subject
            </label>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {enrolledSubjects.map((sub) => {
                const isSelected = selectedSubject === sub.code;
                return (
                  <button
                    key={sub.code}
                    type="button"
                    onClick={() => setSelectedSubject(sub.code)}
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

          {/* Question Count */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2.5">
              2. Number of Questions
            </label>
            <div className="flex gap-3">
              {[5, 10, 15].map((cnt) => (
                <button
                  key={cnt}
                  type="button"
                  onClick={() => setQuestionCount(cnt)}
                  className={`flex-1 py-3 rounded-2xl border text-sm font-semibold transition-all cursor-pointer ${
                    questionCount === cnt
                      ? "border-[#116149] bg-[#116149] text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                  }`}
                >
                  {cnt} Questions
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Free plan includes 15 diagnostic practice questions every day (resets midnight WAT).
            </p>
          </div>

          {/* Launch Button */}
          <button
            type="button"
            onClick={startPractice}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 rounded-full bg-[#116149] px-6 py-4 text-sm font-semibold text-white shadow-sm hover:bg-[#0e523e] transition-all cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" /> Preparing Practice Set...
              </>
            ) : (
              <>
                Start Focused Practice <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // 2. ACTIVE QUESTION SCREEN
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Top Header / Progress */}
      <div className="flex items-center justify-between text-xs text-slate-600 bg-white p-4 rounded-2xl border border-slate-200/80">
        <div className="flex items-center gap-2">
          <span className="font-bold text-[#116149] uppercase tracking-wider">
            {currentQ.subjectName}
          </span>
          <span>•</span>
          <span className="text-slate-500">{currentQ.topicTitle}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-semibold text-slate-700">
            Question {currentIndex + 1} of {questions.length}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[11px] font-semibold text-slate-600 uppercase">
            {currentQ.difficulty}
          </span>
        </div>
      </div>

      {/* Reading Passage (if present) */}
      {currentQ.passage && (
        <div className="rounded-3xl border border-emerald-950/10 bg-[#EDF2E9]/60 p-6 sm:p-8">
          {currentQ.passage.title && (
            <h3 className="text-sm font-bold text-[#092E28] uppercase tracking-wider mb-2">
              Passage: {currentQ.passage.title}
            </h3>
          )}
          <p className="text-sm leading-relaxed text-slate-800 italic">
            {currentQ.passage.content}
          </p>
        </div>
      )}

      {/* Question Card */}
      <div className="rounded-3xl border border-emerald-950/10 bg-white p-6 sm:p-10 shadow-sm space-y-6">
        {/* Question Stem with KaTeX Math Rendering */}
        <div className="text-base sm:text-lg font-medium text-[#092E28] leading-relaxed">
          <MathRenderer content={currentQ.stem} />
        </div>

        {/* Multiple Choice Options (A, B, C, D) */}
        <div className="space-y-3 pt-2">
          {currentQ.options.map((opt) => {
            const isSelected = selectedOption === opt.label;
            const isCorrectOption = answerResult?.correctOption === opt.label;
            const isChosenWrong = answerResult && isSelected && !answerResult.isCorrect;

            let cardStyles = "border-slate-200 bg-white hover:border-slate-300 text-slate-800";
            let badgeStyles = "border-slate-300 bg-slate-50 text-slate-700";

            if (answerResult) {
              if (isCorrectOption) {
                cardStyles = "border-emerald-600 bg-emerald-50/80 text-[#092E28] ring-1 ring-emerald-600";
                badgeStyles = "border-emerald-600 bg-emerald-600 text-white";
              } else if (isChosenWrong) {
                cardStyles = "border-red-400 bg-red-50/60 text-red-950";
                badgeStyles = "border-red-400 bg-red-500 text-white";
              } else {
                cardStyles = "border-slate-200 opacity-60 text-slate-600";
              }
            } else if (isSelected) {
              cardStyles = "border-[#116149] bg-emerald-50/60 text-[#092E28] ring-1 ring-[#116149]";
              badgeStyles = "border-[#116149] bg-[#116149] text-white";
            }

            return (
              <button
                key={opt.label}
                type="button"
                onClick={() => handleSelectOption(opt.label)}
                disabled={!!answerResult}
                className={`w-full flex items-start gap-4 p-4 sm:p-4.5 rounded-2xl border text-left text-sm sm:text-base font-medium transition-all cursor-pointer disabled:cursor-default ${cardStyles}`}
              >
                <span className={`flex size-7 shrink-0 items-center justify-center rounded-xl border text-xs font-bold transition-colors ${badgeStyles}`}>
                  {opt.label}
                </span>
                <span className="flex-1 pt-0.5">
                  <MathRenderer content={opt.content} />
                </span>
              </button>
            );
          })}
        </div>

        {/* Detailed Diagnostic Solution Banner */}
        {answerResult && (
          <div className={`mt-6 rounded-2xl p-5 sm:p-6 border ${
            answerResult.isCorrect 
              ? "bg-emerald-50/90 border-emerald-200 text-emerald-950" 
              : "bg-amber-50/90 border-amber-200 text-amber-950"
          }`}>
            <div className="flex items-center gap-2 mb-2 font-bold text-sm">
              {answerResult.isCorrect ? (
                <>
                  <CheckCircle2 size={18} className="text-emerald-700" />
                  <span className="text-emerald-800">Correct! Option {answerResult.correctOption}</span>
                </>
              ) : (
                <>
                  <XCircle size={18} className="text-amber-700" />
                  <span className="text-amber-800">Incorrect. The correct answer is Option {answerResult.correctOption}</span>
                </>
              )}
            </div>
            <div className="text-xs sm:text-sm leading-relaxed mt-2 text-slate-800">
              <strong className="block mb-1 text-slate-900">Step-by-step Explanation:</strong>
              <MathRenderer content={answerResult.explanation} />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-4 flex items-center justify-between border-t border-slate-100">
          <button
            type="button"
            onClick={() => {
              setQuestions([]);
              setIsCompleted(false);
            }}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
          >
            Quit Practice
          </button>

          {!answerResult ? (
            <button
              type="button"
              onClick={handleSubmitAnswer}
              disabled={!selectedOption || isSubmitting}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#116149] px-7 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#0e523e] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Verifying...
                </>
              ) : (
                "Check Answer"
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNextQuestion}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#116149] px-7 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#0e523e] transition-all cursor-pointer"
            >
              {currentIndex + 1 < questions.length ? (
                <>
                  Next Question <ArrowRight size={16} />
                </>
              ) : (
                "Finish Session"
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
