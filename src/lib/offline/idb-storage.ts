/**
 * Typed IndexedDB offline storage engine for JAMBPrep (F3 & F5).
 *
 * Stores:
 * - `student_profile`: offline read-only snapshot of user subjects and targets.
 * - `weekly_packs`: issued 250-question packs with questions and feedback keys.
 * - `pack_answers`: locally recorded answers with sync status.
 * - `sync_outbox`: queue of unsynced answers to replay upon reconnection.
 */

const DB_NAME = 'jambprep_offline_v1';
const DB_VERSION = 2;

export interface StoredWeeklyPack {
  packId: string;
  weekKey: string;
  status: string;
  expiresAt: string;
  subjects: Array<{ id: string; code: string; name: string; isCompulsory: boolean; questionCount: number }>;
  questions: Array<Record<string, unknown>>;
  feedback: Record<string, { correctOption: string; explanation: string }>;
  answers: Record<string, { selectedOption: string; answeredAt: string }>;
  progress: {
    total: number;
    answered: number;
    bySubject: Record<string, { total: number; answered: number }>;
  };
  downloadedAt: string;
  userId: string;
}

export interface StoredAnswer {
  packId: string;
  questionId: string;
  selectedOption: 'A' | 'B' | 'C' | 'D';
  answeredAt: string;
  timeSpentSeconds?: number;
  synced: boolean;
  userId: string;
}

export interface OutboxItem {
  id?: number;
  packId: string;
  questionId: string;
  selectedOption: 'A' | 'B' | 'C' | 'D';
  answeredAt: string;
  queuedAt: string;
  userId: string;
  revision: number;
  retryCount: number;
  idempotencyKey?: string;
  lastError?: string;
}

export interface StoredProfileSnapshot {
  userId: string;
  displayName: string | null;
  email: string | null;
  targetScore: number;
  subjects: Array<{ id: string; code: string; name: string; isCompulsory: boolean }>;
  lastSyncedAt: string;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB is not supported on this platform.'));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // 1. Student profile snapshot store
      if (!db.objectStoreNames.contains('student_profile')) {
        db.createObjectStore('student_profile', { keyPath: 'userId' });
      }

      // 2. Weekly packs store (keyed by composite weekKey or packId)
      if (!db.objectStoreNames.contains('weekly_packs')) {
        const packStore = db.createObjectStore('weekly_packs', { keyPath: 'packId' });
        packStore.createIndex('by_user_week', ['userId', 'weekKey'], { unique: true });
      }

      // 3. Local answers store (keyed by [packId, questionId])
      if (!db.objectStoreNames.contains('pack_answers')) {
        const answersStore = db.createObjectStore('pack_answers', { keyPath: ['packId', 'questionId'] });
        answersStore.createIndex('by_user_pack', ['userId', 'packId'], { unique: false });
        answersStore.createIndex('by_synced', ['userId', 'synced'], { unique: false });
      }

      // 4. Outbox sync queue (auto-incrementing)
      if (!db.objectStoreNames.contains('sync_outbox')) {
        const outboxStore = db.createObjectStore('sync_outbox', { keyPath: 'id', autoIncrement: true });
        outboxStore.createIndex('by_user', 'userId', { unique: false });
        outboxStore.createIndex('by_user_pack_q', ['userId', 'packId', 'questionId'], { unique: false });
      } else {
        const tx = (event.target as IDBOpenDBRequest).transaction;
        if (tx && tx.objectStoreNames.contains('sync_outbox')) {
          const outboxStore = tx.objectStore('sync_outbox');
          if (!outboxStore.indexNames.contains('by_user_pack_q')) {
            outboxStore.createIndex('by_user_pack_q', ['userId', 'packId', 'questionId'], { unique: false });
          }
        }
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to open offline database.'));
  });
}

/**
 * Saves or updates an issued weekly practice pack for offline use.
 */
export async function saveWeeklyPackToIdb(pack: StoredWeeklyPack): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('weekly_packs', 'readwrite');
    const store = tx.objectStore('weekly_packs');
    const req = store.put(pack);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Loads the active weekly practice pack for a student by weekKey.
 */
export async function getWeeklyPackFromIdb(userId: string, weekKey: string): Promise<StoredWeeklyPack | null> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('weekly_packs', 'readonly');
    const store = tx.objectStore('weekly_packs');
    const index = store.index('by_user_week');
    const req = index.get([userId, weekKey]);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Loads a weekly practice pack directly by its packId primary key.
 */
export async function getWeeklyPackByIdFromIdb(packId: string): Promise<StoredWeeklyPack | null> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('weekly_packs', 'readonly');
    const store = tx.objectStore('weekly_packs');
    const req = store.get(packId);
    req.onsuccess = () => resolve((req.result as StoredWeeklyPack) || null);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Records a student answer locally in IndexedDB and enqueues an outbox sync event.
 */
export async function recordLocalAnswer(answer: StoredAnswer): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['pack_answers', 'sync_outbox', 'weekly_packs'], 'readwrite');

    // 1. Put in pack_answers
    const answersStore = tx.objectStore('pack_answers');
    answersStore.put(answer);

    // 2. Put in sync_outbox with coalescing & monotonic revision
    const outboxStore = tx.objectStore('sync_outbox');
    const hasIndex = outboxStore.indexNames.contains('by_user_pack_q');
    if (hasIndex) {
      const existingReq = outboxStore.index('by_user_pack_q').get([answer.userId, answer.packId, answer.questionId]);
      existingReq.onsuccess = () => {
        const existing = existingReq.result as OutboxItem | undefined;
        const revision = (existing?.revision || 0) + 1;
        const outboxItem: OutboxItem = {
          ...(existing?.id !== undefined ? { id: existing.id } : {}),
          packId: answer.packId,
          questionId: answer.questionId,
          selectedOption: answer.selectedOption,
          answeredAt: answer.answeredAt,
          queuedAt: existing?.queuedAt || new Date().toISOString(),
          userId: answer.userId,
          revision,
          retryCount: 0,
          idempotencyKey: `${answer.userId}_${answer.packId}_${answer.questionId}_${revision}`,
        };
        if (existing?.id !== undefined) {
          outboxStore.put(outboxItem);
        } else {
          outboxStore.add(outboxItem);
        }
      };
    } else {
      const outboxItem: OutboxItem = {
        packId: answer.packId,
        questionId: answer.questionId,
        selectedOption: answer.selectedOption,
        answeredAt: answer.answeredAt,
        queuedAt: new Date().toISOString(),
        userId: answer.userId,
        revision: 1,
        retryCount: 0,
        idempotencyKey: `${answer.userId}_${answer.packId}_${answer.questionId}_1`,
      };
      outboxStore.add(outboxItem);
    }

    // 3. Update answers map inside the weekly_pack object for fast rendering
    const packStore = tx.objectStore('weekly_packs');
    const packReq = packStore.get(answer.packId);
    packReq.onsuccess = () => {
      const pack = packReq.result as StoredWeeklyPack | undefined;
      if (pack) {
        if (!pack.answers) pack.answers = {};
        pack.answers[answer.questionId] = {
          selectedOption: answer.selectedOption,
          answeredAt: answer.answeredAt,
        };

        // Recalculate progress
        if (!pack.progress) {
          pack.progress = { total: pack.questions?.length || 250, answered: 0, bySubject: {} };
        }
        if (!pack.progress.bySubject) {
          pack.progress.bySubject = {};
        }
        const answeredCount = Object.keys(pack.answers).length;
        pack.progress.answered = answeredCount;

        // Update subject breakdown
        const q = pack.questions.find((item: Record<string, unknown>) => item.id === answer.questionId) as { subjectCode?: string } | undefined;
        if (q?.subjectCode && pack.progress.bySubject[q.subjectCode]) {
          pack.progress.bySubject[q.subjectCode].answered = Object.keys(pack.answers).filter(qId => {
            const found = pack.questions.find((it: Record<string, unknown>) => it.id === qId) as { subjectCode?: string } | undefined;
            return found?.subjectCode === q.subjectCode;
          }).length;
        }

        packStore.put(pack);
      }
    };

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Returns all queued outbox items for a student.
 */
export async function getOutboxItems(userId: string): Promise<OutboxItem[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('sync_outbox', 'readonly');
    const store = tx.objectStore('sync_outbox');
    const index = store.index('by_user');
    const req = index.getAll(userId);
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Removes successfully synced items from outbox.
 */
export async function clearSyncedOutboxItems(itemIds: number[]): Promise<void> {
  if (!itemIds.length) return;
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('sync_outbox', 'readwrite');
    const store = tx.objectStore('sync_outbox');
    for (const id of itemIds) {
      store.delete(id);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Returns count of pending outbox items for a user.
 */
export async function getOutboxCount(userId: string): Promise<number> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('sync_outbox', 'readonly');
    const store = tx.objectStore('sync_outbox');
    const index = store.index('by_user');
    const req = index.count(userId);
    req.onsuccess = () => resolve(req.result || 0);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Updates retry count and last error for an outbox item.
 */
export async function updateOutboxItemRetry(id: number, error: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('sync_outbox', 'readwrite');
    const store = tx.objectStore('sync_outbox');
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const item = getReq.result as OutboxItem | undefined;
      if (item) {
        item.retryCount = (item.retryCount || 0) + 1;
        item.lastError = error;
        store.put(item);
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Saves profile snapshot for offline dashboard usage.
 */
export async function saveProfileSnapshot(profile: StoredProfileSnapshot): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('student_profile', 'readwrite');
    tx.objectStore('student_profile').put(profile);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Retrieves the saved profile snapshot.
 */
export async function getProfileSnapshot(userId: string): Promise<StoredProfileSnapshot | null> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('student_profile', 'readonly');
    const req = tx.objectStore('student_profile').get(userId);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Purges all private offline data when a student signs out or switches accounts.
 */
export async function purgeAllActorOfflineData(): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const stores = ['student_profile', 'weekly_packs', 'pack_answers', 'sync_outbox'];
    const tx = db.transaction(stores, 'readwrite');
    for (const s of stores) {
      tx.objectStore(s).clear();
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
