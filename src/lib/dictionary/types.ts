export type PartOfSpeech =
  | 'noun'
  | 'verb'
  | 'adjective'
  | 'adverb'
  | 'preposition'
  | 'conjunction'
  | 'idiom';

export type WordCategory =
  | 'oral_english'
  | 'lexis_synonym'
  | 'lexis_antonym'
  | 'irregular_verb'
  | 'commonly_confused';

export interface VerbConjugation {
  base: string;           // e.g. "broadcast"
  past: string;           // e.g. "broadcast" (NOT broadcasted)
  pastParticiple: string; // e.g. "broadcast"
  presentParticiple: string; // e.g. "broadcasting"
  thirdPerson: string;    // e.g. "broadcasts"
}

export interface PhoneticDetails {
  ipa: string;            // e.g. "/rɪˈsiːt/"
  syllables: string[];    // e.g. ["re", "ceipt"]
  primaryStressIndex: number; // 0-based index of stressed syllable (e.g. 1 -> re-CEIPT)
  silentLetters?: { letter: string; index: number }[]; // 0-based index in the word string
  rhymesWith: string[];   // Words sharing the exact vowel + coda sound (e.g. ["deceit", "conceit"])
  soundFeatures?: {
    symbol: string;       // e.g. "/iː/", "/ʃ/", "/θ/", "/ð/"
    category: 'vowel' | 'consonant';
    description: string;  // e.g. "Long close front unrounded vowel"
  }[];
}

export interface UtmeWordEntry {
  id: string;
  word: string;
  partOfSpeech: PartOfSpeech;
  definition: string;
  contextSentence: string;
  examNote?: string;
  verbForms?: VerbConjugation;
  synonyms: string[];
  antonyms: string[];
  phonetics: PhoneticDetails;
  category: WordCategory;
  jambFrequency: 'medium' | 'high' | 'very_high';
}

export interface UserSavedWord {
  wordId: string;
  word: string;
  savedAt: string;
  mastered: boolean;
  notes?: string;
}

export interface DailyFivePack {
  date: string; // YYYY-MM-DD
  words: UtmeWordEntry[];
}

// Game Types
export interface StressGameItem {
  id: string;
  word: string;
  syllables: string[];
  stressedIndex: number;
  partOfSpeech: string;
  sentenceExample: string;
  explanation: string;
}

export interface EmphaticGameItem {
  id: string;
  sentence: string;
  stressedWord: string;
  options: { text: string; isCorrect: boolean }[];
  explanation: string;
}

export interface SoundMatchGameItem {
  id: string;
  targetSound: string;      // e.g. "/ʃ/" as in 'shoe'
  soundType: 'vowel' | 'consonant';
  prompt: string;           // e.g. "Which word contains the sound /ʃ/?"
  options: { word: string; isMatch: boolean; transcription: string; explanation: string }[];
}

export interface SilentLetterGameItem {
  id: string;
  word: string;
  silentIndices: number[];  // Character index in the word that is silent
  ipa: string;
  explanation: string;
}

export interface SynAntonymGameItem {
  id: string;
  sentence: string;
  targetWord: string;
  mode: 'synonym' | 'antonym';
  options: string[];
  correctOption: string;
  distractorExplanations: Record<string, string>;
  explanation: string;
}
