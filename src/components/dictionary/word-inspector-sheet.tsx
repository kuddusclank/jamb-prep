"use client";

import { useEffect, useState } from "react";
import { Volume2, Bookmark, BookmarkCheck, X, Sparkles, AlertTriangle, ArrowRight } from "lucide-react";
import type { UtmeWordEntry } from "@/lib/dictionary/types";
import { DictionaryService } from "@/lib/dictionary/dictionary-service";

interface WordInspectorSheetProps {
  wordEntry: UtmeWordEntry | null;
  isOpen: boolean;
  onClose: () => void;
}

export function WordInspectorSheet({ wordEntry, isOpen, onClose }: WordInspectorSheetProps) {
  const [isSaved, setIsSaved] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  useEffect(() => {
    if (wordEntry) {
      setIsSaved(DictionaryService.isWordSaved(wordEntry.word));
    }
  }, [wordEntry]);

  if (!isOpen || !wordEntry) return null;

  const playPronunciation = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    setIsPlayingAudio(true);
    const utterance = new SpeechSynthesisUtterance(wordEntry.word);
    utterance.lang = "en-GB"; // Standard British English as tested in JAMB
    utterance.rate = 0.85; // Slightly slower for clarity
    utterance.onend = () => setIsPlayingAudio(false);
    utterance.onerror = () => setIsPlayingAudio(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const handleToggleSave = () => {
    const newState = DictionaryService.toggleSaveWord(wordEntry);
    setIsSaved(newState);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-xs transition-opacity animate-fade-in">
      {/* Backdrop tap to close */}
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white p-6 shadow-2xl z-10 transition-transform">
        {/* Top Handle / Close Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-[#116149] border border-emerald-200">
              <Sparkles size={12} /> UTME Lexicon
            </span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 capitalize">
              {wordEntry.partOfSpeech}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleSave}
              className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                isSaved
                  ? "bg-amber-100 text-amber-900 border border-amber-300"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
              title={isSaved ? "Saved in your Word Bank" : "Save to Word Bank"}
            >
              {isSaved ? <BookmarkCheck size={14} className="text-amber-700" /> : <Bookmark size={14} />}
              {isSaved ? "Saved" : "Save"}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Word Title & Audio Pronunciation */}
        <div className="mt-4 flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 capitalize">
              {wordEntry.word}
            </h2>
            <div className="mt-1 flex items-center gap-2 text-sm text-slate-500 font-mono">
              <span>{wordEntry.phonetics.ipa}</span>
              {wordEntry.phonetics.syllables && (
                <span className="text-xs font-sans text-slate-400">
                  (
                  {wordEntry.phonetics.syllables.map((syl, i) => (
                    <span
                      key={i}
                      className={
                        i === wordEntry.phonetics.primaryStressIndex
                          ? "font-bold text-[#116149] uppercase underline"
                          : ""
                      }
                    >
                      {syl}
                      {i < wordEntry.phonetics.syllables.length - 1 ? " · " : ""}
                    </span>
                  ))}
                  )
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={playPronunciation}
            disabled={isPlayingAudio}
            className="inline-flex items-center gap-2 rounded-full bg-[#116149] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#0e523e] transition cursor-pointer disabled:opacity-50"
          >
            <Volume2 size={15} className={isPlayingAudio ? "animate-pulse" : ""} />
            Listen
          </button>
        </div>

        {/* Definition */}
        <div className="mt-4 rounded-2xl bg-slate-50 p-4 border border-slate-100">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Definition</p>
          <p className="text-sm text-slate-900 leading-relaxed font-medium">{wordEntry.definition}</p>
          {wordEntry.contextSentence && (
            <div className="mt-2.5 pt-2.5 border-t border-slate-200/60 text-xs italic text-slate-600">
              "{wordEntry.contextSentence}"
            </div>
          )}
        </div>

        {/* Verb Conjugation Matrix (if applicable) */}
        {wordEntry.verbForms && (
          <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4">
            <p className="text-xs font-bold text-emerald-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Sparkles size={13} className="text-[#116149]" /> Verb Conjugation Traps
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
              <div className="p-2 rounded-xl bg-white border border-emerald-200/60 shadow-2xs">
                <p className="text-slate-400 text-[10px] uppercase font-bold">Base</p>
                <p className="font-bold text-slate-900 mt-0.5">{wordEntry.verbForms.base}</p>
              </div>
              <div className="p-2 rounded-xl bg-white border border-emerald-200/60 shadow-2xs">
                <p className="text-slate-400 text-[10px] uppercase font-bold">Past Tense</p>
                <p className="font-bold text-emerald-900 mt-0.5">{wordEntry.verbForms.past}</p>
              </div>
              <div className="p-2 rounded-xl bg-white border border-emerald-200/60 shadow-2xs">
                <p className="text-slate-400 text-[10px] uppercase font-bold">Past Participle</p>
                <p className="font-bold text-emerald-900 mt-0.5">{wordEntry.verbForms.pastParticiple}</p>
              </div>
              <div className="p-2 rounded-xl bg-white border border-emerald-200/60 shadow-2xs">
                <p className="text-slate-400 text-[10px] uppercase font-bold">-ing Form</p>
                <p className="font-bold text-slate-900 mt-0.5">{wordEntry.verbForms.presentParticiple}</p>
              </div>
            </div>
          </div>
        )}

        {/* Exam Trap Warning (if present) */}
        {wordEntry.examNote && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 flex items-start gap-2.5">
            <AlertTriangle size={16} className="text-amber-700 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 leading-relaxed font-medium">
              <span className="font-bold">UTME Exam Trap: </span>
              {wordEntry.examNote}
            </div>
          </div>
        )}

        {/* Synonyms & Antonyms Tag Pills */}
        <div className="mt-4 space-y-3">
          {wordEntry.synonyms.length > 0 && (
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Nearest in Meaning (Synonyms)
              </p>
              <div className="flex flex-wrap gap-1.5">
                {wordEntry.synonyms.map((syn, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-900 border border-emerald-200"
                  >
                    {syn}
                  </span>
                ))}
              </div>
            </div>
          )}

          {wordEntry.antonyms.length > 0 && (
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Opposite in Meaning (Antonyms)
              </p>
              <div className="flex flex-wrap gap-1.5">
                {wordEntry.antonyms.map((ant, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-900 border border-rose-200"
                  >
                    {ant}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Oral English / Rhyme Section */}
        {wordEntry.phonetics.rhymesWith.length > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-100">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Rhymes With (Oral English)
            </p>
            <div className="flex flex-wrap gap-1.5">
              {wordEntry.phonetics.rhymesWith.map((rhyme, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700"
                >
                  {rhyme}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
