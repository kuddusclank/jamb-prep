/**
 * Offline User Profile & Entitlement Cache
 *
 * Persists student profile snapshot, enrolled subjects, and subscription expiry
 * to local storage so that paid Pro students can seamlessly boot the study workspace
 * and practice the weekly 250-question pack when completely offline.
 *
 * Strictly enforces that offline access & weekly packs are exclusive to active,
 * unexpired paid subscriptions.
 */

import type { ProfileData } from "@/lib/api/app-dtos";
import type { SessionIdentityResponse } from "@/lib/api/native-client";

export interface OfflineUserProfile {
  userId: string;
  displayName: string;
  email: string;
  role: 'student' | 'admin';
  targetScore: number;
  enrolledSubjects: Array<{
    id: string;
    code: string;
    name: string;
    isCompulsory: boolean;
  }>;
  subscription: {
    isPremium: boolean;
    expiresAt: string | null; // ISO-8601 string
    planCode: string | null;
    autoRenew: boolean;
  };
  streak: {
    currentStreak: number;
    longestStreak: number;
    lastActiveDate?: string | null;
  };
  cachedAt: number; // Date.now() timestamp
  schemaVersion: 1;
}

const STORAGE_PREFIX = 'jambprep_profile_offline:';
const LAST_ACTIVE_KEY = 'jambprep_last_active_user';

function getStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Persists or updates the offline snapshot of the student's profile & subscription.
 */
export function saveOfflineProfile(data: {
  userId?: string;
  profile?: ProfileData | null;
  identity?: SessionIdentityResponse | null;
  enrolledSubjects?: Array<{
    id: string;
    code: string;
    name: string;
    isCompulsory: boolean;
  }>;
}): void {
  const storage = getStorage();
  if (!storage) return;

  const userId = data.userId || data.profile?.profile?.id || data.identity?.user?.id;
  if (!userId) return;

  const existing = getOfflineProfile(userId);

  const displayName =
    data.profile?.profile?.display_name ||
    data.identity?.user?.displayName ||
    existing?.displayName ||
    'Student';

  const email =
    data.profile?.profile?.email ||
    data.identity?.user?.email ||
    existing?.email ||
    '';

  const role: 'student' | 'admin' =
    (data.profile?.profile?.role === 'admin' || data.identity?.user?.role === 'admin')
      ? 'admin'
      : (existing?.role ?? 'student');

  const targetScore =
    data.profile?.preferences?.target_score ??
    existing?.targetScore ??
    250;

  const enrolledSubjects =
    data.enrolledSubjects?.length
      ? data.enrolledSubjects
      : existing?.enrolledSubjects ?? [];

  const isPremium =
    data.profile?.subscription?.isPremium ??
    existing?.subscription?.isPremium ??
    false;

  const rawExpiresAt =
    data.profile?.subscription?.expiresAt ??
    existing?.subscription?.expiresAt ??
    null;

  const expiresAt = typeof rawExpiresAt === 'string'
    ? rawExpiresAt
    : null;

  const planCode =
    data.profile?.subscription?.planCode ??
    existing?.subscription?.planCode ??
    null;

  const autoRenew =
    data.profile?.subscription?.autoRenew ??
    existing?.subscription?.autoRenew ??
    true;

  const streak = {
    currentStreak: data.profile?.studyStreak?.streak?.currentStreak ?? existing?.streak?.currentStreak ?? 0,
    longestStreak: data.profile?.studyStreak?.streak?.bestStreak ?? existing?.streak?.longestStreak ?? 0,
    lastActiveDate: data.profile?.studyStreak?.streak?.lastQualifiedDate ?? existing?.streak?.lastActiveDate ?? null,
  };

  const snapshot: OfflineUserProfile = {
    userId,
    displayName,
    email,
    role,
    targetScore,
    enrolledSubjects,
    subscription: {
      isPremium,
      expiresAt,
      planCode,
      autoRenew,
    },
    streak,
    cachedAt: Date.now(),
    schemaVersion: 1,
  };

  try {
    storage.setItem(`${STORAGE_PREFIX}${userId}`, JSON.stringify(snapshot));
    storage.setItem(LAST_ACTIVE_KEY, userId);
  } catch (err) {
    console.warn('[OfflineProfileCache] Unable to save offline snapshot to localStorage', err);
  }
}

/**
 * Retrieves the cached offline user profile from local storage.
 */
export function getOfflineProfile(userId?: string | null): OfflineUserProfile | null {
  const storage = getStorage();
  if (!storage) return null;

  const resolvedUserId = userId || storage.getItem(LAST_ACTIVE_KEY) || storage.getItem('jambprep_active_user_id');
  if (!resolvedUserId) return null;

  try {
    const raw = storage.getItem(`${STORAGE_PREFIX}${resolvedUserId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OfflineUserProfile;
    if (parsed.schemaVersion !== 1 || !parsed.userId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export type OfflineAccessValidity =
  | { valid: true; profile: OfflineUserProfile }
  | { valid: false; reason: 'no_profile' | 'free_tier' | 'expired' | 'tampered'; profile?: OfflineUserProfile };

/**
 * Verifies whether the cached profile is eligible for offline mode.
 * Rules:
 * 1. Must have a valid cached profile.
 * 2. Clock must not be tampered with (current time before cachedAt).
 * 3. Must have an active paid subscription (`isPremium === true`).
 * 4. Subscription must not be expired (`expiresAt > Date.now()`).
 */
export function isOfflineAccessValid(profile: OfflineUserProfile | null): OfflineAccessValidity {
  if (!profile) {
    return { valid: false, reason: 'no_profile' };
  }

  // Device clock tampering check: if current time is more than 2 minutes before cachedAt,
  // user likely altered system clock backward to artificially prolong subscription.
  const now = Date.now();
  if (now < profile.cachedAt - 120_000) {
    return { valid: false, reason: 'tampered', profile };
  }

  if (!profile.subscription.isPremium) {
    return { valid: false, reason: 'free_tier', profile };
  }

  if (profile.subscription.expiresAt) {
    const expiryTime = new Date(profile.subscription.expiresAt).getTime();
    if (!Number.isNaN(expiryTime) && expiryTime <= now) {
      return { valid: false, reason: 'expired', profile };
    }
  }

  return { valid: true, profile };
}

/**
 * Removes cached offline snapshot for a user.
 */
export function clearOfflineProfile(userId: string): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.removeItem(`${STORAGE_PREFIX}${userId}`);
    if (storage.getItem(LAST_ACTIVE_KEY) === userId) {
      storage.removeItem(LAST_ACTIVE_KEY);
    }
  } catch {}
}
