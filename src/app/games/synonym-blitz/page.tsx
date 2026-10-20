"use client";

import { useState } from "react";
import Link from "next/link";
import { StudyWorkspace } from "@/components/study-workspace";
import { ProFeatureGate } from "@/components/dictionary/pro-feature-gate";
import { SYN_ANTONYM_ITEMS } from "@/lib/dictionary/game-data";
import {
  Zap,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Sparkles,
  Trophy,
  Flame,
} from "lucide-react";
import { recordStreakActivity, type StreakActivationResult } from "@/lib/dictionary/streak-activation";

export default function SynonymBlitzGamePage() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [streakInfo, setStreakInfo] = useState<StreakActivationResult | null>(null);

  const currentItem = SYN_ANTONYM_ITEMS[currentIndex];
  const totalQuestions = SYN_ANTONYM_ITEMS.length;

  const handleSelect = (option: string) => {
    if (isAnswered) return;
    setSelectedAnswer(option);
    setIsAnswered(true);

    const isCorrect = option === currentItem.correctOption;
    const nextScore = isCorrect ? score + 10 + streak * 2 : score;
    if (isCorrect) {
      setScore(nextScore);
      setStreak((st) => st + 1);
    } else {
      setStreak(0);
    }

    recordStreakActivity({
      activityType: "dictionary_game_completed",
      details: { game: "Synonym Blitz", score: nextScore },
    }).then((res) => {
      if (res) setStreakInfo(res);
    });
  };

  const handleNext = () => {
    if (currentIndex + 1 < totalQuestions) {
      setCurrentIndex((i) => i + 1);
      setSelectedAnswer(null);
      setIsAnswered(false);
    } else {
      setIsCompleted(true);
      recordStreakActivity({
        activityType: "dictionary_game_completed",
        details: { game: "Synonym Blitz", score },
      }).then((res) => {
        if (res) setStreakInfo(res);
      });
    }
  };

  const restartGame = () => {
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setScore(0);
    setStreak(0);
    setIsCompleted(false);
  };

  return (
    <ProFeatureGate
      title="Synonym & Antonym Blitz"
      description="Rapid-fire nearest in meaning and opposite in meaning challenges from authentic UTME past questions."
    >
      <StudyWorkspace>
        <main className="shell section-space">
        <div className="mx-auto max-w-2xl space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <Link
              href="/dictionary"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition"
            >
              <ArrowLeft size={14} /> Back to Dictionary
            </Link>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-900 border border-purple-200">
                Score: {score}
              </span>
              {streak > 1 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                  🔥 {streak} Streak!
                </span>
              )}
            </div>
          </div>

          {/* GAME COMPLETION */}
          {isCompleted ? (
            <div className="rounded-3xl border border-purple-200 bg-white p-8 text-center shadow-lg animate-fade-in">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-100 text-purple-700 mb-4">
                <Trophy size={32} />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Blitz Complete!</h2>
              <p className="mt-1 text-sm text-slate-500">
                You scored <span className="font-bold text-purple-700">{score} points</span> in Lexis & Structure!
              </p>
              <div className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-amber-500/10 px-4 py-2 border border-amber-500/30 text-amber-900 text-xs font-bold">
                <Flame size={16} className="fill-current text-amber-500 animate-pulse" />
                <span>
                  Daily Study Streak Active! {streakInfo ? `You're on a ${streakInfo.currentStreak}-day streak!` : "Today's fire is locked in!"}
                </span>
              </div>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={restartGame}
                  className="inline-flex items-center gap-2 rounded-full bg-purple-700 px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-purple-800 transition cursor-pointer"
                >
                  <RotateCcw size={14} /> Play Again
                </button>
                <Link
                  href="/dictionary"
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                >
                  More Word Games
                </Link>
              </div>
            </div>
          ) : (
            /* GAME CARD */
            <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-6">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>
                  Question {currentIndex + 1} of {totalQuestions}
                </span>
                <span
                  className={`font-bold px-2.5 py-0.5 rounded-full ${
                    currentItem.mode === "synonym"
                      ? "bg-emerald-100 text-emerald-900"
                      : "bg-rose-100 text-rose-900"
                  }`}
                >
                  {currentItem.mode === "synonym" ? "NEAREST IN MEANING" : "OPPOSITE IN MEANING"}
                </span>
              </div>

              {/* Target Sentence Display */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Select the word {currentItem.mode === "synonym" ? "NEAREST" : "OPPOSITE"} in meaning to the capitalized word:
                </p>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-base font-medium text-slate-800 leading-relaxed">
                  {currentItem.sentence.split(currentItem.targetWord).map((part, i, arr) => (
                    <span key={i}>
                      {part}
                      {i < arr.length - 1 && (
                        <span className="font-extrabold text-purple-800 underline decoration-purple-400 decoration-2 underline-offset-4">
                          {currentItem.targetWord}
                        </span>
                      )}
                    </span>
                  ))}
                </div>
              </div>

              {/* Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {currentItem.options.map((opt, idx) => {
                  const isSelected = selectedAnswer === opt;
                  const isCorrect = opt === currentItem.correctOption;
                  let optStyle = "border-slate-200 bg-white hover:border-purple-300 text-slate-800";

                  if (isAnswered) {
                    if (isCorrect) {
                      optStyle = "border-emerald-500 bg-emerald-50 text-emerald-950 font-bold";
                    } else if (isSelected && !isCorrect) {
                      optStyle = "border-rose-400 bg-rose-50 text-rose-950 font-medium";
                    } else {
                      optStyle = "border-slate-200 bg-slate-50 text-slate-400 opacity-60";
                    }
                  }

                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={isAnswered}
                      onClick={() => handleSelect(opt)}
                      className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${optStyle}`}
                    >
                      <span className="text-sm capitalize font-semibold">{opt}</span>
                      {isAnswered && isCorrect && (
                        <CheckCircle2 size={16} className="text-emerald-700 shrink-0" />
                      )}
                      {isAnswered && isSelected && !isCorrect && (
                        <XCircle size={16} className="text-rose-700 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Explanation & Next */}
              {isAnswered && (
                <div className="pt-4 border-t border-slate-100 space-y-4 animate-fade-in">
                  <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200 text-xs text-purple-950 leading-relaxed">
                    <p className="font-bold mb-1">Lexical Breakdown:</p>
                    {currentItem.explanation}
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleNext}
                      className="inline-flex items-center gap-2 rounded-full bg-purple-700 px-6 py-2.5 text-xs font-bold text-white hover:bg-purple-800 transition cursor-pointer"
                    >
                      {currentIndex + 1 < totalQuestions ? "Next Question" : "See Results"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </StudyWorkspace>
  </ProFeatureGate>
  );
}
