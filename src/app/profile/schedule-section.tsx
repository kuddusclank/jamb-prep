"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bell,
  BellOff,
  CalendarClock,
  CheckCircle2,
  Flame,
  Info,
  Loader2,
  Lock,
  RefreshCw,
  Smartphone,
  Sparkles,
  Trash2,
  Trophy,
  AlertTriangle,
} from "lucide-react";
import Link from "@/components/pending-link";
import { createNativeApiClient } from "@/lib/api/native-client";
import {
  detectPushCapability,
  detachAndUnsubscribeBrowserPush,
  getCurrentBrowserEndpointHash,
  subscribeBrowserToWebPush,
  type PushCapabilitySnapshot,
} from "@/lib/pwa/push-client";

export interface StudyScheduleDeviceDto {
  id: string;
  deviceLabel: string;
  environment: string;
  enabled: boolean;
  disabledReason: string | null;
  lastSeenAt: string;
  lastTestSentAt: string | null;
  isCurrentDevice: boolean;
}

export interface StudyScheduleResponseDto {
  accessState: "free_locked" | "premium_active" | "expired_readonly";
  isPremium: boolean;
  expiresAt: string | null;
  canActivateOrEdit: boolean;
  canDisableOrDetach: boolean;
  vapidPublicKey: string | null;
  schedule: {
    exists: boolean;
    enabled: boolean;
    goalType: "questions";
    dailyGoal: number;
    pendingDailyGoal: number | null;
    pendingGoalEffectiveDate: string | null;
    reminderEnabled: boolean;
    reminderLocalTime: string;
    timeZone: string;
    pendingTimeZone: string | null;
    pendingTimeZoneEffectiveDate: string | null;
    nextReminderAt: string | null;
    revision: number;
  };
  todayProgress: {
    localDate: string;
    timeZone: string;
    targetQuestions: number;
    acceptedCount: number;
    remainingQuestions: number;
    progressPercent: number;
    qualified: boolean;
    qualifiedAt: string | null;
  };
  streak: {
    currentStreak: number;
    bestStreak: number;
    lastQualifiedDate: string | null;
    qualifiedToday: boolean;
    recentDays?: Array<{
      localDate: string;
      dayShort: string;
      qualified: boolean;
      isToday: boolean;
      activityKind: 'mock' | 'practice' | 'mixed' | 'none';
    }>;
  };
  pushSubscriptions: StudyScheduleDeviceDto[];
}

const COMMON_TIME_ZONES = [
  { value: "Africa/Lagos", label: "West Africa Time — Lagos (WAT, UTC+1)" },
  { value: "Africa/Accra", label: "Greenwich Mean Time — Accra (GMT, UTC+0)" },
  { value: "Africa/Nairobi", label: "East Africa Time — Nairobi (EAT, UTC+3)" },
  { value: "Africa/Johannesburg", label: "South Africa Standard Time (SAST, UTC+2)" },
  { value: "Europe/London", label: "United Kingdom — London (GMT/BST)" },
  { value: "America/New_York", label: "Eastern Time — New York (ET)" },
];

export function ScheduleSection() {
  const [data, setData] = useState<StudyScheduleResponseDto | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Form state populated only after server response arrives
  const [enabled, setEnabled] = useState<boolean>(false);
  const [dailyGoal, setDailyGoal] = useState<number>(10);
  const [reminderEnabled, setReminderEnabled] = useState<boolean>(false);
  const [reminderLocalTime, setReminderLocalTime] = useState<string>("19:00");
  const [timeZone, setTimeZone] = useState<string>("Africa/Lagos");

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isSubscribingDevice, setIsSubscribingDevice] = useState<boolean>(false);
  const [isTestingReminder, setIsTestingReminder] = useState<boolean>(false);
  const [removingDeviceId, setRemovingDeviceId] = useState<string | null>(null);
  const flameScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (flameScrollRef.current) {
      flameScrollRef.current.scrollLeft = flameScrollRef.current.scrollWidth;
    }
  }, [data?.streak?.recentDays?.length]);

  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const [capability, setCapability] = useState<PushCapabilitySnapshot>(() =>
    detectPushCapability()
  );

  const syncFormFromServer = useCallback((payload: StudyScheduleResponseDto) => {
    setEnabled(payload.schedule.enabled);
    setDailyGoal(payload.schedule.pendingDailyGoal ?? payload.schedule.dailyGoal);
    setReminderEnabled(payload.schedule.reminderEnabled);
    setReminderLocalTime(payload.schedule.reminderLocalTime);
    setTimeZone(payload.schedule.pendingTimeZone ?? payload.schedule.timeZone);
  }, []);

  const loadSchedule = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const endpointHash = await getCurrentBrowserEndpointHash();
      const query = endpointHash ? `?endpointHash=${encodeURIComponent(endpointHash)}` : "";
      const client = createNativeApiClient();
      const { data: res } = await client.request<StudyScheduleResponseDto>(
        `/api/v1/study-schedule${query}`,
        { method: "GET" }
      );
      setData(res);
      syncFormFromServer(res);
      setCapability(detectPushCapability());
    } catch (err) {
      setLoadError(
        err instanceof Error
          ? err.message
          : "Unable to load your study schedule right now."
      );
    } finally {
      setLoading(false);
    }
  }, [syncFormFromServer]);

  useEffect(() => {
    void loadSchedule();
  }, [loadSchedule]);

  const handleSaveSchedule = async (overrideDisable?: boolean) => {
    if (!data) return;
    setIsSaving(true);
    setFeedback(null);
    try {
      const nextEnabled = overrideDisable === true ? false : enabled;
      const client = createNativeApiClient();
      const { data: updated } = await client.request<StudyScheduleResponseDto>(
        "/api/v1/study-schedule",
        {
          method: "PUT",
          headers: {
            "Idempotency-Key": crypto.randomUUID(),
          },
          body: {
            enabled: nextEnabled,
            dailyGoal,
            reminderEnabled: nextEnabled ? reminderEnabled : false,
            reminderLocalTime,
            timeZone,
            expectedRevision: data.schedule.exists ? data.schedule.revision : undefined,
          },
        }
      );
      setData(updated);
      syncFormFromServer(updated);
      setFeedback({
        type: "success",
        message: nextEnabled
          ? "Study schedule saved."
          : "Study schedule turned off. Your earned streak history is preserved.",
      });
    } catch (err) {
      setFeedback({
        type: "error",
        message:
          err instanceof Error
            ? err.message
            : "Could not save your study schedule. Please try again.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEnableDeviceNotifications = async () => {
    if (!data) return;
    if (!data.vapidPublicKey) {
      setFeedback({
        type: "error",
        message:
          "Push notifications are not configured on this server yet. Your daily study goal and streak still track automatically.",
      });
      return;
    }

    setIsSubscribingDevice(true);
    setFeedback(null);
    try {
      const browserSub = await subscribeBrowserToWebPush(data.vapidPublicKey);
      const client = createNativeApiClient();
      await client.request("/api/v1/study-schedule/push-subscriptions", {
        method: "POST",
        headers: {
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: {
          endpoint: browserSub.endpoint,
          keys: browserSub.keys,
          deviceLabel: browserSub.deviceLabel,
          environment: browserSub.environment,
        },
      });
      setCapability(detectPushCapability());
      await loadSchedule();
      setFeedback({
        type: "success",
        message: "Notifications enabled on this device.",
      });
    } catch (err) {
      setCapability(detectPushCapability());
      setFeedback({
        type: "error",
        message:
          err instanceof Error
            ? err.message
            : "Could not enable notifications on this device.",
      });
    } finally {
      setIsSubscribingDevice(false);
    }
  };

  const handleRemoveDevice = async (sub: StudyScheduleDeviceDto) => {
    setRemovingDeviceId(sub.id);
    setFeedback(null);
    try {
      const client = createNativeApiClient();
      await client.request(
        `/api/v1/study-schedule/push-subscriptions/${encodeURIComponent(sub.id)}`,
        { method: "DELETE" }
      );
      if (sub.isCurrentDevice) {
        await detachAndUnsubscribeBrowserPush({ notifyServer: false });
      }
      await loadSchedule();
      setFeedback({
        type: "success",
        message: "Device removed from study reminders.",
      });
    } catch (err) {
      setFeedback({
        type: "error",
        message:
          err instanceof Error ? err.message : "Could not remove this device.",
      });
    } finally {
      setRemovingDeviceId(null);
    }
  };

  const handleSendTestReminder = async (subscriptionId?: string) => {
    setIsTestingReminder(true);
    setFeedback(null);
    try {
      const client = createNativeApiClient();
      await client.request("/api/v1/study-schedule/test-reminder", {
        method: "POST",
        headers: {
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: {
          subscriptionId,
        },
      });
      await loadSchedule();
      setFeedback({
        type: "success",
        message:
          "Test reminder accepted by push provider. Check your device notifications (ensure Do Not Disturb / Focus is off).",
      });
    } catch (err) {
      setFeedback({
        type: "error",
        message:
          err instanceof Error
            ? err.message
            : "Could not send a test reminder right now.",
      });
    } finally {
      setIsTestingReminder(false);
    }
  };

  // Detect browser IANA timezone if not already in COMMON_TIME_ZONES
  const detectedBrowserZone =
    typeof Intl !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : null;
  const timeZoneOptions = [...COMMON_TIME_ZONES];
  if (
    detectedBrowserZone &&
    !timeZoneOptions.some((tz) => tz.value === detectedBrowserZone)
  ) {
    timeZoneOptions.unshift({
      value: detectedBrowserZone,
      label: `Detected time zone (${detectedBrowserZone})`,
    });
  }
  if (timeZone && !timeZoneOptions.some((tz) => tz.value === timeZone)) {
    timeZoneOptions.unshift({
      value: timeZone,
      label: timeZone,
    });
  }

  return (
    <section
      id="schedule"
      aria-labelledby="schedule-section-heading"
      className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-100 text-[#116149]">
            <CalendarClock size={18} aria-hidden="true" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2
                id="schedule-section-heading"
                className="text-base font-bold text-[#092E28]"
              >
                Schedule & Study Streak
              </h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#116149]">
                Premium
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Set a daily question target, build your study streak, and get an optional daily reminder.
            </p>
          </div>
        </div>
      </div>

      {/* Shimmer loading state before server response arrives */}
      {loading && !data ? (
        <div
          role="status"
          aria-live="polite"
          aria-busy="true"
          className="space-y-4 animate-pulse"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="h-24 rounded-2xl bg-slate-100" />
            <div className="h-24 rounded-2xl bg-slate-100" />
            <div className="h-24 rounded-2xl bg-slate-100" />
          </div>
          <div className="h-36 rounded-2xl bg-slate-100" />
          <span className="sr-only">Loading your study schedule...</span>
        </div>
      ) : loadError && !data ? (
        <div className="rounded-2xl border border-red-200 bg-red-50/70 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-2.5 text-xs text-red-900">
            <AlertTriangle size={17} className="text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Could not load Study Schedule</p>
              <p className="text-red-700 mt-0.5">{loadError}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void loadSchedule()}
            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full border border-red-300 bg-white px-4 text-xs font-semibold text-red-800 hover:bg-red-50 cursor-pointer shrink-0"
          >
            <RefreshCw size={14} />
            Retry
          </button>
        </div>
      ) : data?.accessState === "free_locked" ? (
        /* Locked Free State */
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5 max-w-xl">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-200 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-slate-700">
                <Lock size={12} aria-hidden="true" /> Premium Feature
              </span>
              <h3 className="text-lg font-bold text-[#092E28]">
                Build a daily UTME habit with Schedule & Reminders
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Premium students can activate a personal daily question target (5, 10, 15, or custom), track their current and best study streaks automatically across practice and mock sessions, and receive a daily Web Push study reminder on opted-in devices.
              </p>
            </div>

            <Link
              href="/pricing"
              className="shrink-0 min-h-11 inline-flex items-center justify-center gap-2 rounded-full bg-[#116149] px-6 text-xs font-semibold text-white hover:bg-[#0b4936] transition shadow-sm"
            >
              <Sparkles size={14} className="text-amber-300" aria-hidden="true" />
              View plans
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200/80 opacity-75">
            <div className="rounded-xl border border-slate-200 bg-white p-3.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Daily Goal
              </span>
              <p className="text-sm font-bold text-slate-700 mt-1">
                10 questions / day
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Study Streak
              </span>
              <p className="text-sm font-bold text-slate-700 mt-1">
                Automatic daily tracking
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Push Reminders
              </span>
              <p className="text-sm font-bold text-slate-700 mt-1">
                1 custom daily reminder
              </p>
            </div>
          </div>
        </div>
      ) : data?.accessState === "expired_readonly" ? (
        /* Expired Premium Read-Only State (retains history and allows free disable/detach) */
        <div className="space-y-6">
          <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1 max-w-xl">
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-200/80 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-amber-950">
                <Lock size={12} aria-hidden="true" /> Read-only History · Premium Expired
              </span>
              <h3 className="text-base font-bold text-[#092E28]">
                Your study streak history and preferences are saved
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                New daily goal accrual and scheduled push reminders are paused while your account is on the Free tier. Renew Premium anytime to resume tracking, or manage/remove your saved reminder devices below at no cost.
              </p>
            </div>
            <Link
              href="/pricing"
              className="shrink-0 min-h-11 inline-flex items-center justify-center gap-2 rounded-full bg-[#116149] px-6 text-xs font-semibold text-white hover:bg-[#0b4936] transition"
            >
              <Sparkles size={14} className="text-amber-300" aria-hidden="true" />
              Renew Premium
            </Link>
          </div>

          {feedback && (
            <div
              role="status"
              className={`p-4 rounded-2xl border text-xs flex items-center gap-2 ${
                feedback.type === "error"
                  ? "border-red-200 bg-red-50 text-red-800"
                  : "border-emerald-200 bg-emerald-50 text-emerald-800"
              }`}
            >
              {feedback.type === "error" ? (
                <AlertTriangle size={16} className="shrink-0 text-red-600" />
              ) : (
                <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                <Flame size={15} className="text-amber-600" aria-hidden="true" />
                Current Streak
              </div>
              <p className="text-2xl font-extrabold text-[#092E28] mt-1">
                {data.streak.currentStreak}{" "}
                <span className="text-xs font-semibold text-slate-500">
                  {data.streak.currentStreak === 1 ? "day" : "days"}
                </span>
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                <Trophy size={15} className="text-[#116149]" aria-hidden="true" />
                Best Streak
              </div>
              <p className="text-2xl font-extrabold text-[#092E28] mt-1">
                {data.streak.bestStreak}{" "}
                <span className="text-xs font-semibold text-slate-500">
                  {data.streak.bestStreak === 1 ? "day" : "days"}
                </span>
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                <CalendarClock size={15} className="text-slate-600" aria-hidden="true" />
                Saved Preference
              </div>
              <p className="text-sm font-bold text-[#092E28] mt-1.5">
                {data.schedule.dailyGoal} questions/day · {data.schedule.reminderLocalTime}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {data.schedule.timeZone}
              </p>
            </div>
          </div>

          {(data.schedule.exists || data.pushSubscriptions.length > 0) && (
            <div className="rounded-2xl border border-slate-200 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-bold text-[#092E28]">
                  Privacy & Opt-Out Controls (Available without payment)
                </p>
                {data.schedule.exists && (
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => void handleSaveSchedule(true)}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer disabled:opacity-50"
                  >
                    <BellOff size={13} />
                    Turn off saved schedule preference
                  </button>
                )}
              </div>

              {data.pushSubscriptions.length > 0 && (
                <ul className="divide-y divide-slate-100 text-xs">
                  {data.pushSubscriptions.map((sub) => (
                    <li
                      key={sub.id}
                      className="py-2.5 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2">
                        <Smartphone size={14} className="text-slate-500" />
                        <span className="font-semibold text-[#092E28]">
                          {sub.deviceLabel}
                        </span>
                        {sub.isCurrentDevice && (
                          <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-[#116149]">
                            This device
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        disabled={removingDeviceId === sub.id}
                        onClick={() => void handleRemoveDevice(sub)}
                        className="inline-flex items-center gap-1 text-red-600 hover:underline font-semibold cursor-pointer disabled:opacity-50"
                      >
                        <Trash2 size={13} />
                        Remove device
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      ) : data ? (
        /* Active Premium State */
        <div className="space-y-6">
          {feedback && (
            <div
              role="status"
              className={`p-4 rounded-2xl border text-xs flex items-center gap-2 ${
                feedback.type === "error"
                  ? "border-red-200 bg-red-50 text-red-800"
                  : "border-emerald-200 bg-emerald-50 text-emerald-800"
              }`}
            >
              {feedback.type === "error" ? (
                <AlertTriangle size={16} className="shrink-0 text-red-600" />
              ) : (
                <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          {/* Progress & Streak Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600">
                  Today&apos;s Goal Progress
                </span>
                {data.todayProgress.qualified ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-[#116149]">
                    <CheckCircle2 size={11} /> Goal met
                  </span>
                ) : (
                  <span className="text-[11px] font-mono text-slate-500">
                    {data.todayProgress.localDate}
                  </span>
                )}
              </div>
              <div className="mt-2">
                <p className="text-2xl font-extrabold text-[#092E28]">
                  {data.todayProgress.acceptedCount}{" "}
                  <span className="text-sm font-semibold text-slate-500">
                    / {data.todayProgress.targetQuestions} questions
                  </span>
                </p>
                <div
                  className="mt-2 h-2 w-full rounded-full bg-slate-200 overflow-hidden"
                  role="progressbar"
                  aria-valuenow={data.todayProgress.progressPercent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Daily study goal progress"
                >
                  <div
                    className="h-full rounded-full bg-[#116149] transition-all"
                    style={{ width: `${data.todayProgress.progressPercent}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 flex flex-col justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                <Flame size={15} className="text-amber-600" aria-hidden="true" />
                Current Streak
              </div>
              <div className="mt-2">
                <p className="text-2xl font-extrabold text-[#092E28]">
                  {data.streak.currentStreak}{" "}
                  <span className="text-sm font-semibold text-slate-500">
                    {data.streak.currentStreak === 1 ? "day" : "days"}
                  </span>
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  {data.streak.qualifiedToday
                    ? "Today's goal completed!"
                    : data.streak.currentStreak > 0
                      ? `Complete ${data.todayProgress.remainingQuestions} more today to extend`
                      : "Reach today's goal to start your streak"}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 flex flex-col justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                <Trophy size={15} className="text-[#116149]" aria-hidden="true" />
                Best Streak
              </div>
              <div className="mt-2">
                <p className="text-2xl font-extrabold text-[#092E28]">
                  {data.streak.bestStreak}{" "}
                  <span className="text-sm font-semibold text-slate-500">
                    {data.streak.bestStreak === 1 ? "day" : "days"}
                  </span>
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  {data.streak.lastQualifiedDate
                    ? `Last qualified: ${data.streak.lastQualifiedDate}`
                    : "Earned across practice & mocks"}
                </p>
              </div>
            </div>
          </div>

          {/* 7-Day Flame Tracker & Motivation Callout */}
          <div className="rounded-2xl border border-amber-200/90 bg-gradient-to-br from-amber-50/80 via-white to-emerald-50/40 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs font-bold text-[#092E28] flex items-center gap-1.5">
                <Flame size={15} className="text-amber-500 fill-amber-500" />
                {data.streak.qualifiedToday
                  ? "Today's streak locked in! Practice at least once or take a mock tomorrow to keep growing."
                  : data.streak.currentStreak > 0
                    ? `Keep your ${data.streak.currentStreak}-day fire burning! Complete 1 practice session or a mock exam today.`
                    : "Both practice sessions and mock exams count toward your daily streak!"}
              </p>
              <p className="text-[11px] text-slate-600">
                Any full CBT mock simulation or meeting your daily practice target secures your streak for the day.
              </p>
            </div>

            {data.streak.recentDays && data.streak.recentDays.length > 0 && (
              <div
                ref={flameScrollRef}
                className="flex items-center gap-1.5 sm:gap-2 shrink-0 overflow-x-auto pb-1 max-w-full sm:max-w-xs md:max-w-sm flex-nowrap scroll-smooth"
                tabIndex={0}
                aria-label="Daily study streak flame history"
              >
                {data.streak.recentDays.map((day) => (
                  <div
                    key={day.localDate}
                    className={`flex flex-col items-center justify-center p-1.5 rounded-xl text-center shrink-0 min-w-10 sm:min-w-11 ${
                      day.isToday
                        ? day.qualified
                          ? 'bg-amber-100 border border-amber-400 font-bold'
                          : 'bg-white border-2 border-dashed border-amber-300 font-bold'
                        : day.qualified
                          ? 'bg-amber-50 border border-amber-200'
                          : 'bg-slate-100 border border-slate-200 text-slate-400'
                    }`}
                    title={`${day.localDate}: ${day.qualified ? 'Qualified' : 'No study'}`}
                  >
                    <span className="text-[9px] uppercase tracking-wider font-semibold">
                      {day.dayShort}
                    </span>
                    <span className="text-sm mt-0.5" aria-hidden="true">
                      {day.qualified ? '🔥' : '⚪'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Schedule Activation & Goal Controls */}
          <div className="rounded-2xl border border-slate-200 p-5 space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <label
                  htmlFor="schedule-enabled-toggle"
                  className="text-sm font-bold text-[#092E28] cursor-pointer"
                >
                  Activate Daily Study Schedule
                </label>
                <p className="text-xs text-slate-500 mt-0.5">
                  Counts every distinct question you answer in Practice or Mock exams toward your daily target.
                </p>
              </div>
              <input
                id="schedule-enabled-toggle"
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="size-5 accent-[#116149] rounded cursor-pointer mt-0.5"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-3 border-t border-slate-100">
              {/* Daily Question Target */}
              <div>
                <label
                  htmlFor="schedule-daily-goal"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
                >
                  Daily Question Goal (1–60)
                </label>
                <div className="flex flex-wrap items-center gap-2.5">
                  {[5, 10, 15].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setDailyGoal(preset)}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold border cursor-pointer transition ${
                        dailyGoal === preset
                          ? "bg-[#116149] text-white border-[#116149]"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {preset} / day
                    </button>
                  ))}
                  <input
                    id="schedule-daily-goal"
                    type="number"
                    min={1}
                    max={60}
                    value={dailyGoal}
                    onChange={(e) => setDailyGoal(Number(e.target.value))}
                    aria-label="Custom daily question goal"
                    className="w-24 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-[#092E28] focus:border-[#116149] focus:outline-hidden focus:ring-1 focus:ring-[#116149]"
                  />
                </div>
                {data.schedule.pendingDailyGoal !== null &&
                  data.schedule.pendingGoalEffectiveDate && (
                    <p className="text-[11px] text-amber-800 mt-1.5">
                      Today&apos;s target remains frozen at{" "}
                      <strong>{data.todayProgress.targetQuestions}</strong> questions. Your new goal of{" "}
                      <strong>{data.schedule.pendingDailyGoal}</strong> takes effect on{" "}
                      <strong>{data.schedule.pendingGoalEffectiveDate}</strong>.
                    </p>
                  )}
              </div>

              {/* Time Zone */}
              <div>
                <label
                  htmlFor="schedule-time-zone"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
                >
                  Study Time Zone
                </label>
                <select
                  id="schedule-time-zone"
                  value={timeZone}
                  onChange={(e) => setTimeZone(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-[#092E28] focus:border-[#116149] focus:outline-hidden focus:ring-1 focus:ring-[#116149]"
                >
                  {timeZoneOptions.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                </select>
                {data.schedule.pendingTimeZone &&
                  data.schedule.pendingTimeZoneEffectiveDate && (
                    <p className="text-[11px] text-amber-800 mt-1.5">
                      Time zone change to <strong>{data.schedule.pendingTimeZone}</strong> takes effect on{" "}
                      <strong>{data.schedule.pendingTimeZoneEffectiveDate}</strong>.
                    </p>
                  )}
              </div>
            </div>

            {/* Daily Reminder Settings */}
            <div className="pt-4 border-t border-slate-100 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <label
                    htmlFor="schedule-reminder-toggle"
                    className="text-sm font-bold text-[#092E28] cursor-pointer"
                  >
                    Send a Daily Study Reminder
                  </label>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Optional. Sends one private reminder at your chosen time if you haven&apos;t met your daily goal yet.
                  </p>
                </div>
                <input
                  id="schedule-reminder-toggle"
                  type="checkbox"
                  checked={enabled && reminderEnabled}
                  disabled={!enabled}
                  onChange={(e) => setReminderEnabled(e.target.checked)}
                  className="size-5 accent-[#116149] rounded cursor-pointer mt-0.5 disabled:opacity-40"
                />
              </div>

              {enabled && reminderEnabled && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center bg-slate-50/80 p-4 rounded-xl border border-slate-200/70">
                  <div>
                    <label
                      htmlFor="schedule-reminder-time"
                      className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1"
                    >
                      Reminder Time (24-Hour)
                    </label>
                    <input
                      id="schedule-reminder-time"
                      type="time"
                      value={reminderLocalTime}
                      onChange={(e) => setReminderLocalTime(e.target.value)}
                      className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-bold text-[#092E28] focus:border-[#116149] focus:outline-hidden focus:ring-1 focus:ring-[#116149]"
                    />
                  </div>
                  <div className="text-xs text-slate-600 space-y-1">
                    {data.schedule.nextReminderAt ? (
                      <p>
                        Next scheduled check:{" "}
                        <strong className="text-[#092E28]">
                          {new Date(data.schedule.nextReminderAt).toLocaleString("en-NG", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </strong>
                      </p>
                    ) : (
                      <p>Save your schedule to calculate your next reminder time.</p>
                    )}
                    <p className="text-[11px] text-slate-500">
                      Automatically skipped on days when your study goal is already completed.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                disabled={isSaving}
                onClick={() => void handleSaveSchedule()}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#116149] px-6 text-xs font-semibold text-white hover:bg-[#0b4936] transition cursor-pointer disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Saving Schedule...
                  </>
                ) : (
                  "Save Schedule Settings"
                )}
              </button>

              <span className="text-[11px] text-slate-500">
                Daily goal & streak tracking work even if push notifications are off.
              </span>
            </div>
          </div>

          {/* Device Push Subscription & Permission Controls */}
          <div className="rounded-2xl border border-slate-200 p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Bell size={16} className="text-[#116149]" aria-hidden="true" />
                <h3 className="text-sm font-bold text-[#092E28]">
                  Device Notification Delivery
                </h3>
              </div>

              {capability.supported && capability.permission !== "denied" && (
                <button
                  type="button"
                  disabled={isSubscribingDevice}
                  onClick={() => void handleEnableDeviceNotifications()}
                  className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full border border-[#116149] bg-emerald-50/70 px-4 text-xs font-semibold text-[#116149] hover:bg-emerald-100/70 transition cursor-pointer disabled:opacity-50"
                >
                  {isSubscribingDevice ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Connecting device...
                    </>
                  ) : data.pushSubscriptions.some((s) => s.isCurrentDevice && s.enabled) ? (
                    <>
                      <RefreshCw size={13} />
                      Refresh this device
                    </>
                  ) : (
                    <>
                      <Bell size={13} />
                      Enable notifications on this device
                    </>
                  )}
                </button>
              )}
            </div>

            {capability.requiresIosHomeScreenInstall && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 text-xs text-amber-950 flex items-start gap-2.5">
                <Info size={16} className="text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">iPhone & iPad Home Screen installation required for Push</p>
                  <p className="mt-0.5 text-amber-900">
                    Apple iOS only delivers Web Push notifications to installed Home Screen web apps. Tap the Safari Share button, choose{" "}
                    <strong>Add to Home Screen</strong>, and open JAMBPrep from your Home Screen to enable device reminders.
                  </p>
                </div>
              </div>
            )}

            {!capability.requiresIosHomeScreenInstall && !capability.supported && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-600 flex items-start gap-2.5">
                <Info size={16} className="text-slate-500 shrink-0 mt-0.5" />
                <span>
                  This browser does not support Web Push notifications. Your daily study goal and streak will still update automatically whenever you practice or take mocks.
                </span>
              </div>
            )}

            {capability.permission === "denied" && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 text-xs text-amber-950 flex items-start gap-2.5">
                <AlertTriangle size={16} className="text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Notifications are blocked in your browser settings</p>
                  <p className="mt-0.5 text-amber-900">
                    To receive daily study reminders on this device, allow notifications for this site in your browser or system settings, then tap{" "}
                    <strong>Enable notifications on this device</strong>.
                  </p>
                </div>
              </div>
            )}

            {data.pushSubscriptions.length > 0 ? (
              <div className="space-y-2.5">
                <p className="text-xs font-semibold text-slate-600">
                  Registered reminder devices ({data.pushSubscriptions.filter((s) => s.enabled).length} / 3 active)
                </p>
                <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-slate-50/50 px-4">
                  {data.pushSubscriptions.map((sub) => (
                    <li
                      key={sub.id}
                      className="py-3 flex flex-wrap items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <Smartphone size={15} className="text-slate-500 shrink-0" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[#092E28]">
                              {sub.deviceLabel}
                            </span>
                            {sub.isCurrentDevice && (
                              <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-[#116149]">
                                This device
                              </span>
                            )}
                            {!sub.enabled && (
                              <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                                Inactive ({sub.disabledReason || "disabled"})
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Last active:{" "}
                            {new Date(sub.lastSeenAt).toLocaleDateString("en-NG", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {sub.enabled && sub.isCurrentDevice && (
                          <button
                            type="button"
                            disabled={isTestingReminder}
                            onClick={() => void handleSendTestReminder(sub.id)}
                            className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-3 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer disabled:opacity-50"
                          >
                            {isTestingReminder ? "Sending..." : "Send test"}
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={removingDeviceId === sub.id}
                          onClick={() => void handleRemoveDevice(sub)}
                          className="inline-flex items-center gap-1 text-red-600 hover:underline font-semibold cursor-pointer disabled:opacity-50"
                        >
                          <Trash2 size={13} />
                          Remove
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-xs text-slate-500">
                No devices are subscribed to push reminders yet.
              </p>
            )}

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Privacy & delivery note: Lock-screen reminders use generic study copy and never display your name, score, or personal details. Delivery depends on your device being connected and not silenced by OS Focus, Do Not Disturb, or battery-saver restrictions.
            </p>
          </div>
        </div>
      ) : null}
    </section>
  );
}
