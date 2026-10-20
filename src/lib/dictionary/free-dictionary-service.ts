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
   * Fetch and parse an English word from the Free Dictionary API,
   * with automatic fallback to Datamuse / Wiktionary if dictionaryapi.dev
   * is slow, down, or returns Cloudflare 530/500 errors.
   */
  static async lookup(rawWord: string): Promise<UtmeWordEntry | null> {
    const word = rawWord.trim().toLowerCase().replace(/[^a-z\s-]/g, '').trim();
    if (!word || word.length < 2) return null;

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

    // 1. Try Primary: Free Dictionary API (api.dictionaryapi.dev)
    try {
      const primaryEntry = await this.fetchWithTimeout(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,
        3500
      );

      if (primaryEntry && Array.isArray(primaryEntry) && primaryEntry.length > 0) {
        const entry = this.mapToUtmeWordEntry(primaryEntry[0], word);
        this.cacheResult(word, entry);
        return entry;
      }
    } catch {
      // Failed or timed out, proceed to fallback
    }

    // 2. Fallback: Datamuse API (high-availability global dictionary API)
    try {
      const datamuseEntry = await this.fetchFromDatamuse(word);
      if (datamuseEntry) {
        this.cacheResult(word, datamuseEntry);
        return datamuseEntry;
      }
    } catch {
      // Proceed to tertiary fallback
    }

    // 3. Fallback: Wiktionary REST API
    try {
      const wiktionaryEntry = await this.fetchFromWiktionary(word);
      if (wiktionaryEntry) {
        this.cacheResult(word, wiktionaryEntry);
        return wiktionaryEntry;
      }
    } catch {
      // Not found
    }

    // Genuinely not found across all available sources
    memoryCache.set(word, null);
    return null;
  }

  /**
   * Helper to fetch with an abort timeout
   */
  private static async fetchWithTimeout(url: string, timeoutMs: number): Promise<any | null> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) return null;
      return await response.json();
    } catch {
      clearTimeout(timeoutId);
      return null;
    }
  }

  /**
   * Fallback using Datamuse definitions and synonyms
   */
  private static async fetchFromDatamuse(word: string): Promise<UtmeWordEntry | null> {
    const data = await this.fetchWithTimeout(
      `https://api.datamuse.com/words?sp=${encodeURIComponent(word)}&md=dpsf&max=1`,
      3500
    );

    if (!Array.isArray(data) || data.length === 0) return null;
    const item = data[0];
    if (item.word.toLowerCase() !== word.toLowerCase() || !Array.isArray(item.defs) || item.defs.length === 0) {
      return null;
    }

    // Parse definitions and parts of speech
    const meaningsList: DictionaryMeaningDetail[] = [];
    const synonymsList: string[] = [];
    let primaryDef = '';
    let primaryPos: PartOfSpeech = 'noun';

    // Group definitions by part of speech
    const posGroups = new Map<string, string[]>();
    for (const rawDef of item.defs) {
      const parts = rawDef.split('\t');
      const posCode = parts[0] || 'n';
      const cleanDef = (parts[1] || '').trim();
      if (!cleanDef) continue;

      if (!primaryDef) {
        primaryDef = cleanDef;
        primaryPos = this.codeToPartOfSpeech(posCode);
      }

      const existing = posGroups.get(posCode) || [];
      if (existing.length < 4) {
        existing.push(cleanDef);
        posGroups.set(posCode, existing);
      }
    }

    // Query synonyms in parallel
    try {
      const synData = await this.fetchWithTimeout(
        `https://api.datamuse.com/words?rel_syn=${encodeURIComponent(word)}&max=6`,
        2000
      );
      if (Array.isArray(synData)) {
        synData.forEach((s) => {
          if (s.word && !synonymsList.includes(s.word)) {
            synonymsList.push(s.word);
          }
        });
      }
    } catch {
      // Synonyms query optional
    }

    posGroups.forEach((defs, posCode) => {
      const posLabel = this.codeToPartOfSpeech(posCode);
      meaningsList.push({
        partOfSpeech: posLabel,
        definitions: defs,
        synonyms: synonymsList.slice(0, 4),
        antonyms: [],
      });
    });

    const syllables = this.estimateSyllables(word);

    return {
      id: `dict-${word}`,
      word: word,
      partOfSpeech: primaryPos,
      definition: primaryDef || `The word "${word}".`,
      contextSentence: `In Use of English examinations, candidates are expected to understand the contextual usage of "${word}".`,
      examNote: `Commonly tested vocabulary term.`,
      synonyms: synonymsList.slice(0, 6),
      antonyms: [],
      phonetics: {
        ipa: `/${word}/`,
        syllables: syllables,
        primaryStressIndex: 0,
        rhymesWith: [],
      },
      source: 'free_dictionary',
      category: 'oral_english',
      jambFrequency: 'medium',
      meaningsList: meaningsList,
    };
  }

  /**
   * Tertiary Fallback: Wiktionary REST API
   */
  private static async fetchFromWiktionary(word: string): Promise<UtmeWordEntry | null> {
    const data = await this.fetchWithTimeout(
      `https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(word)}`,
      3500
    );

    if (!data || !Array.isArray(data.en) || data.en.length === 0) return null;

    let primaryDef = '';
    let primaryPos: PartOfSpeech = 'noun';
    const meaningsList: DictionaryMeaningDetail[] = [];

    for (const section of data.en) {
      const pos = this.normalizePartOfSpeech(section.partOfSpeech || 'noun');
      const defs: string[] = [];

      if (Array.isArray(section.definitions)) {
        for (const d of section.definitions) {
          // Strip HTML tags from Wiktionary HTML definition string
          const plain = (d.definition || '').replace(/<[^>]*>?/gm, '').trim();
          if (plain && !plain.startsWith('Alternative form') && plain.length > 5) {
            defs.push(plain);
            if (!primaryDef) {
              primaryDef = plain;
              primaryPos = pos;
            }
          }
        }
      }

      if (defs.length > 0) {
        meaningsList.push({
          partOfSpeech: pos,
          definitions: defs.slice(0, 3),
          synonyms: [],
          antonyms: [],
        });
      }
    }

    if (!primaryDef) return null;

    return {
      id: `wikt-${word}`,
      word: word,
      partOfSpeech: primaryPos,
      definition: primaryDef,
      contextSentence: `Carefully examine the nuances of "${word}" in sentence construction.`,
      examNote: `Standard English lexicon term.`,
      synonyms: [],
      antonyms: [],
      phonetics: {
        ipa: `/${word}/`,
        syllables: this.estimateSyllables(word),
        primaryStressIndex: 0,
        rhymesWith: [],
      },
      source: 'free_dictionary',
      category: 'oral_english',
      jambFrequency: 'medium',
      meaningsList: meaningsList,
    };
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
      primaryExample = `The student checked their vocabulary notes for the accurate meaning of "${cleanWord}".`;
    }

    const syllables = this.estimateSyllables(cleanWord);

    return {
      id: `free-${cleanWord}`,
      word: cleanWord,
      partOfSpeech: primaryPartOfSpeech,
      definition: primaryDef,
      contextSentence: primaryExample,
      examNote: `Standard English dictionary vocabulary entry.`,
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

  private static cacheResult(word: string, entry: UtmeWordEntry) {
    memoryCache.set(word, entry);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`${CACHE_PREFIX}${word}`, JSON.stringify(entry));
      } catch {
        // Ignore storage quota
      }
    }
  }

  private static normalizePartOfSpeech(pos: string): PartOfSpeech {
    const lower = (pos || '').toLowerCase();
    if (lower.includes('verb')) return 'verb';
    if (lower.includes('adj')) return 'adjective';
    if (lower.includes('adv')) return 'adverb';
    if (lower.includes('prep')) return 'preposition';
    if (lower.includes('conj')) return 'conjunction';
    if (lower.includes('idiom')) return 'idiom';
    return 'noun';
  }

  private static codeToPartOfSpeech(code: string): PartOfSpeech {
    switch (code) {
      case 'v':
        return 'verb';
      case 'adj':
        return 'adjective';
      case 'adv':
        return 'adverb';
      case 'prep':
        return 'preposition';
      case 'conj':
        return 'conjunction';
      default:
        return 'noun';
    }
  }

  private static estimateSyllables(word: string): string[] {
    if (word.length <= 4) return [word];
    const parts = word.match(/[^aeiouy]*[aeiouy]+(?:[^aeiouy]+(?=$|[^aeiouy]))?/gi);
    return parts && parts.length > 0 ? parts : [word];
  }
}
