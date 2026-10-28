import {
  saveWeeklyPackToIdb,
  getWeeklyPackFromIdb,
  getWeeklyPackByIdFromIdb,
  recordLocalAnswer,
  type StoredWeeklyPack,
  type StoredAnswer,
} from './idb-storage';
import {
  fetchWeeklyPackFromServer,
  type WeeklyPackResponse,
} from '@/lib/client-actions';
import { syncManager } from './sync-manager';

/**
 * Calculates current ISO week key in Africa/Lagos (WAT, UTC+1).
 */
export function getCurrentWeekKey(now = new Date()): string {
  const watMs = now.getTime() + 3600000;
  const watDate = new Date(watMs);
  const dayOfWeek = watDate.getUTCDay();
  const daysSinceMonday = (dayOfWeek + 6) % 7;
  const monday = new Date(watMs - daysSinceMonday * 86400000);
  const year = monday.getUTCFullYear();
  const firstThursday = new Date(Date.UTC(year, 0, 4));
  const firstThursdayDay = (firstThursday.getUTCDay() + 6) % 7;
  const firstMonday = new Date(Date.UTC(year, 0, 4 - firstThursdayDay));
  const weekNum = Math.floor((monday.getTime() - firstMonday.getTime()) / (7 * 86400000)) + 1;
  return `${year}-W${String(weekNum).padStart(2, '0')}`;
}

/**
 * Ensures the student has this week's pack cached in IndexedDB.
 * If not cached or if forceRefresh is true, fetches from server and caches.
 */
export async function ensureWeeklyPackDownloaded(
  userId: string,
  forceRefresh = false
): Promise<StoredWeeklyPack> {
  const weekKey = getCurrentWeekKey();

  if (!forceRefresh) {
    const cached = await getWeeklyPackFromIdb(userId, weekKey);
    if (cached) {
      return cached;
    }
  }

  // Fetch from server
  const serverPack: WeeklyPackResponse = await fetchWeeklyPackFromServer();

  const stored: StoredWeeklyPack = {
    packId: serverPack.packId,
    weekKey: serverPack.weekKey,
    status: serverPack.status,
    expiresAt: serverPack.expiresAt,
    subjects: serverPack.subjects,
    questions: serverPack.questions,
    feedback: serverPack.feedback,
    answers: serverPack.answers || {},
    progress: serverPack.progress || {
      total: serverPack.questions.length,
      answered: Object.keys(serverPack.answers || {}).length,
      bySubject: {},
    },
    downloadedAt: new Date().toISOString(),
    userId,
  };

  await saveWeeklyPackToIdb(stored);
  return stored;
}

/**
 * Records a student answer locally, providing instant UI feedback,
 * and asynchronously flushes to the server if online.
 */
export async function submitPackAnswer(params: {
  userId: string;
  packId: string;
  questionId: string;
  selectedOption: 'A' | 'B' | 'C' | 'D';
}): Promise<{ isCorrect: boolean; correctOption: string; explanation: string }> {
  const weekKey = getCurrentWeekKey();
  let pack = await getWeeklyPackFromIdb(params.userId, weekKey);
  if (!pack) {
    try {
      pack = await getWeeklyPackByIdFromIdb(params.packId);
    } catch {
      // ignore
    }
  }
  const feedback = pack?.feedback?.[params.questionId] || {
    correctOption: 'A',
    explanation: 'No explanation provided.',
  };
  const isCorrect = feedback.correctOption === params.selectedOption;

  const answerRecord: StoredAnswer = {
    packId: params.packId,
    questionId: params.questionId,
    selectedOption: params.selectedOption,
    answeredAt: new Date().toISOString(),
    synced: false,
    userId: params.userId,
  };

  // 1. Durably record in IndexedDB
  await recordLocalAnswer(answerRecord);

  // 2. Refresh pending count and trigger background sync if online
  void syncManager.refreshPendingCount();
  if (typeof navigator !== 'undefined' && navigator.onLine) {
    void syncManager.triggerSync('answer_submitted');
  }

  return {
    isCorrect,
    correctOption: feedback.correctOption,
    explanation: feedback.explanation,
  };
}

/**
 * Flushes all pending outbox answers to the server via the unified SyncManager.
 */
export async function flushPendingSync(_userId?: string): Promise<number> {
  return syncManager.triggerSync('manual');
}
