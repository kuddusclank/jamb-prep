import { createNativeApiClient } from "@/lib/api/native-client";

export interface StreakActivationResult {
  qualifiedToday: boolean;
  currentStreak: number;
  bestStreak: number;
  localDate: string;
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
  try {
    const client = createNativeApiClient();
    const res = await client.request<StreakActivationResult>(
      "/api/v1/study-schedule/activity",
      {
        method: "POST",
        body: params, // Native client serializes this automatically
      }
    );

    if (typeof window !== "undefined" && res?.data) {
      window.dispatchEvent(
        new CustomEvent("study-streak-updated", { detail: res.data })
      );
    }

    return res.data;
  } catch (err) {
    console.warn("Could not record study streak activity", err);
    return null;
  }
}
