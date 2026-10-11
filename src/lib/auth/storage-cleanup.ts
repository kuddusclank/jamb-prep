/**
 * Private Browser State, Cache & Exam Outbox Teardown Coordinator (T04)
 *
 * Ensures that private student state — including exam answer outboxes (`jamb_outbox_*`),
 * CBT snapshots (`jamb_cbt_*`, `jamb_exam_*`), interruption tracking (`mock-interruption:*`),
 * pending provisioning metadata (`jambprep_session_*`), and in-memory API caches —
 * is deterministically cleared on logout AND on account switch (`userA -> userB`).
 */

export interface StorageLike {
  readonly length: number;
  key(index: number): string | null;
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface BrowserStorageEnvironment {
  localStorage?: StorageLike | null;
  sessionStorage?: StorageLike | null;
}

export type PrivateStateClearReason =
  | 'logout'
  | 'account_switch'
  | 'session_expired'
  | 'session_revoked';

export interface ClearPrivateStateResult {
  reason: PrivateStateClearReason;
  previousUserId: string | null;
  nextUserId: string | null;
  removedLocalStorageKeys: string[];
  removedSessionStorageKeys: string[];
  inMemoryClearersRun: number;
}

export const ACTIVE_USER_STORAGE_KEY = 'jambprep_active_user_id';
export const PENDING_BOOTSTRAP_KEY_PREFIX = 'jambprep_session_pending_bootstrap:';

/**
 * Prefixes of private student keys stored in `localStorage` or `sessionStorage`.
 * Notice: Supabase's own `sb-*` auth token keys are managed by `supabase.auth.signOut()`
 * and must not be stripped mid-session during an account-switch check before the new session settles.
 */
export const PRIVATE_STORAGE_KEY_PREFIXES: ReadonlyArray<string> = [
  'jamb_cbt_',
  'jamb_outbox_',
  'jamb_exam_',
  'mock-interruption:',
  'jambprep_cache_',
  'jambprep_session_',
  'jambprep_outbox_',
  'jambprep_profile_',
  'jambprep_exam_',
  'jambprep_practice_',
];

const inMemoryCacheClearers = new Set<() => void>();

/**
 * Registers an in-memory store or cache reset callback to be invoked whenever
 * the user logs out or switches accounts. Returns an unsubscribe function.
 */
export function registerPrivateCacheClearer(clearer: () => void): () => void {
  inMemoryCacheClearers.add(clearer);
  return () => {
    inMemoryCacheClearers.delete(clearer);
  };
}

function resolveDefaultStorageEnv(env?: BrowserStorageEnvironment): {
  localStorage: StorageLike | null;
  sessionStorage: StorageLike | null;
} {
  if (env) {
    return {
      localStorage: env.localStorage ?? null,
      sessionStorage: env.sessionStorage ?? null,
    };
  }
  if (typeof window === 'undefined') {
    return { localStorage: null, sessionStorage: null };
  }
  let local: StorageLike | null = null;
  let session: StorageLike | null = null;
  try {
    local = window.localStorage;
  } catch {
    local = null;
  }
  try {
    session = window.sessionStorage;
  } catch {
    session = null;
  }
  return { localStorage: local, sessionStorage: session };
}

function isPrivateStudentStorageKey(key: string): boolean {
  if (key === ACTIVE_USER_STORAGE_KEY) {
    return true;
  }
  return PRIVATE_STORAGE_KEY_PREFIXES.some((prefix) => key.startsWith(prefix));
}

function removeMatchingKeys(storage: StorageLike | null): string[] {
  if (!storage) {
    return [];
  }
  const keysToRemove: string[] = [];
  try {
    for (let i = 0; i < storage.length; i++) {
      const k = storage.key(i);
      if (k && isPrivateStudentStorageKey(k)) {
        keysToRemove.push(k);
      }
    }
    for (const k of keysToRemove) {
      storage.removeItem(k);
    }
  } catch {
    // Ignore storage access errors (e.g. private browsing restrictions)
  }
  return keysToRemove;
}

/**
 * Counts how many unsynced exam answer items currently exist across `jamb_outbox_*`
 * keys in `localStorage`.
 */
export function getPendingExamOutboxCount(env?: BrowserStorageEnvironment): number {
  const { localStorage } = resolveDefaultStorageEnv(env);
  if (!localStorage) {
    return 0;
  }
  let count = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('jamb_outbox_') || key.startsWith('jambprep_outbox_'))) {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          count += parsed.length;
        }
      }
    }
  } catch {
    return count;
  }
  return count;
}

/**
 * Clears all private student state, exam outboxes, snapshots, and in-memory caches.
 */
export function clearPrivateBrowserState(options?: {
  reason?: PrivateStateClearReason;
  previousUserId?: string | null;
  nextUserId?: string | null;
  storageEnv?: BrowserStorageEnvironment;
}): ClearPrivateStateResult {
  const reason = options?.reason ?? 'logout';
  const { localStorage, sessionStorage } = resolveDefaultStorageEnv(options?.storageEnv);

  let previousUserId = options?.previousUserId ?? null;
  if (!previousUserId && localStorage) {
    try {
      previousUserId = localStorage.getItem(ACTIVE_USER_STORAGE_KEY);
    } catch {
      previousUserId = null;
    }
  }

  const removedLocalStorageKeys = removeMatchingKeys(localStorage);
  const removedSessionStorageKeys = removeMatchingKeys(sessionStorage);

  if (options?.nextUserId && localStorage) {
    try {
      localStorage.setItem(ACTIVE_USER_STORAGE_KEY, options.nextUserId);
    } catch {
      // Ignore quota errors
    }
  }

  let inMemoryClearersRun = 0;
  for (const clearer of inMemoryCacheClearers) {
    try {
      clearer();
      inMemoryClearersRun += 1;
    } catch {
      // Ensure all registered clearers execute even if one throws
    }
  }

  return {
    reason,
    previousUserId,
    nextUserId: options?.nextUserId ?? null,
    removedLocalStorageKeys,
    removedSessionStorageKeys,
    inMemoryClearersRun,
  };
}

/**
 * Synchronizes the active authenticated `userId` with browser storage.
 * - If `nextUserId` is null, clears all private state (`reason: 'logout'`).
 * - If a different user was previously active (`previousUserId !== nextUserId`),
 *   immediately clears all private state/outboxes/caches from the previous user
 *   (`reason: 'account_switch'`) and binds storage to `nextUserId`.
 * - If the same user remains active, preserves their in-progress outbox and caches.
 */
export function syncBrowserUserStorage(
  nextUserId: string | null,
  storageEnv?: BrowserStorageEnvironment
): { switched: boolean; cleared: ClearPrivateStateResult | null } {
  const { localStorage } = resolveDefaultStorageEnv(storageEnv);
  const cleanNextId = nextUserId?.trim() || null;

  let storedUserId: string | null = null;
  if (localStorage) {
    try {
      storedUserId = localStorage.getItem(ACTIVE_USER_STORAGE_KEY)?.trim() || null;
    } catch {
      storedUserId = null;
    }
  }

  if (!cleanNextId) {
    const cleared = clearPrivateBrowserState({
      reason: 'logout',
      previousUserId: storedUserId,
      nextUserId: null,
      storageEnv,
    });
    return { switched: Boolean(storedUserId), cleared };
  }

  if (localStorage && (!storedUserId || storedUserId.toLowerCase() !== cleanNextId.toLowerCase())) {
    const cleared = clearPrivateBrowserState({
      reason: 'account_switch',
      previousUserId: storedUserId,
      nextUserId: cleanNextId,
      storageEnv,
    });
    return { switched: true, cleared };
  }

  if (localStorage && storedUserId !== cleanNextId) {
    try {
      localStorage.setItem(ACTIVE_USER_STORAGE_KEY, cleanNextId);
    } catch {
      // Ignore storage write errors
    }
  }

  return { switched: false, cleared: null };
}
