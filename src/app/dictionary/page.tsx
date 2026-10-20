"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { StudyWorkspace } from "@/components/study-workspace";
import {
  Search,
  BookOpen,
  Volume2,
  Bookmark,
  BookmarkCheck,
  Gamepad2,
  Flame,
  CheckCircle2,
  ArrowRight,
  Filter,
  Zap,
  Ear,
  Target,
  ArrowLeftRight,
  AlertTriangle,
  Globe,
  Loader2,
  X,
} from "lucide-react";
import type { UtmeWordEntry, UserSavedWord, DailyFivePack, WordCategory } from "@/lib/dictionary/types";
import { DictionaryService } from "@/lib/dictionary/dictionary-service";
import { FreeDictionaryService } from "@/lib/dictionary/free-dictionary-service";
import { UTME_LEXICON } from "@/lib/dictionary/utme-lexicon-data";
import { WordInspectorSheet } from "@/components/dictionary/word-inspector-sheet";
import { ProFeatureGate } from "@/components/dictionary/pro-feature-gate";
import { recordStreakActivity, type StreakActivationResult } from "@/lib/dictionary/streak-activation";

export default function DictionaryPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<"all" | WordCategory>("all");
  const [activeWord, setActiveWord] = useState<UtmeWordEntry | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [dailyFive, setDailyFive] = useState<DailyFivePack | null>(null);
  const [savedWords, setSavedWords] = useState<UserSavedWord[]>([]);
  const [activeTab, setActiveTab] = useState<"browse" | "saved" | "games">("browse");
  const [displayLimit, setDisplayLimit] = useState(40);
  const [streakStatus, setStreakStatus] = useState<StreakActivationResult | null>(null);

  // Free Dictionary API states
  const [onlineResult, setOnlineResult] = useState<UtmeWordEntry | null>(null);
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);
  const [searchedOnlineTerm, setSearchedOnlineTerm] = useState("");

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
    recordStreakActivity({
      activityType: "dictionary_word_learned",
      details: { word: entry.word },
    }).then((res) => {
      if (res) setStreakStatus(res);
    });
  };

  // Filter local UTME lexicon
  const filteredWords = useMemo(() => {
    return UTME_LEXICON.filter((entry) => {
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
  }, [searchQuery, selectedCategory]);

  // Debounced search on Free Dictionary API when user enters a query
  useEffect(() => {
    const q = searchQuery.trim().toLowerCase();
    if (q.length < 2) {
      setOnlineResult(null);
      setIsSearchingOnline(false);
      setSearchedOnlineTerm("");
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingOnline(true);
      setSearchedOnlineTerm(q);
      try {
        const result = await FreeDictionaryService.lookup(q);
        setOnlineResult(result);
      } catch {
        setOnlineResult(null);
      } finally {
        setIsSearchingOnline(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleManualOnlineSearch = async () => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return;
    setIsSearchingOnline(true);
    setSearchedOnlineTerm(q);
    try {
      const result = await FreeDictionaryService.lookup(q);
      setOnlineResult(result);
    } catch {
      setOnlineResult(null);
    } finally {
      setIsSearchingOnline(false);
    }
  };

  const playWordAudio = (word: string, audioUrl?: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.play().catch(() => {
        fallbackSpeech(word);
      });
      return;
    }

    fallbackSpeech(word);
  };

  const fallbackSpeech = (word: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = "en-GB";
    utterance.rate = 0.85;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const handleToggleSaveDirect = (entry: UtmeWordEntry, e: React.MouseEvent) => {
    e.stopPropagation();
    const newState = DictionaryService.toggleSaveWord(entry);
    refreshSavedWords();
    if (newState) {
      recordStreakActivity({
        activityType: "dictionary_word_learned",
        details: { word: entry.word },
      }).then((res) => {
        if (res) setStreakStatus(res);
      });
    }
  };

  const isWordSaved = (word: string) => {
    return savedWords.some((w) => w.word.toLowerCase() === word.toLowerCase().trim());
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
                Master 680+ high-frequency synonyms, antonyms, irregular verb traps, silent letters, and syllable stress patterns tested in the JAMB UTME with live Free Dictionary definitions.
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
                    <BookOpen size={16} />
                  </span>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Daily 5 UTME Trap Words</h2>
                    <p className="text-xs text-slate-500">Curated high-frequency words for {dailyFive.date}</p>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200 self-start sm:self-auto">
                  <Flame size={13} className="text-amber-600 fill-amber-600 animate-pulse" />
                  {streakStatus?.qualifiedToday ? "Daily Streak Active 🔥" : "Daily Streak Practice"}
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
                          onClick={(e) => playWordAudio(item.word, item.audioUrl, e)}
                          className="p-1 text-slate-400 hover:text-[#116149] transition rounded-full hover:bg-slate-100"
                          title="Listen pronunciation"
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

          {/* Navigation Tabs (Responsive Segmented Control on mobile, Tabs on desktop) */}
          <div className="grid grid-cols-3 p-1 rounded-2xl bg-slate-100 border border-slate-200/70 gap-1 sm:flex sm:bg-transparent sm:p-0 sm:border-0 sm:border-b sm:border-slate-200 sm:rounded-none">
            <button
              type="button"
              onClick={() => setActiveTab("browse")}
              className={`py-2.5 px-2 sm:px-5 text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 rounded-xl sm:rounded-none sm:border-b-2 ${
                activeTab === "browse"
                  ? "bg-white text-[#116149] shadow-xs sm:bg-transparent sm:shadow-none sm:border-[#116149]"
                  : "text-slate-600 hover:text-slate-900 sm:border-transparent sm:text-slate-500 sm:hover:text-slate-800"
              }`}
            >
              <BookOpen size={16} className="shrink-0" />
              <span className="truncate">Dictionary</span>
              <span className="hidden sm:inline text-xs opacity-75 font-normal">({UTME_LEXICON.length})</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("saved");
                refreshSavedWords();
              }}
              className={`py-2.5 px-2 sm:px-5 text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 rounded-xl sm:rounded-none sm:border-b-2 ${
                activeTab === "saved"
                  ? "bg-white text-[#116149] shadow-xs sm:bg-transparent sm:shadow-none sm:border-[#116149]"
                  : "text-slate-600 hover:text-slate-900 sm:border-transparent sm:text-slate-500 sm:hover:text-slate-800"
              }`}
            >
              <Bookmark size={16} className="shrink-0" />
              <span className="truncate">Word Bank</span>
              <span className="text-[11px] font-semibold px-1.5 py-0.2 rounded-full bg-slate-200/80 text-slate-700">
                {savedWords.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("games")}
              className={`py-2.5 px-2 sm:px-5 text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 rounded-xl sm:rounded-none sm:border-b-2 ${
                activeTab === "games"
                  ? "bg-white text-[#116149] shadow-xs sm:bg-transparent sm:shadow-none sm:border-[#116149]"
                  : "text-slate-600 hover:text-slate-900 sm:border-transparent sm:text-slate-500 sm:hover:text-slate-800"
              }`}
            >
              <Gamepad2 size={16} className="shrink-0" />
              <span className="truncate">Word Games</span>
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
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleManualOnlineSearch();
                      }
                    }}
                    placeholder="Search words, definitions, or look up online..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-24 py-3 text-sm focus:bg-white focus:border-[#116149] focus:outline-hidden transition"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-14 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer"
                    >
                      <X size={15} />
                    </button>
                  )}
                  {isSearchingOnline ? (
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                      <Loader2 size={18} className="animate-spin text-emerald-600" />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleManualOnlineSearch}
                      title="Search Free English Dictionary"
                      className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition cursor-pointer"
                    >
                      Lookup
                    </button>
                  )}
                </div>

                {/* Category Filter Pills (Horizontal swipe on mobile, wrap on desktop) */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 -mx-1 px-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden border-t border-slate-100">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1 shrink-0">
                    <Filter size={11} /> Filter:
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedCategory("all")}
                    className={`shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer ${
                      selectedCategory === "all"
                        ? "bg-slate-900 text-white shadow-2xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    All Words
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedCategory("irregular_verb")}
                    className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer ${
                      selectedCategory === "irregular_verb"
                        ? "bg-[#116149] text-white shadow-2xs"
                        : "bg-emerald-50 text-emerald-800 border border-emerald-100 hover:bg-emerald-100"
                    }`}
                  >
                    <Zap size={12} /> Irregular Verbs
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedCategory("oral_english")}
                    className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer ${
                      selectedCategory === "oral_english"
                        ? "bg-[#116149] text-white shadow-2xs"
                        : "bg-blue-50 text-blue-800 border border-blue-100 hover:bg-blue-100"
                    }`}
                  >
                    <Ear size={12} /> Oral English & Silent Letters
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedCategory("lexis_synonym")}
                    className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer ${
                      selectedCategory === "lexis_synonym"
                        ? "bg-[#116149] text-white shadow-2xs"
                        : "bg-purple-50 text-purple-800 border border-purple-100 hover:bg-purple-100"
                    }`}
                  >
                    <Target size={12} /> Synonyms
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedCategory("lexis_antonym")}
                    className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer ${
                      selectedCategory === "lexis_antonym"
                        ? "bg-[#116149] text-white shadow-2xs"
                        : "bg-rose-50 text-rose-800 border border-rose-100 hover:bg-rose-100"
                    }`}
                  >
                    <ArrowLeftRight size={12} /> Antonyms
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedCategory("commonly_confused")}
                    className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer ${
                      selectedCategory === "commonly_confused"
                        ? "bg-[#116149] text-white shadow-2xs"
                        : "bg-amber-50 text-amber-800 border border-amber-100 hover:bg-amber-100"
                    }`}
                  >
                    <AlertTriangle size={12} /> Commonly Confused
                  </button>
                </div>
              </div>

              {/* Free Dictionary Live Result Banner (if found for search query) */}
              {onlineResult && (
                <div className="rounded-2xl border-2 border-emerald-300 bg-gradient-to-r from-emerald-50/90 via-white to-sky-50/50 p-5 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-emerald-100">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-600 text-white shadow-2xs">
                        <Globe size={13} /> Free English Dictionary API
                      </span>
                      <span className="text-xs font-semibold text-slate-500 capitalize bg-white px-2.5 py-0.5 rounded-full border border-slate-200">
                        {onlineResult.partOfSpeech}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => handleToggleSaveDirect(onlineResult, e)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer ${
                          isWordSaved(onlineResult.word)
                            ? "bg-amber-100 text-amber-900 border border-amber-300"
                            : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        {isWordSaved(onlineResult.word) ? (
                          <>
                            <BookmarkCheck size={14} className="text-amber-700" /> Saved in Bank
                          </>
                        ) : (
                          <>
                            <Bookmark size={14} /> Save to Word Bank
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenWord(onlineResult)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold bg-[#116149] text-white hover:bg-[#0e523e] transition cursor-pointer"
                      >
                        Inspect Details <ArrowRight size={13} />
                      </button>
                    </div>
                  </div>

                  <div className="mt-3.5 flex flex-wrap items-baseline gap-3">
                    <h3 className="text-2xl font-black text-slate-900 capitalize tracking-tight">
                      {onlineResult.word}
                    </h3>
                    <span className="font-mono text-sm text-slate-500">
                      {onlineResult.phonetics.ipa}
                    </span>
                    <button
                      type="button"
                      onClick={() => playWordAudio(onlineResult.word, onlineResult.audioUrl)}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-900 hover:bg-emerald-200 transition cursor-pointer"
                    >
                      <Volume2 size={13} /> Listen Audio
                    </button>
                  </div>

                  <p className="mt-2 text-sm text-slate-700 font-medium leading-relaxed">
                    {onlineResult.definition}
                  </p>

                  {onlineResult.contextSentence && (
                    <p className="mt-1.5 text-xs italic text-slate-500">
                      "{onlineResult.contextSentence}"
                    </p>
                  )}

                  {onlineResult.synonyms.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-400">Synonyms:</span>
                      {onlineResult.synonyms.map((s, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white border border-slate-200 text-slate-700"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Word List Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredWords.slice(0, displayLimit).map((entry) => {
                  const saved = isWordSaved(entry.word);
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
                              onClick={(e) => playWordAudio(entry.word, entry.audioUrl, e)}
                              className="p-1 text-slate-400 hover:text-[#116149] transition rounded-full hover:bg-slate-100"
                              title="Listen pronunciation"
                            >
                              <Volume2 size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleToggleSaveDirect(entry, e)}
                              className={`p-1 rounded-full transition ${
                                saved ? "text-amber-500" : "text-slate-300 hover:text-slate-600"
                              }`}
                              title={saved ? "Saved in Word Bank" : "Save to Word Bank"}
                            >
                              <Bookmark size={15} className={saved ? "fill-amber-500" : ""} />
                            </button>
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

              {/* Show More Words Button */}
              {filteredWords.length > displayLimit && (
                <div className="text-center pt-4">
                  <button
                    type="button"
                    onClick={() => setDisplayLimit((prev) => prev + 40)}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-6 py-2.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition cursor-pointer"
                  >
                    Load More Words (Showing {displayLimit} of {filteredWords.length})
                  </button>
                </div>
              )}

              {/* Empty state when no local or online matches */}
              {filteredWords.length === 0 && !onlineResult && !isSearchingOnline && (
                <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center">
                  <p className="text-base font-bold text-slate-900">
                    No words found for "{searchQuery}"
                  </p>
                  <p className="mt-1 text-sm text-slate-500 max-w-md mx-auto">
                    Neither the local UTME bank nor the Free Dictionary API returned a match. Check your spelling or try another term.
                  </p>
                  <div className="mt-4 flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery("");
                        setSelectedCategory("all");
                      }}
                      className="inline-flex items-center gap-2 rounded-full bg-[#116149] px-5 py-2 text-xs font-semibold text-white cursor-pointer"
                    >
                      Clear Search
                    </button>
                  </div>
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
                        onClick={async () => {
                          if (fullEntry) {
                            handleOpenWord(fullEntry);
                          } else {
                            const online = await FreeDictionaryService.lookup(item.word);
                            if (online) handleOpenWord(online);
                          }
                        }}
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
                                const mastered = DictionaryService.toggleMastered(item.word);
                                refreshSavedWords();
                                if (mastered) {
                                  recordStreakActivity({
                                    activityType: "dictionary_word_learned",
                                    details: { word: item.word },
                                  }).then((res) => {
                                    if (res) setStreakStatus(res);
                                  });
                                }
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
                          {fullEntry ? (
                            <p className="text-sm text-slate-600 line-clamp-2">
                              {fullEntry.definition}
                            </p>
                          ) : (
                            <p className="text-sm text-slate-400 italic">
                              Saved from Free English Dictionary. Click to inspect definitions.
                            </p>
                          )}
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
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
              <div className="rounded-3xl border border-emerald-200 bg-gradient-to-r from-emerald-800 to-[#116149] p-8 text-white shadow-md">
                <div className="max-w-xl space-y-3">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-emerald-100 backdrop-blur-xs border border-white/20">
                    <Gamepad2 size={14} /> Interactive Oral English & Lexis Drills
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                    Level Up Your UTME English Score
                  </h2>
                  <p className="text-sm text-emerald-100/90 leading-relaxed">
                    Test your mastery of word stress patterns, vowel and consonant phonetics, silent letters, and synonyms with rapid-fire UTME drills.
                  </p>
                </div>
              </div>

              {/* 4 Games Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Game 1: Stress Master */}
                <Link
                  href="/games/stress-master"
                  className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-xs hover:border-emerald-500 hover:shadow-lg transition flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 group-hover:scale-105 transition-transform">
                        <Zap size={24} />
                      </span>
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900">
                        Syllable Stress
                      </span>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 group-hover:text-[#116149] transition">
                        Stress Master
                      </h3>
                      <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                        Identify which syllable carries the primary stress in 2-, 3-, and 4-syllable UTME trap words.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-[#116149]">
                    <span>Play Drill</span>
                    <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>

                {/* Game 2: Sound Match */}
                <Link
                  href="/games/sound-match"
                  className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-xs hover:border-emerald-500 hover:shadow-lg transition flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-200 group-hover:scale-105 transition-transform">
                        <Ear size={24} />
                      </span>
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-900">
                        Vowels & Consonants
                      </span>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 group-hover:text-[#116149] transition">
                        Sound Match
                      </h3>
                      <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                        Match words sharing the exact same vowel or consonant sound (e.g., /iː/, /ʃ/, /θ/, /eɪ/).
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-[#116149]">
                    <span>Play Drill</span>
                    <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>

                {/* Game 3: Synonym Blitz */}
                <Link
                  href="/games/synonym-blitz"
                  className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-xs hover:border-emerald-500 hover:shadow-lg transition flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 border border-purple-200 group-hover:scale-105 transition-transform">
                        <Target size={24} />
                      </span>
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-100 text-purple-900">
                        Speed Lexis
                      </span>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 group-hover:text-[#116149] transition">
                        Synonym Blitz
                      </h3>
                      <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                        Test rapid vocabulary recall against a 60-second timer to boost your comprehension speed.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-[#116149]">
                    <span>Play Drill</span>
                    <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>

                {/* Game 4: Silent Hunter */}
                <Link
                  href="/games/silent-hunter"
                  className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-xs hover:border-emerald-500 hover:shadow-lg transition flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 group-hover:scale-105 transition-transform">
                        <AlertTriangle size={24} />
                      </span>
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-900">
                        Silent Letters
                      </span>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 group-hover:text-[#116149] transition">
                        Silent Letter Hunter
                      </h3>
                      <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                        Spot the unpronounced silent consonants in notorious JAMB words like "debt", "doubt", "receipt", and "corps".
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-[#116149]">
                    <span>Play Drill</span>
                    <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Word Inspector Modal Sheet */}
      <WordInspectorSheet
        wordEntry={activeWord}
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
      />
    </StudyWorkspace>
    </ProFeatureGate>
  );
}
