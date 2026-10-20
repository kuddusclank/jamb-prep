"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { UtmeWordEntry } from "@/lib/dictionary/types";
import { DictionaryService } from "@/lib/dictionary/dictionary-service";
import { WordInspectorSheet } from "./word-inspector-sheet";

interface InspectableTextProps {
  content: string;
  className?: string;
  isPremium?: boolean;
}

export function InspectableText({ content, className = "", isPremium = true }: InspectableTextProps) {
  const router = useRouter();
  const [activeWord, setActiveWord] = useState<UtmeWordEntry | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);

  const handleWordClick = async (rawToken: string) => {
    const cleanWord = rawToken.replace(/[^a-zA-Z]/g, "").toLowerCase();
    if (cleanWord.length < 3) return; // Skip tiny stop words

    // If not premium, immediately navigate to pricing page
    if (!isPremium) {
      router.push("/pricing");
      return;
    }

    // Check local bank first
    const local = DictionaryService.getWord(cleanWord);
    if (local) {
      setActiveWord(local);
      setIsSheetOpen(true);
      return;
    }

    // Try online lookup
    setIsLookingUp(true);
    const online = await DictionaryService.lookupWordOnline(cleanWord);
    setIsLookingUp(false);
    if (online) {
      setActiveWord(online);
      setIsSheetOpen(true);
    }
  };

  // Split content while preserving words and whitespace
  const tokens = content.split(/(\s+)/);

  return (
    <>
      <span className={className}>
        {tokens.map((token, index) => {
          const isWord = /[a-zA-Z]{3,}/.test(token);
          if (!isWord) return <span key={index}>{token}</span>;

          const clean = token.replace(/[^a-zA-Z]/g, "").toLowerCase();
          const hasLocalDefinition = Boolean(DictionaryService.getWord(clean));

          return (
            <span
              key={index}
              onClick={() => void handleWordClick(token)}
              className={`cursor-pointer rounded-xs transition-colors hover:bg-emerald-100 hover:text-emerald-950 ${
                hasLocalDefinition
                  ? "underline decoration-emerald-400/60 decoration-dotted underline-offset-3"
                  : ""
              }`}
              title={isPremium ? "Click or tap to inspect definition & phonetics" : "Upgrade to Pro to inspect words and phonetics"}
            >
              {token}
            </span>
          );
        })}
      </span>

      <WordInspectorSheet
        wordEntry={activeWord}
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
      />
    </>
  );
}
