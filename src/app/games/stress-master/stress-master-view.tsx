"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { StudyWorkspace } from "@/components/study-workspace";
import { ProFeatureGate } from "@/components/dictionary/pro-feature-gate";
import {
  STRESS_GAME_ITEMS,
  EMPHATIC_STRESS_ITEMS,
  getRandomGameItems,
} from "@/lib/dictionary/game-data";
import type { StressGameItem, EmphaticGameItem } from "@/lib/dictionary/types";
import {
  Target,
  ArrowLeft,
  Volume2,
  CheckCircle2,
  XCircle,
  RotateCcw,
  HelpCircle,
  Trophy,
  Flame,
} from "lucide-react";
import { recordStreakActivity, type StreakActivationResult } from "@/lib/dictionary/streak-activation";
import { useNetworkStatus } from "@/lib/offline/network-state";

export interface StressMasterGameProps {
  onBack?: () => void;
  isEmbedded?: boolean;
}

export function StressMasterGameView({ onBack, isEmbedded = false }: StressMasterGameProps = {}) {
  const { isOffline } = useNetworkStatus();
  const [mode, setMode] = useState<"syllable" | "emphatic">("syllable");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [streakInfo, setStreakInfo] = useState<StreakActivationResult | null>(null);

  const [syllableDeck, setSyllableDeck] = useState<StressGameItem[]>([]);
  const [emphaticDeck, setEmphaticDeck] = useState<EmphaticGameItem[]>([]);

  useEffect(() => {
    setSyllableDeck(getRandomGameItems(STRESS_GAME_ITEMS, 10));
    setEmphaticDeck(getRandomGameItems(EMPHATIC_STRESS_ITEMS, 10));
  }, []);

  const activeDeck = mode === "syllable" ? syllableDeck : emphaticDeck;
  const currentSyllableItem =
    (syllableDeck.length > 0 ? syllableDeck : STRESS_GAME_ITEMS)[currentIndex] || STRESS_GAME_ITEMS[0];
  const currentEmphaticItem =
    (emphaticDeck.length > 0 ? emphaticDeck : EMPHATIC_STRESS_ITEMS)[currentIndex] || EMPHATIC_STRESS_ITEMS[0];

  const totalQuestions =
    activeDeck.length > 0
      ? activeDeck.length
      : mode === "syllable"
        ? Math.min(10, STRESS_GAME_ITEMS.length)
        : Math.min(10, EMPHATIC_STRESS_ITEMS.length);

  const playAudio = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-GB";
    utterance.rate = 0.8;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const handleSyllableSelect = (idx: number) => {
    if (isAnswered) return;
    setSelectedAnswer(idx);
    setIsAnswered(true);

    const isCorrect = idx === currentSyllableItem.stressedIndex;
    const nextScore = isCorrect ? score + 10 + streak * 2 : score;
    if (isCorrect) {
      setScore(nextScore);
      setStreak((st) => st + 1);
    } else {
      setStreak(0);
    }

    recordStreakActivity({
      activityType: "dictionary_game_completed",
      details: { game: "Stress Master (Syllables)", score: nextScore },
    }).then((res) => {
      if (res) setStreakInfo(res);
    });
  };

  const handleEmphaticSelect = (idx: number) => {
    if (isAnswered) return;
    setSelectedAnswer(idx);
    setIsAnswered(true);

    const isCorrect = currentEmphaticItem.options[idx].isCorrect;
    const nextScore = isCorrect ? score + 10 + streak * 2 : score;
    if (isCorrect) {
      setScore(nextScore);
      setStreak((st) => st + 1);
    } else {
      setStreak(0);
    }

    recordStreakActivity({
      activityType: "dictionary_game_completed",
      details: { game: "Stress Master (Emphatic)", score: nextScore },
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
        details: { game: `Stress Master (${mode})`, score },
      }).then((res) => {
        if (res) setStreakInfo(res);
      });
    }
  };

  const restartGame = () => {
    setSyllableDeck(getRandomGameItems(STRESS_GAME_ITEMS, 10));
    setEmphaticDeck(getRandomGameItems(EMPHATIC_STRESS_ITEMS, 10));
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setScore(0);
    setStreak(0);
    setIsCompleted(false);
  };

  const gameContent = (
    <main className="shell section-space">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Top Bar Navigation */}
        <div className="flex items-center justify-between">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition cursor-pointer"
            >
              <ArrowLeft size={14} /> Back to Games
            </button>
          ) : (
            <Link
              href="/dictionary?tab=games"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition"
            >
              <ArrowLeft size={14} /> Back to Games
            </Link>
          )}

          {/* Score & Streak */}
          <div className="flex items-center gap-2">
            {isOffline && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-[#116149] border border-emerald-200">
                ⚡ Offline Mode
              </span>
            )}
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200">
              Score: {score}
            </span>
            {streak > 1 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 animate-pulse">
                🔥 {streak} Streak!
              </span>
            )}
          </div>
        </div>

          {/* Mode Switcher */}
          <div className="grid grid-cols-2 rounded-2xl bg-slate-100 p-1.5 border border-slate-200 gap-1.5">
            <button
              type="button"
              onClick={() => {
                setMode("syllable");
                restartGame();
              }}
              className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-xl transition cursor-pointer text-center ${
                mode === "syllable"
                  ? "bg-white text-[#116149] shadow-sm font-bold"
                  : "text-slate-600 hover:text-slate-900 font-medium hover:bg-slate-200/50"
              }`}
            >
              <span className={`text-[10px] uppercase tracking-wider font-extrabold ${
                mode === "syllable" ? "text-emerald-700/80" : "text-slate-400"
              }`}>
                Mode 1
              </span>
              <span className="text-xs sm:text-sm font-bold tracking-tight">
                Syllable Stress
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMode("emphatic");
                restartGame();
              }}
              className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-xl transition cursor-pointer text-center ${
                mode === "emphatic"
                  ? "bg-white text-[#116149] shadow-sm font-bold"
                  : "text-slate-600 hover:text-slate-900 font-medium hover:bg-slate-200/50"
              }`}
            >
              <span className={`text-[10px] uppercase tracking-wider font-extrabold ${
                mode === "emphatic" ? "text-emerald-700/80" : "text-slate-400"
              }`}>
                Mode 2
              </span>
              <span className="text-xs sm:text-sm font-bold tracking-tight">
                Emphatic Stress
              </span>
            </button>
          </div>

          {/* GAME COMPLETION SCREEN */}
          {isCompleted ? (
            <div className="rounded-3xl border border-emerald-200 bg-white p-8 text-center shadow-lg animate-fade-in">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-[#116149] mb-4">
                <Trophy size={32} />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Drill Complete!</h2>
              <p className="mt-1 text-sm text-slate-500">
                You scored <span className="font-bold text-[#116149]">{score} points</span> in{" "}
                {mode === "syllable" ? "Syllable Stress" : "Emphatic Stress"}!
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
                  className="inline-flex items-center gap-2 rounded-full bg-[#116149] px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#0e523e] transition cursor-pointer"
                >
                  <RotateCcw size={14} /> Play Again
                </button>
                <Link
                  href="/dictionary"
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                >
                  Other Word Games
                </Link>
              </div>
            </div>
          ) : mode === "syllable" ? (
            /* MODE 1: SYLLABLE STRESS TAPPING */
            <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-6">
              {/* Progress */}
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>
                  Question {currentIndex + 1} of {totalQuestions}
                </span>
                <span className="capitalize font-semibold text-emerald-800">
                  {currentSyllableItem.partOfSpeech}
                </span>
              </div>

              {/* Target Prompt */}
              <div className="text-center space-y-2">
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-[#116149]">
                  <Target size={13} /> Tap the stressed syllable
                </span>
                <h3 className="text-3xl font-extrabold text-slate-900 tracking-wide capitalize">
                  {currentSyllableItem.word}
                </h3>
                <p className="text-xs text-slate-500 italic">"{currentSyllableItem.sentenceExample}"</p>
              </div>

              {/* Syllable Tapping Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                {currentSyllableItem.syllables.map((syl, idx) => {
                  const isCorrect = idx === currentSyllableItem.stressedIndex;
                  const isSelected = selectedAnswer === idx;

                  let btnStyle = "bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-200";
                  if (isAnswered) {
                    if (isCorrect) {
                      btnStyle = "bg-emerald-600 text-white border-emerald-700 shadow-md scale-105";
                    } else if (isSelected && !isCorrect) {
                      btnStyle = "bg-rose-600 text-white border-rose-700";
                    } else {
                      btnStyle = "bg-slate-100 text-slate-400 border-slate-200 opacity-60";
                    }
                  }

                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={isAnswered}
                      onClick={() => handleSyllableSelect(idx)}
                      className={`min-w-20 px-4 py-3 rounded-2xl text-base font-extrabold uppercase tracking-widest border transition-all cursor-pointer ${btnStyle}`}
                    >
                      {syl}
                    </button>
                  );
                })}
              </div>

              {/* Explanation & Next */}
              {isAnswered && (
                <div className="pt-4 border-t border-slate-100 space-y-4 animate-fade-in">
                  <div
                    className={`p-4 rounded-2xl border ${
                      selectedAnswer === currentSyllableItem.stressedIndex
                        ? "bg-emerald-50/70 border-emerald-200 text-emerald-950"
                        : "bg-rose-50/70 border-rose-200 text-rose-950"
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-sm mb-1">
                      {selectedAnswer === currentSyllableItem.stressedIndex ? (
                        <>
                          <CheckCircle2 size={16} className="text-emerald-700" /> Correct!
                        </>
                      ) : (
                        <>
                          <XCircle size={16} className="text-rose-700" /> Incorrect
                        </>
                      )}
                    </div>
                    <p className="text-xs leading-relaxed">{currentSyllableItem.explanation}</p>
                  </div>

                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => playAudio(currentSyllableItem.word)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#116149] hover:underline"
                    >
                      <Volume2 size={14} /> Listen to pronunciation
                    </button>

                    <button
                      type="button"
                      onClick={handleNext}
                      className="inline-flex items-center gap-2 rounded-full bg-[#116149] px-6 py-2.5 text-xs font-bold text-white hover:bg-[#0e523e] transition cursor-pointer"
                    >
                      {currentIndex + 1 < totalQuestions ? "Next Word" : "See Results"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* MODE 2: EMPHATIC STRESS (CONTRAST) */
            <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-6">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>
                  Question {currentIndex + 1} of {totalQuestions}
                </span>
                <span className="font-semibold text-emerald-800">Emphatic Contrast</span>
              </div>

              <div className="space-y-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-[#116149]">
                  <HelpCircle size={14} /> Which question does this statement answer?
                </span>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-lg font-bold text-slate-900 leading-relaxed">
                  {currentEmphaticItem.sentence}
                </div>
                <p className="text-xs text-slate-500">
                  Focus on the capitalized word:{" "}
                  <span className="font-bold text-[#116149] uppercase">
                    {currentEmphaticItem.stressedWord}
                  </span>
                </p>
              </div>

              {/* Options */}
              <div className="space-y-2.5">
                {currentEmphaticItem.options.map((opt, idx) => {
                  const isSelected = selectedAnswer === idx;
                  let optStyle = "border-slate-200 bg-white hover:border-slate-300 text-slate-800";

                  if (isAnswered) {
                    if (opt.isCorrect) {
                      optStyle = "border-emerald-500 bg-emerald-50 text-emerald-950 font-medium";
                    } else if (isSelected && !opt.isCorrect) {
                      optStyle = "border-rose-400 bg-rose-50 text-rose-950";
                    } else {
                      optStyle = "border-slate-200 bg-slate-50 text-slate-400 opacity-60";
                    }
                  }

                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={isAnswered}
                      onClick={() => handleEmphaticSelect(idx)}
                      className={`w-full text-left p-4 rounded-2xl border text-sm transition-all cursor-pointer flex items-center justify-between gap-3 ${optStyle}`}
                    >
                      <span>{opt.text}</span>
                      {isAnswered && opt.isCorrect && (
                        <CheckCircle2 size={16} className="text-emerald-700 shrink-0" />
                      )}
                      {isAnswered && isSelected && !opt.isCorrect && (
                        <XCircle size={16} className="text-rose-700 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Explanation & Next */}
              {isAnswered && (
                <div className="pt-4 border-t border-slate-100 space-y-4 animate-fade-in">
                  <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-950 leading-relaxed">
                    <p className="font-bold mb-1">UTME Rule:</p>
                    {currentEmphaticItem.explanation}
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleNext}
                      className="inline-flex items-center gap-2 rounded-full bg-[#116149] px-6 py-2.5 text-xs font-bold text-white hover:bg-[#0e523e] transition cursor-pointer"
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
    );

    if (isEmbedded) {
      return gameContent;
    }

    return (
      <ProFeatureGate
        title="Stress Master Game"
        description="Practice syllable stress and emphatic sentence contrast drills tested in UTME Use of English."
      >
        <StudyWorkspace>
          {gameContent}
        </StudyWorkspace>
      </ProFeatureGate>
    );
}
