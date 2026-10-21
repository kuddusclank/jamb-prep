import { createNativeApiClient } from "@/lib/api/native-client";
import { getNetworkStateManager, isNetworkOrTimeoutError } from "@/lib/offline/network-state";
import { getOfflineProfile } from "@/lib/offline/offline-profile-cache";

export interface StreakActivationResult {
  qualifiedToday: boolean;
  currentStreak: number;
  bestStreak: number;
  localDate: string;
}

export interface StreakActivityPayload {
  activityType: "dictionary_word_learned" | "dictionary_game_completed" | "dictionary_study";
  details?: {
    word?: string;
    game?: string;
    score?: number;
    wordsStudiedCount?: number;
  };
  timestamp?: number;
}

const OFFLINE_STREAK_QUEUE_KEY = "jambprep_offline_streak_activities_v1";

function getOfflineQueue(): StreakActivityPayload[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(OFFLINE_STREAK_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveOfflineQueue(queue: StreakActivityPayload[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(OFFLINE_STREAK_QUEUE_KEY, JSON.stringify(queue.slice(-20)));
  } catch {
    // Storage quota or error safe
  }
}

let isFlushing = false;
export async function flushOfflineStreakActivities() {
  if (isFlushing || typeof window === "undefined" || !navigator.onLine) return;
  const queue = getOfflineQueue();
  if (queue.length === 0) return;

  isFlushing = true;
  try {
    const client = createNativeApiClient();
    const remaining: StreakActivityPayload[] = [];

    for (const item of queue) {
      try {
        await client.request<StreakActivationResult>(
          "/api/v1/study-schedule/activity",
          {
            method: "POST",
            body: item,
          }
        );
      } catch (err) {
        if (isNetworkOrTimeoutError(err)) {
          remaining.push(item);
        }
      }
    }

    saveOfflineQueue(remaining);
  } finally {
    isFlushing = false;
  }
}

// Auto-subscribe to network state manager for online reconnection
if (typeof window !== "undefined") {
  getNetworkStateManager().subscribe((isOnline) => {
    if (isOnline) {
      void flushOfflineStreakActivities();
    }
  });
}

export async function recordStreakActivity(params: {
  activityType: "dictionary_word_learned" | "dictionary_game_completed" | "dictionary_study";
  details?: {
    word?: string;
    game?: string;
    score?: number;
    wordsStudiedCount?: number;
  };
}): Promise<StreakActivationResult | null> {
  const isCurrentlyOffline = typeof navigator !== "undefined" && !navigator.onLine;

  if (isCurrentlyOffline) {
    const queue = getOfflineQueue();
    queue.push({ ...params, timestamp: Date.now() });
    saveOfflineQueue(queue);

    const cached = getOfflineProfile();
    const current = cached?.streak?.currentStreak ?? 0;
    const best = cached?.streak?.longestStreak ?? Math.max(1, current);

    const optimistic: StreakActivationResult = {
      qualifiedToday: true,
      currentStreak: Math.max(1, current),
      bestStreak: Math.max(1, best),
      localDate: new Date().toISOString().split("T")[0],
    };

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("study-streak-updated", { detail: optimistic })
      );
    }

    return optimistic;
  }

  try {
    const client = createNativeApiClient();
    const res = await client.request<StreakActivationResult>(
      "/api/v1/study-schedule/activity",
      {
        method: "POST",
        body: params,
      }
    );

    if (typeof window !== "undefined" && res?.data) {
      window.dispatchEvent(
        new CustomEvent("study-streak-updated", { detail: res.data })
      );
    }

    return res.data;
  } catch (err) {
    if (isNetworkOrTimeoutError(err)) {
      getNetworkStateManager().markOffline(err instanceof Error ? err.message : String(err));
      const queue = getOfflineQueue();
      queue.push({ ...params, timestamp: Date.now() });
      saveOfflineQueue(queue);

      const cached = getOfflineProfile();
      const current = cached?.streak?.currentStreak ?? 0;
      const best = cached?.streak?.longestStreak ?? Math.max(1, current);

      const optimistic: StreakActivationResult = {
        qualifiedToday: true,
        currentStreak: Math.max(1, current),
        bestStreak: Math.max(1, best),
        localDate: new Date().toISOString().split("T")[0],
      };

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("study-streak-updated", { detail: optimistic })
        );
      }

      return optimistic;
    }

    console.warn("Could not record study streak activity", err);
    return null;
  }
}
