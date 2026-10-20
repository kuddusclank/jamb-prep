"use client";

import { useState } from "react";
import Link from "next/link";
import { StudyWorkspace } from "@/components/study-workspace";
import { ProFeatureGate } from "@/components/dictionary/pro-feature-gate";
import { SOUND_MATCH_ITEMS } from "@/lib/dictionary/game-data";
import {
  Ear,
  ArrowLeft,
  Volume2,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Sparkles,
  Trophy,
  Flame,
} from "lucide-react";
import { recordStreakActivity, type StreakActivationResult } from "@/lib/dictionary/streak-activation";

export default function SoundMatchGamePage() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [streakInfo, setStreakInfo] = useState<StreakActivationResult | null>(null);

  const currentItem = SOUND_MATCH_ITEMS[currentIndex];
  const totalQuestions = SOUND_MATCH_ITEMS.length;

  const playAudio = (text: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-GB";
    utterance.rate = 0.8;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const handleSelect = (idx: number) => {
    if (isAnswered) return;
    setSelectedAnswer(idx);
    setIsAnswered(true);

    const isMatch = currentItem.options[idx].isMatch;
    const nextScore = isMatch ? score + 10 + streak * 2 : score;
    if (isMatch) {
      setScore(nextScore);
      setStreak((st) => st + 1);
    } else {
      setStreak(0);
    }

    // Playing the game activates the daily streak immediately
    recordStreakActivity({
      activityType: "dictionary_game_completed",
      details: { game: "Sound Match", score: nextScore },
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
        details: { game: "Sound Match", score },
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
      title="Sound Match & Oral English"
      description="Master vowel and consonant sounds, IPA transcriptions, and speech audio tested in UTME."
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
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-900 border border-blue-200">
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
            <div className="rounded-3xl border border-blue-200 bg-white p-8 text-center shadow-lg animate-fade-in">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 mb-4">
                <Trophy size={32} />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Sound Match Complete!</h2>
              <p className="mt-1 text-sm text-slate-500">
                You scored <span className="font-bold text-blue-700">{score} points</span> in Speech Sounds!
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
                  className="inline-flex items-center gap-2 rounded-full bg-blue-700 px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-blue-800 transition cursor-pointer"
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
                <span className="font-semibold text-blue-700 capitalize">
                  {currentItem.soundType} Sound
                </span>
              </div>

              {/* Target Sound Display */}
              <div className="text-center space-y-3">
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
                  <Ear size={13} /> Target Sound
                </span>
                <div className="mx-auto flex h-20 w-28 items-center justify-center rounded-2xl bg-blue-50/80 border-2 border-blue-300 text-3xl font-mono font-bold text-blue-900">
                  {currentItem.targetSound}
                </div>
                <p className="text-sm font-bold text-slate-800">{currentItem.prompt}</p>
              </div>

              {/* Word Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {currentItem.options.map((opt, idx) => {
                  const isSelected = selectedAnswer === idx;
                  let cardStyle = "border-slate-200 bg-white hover:border-blue-300 text-slate-800";

                  if (isAnswered) {
                    if (opt.isMatch) {
                      cardStyle = "border-emerald-500 bg-emerald-50 text-emerald-950 font-bold";
                    } else if (isSelected && !opt.isMatch) {
                      cardStyle = "border-rose-400 bg-rose-50 text-rose-950 font-medium";
                    } else {
                      cardStyle = "border-slate-200 bg-slate-50 text-slate-400 opacity-60";
                    }
                  }

                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={isAnswered}
                      onClick={() => handleSelect(idx)}
                      className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${cardStyle}`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-base capitalize">{opt.word}</span>
                        {isAnswered && (
                          <span className="text-xs font-mono text-slate-400">({opt.transcription})</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span
                          onClick={(e) => playAudio(opt.word, e)}
                          className="p-1 text-slate-400 hover:text-blue-700 transition"
                          title="Listen"
                        >
                          <Volume2 size={16} />
                        </span>
                        {isAnswered && opt.isMatch && (
                          <CheckCircle2 size={18} className="text-emerald-700 shrink-0" />
                        )}
                        {isAnswered && isSelected && !opt.isMatch && (
                          <XCircle size={18} className="text-rose-700 shrink-0" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Explanation & Next */}
              {isAnswered && (
                <div className="pt-4 border-t border-slate-100 space-y-4 animate-fade-in">
                  <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 text-xs text-blue-950 leading-relaxed">
                    <p className="font-bold mb-1">Oral English Breakdown:</p>
                    {currentItem.options[selectedAnswer ?? 0]?.explanation ||
                      "Review the phonetic transcription carefully."}
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleNext}
                      className="inline-flex items-center gap-2 rounded-full bg-blue-700 px-6 py-2.5 text-xs font-bold text-white hover:bg-blue-800 transition cursor-pointer"
                    >
                      {currentIndex + 1 < totalQuestions ? "Next Sound" : "See Results"}
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
