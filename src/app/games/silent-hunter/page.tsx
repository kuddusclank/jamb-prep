"use client";

import { useState } from "react";
import Link from "next/link";
import { StudyWorkspace } from "@/components/study-workspace";
import { SILENT_LETTER_ITEMS } from "@/lib/dictionary/game-data";
import {
  EyeOff,
  ArrowLeft,
  Volume2,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Sparkles,
  Trophy,
} from "lucide-react";

export default function SilentHunterGamePage() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedLetterIdx, setSelectedLetterIdx] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  const currentItem = SILENT_LETTER_ITEMS[currentIndex];
  const totalQuestions = SILENT_LETTER_ITEMS.length;

  const playAudio = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-GB";
    utterance.rate = 0.8;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const handleLetterTap = (charIdx: number) => {
    if (isAnswered) return;
    setSelectedLetterIdx(charIdx);
    setIsAnswered(true);

    const isSilent = currentItem.silentIndices.includes(charIdx);
    if (isSilent) {
      setScore((s) => s + 10 + streak * 2);
      setStreak((st) => st + 1);
    } else {
      setStreak(0);
    }
  };

  const handleNext = () => {
    if (currentIndex + 1 < totalQuestions) {
      setCurrentIndex((i) => i + 1);
      setSelectedLetterIdx(null);
      setIsAnswered(false);
    } else {
      setIsCompleted(true);
    }
  };

  const restartGame = () => {
    setCurrentIndex(0);
    setSelectedLetterIdx(null);
    setIsAnswered(false);
    setScore(0);
    setStreak(0);
    setIsCompleted(false);
  };

  const isCurrentSelectionCorrect =
    selectedLetterIdx !== null && currentItem.silentIndices.includes(selectedLetterIdx);

  return (
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
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200">
                Score: {score}
              </span>
              {streak > 1 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                  🔥 {streak} Streak!
                </span>
              )}
            </div>
          </div>

          {/* GAME COMPLETION */}
          {isCompleted ? (
            <div className="rounded-3xl border border-amber-200 bg-white p-8 text-center shadow-lg animate-fade-in">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-800 mb-4">
                <Trophy size={32} />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Hunt Complete!</h2>
              <p className="mt-1 text-sm text-slate-500">
                You scored <span className="font-bold text-amber-800">{score} points</span> in Silent Letters!
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={restartGame}
                  className="inline-flex items-center gap-2 rounded-full bg-amber-700 px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-amber-800 transition cursor-pointer"
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
                <span className="font-semibold text-amber-800">Silent Letter Discovery</span>
              </div>

              <div className="text-center space-y-2">
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200">
                  <EyeOff size={13} /> Tap the letter that is SILENT
                </span>
                <p className="text-xs text-slate-500">
                  One of the letters in this word is not pronounced in Standard English:
                </p>
              </div>

              {/* Interactive Word Letters */}
              <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2.5 py-4">
                {currentItem.word.split("").map((char, idx) => {
                  const isSilent = currentItem.silentIndices.includes(idx);
                  const isSelected = selectedLetterIdx === idx;

                  let letterStyle = "bg-slate-50 text-slate-900 border-slate-200 hover:bg-amber-100 hover:border-amber-300";

                  if (isAnswered) {
                    if (isSilent) {
                      letterStyle = "bg-amber-500 text-white border-amber-600 shadow-md scale-110 font-black animate-bounce";
                    } else if (isSelected && !isSilent) {
                      letterStyle = "bg-rose-500 text-white border-rose-600 font-bold";
                    } else {
                      letterStyle = "bg-slate-100 text-slate-400 border-slate-200 opacity-60";
                    }
                  }

                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={isAnswered}
                      onClick={() => handleLetterTap(idx)}
                      className={`h-12 w-10 sm:h-14 sm:w-12 rounded-xl text-xl sm:text-2xl font-mono uppercase font-bold border transition-all cursor-pointer flex items-center justify-center ${letterStyle}`}
                    >
                      {char}
                    </button>
                  );
                })}
              </div>

              {/* Phonetic Reveal */}
              {isAnswered && (
                <div className="text-center">
                  <span className="text-sm font-mono text-slate-500 font-bold">
                    Pronunciation: {currentItem.ipa}
                  </span>
                </div>
              )}

              {/* Explanation & Next */}
              {isAnswered && (
                <div className="pt-4 border-t border-slate-100 space-y-4 animate-fade-in">
                  <div
                    className={`p-4 rounded-2xl border ${
                      isCurrentSelectionCorrect
                        ? "bg-emerald-50/70 border-emerald-200 text-emerald-950"
                        : "bg-rose-50/70 border-rose-200 text-rose-950"
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-sm mb-1">
                      {isCurrentSelectionCorrect ? (
                        <>
                          <CheckCircle2 size={16} className="text-emerald-700" /> Correct!
                        </>
                      ) : (
                        <>
                          <XCircle size={16} className="text-rose-700" /> Sounded Letter
                        </>
                      )}
                    </div>
                    <p className="text-xs leading-relaxed">{currentItem.explanation}</p>
                  </div>

                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => playAudio(currentItem.word)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-800 hover:underline"
                    >
                      <Volume2 size={14} /> Listen to pronunciation
                    </button>

                    <button
                      type="button"
                      onClick={handleNext}
                      className="inline-flex items-center gap-2 rounded-full bg-amber-700 px-6 py-2.5 text-xs font-bold text-white hover:bg-amber-800 transition cursor-pointer"
                    >
                      {currentIndex + 1 < totalQuestions ? "Next Word" : "See Results"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </StudyWorkspace>
  );
}
