"use client";

import { useState, useTransition } from "react";
import { Search, X, BookOpen, Volume2, ArrowRight } from "lucide-react";
import type { UtmeWordEntry } from "@/lib/dictionary/types";
import { DictionaryService } from "@/lib/dictionary/dictionary-service";
import { WordInspectorSheet } from "./word-inspector-sheet";

interface QuickLookupDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function QuickLookupDialog({ isOpen, onClose }: QuickLookupDialogProps) {
  const [query, setQuery] = useState("");
  const [selectedWord, setSelectedWord] = useState<UtmeWordEntry | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [onlineResult, setOnlineResult] = useState<UtmeWordEntry | null>(null);
  const [searchedOnline, setSearchedOnline] = useState(false);

  if (!isOpen) return null;

  const localMatches: UtmeWordEntry[] = query.trim() ? DictionaryService.searchWords(query.trim()) : [];

  const handleSelectWord = (entry: UtmeWordEntry) => {
    setSelectedWord(entry);
    setIsSheetOpen(true);
  };

  const handleOnlineSearch = () => {
    if (!query.trim()) return;
    startTransition(async () => {
      setSearchedOnline(true);
      const res = await DictionaryService.lookupWordOnline(query.trim());
      setOnlineResult(res);
    });
  };

  return (
    <>
      <div 
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs flex items-start justify-center p-4 pt-16 sm:pt-24 animate-in fade-in duration-150"
        onClick={onClose}
      >
        <div 
          className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 px-6 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-100 text-[#116149]">
                <BookOpen size={18} />
              </span>
              <h2 className="text-base font-bold text-slate-800">Quick UTME Dictionary</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          {/* Search Box */}
          <div className="p-4 px-6 bg-slate-50 border-b border-slate-100">
            <div className="relative">
              <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                autoFocus
                placeholder="Type any word (e.g. subtle, broadcast, ambiguous)..."
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSearchedOnline(false);
                  setOnlineResult(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleOnlineSearch();
                }}
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#116149] focus:border-transparent"
              />
            </div>
          </div>

          {/* Results List */}
          <div className="max-h-72 overflow-y-auto p-4 px-6 divide-y divide-slate-100">
            {localMatches.length > 0 ? (
              localMatches.map((entry) => (
                <button
                  key={entry.word}
                  type="button"
                  onClick={() => handleSelectWord(entry)}
                  className="w-full text-left py-3 px-2 flex items-center justify-between rounded-xl hover:bg-emerald-50/60 transition-colors group"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 group-hover:text-[#116149] capitalize">
                        {entry.word}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        {entry.phonetics.ipa}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100/70 px-1.5 py-0.5 rounded-sm">
                        {entry.partOfSpeech}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-1 mt-0.5">
                      {entry.definition}
                    </p>
                  </div>
                  <ArrowRight size={16} className="text-slate-300 group-hover:text-[#116149] transition-transform group-hover:translate-x-0.5 shrink-0 ml-2" />
                </button>
              ))
            ) : query.trim() ? (
              <div className="py-6 text-center">
                <p className="text-sm text-slate-600">
                  No local UTME lexicon entry for &ldquo;<span className="font-semibold">{query}</span>&rdquo;.
                </p>
                {onlineResult ? (
                  <button
                    type="button"
                    onClick={() => handleSelectWord(onlineResult)}
                    className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 text-[#116149] font-medium text-xs hover:bg-emerald-100 border border-emerald-200"
                  >
                    View standard online definition for &ldquo;{onlineResult.word}&rdquo; <ArrowRight size={14} />
                  </button>
                ) : searchedOnline ? (
                  <p className="mt-2 text-xs text-slate-400">Word not found online either.</p>
                ) : (
                  <button
                    type="button"
                    onClick={handleOnlineSearch}
                    disabled={isPending}
                    className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#116149] text-white font-medium text-xs hover:bg-[#0e523e] transition-colors"
                  >
                    {isPending ? "Searching online..." : "Search comprehensive dictionary"}
                  </button>
                )}
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-slate-400">
                Type above to look up definitions, syllable stress, irregular verb forms, and exam tips.
              </div>
            )}
          </div>
        </div>
      </div>

      <WordInspectorSheet
        wordEntry={selectedWord}
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
      />
    </>
  );
}
