import { UTME_LEXICON } from './utme-lexicon-data';
import type { UtmeWordEntry, UserSavedWord, DailyFivePack } from './types';
import { FreeDictionaryService } from './free-dictionary-service';

const SAVED_WORDS_KEY = 'jambprep_user_saved_words_v1';

export class DictionaryService {
  /**
   * Search local lexicon by query string (matches word, definition, or synonyms)
   */
  static searchWords(query: string): UtmeWordEntry[] {
    const q = query.trim().toLowerCase();
    if (!q) return UTME_LEXICON.slice(0, 30);

    return UTME_LEXICON.filter((entry) => {
      return (
        entry.word.toLowerCase().includes(q) ||
        entry.definition.toLowerCase().includes(q) ||
        entry.synonyms.some((s) => s.toLowerCase().includes(q)) ||
        entry.antonyms.some((a) => a.toLowerCase().includes(q))
      );
    });
  }

  /**
   * Get exact word by word string
   */
  static getWord(word: string): UtmeWordEntry | undefined {
    const clean = word.trim().toLowerCase().replace(/[^a-z-]/g, '');
    return UTME_LEXICON.find((entry) => entry.word.toLowerCase() === clean);
  }

  /**
   * Look up word with external dictionary fallback if missing from local bank
   */
  static async lookupWordOnline(word: string): Promise<UtmeWordEntry | null> {
    const local = this.getWord(word);
    if (local) return local;

    return FreeDictionaryService.lookup(word);
  }

  /**
   * Deterministic Daily 5 selection for any given calendar date (YYYY-MM-DD)
   */
  static getDailyFive(dateString?: string): DailyFivePack {
    const today = dateString || new Date().toISOString().split('T')[0];
    
    // Hash the date string to produce a deterministic starting index
    let hash = 0;
    for (let i = 0; i < today.length; i++) {
      hash = (hash << 5) - hash + today.charCodeAt(i);
      hash |= 0;
    }
    const startIndex = Math.abs(hash) % UTME_LEXICON.length;

    const selected: UtmeWordEntry[] = [];
    for (let i = 0; i < 5; i++) {
      const idx = (startIndex + i) % UTME_LEXICON.length;
      selected.push(UTME_LEXICON[idx]);
    }

    return {
      date: today,
      words: selected,
    };
  }

  /**
   * Get user's saved words from local storage
   */
  static getSavedWords(): UserSavedWord[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(SAVED_WORDS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  /**
   * Check if a word is saved
   */
  static isWordSaved(word: string): boolean {
    const clean = word.toLowerCase().trim();
    const saved = this.getSavedWords();
    return saved.some((item) => item.word.toLowerCase() === clean);
  }

  /**
   * Toggle save status of a word
   */
  static toggleSaveWord(entry: UtmeWordEntry): boolean {
    if (typeof window === 'undefined') return false;
    try {
      const saved = this.getSavedWords();
      const existingIdx = saved.findIndex((item) => item.word.toLowerCase() === entry.word.toLowerCase());

      if (existingIdx >= 0) {
        // Remove word
        saved.splice(existingIdx, 1);
        localStorage.setItem(SAVED_WORDS_KEY, JSON.stringify(saved));
        return false;
      } else {
        // Add word
        const newRecord: UserSavedWord = {
          wordId: entry.id,
          word: entry.word,
          savedAt: new Date().toISOString(),
          mastered: false,
        };
        saved.unshift(newRecord);
        localStorage.setItem(SAVED_WORDS_KEY, JSON.stringify(saved));
        return true;
      }
    } catch {
      return false;
    }
  }

  /**
   * Toggle mastered status
   */
  static toggleMastered(word: string): boolean {
    if (typeof window === 'undefined') return false;
    try {
      const saved = this.getSavedWords();
      const item = saved.find((w) => w.word.toLowerCase() === word.toLowerCase());
      if (item) {
        item.mastered = !item.mastered;
        localStorage.setItem(SAVED_WORDS_KEY, JSON.stringify(saved));
        return item.mastered;
      }
      return false;
    } catch {
      return false;
    }
  }
}
