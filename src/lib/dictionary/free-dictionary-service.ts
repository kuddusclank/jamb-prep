import type { UtmeWordEntry, PartOfSpeech, DictionaryMeaningDetail } from './types';

export interface FreeDictionaryRawEntry {
  word: string;
  phonetic?: string;
  phonetics?: Array<{
    text?: string;
    audio?: string;
    sourceUrl?: string;
  }>;
  origin?: string;
  meanings?: Array<{
    partOfSpeech: string;
    definitions?: Array<{
      definition: string;
      example?: string;
      synonyms?: string[];
      antonyms?: string[];
    }>;
    synonyms?: string[];
    antonyms?: string[];
  }>;
  license?: { name: string; url: string };
  sourceUrls?: string[];
}

const CACHE_PREFIX = 'free_dict_cache_';
const memoryCache = new Map<string, UtmeWordEntry | null>();

export class FreeDictionaryService {
  /**
   * Fetch and parse an English word from the Free Dictionary API
   */
  static async lookup(rawWord: string): Promise<UtmeWordEntry | null> {
    const word = rawWord.trim().toLowerCase().replace(/[^a-z-]/g, '');
    if (!word) return null;

    // Check memory cache
    if (memoryCache.has(word)) {
      return memoryCache.get(word) || null;
    }

    // Check localStorage cache if in browser
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(`${CACHE_PREFIX}${word}`);
        if (stored) {
          const parsed = JSON.parse(stored) as UtmeWordEntry;
          memoryCache.set(word, parsed);
          return parsed;
        }
      } catch {
        // Ignore storage errors
      }
    }

    try {
      const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`;
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        // Not found or rate-limited
        memoryCache.set(word, null);
        return null;
      }

      const data = (await response.json()) as FreeDictionaryRawEntry[];
      if (!Array.isArray(data) || data.length === 0) {
        memoryCache.set(word, null);
        return null;
      }

      const primary = data[0];
      const entry = this.mapToUtmeWordEntry(primary, word);

      // Cache result
      memoryCache.set(word, entry);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(`${CACHE_PREFIX}${word}`, JSON.stringify(entry));
        } catch {
          // Ignore storage quota limits
        }
      }

      return entry;
    } catch {
      return null;
    }
  }

  /**
   * Transform Free Dictionary JSON entry into our standardized UtmeWordEntry
   */
  private static mapToUtmeWordEntry(raw: FreeDictionaryRawEntry, cleanWord: string): UtmeWordEntry {
    // 1. Resolve Best Audio URL
    let audioUrl: string | undefined;
    if (Array.isArray(raw.phonetics)) {
      for (const p of raw.phonetics) {
        if (p.audio && p.audio.trim()) {
          let a = p.audio.trim();
          if (a.startsWith('//')) {
            a = `https:${a}`;
          }
          audioUrl = a;
          break;
        }
      }
    }

    // 2. Resolve IPA Text
    let ipaText = raw.phonetic || '';
    if (!ipaText && Array.isArray(raw.phonetics)) {
      for (const p of raw.phonetics) {
        if (p.text && p.text.trim()) {
          ipaText = p.text.trim();
          break;
        }
      }
    }
    if (!ipaText) {
      ipaText = `/${cleanWord}/`;
    }

    // 3. Extract Meanings, Synonyms, Antonyms
    const allSynonyms = new Set<string>();
    const allAntonyms = new Set<string>();
    const meaningsList: DictionaryMeaningDetail[] = [];

    let primaryDef = '';
    let primaryExample = '';
    let primaryPartOfSpeech: PartOfSpeech = 'noun';

    if (Array.isArray(raw.meanings)) {
      for (let i = 0; i < raw.meanings.length; i++) {
        const m = raw.meanings[i];
        const pos = this.normalizePartOfSpeech(m.partOfSpeech);
        if (i === 0) {
          primaryPartOfSpeech = pos;
        }

        if (Array.isArray(m.synonyms)) {
          m.synonyms.forEach((s) => allSynonyms.add(s.toLowerCase()));
        }
        if (Array.isArray(m.antonyms)) {
          m.antonyms.forEach((a) => allAntonyms.add(a.toLowerCase()));
        }

        const defStrings: string[] = [];
        let firstEx = '';

        if (Array.isArray(m.definitions)) {
          for (let j = 0; j < m.definitions.length; j++) {
            const d = m.definitions[j];
            if (d.definition) {
              defStrings.push(d.definition);
              if (!primaryDef) {
                primaryDef = d.definition;
              }
            }
            if (d.example) {
              if (!firstEx) firstEx = d.example;
              if (!primaryExample) primaryExample = d.example;
            }
            if (Array.isArray(d.synonyms)) {
              d.synonyms.forEach((s) => allSynonyms.add(s.toLowerCase()));
            }
            if (Array.isArray(d.antonyms)) {
              d.antonyms.forEach((a) => allAntonyms.add(a.toLowerCase()));
            }
          }
        }

        if (defStrings.length > 0) {
          meaningsList.push({
            partOfSpeech: m.partOfSpeech,
            definitions: defStrings.slice(0, 4),
            example: firstEx,
            synonyms: (m.synonyms || []).slice(0, 6),
            antonyms: (m.antonyms || []).slice(0, 6),
          });
        }
      }
    }

    if (!primaryDef) {
      primaryDef = `The English word "${cleanWord}".`;
    }
    if (!primaryExample) {
      primaryExample = `The lecturer asked students to consult their dictionary for the meaning of "${cleanWord}".`;
    }

    // 4. Basic syllable estimation
    const syllables = this.estimateSyllables(cleanWord);

    return {
      id: `free-${cleanWord}`,
      word: cleanWord,
      partOfSpeech: primaryPartOfSpeech,
      definition: primaryDef,
      contextSentence: primaryExample,
      examNote: 'Definition fetched directly from Free English Dictionary API.',
      synonyms: Array.from(allSynonyms).slice(0, 6),
      antonyms: Array.from(allAntonyms).slice(0, 6),
      phonetics: {
        ipa: ipaText,
        syllables: syllables,
        primaryStressIndex: 0,
        rhymesWith: [],
        audio: audioUrl,
      },
      audioUrl: audioUrl,
      source: 'free_dictionary',
      category: 'oral_english',
      jambFrequency: 'medium',
      meaningsList: meaningsList,
    };
  }

  private static normalizePartOfSpeech(pos: string): PartOfSpeech {
    const lower = pos.toLowerCase();
    if (lower.includes('verb')) return 'verb';
    if (lower.includes('adj')) return 'adjective';
    if (lower.includes('adv')) return 'adverb';
    if (lower.includes('prep')) return 'preposition';
    if (lower.includes('conj')) return 'conjunction';
    if (lower.includes('idiom')) return 'idiom';
    return 'noun';
  }

  private static estimateSyllables(word: string): string[] {
    if (word.length <= 4) return [word];
    // Simple vowel cluster hyphenation for visual hint
    const parts = word.match(/[^aeiouy]*[aeiouy]+(?:[^aeiouy]+(?=$|[^aeiouy]))?/gi);
    return parts && parts.length > 0 ? parts : [word];
  }
}
