import type {
  StressGameItem,
  EmphaticGameItem,
  SoundMatchGameItem,
  SilentLetterGameItem,
  SynAntonymGameItem,
} from './types';

export { STRESS_GAME_ITEMS, EMPHATIC_STRESS_ITEMS } from './game-stress-data';
export { SILENT_LETTER_ITEMS } from './game-silent-data';
export { SOUND_MATCH_ITEMS } from './game-sound-data';
export { SYN_ANTONYM_ITEMS } from './game-synonym-data';

/**
 * Fisher-Yates array shuffler to ensure truly uniform random order
 */
export function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Sample N random items from a collection, shuffled every time
 */
export function getRandomGameItems<T>(items: T[], count: number = 10): T[] {
  if (!items || items.length === 0) return [];
  const shuffled = shuffleArray(items);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}
