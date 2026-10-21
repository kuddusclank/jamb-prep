import test from "node:test";
import assert from "node:assert/strict";

// Mock localStorage for Node.js test environment
class MockStorage {
  constructor() {
    this.store = new Map();
  }
  getItem(key) {
    return this.store.get(key) || null;
  }
  setItem(key, value) {
    this.store.set(key, String(value));
  }
  removeItem(key) {
    this.store.delete(key);
  }
  clear() {
    this.store.clear();
  }
}

globalThis.window = {
  localStorage: new MockStorage(),
};

// Import module under test
const {
  saveOfflineProfile,
  getOfflineProfile,
  isOfflineAccessValid,
  clearOfflineProfile,
} = await import("../src/lib/offline/offline-profile-cache.ts");

test("saveOfflineProfile saves snapshot and getOfflineProfile reads it back", () => {
  const userId = "11111111-2222-3333-4444-555555555555";
  const futureExpiry = new Date(Date.now() + 30 * 86400000).toISOString();

  saveOfflineProfile({
    profile: {
      profile: {
        id: userId,
        display_name: "Adeola Adeleke",
        email: "adeola@example.com",
        role: "student",
      },
      preferences: {
        target_score: 320,
        target_institution: "University of Lagos",
        target_course: "Medicine",
      },
      subscription: {
        isPremium: true,
        expiresAt: futureExpiry,
        daysRemaining: 30,
        planCode: "pro_monthly",
        autoRenew: true,
        cancelledAt: null,
      },
      studyStreak: {
        accessState: "premium_active",
        isPremium: true,
        expiresAt: futureExpiry,
        canActivateOrEdit: true,
        canDisableOrDetach: true,
        vapidPublicKey: null,
        schedule: {
          exists: true,
          enabled: true,
          goalType: "questions",
          dailyGoal: 20,
          pendingDailyGoal: null,
          pendingGoalEffectiveDate: null,
          reminderEnabled: false,
          reminderLocalTime: "20:00",
          timeZone: "Africa/Lagos",
          pendingTimeZone: null,
          pendingTimeZoneEffectiveDate: null,
          nextReminderAt: null,
          revision: 1,
        },
        todayProgress: {
          localDate: "2026-10-21",
          timeZone: "Africa/Lagos",
          targetQuestions: 20,
          acceptedCount: 20,
          remainingQuestions: 0,
          progressPercent: 100,
          qualified: true,
          qualifiedAt: new Date().toISOString(),
        },
        streak: {
          currentStreak: 7,
          bestStreak: 14,
          lastQualifiedDate: "2026-10-21",
          qualifiedToday: true,
          recentDays: [],
        },
        pushSubscriptions: [],
      },
    },
    enrolledSubjects: [
      { id: "sub-1", code: "ENG", name: "Use of English", isCompulsory: true },
      { id: "sub-2", code: "MAT", name: "Mathematics", isCompulsory: false },
    ],
  });

  const cached = getOfflineProfile(userId);
  assert.ok(cached, "Profile must be retrieved from cache");
  assert.equal(cached.userId, userId);
  assert.equal(cached.displayName, "Adeola Adeleke");
  assert.equal(cached.targetScore, 320);
  assert.equal(cached.subscription.isPremium, true);
  assert.equal(cached.subscription.expiresAt, futureExpiry);
  assert.equal(cached.streak.currentStreak, 7);
  assert.equal(cached.enrolledSubjects.length, 2);
});

test("isOfflineAccessValid correctly validates active paid users vs free and expired users", () => {
  // Case 1: Active paid subscriber
  const activeProfile = {
    userId: "usr-active",
    displayName: "Active Student",
    email: "active@example.com",
    role: "student",
    targetScore: 280,
    enrolledSubjects: [],
    subscription: {
      isPremium: true,
      expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
      planCode: "pro_monthly",
      autoRenew: true,
    },
    streak: { currentStreak: 3, longestStreak: 5 },
    cachedAt: Date.now() - 5000,
    schemaVersion: 1,
  };
  const activeCheck = isOfflineAccessValid(activeProfile);
  assert.equal(activeCheck.valid, true);

  // Case 2: Free tier user (isPremium === false)
  const freeProfile = {
    ...activeProfile,
    userId: "usr-free",
    subscription: { ...activeProfile.subscription, isPremium: false },
  };
  const freeCheck = isOfflineAccessValid(freeProfile);
  assert.equal(freeCheck.valid, false);
  assert.equal(freeCheck.reason, "free_tier");

  // Case 3: Expired subscription (expiresAt in past)
  const expiredProfile = {
    ...activeProfile,
    userId: "usr-expired",
    subscription: {
      ...activeProfile.subscription,
      expiresAt: new Date(Date.now() - 24 * 3600000).toISOString(),
    },
  };
  const expiredCheck = isOfflineAccessValid(expiredProfile);
  assert.equal(expiredCheck.valid, false);
  assert.equal(expiredCheck.reason, "expired");

  // Case 4: Clock tampering (cachedAt far in future compared to now)
  const tamperedProfile = {
    ...activeProfile,
    userId: "usr-tampered",
    cachedAt: Date.now() + 3600000, // 1 hour in future
  };
  const tamperedCheck = isOfflineAccessValid(tamperedProfile);
  assert.equal(tamperedCheck.valid, false);
  assert.equal(tamperedCheck.reason, "tampered");

  // Case 5: Null profile
  const nullCheck = isOfflineAccessValid(null);
  assert.equal(nullCheck.valid, false);
  assert.equal(nullCheck.reason, "no_profile");
});

test("clearOfflineProfile removes snapshot from storage", () => {
  const userId = "usr-to-clear";
  saveOfflineProfile({
    profile: {
      profile: { id: userId, display_name: "To Clear", email: "clear@example.com", role: "student" },
      preferences: { target_score: 250, target_institution: null, target_course: null },
      subscription: { isPremium: true, expiresAt: null, daysRemaining: 0, planCode: null, autoRenew: true, cancelledAt: null },
    },
  });

  assert.ok(getOfflineProfile(userId), "Profile must exist before clear");
  clearOfflineProfile(userId);
  assert.equal(getOfflineProfile(userId), null, "Profile must be null after clear");
});
