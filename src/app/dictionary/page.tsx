"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { StudyWorkspace } from "@/components/study-workspace";
import {
  Search,
  BookOpen,
  Volume2,
  Bookmark,
  BookmarkCheck,
  Gamepad2,
  Sparkles,
  Flame,
  CheckCircle2,
  ArrowRight,
  Filter,
  Zap,
  Ear,
  Target,
  EyeOff,
} from "lucide-react";
import type { UtmeWordEntry, UserSavedWord, DailyFivePack, WordCategory } from "@/lib/dictionary/types";
import { DictionaryService } from "@/lib/dictionary/dictionary-service";
import { UTME_LEXICON } from "@/lib/dictionary/utme-lexicon-data";
import { WordInspectorSheet } from "@/components/dictionary/word-inspector-sheet";
import { ProFeatureGate } from "@/components/dictionary/pro-feature-gate";

export default function DictionaryPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<"all" | WordCategory>("all");
  const [activeWord, setActiveWord] = useState<UtmeWordEntry | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [dailyFive, setDailyFive] = useState<DailyFivePack | null>(null);
  const [savedWords, setSavedWords] = useState<UserSavedWord[]>([]);
  const [activeTab, setActiveTab] = useState<"browse" | "saved" | "games">("browse");

  useEffect(() => {
    setDailyFive(DictionaryService.getDailyFive());
    setSavedWords(DictionaryService.getSavedWords());
  }, []);

  const refreshSavedWords = () => {
    setSavedWords(DictionaryService.getSavedWords());
  };

  const handleOpenWord = (entry: UtmeWordEntry) => {
    setActiveWord(entry);
    setIsSheetOpen(true);
  };

  const filteredWords = UTME_LEXICON.filter((entry) => {
    if (selectedCategory !== "all" && entry.category !== selectedCategory) {
      return false;
    }
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      entry.word.toLowerCase().includes(q) ||
      entry.definition.toLowerCase().includes(q) ||
      entry.synonyms.some((s) => s.toLowerCase().includes(q)) ||
      entry.antonyms.some((a) => a.toLowerCase().includes(q))
    );
  });

  const playWordAudio = (word: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = "en-GB";
    utterance.rate = 0.85;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  return (
    <ProFeatureGate>
      <StudyWorkspace>
        <main className="shell section-space">
        <div className="mx-auto max-w-5xl space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-6">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-[#116149] border border-emerald-200">
                <BookOpen size={13} /> UTME Use of English Lexical Engine
              </span>
              <h1 className="mt-2.5 text-3xl font-extrabold tracking-tight text-slate-900">
                Dictionary, Lexis & Oral Games
              </h1>
              <p className="mt-1 text-sm text-slate-500 max-w-2xl">
                Master high-frequency synonyms, antonyms, irregular verb traps, silent letters, and syllable stress patterns tested in the JAMB UTME.
              </p>
            </div>

            {/* Games Shortcut Button */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("games")}
                className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-bold transition shadow-xs cursor-pointer ${
                  activeTab === "games"
                    ? "bg-[#116149] text-white"
                    : "bg-emerald-50 text-[#116149] border border-emerald-200 hover:bg-emerald-100"
                }`}
              >
                <Gamepad2 size={16} /> Play Word Games
              </button>
            </div>
          </div>

          {/* Daily 5 High-Yield Words Banner */}
          {dailyFive && (
            <section className="rounded-3xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/70 via-white to-slate-50 p-6 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-emerald-100">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#116149] text-white shadow-xs">
                    <Sparkles size={16} />
                  </span>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Daily 5 UTME Trap Words</h2>
                    <p className="text-xs text-slate-500">Curated high-frequency words for {dailyFive.date}</p>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200 self-start sm:self-auto">
                  <Flame size={13} className="text-amber-600 fill-amber-600" /> Daily Lesson
                </span>
              </div>

              {/* 5 Word Cards Grid */}
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-5 gap-3">
                {dailyFive.words.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleOpenWord(item)}
                    className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs hover:border-emerald-500 hover:shadow-sm transition cursor-pointer"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {item.partOfSpeech}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => playWordAudio(item.word, e)}
                          className="p-1 text-slate-400 hover:text-[#116149] transition"
                          title="Listen"
                        >
                          <Volume2 size={13} />
                        </button>
                      </div>
                      <p className="font-bold text-slate-900 group-hover:text-[#116149] transition text-sm capitalize">
                        {item.word}
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs text-slate-500 leading-snug">
                        {item.definition}
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-[#116149] font-semibold">
                      <span>Explore</span>
                      <ArrowRight size={11} className="group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-200">
            <button
              type="button"
              onClick={() => setActiveTab("browse")}
              className={`py-3 px-5 text-sm font-bold border-b-2 transition cursor-pointer ${
                activeTab === "browse"
                  ? "border-[#116149] text-[#116149]"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              Browse Dictionary ({UTME_LEXICON.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("saved");
                refreshSavedWords();
              }}
              className={`py-3 px-5 text-sm font-bold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === "saved"
                  ? "border-[#116149] text-[#116149]"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              My Word Bank ({savedWords.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("games")}
              className={`py-3 px-5 text-sm font-bold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === "games"
                  ? "border-[#116149] text-[#116149]"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Gamepad2 size={16} /> Word Games Hub
            </button>
          </div>

          {/* TAB 1: BROWSE DICTIONARY */}
          {activeTab === "browse" && (
            <div className="space-y-6">
              {/* Search & Category Filter Pills */}
              <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                {/* Search Input */}
                <div className="relative">
                  <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by word, definition, synonym, or antonym (e.g., ephemeral, broadcast, subtle)..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-3 text-sm focus:bg-white focus:border-[#116149] focus:outline-hidden transition"
                  />
                </div>

                {/* Category Pills */}
                <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1">
                    <Filter size={11} /> Filter:
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedCategory("all")}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition cursor-pointer ${
                      selectedCategory === "all"
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    All Words
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedCategory("irregular_verb")}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition cursor-pointer ${
                      selectedCategory === "irregular_verb"
                        ? "bg-[#116149] text-white"
                        : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                    }`}
                  >
                    Irregular Verbs
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedCategory("oral_english")}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition cursor-pointer ${
                      selectedCategory === "oral_english"
                        ? "bg-blue-700 text-white"
                        : "bg-blue-50 text-blue-800 hover:bg-blue-100"
                    }`}
                  >
                    Oral English & Silent Letters
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedCategory("lexis_synonym")}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition cursor-pointer ${
                      selectedCategory === "lexis_synonym"
                        ? "bg-purple-700 text-white"
                        : "bg-purple-50 text-purple-800 hover:bg-purple-100"
                    }`}
                  >
                    Synonyms
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedCategory("lexis_antonym")}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition cursor-pointer ${
                      selectedCategory === "lexis_antonym"
                        ? "bg-rose-700 text-white"
                        : "bg-rose-50 text-rose-800 hover:bg-rose-100"
                    }`}
                  >
                    Antonyms
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedCategory("commonly_confused")}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition cursor-pointer ${
                      selectedCategory === "commonly_confused"
                        ? "bg-amber-700 text-white"
                        : "bg-amber-50 text-amber-800 hover:bg-amber-100"
                    }`}
                  >
                    Commonly Confused
                  </button>
                </div>
              </div>

              {/* Word List Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredWords.map((entry) => {
                  const saved = savedWords.some((w) => w.word.toLowerCase() === entry.word.toLowerCase());
                  return (
                    <article
                      key={entry.id}
                      onClick={() => handleOpenWord(entry)}
                      className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-emerald-500 hover:shadow-md transition cursor-pointer flex flex-col justify-between"
                    >
                      <div>
                        {/* Card Top Line */}
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-lg text-slate-900 group-hover:text-[#116149] transition capitalize">
                              {entry.word}
                            </span>
                            <span className="text-xs font-mono text-slate-400">{entry.phonetics.ipa}</span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => playWordAudio(entry.word, e)}
                              className="p-1 text-slate-400 hover:text-[#116149] transition rounded-full hover:bg-slate-100"
                              title="Listen pronunciation"
                            >
                              <Volume2 size={16} />
                            </button>
                            <span
                              className={`p-1 rounded-full ${
                                saved ? "text-amber-500" : "text-slate-300"
                              }`}
                              title={saved ? "Saved" : "Not saved"}
                            >
                              <Bookmark size={15} className={saved ? "fill-amber-500" : ""} />
                            </span>
                          </div>
                        </div>

                        {/* Definition */}
                        <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">
                          {entry.definition}
                        </p>

                        {/* Synonyms & Antonyms preview */}
                        {entry.synonyms.length > 0 && (
                          <div className="mt-3 flex flex-wrap items-center gap-1">
                            <span className="text-[11px] font-semibold text-slate-400 mr-1">Nearest:</span>
                            {entry.synonyms.slice(0, 3).map((s, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-900"
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Card Bottom Tag */}
                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                        <span className="capitalize font-medium">{entry.partOfSpeech}</span>
                        {entry.examNote && (
                          <span className="text-amber-700 font-semibold text-[11px] flex items-center gap-1">
                            ⚠️ Exam Trap
                          </span>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>

              {filteredWords.length === 0 && (
                <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center">
                  <p className="text-base font-bold text-slate-900">No words found</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Try searching for another word or reset your category filter.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedCategory("all");
                    }}
                    className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#116149] px-5 py-2 text-xs font-semibold text-white"
                  >
                    Clear Filter
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: MY WORD BANK */}
          {activeTab === "saved" && (
            <div className="space-y-6">
              {savedWords.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
                  <Bookmark size={36} className="mx-auto text-slate-300 mb-3" />
                  <p className="text-base font-bold text-slate-900">Your Word Bank is empty</p>
                  <p className="mt-1 text-sm text-slate-500 max-w-md mx-auto">
                    While practicing or browsing the dictionary, tap "Save" on any word to add it here for targeted revision.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab("browse")}
                    className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#116149] px-6 py-2.5 text-xs font-semibold text-white cursor-pointer"
                  >
                    Browse Dictionary
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {savedWords.map((item) => {
                    const fullEntry = DictionaryService.getWord(item.word);
                    return (
                      <div
                        key={item.word}
                        onClick={() => fullEntry && handleOpenWord(fullEntry)}
                        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-emerald-500 transition cursor-pointer flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-bold text-lg text-slate-900 capitalize">
                              {item.word}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const isM = DictionaryService.toggleMastered(item.word);
                                refreshSavedWords();
                              }}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer ${
                                item.mastered
                                  ? "bg-emerald-100 text-emerald-900"
                                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                              }`}
                            >
                              <CheckCircle2 size={13} className={item.mastered ? "text-emerald-700" : ""} />
                              {item.mastered ? "Mastered" : "Mark Mastered"}
                            </button>
                          </div>
                          {fullEntry && (
                            <p className="text-sm text-slate-600 line-clamp-2">
                              {fullEntry.definition}
                            </p>
                          )}
                        </div>

                        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                          <span>Saved {new Date(item.savedAt).toLocaleDateString()}</span>
                          <span className="text-[#116149] font-semibold flex items-center gap-1">
                            Inspect <ArrowRight size={12} />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: WORD GAMES HUB */}
          {activeTab === "games" && (
            <div className="space-y-6">
              <div className="text-center max-w-xl mx-auto mb-6">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200">
                  <Gamepad2 size={13} className="text-amber-700" /> Interactive UTME Arcade
                </span>
                <h2 className="mt-2 text-2xl font-extrabold text-slate-900">
                  Oral English & Vocabulary Drills
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Fast-paced, bite-sized mini games to turn the hardest sections of JAMB Use of English into automatic points.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Game 1: Stress Master */}
                <Link
                  href="/games/stress-master"
                  className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-xs hover:border-[#116149] hover:shadow-lg transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-[#116149] mb-4 group-hover:scale-105 transition-transform">
                      <Target size={24} />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                      Oral English · Stress
                    </span>
                    <h3 className="mt-2 text-xl font-bold text-slate-900 group-hover:text-[#116149] transition">
                      Stress Master
                    </h3>
                    <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
                      Tap the stressed syllable in polysyllabic words (e.g., photoGRAPHic) and solve emphatic sentence contrast questions.
                    </p>
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-[#116149]">
                    <span>Play Syllable & Emphatic Drills</span>
                    <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>

                {/* Game 2: Sound Match & Rhyme Rush */}
                <Link
                  href="/games/sound-match"
                  className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-xs hover:border-blue-600 hover:shadow-lg transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 mb-4 group-hover:scale-105 transition-transform">
                      <Ear size={24} />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-800 bg-blue-50 px-2.5 py-0.5 rounded-full">
                      Phonetics & Rhymes
                    </span>
                    <h3 className="mt-2 text-xl font-bold text-slate-900 group-hover:text-blue-700 transition">
                      Sound Match & Rhyme Rush
                    </h3>
                    <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
                      Identify identical vowel & consonant phonemes (/ʃ/, /θ/, /iː/), decode IPA transcriptions, and catch rhyming pairs like suite & sweet.
                    </p>
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-blue-700">
                    <span>Train Ear for Speech Sounds</span>
                    <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>

                {/* Game 3: Syn/Antonym Blitz */}
                <Link
                  href="/games/synonym-blitz"
                  className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-xs hover:border-purple-600 hover:shadow-lg transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-100 text-purple-700 mb-4 group-hover:scale-105 transition-transform">
                      <Zap size={24} />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider text-purple-800 bg-purple-50 px-2.5 py-0.5 rounded-full">
                      Lexis & Structure
                    </span>
                    <h3 className="mt-2 text-xl font-bold text-slate-900 group-hover:text-purple-700 transition">
                      Syn/Antonym Blitz
                    </h3>
                    <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
                      Rapid-fire 10-second drill: decide nearest in meaning or opposite in meaning in authentic past UTME sentences.
                    </p>
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-purple-700">
                    <span>Speed-Train Word Meanings</span>
                    <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>

                {/* Game 4: Silent Hunter */}
                <Link
                  href="/games/silent-hunter"
                  className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-xs hover:border-amber-600 hover:shadow-lg transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 mb-4 group-hover:scale-105 transition-transform">
                      <EyeOff size={24} />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full">
                      Silent Letters
                    </span>
                    <h3 className="mt-2 text-xl font-bold text-slate-900 group-hover:text-amber-700 transition">
                      Silent Hunter
                    </h3>
                    <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
                      Tap the exact silent letter in tricky exam words like receipt, indict, subtle, mortgage, corps, and plumber.
                    </p>
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-amber-700">
                    <span>Hunt Silent Letters</span>
                    <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Word Inspector Modal Sheet */}
        <WordInspectorSheet
          wordEntry={activeWord}
          isOpen={isSheetOpen}
          onClose={() => setIsSheetOpen(false)}
        />
      </main>
    </StudyWorkspace>
  </ProFeatureGate>
  );
}
