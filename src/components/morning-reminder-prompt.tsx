"use client";

import { useState, useEffect } from "react";
import { Bell, CheckCircle2, Clock, X } from "lucide-react";
import { createNativeApiClient } from "@/lib/api/native-client";
import {
  detectPushCapability,
  subscribeBrowserToWebPush,
} from "@/lib/pwa/push-client";

const DISMISS_STORAGE_KEY = "jambprep_morning_reminder_dismissed_until";
const DISMISS_DURATION_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

interface StudyScheduleResponse {
  isPremium: boolean;
  vapidPublicKey: string | null;
  schedule: {
    exists: boolean;
    enabled: boolean;
    dailyGoal: number;
    reminderEnabled: boolean;
    reminderLocalTime: string;
  };
  pushSubscriptions: Array<{
    id: string;
    enabled: boolean;
  }>;
}

export function MorningReminderPrompt() {
  const [scheduleData, setScheduleData] = useState<StudyScheduleResponse | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    // Check if dismissed recently
    try {
      const dismissedUntil = localStorage.getItem(DISMISS_STORAGE_KEY);
      if (dismissedUntil && Number(dismissedUntil) > Date.now()) {
        return;
      }
    } catch {
      // Ignore localStorage access failures
    }

    // Check device capability
    const capability = detectPushCapability();
    if (!capability.supported || capability.permission === "denied") {
      return;
    }

    let isMounted = true;
    const fetchSchedule = async () => {
      try {
        const client = createNativeApiClient();
        const res = await client.request<StudyScheduleResponse>("/api/v1/study-schedule");
        if (!isMounted) return;

        const data = res.data;

        // Skip Pro users who already have any existing schedule
        if (data.isPremium && (data.schedule.exists || data.schedule.enabled || data.schedule.reminderEnabled)) {
          return;
        }

        // Skip any user who already has reminders enabled
        if (data.schedule.reminderEnabled) {
          return;
        }

        // Skip any user who already registered push notification devices
        if (data.pushSubscriptions && data.pushSubscriptions.length > 0) {
          return;
        }

        // If no VAPID public key is configured, cannot subscribe
        if (!data.vapidPublicKey) {
          return;
        }

        setScheduleData(data);
        setIsVisible(true);
      } catch {
        // Silently ignore network or offline failures
      }
    };

    void fetchSchedule();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    try {
      localStorage.setItem(
        DISMISS_STORAGE_KEY,
        String(Date.now() + DISMISS_DURATION_MS)
      );
    } catch {
      // Ignore quota errors
    }
  };

  const handleEnableReminder = async () => {
    if (!scheduleData?.vapidPublicKey) return;

    setIsSubscribing(true);
    setStatusMessage(null);

    try {
      // 1. Prompt browser permission & subscribe to Web Push
      const browserSub = await subscribeBrowserToWebPush(scheduleData.vapidPublicKey);

      const client = createNativeApiClient();

      // 2. Register push device on server
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

      // 3. Save default 7:00 AM reading schedule (15 questions/day)
      await client.request("/api/v1/study-schedule", {
        method: "PUT",
        body: {
          enabled: true,
          reminderEnabled: true,
          dailyGoal: 15,
          reminderLocalTime: "07:00",
          timeZone: "Africa/Lagos",
        },
      });

      setStatusMessage({
        type: "success",
        text: "You're all set! We'll send you a gentle reading reminder at 7:00 AM WAT.",
      });

      // Fade out after 3.5 seconds
      setTimeout(() => {
        setIsVisible(false);
      }, 3500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to enable reminders.";
      setStatusMessage({
        type: "error",
        text: msg,
      });

      // If user denied permission in browser dialog, store dismissal to not prompt repeatedly
      if (typeof Notification !== "undefined" && Notification.permission === "denied") {
        try {
          localStorage.setItem(
            DISMISS_STORAGE_KEY,
            String(Date.now() + DISMISS_DURATION_MS)
          );
        } catch {
          // Ignore
        }
      }
    } finally {
      setIsSubscribing(false);
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div
      role="region"
      aria-label="Morning study reminder setup"
      className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm relative transition-all duration-300"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5 max-w-xl">
          <div className="flex size-10 sm:size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-[#116149] border border-emerald-100">
            <Bell size={18} />
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-700">
                <Clock size={11} className="text-slate-500" /> DAILY HABIT BUILDER
              </span>
              <span className="text-xs font-semibold text-slate-500">7:00 AM WAT</span>
            </div>

            <h3 className="text-base sm:text-lg font-bold text-[#092E28]">
              Set your 7:00 AM daily reading reminder
            </h3>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Build your daily habit for UTME success. Get a gentle morning notification at{" "}
              <strong className="text-[#092E28]">7:00 AM</strong> to complete your 15 questions
              and protect your streak.
            </p>

            {statusMessage && (
              <div
                className={`mt-2 inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium ${
                  statusMessage.type === "success"
                    ? "bg-emerald-50 border border-emerald-200 text-[#116149]"
                    : "bg-red-50 border border-red-200 text-red-700"
                }`}
              >
                {statusMessage.type === "success" && <CheckCircle2 size={14} />}
                <span>{statusMessage.text}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto pt-2 sm:pt-0">
          <button
            type="button"
            onClick={() => void handleEnableReminder()}
            disabled={isSubscribing || statusMessage?.type === "success"}
            className="flex-1 sm:flex-none min-h-10 inline-flex items-center justify-center gap-2 rounded-full bg-[#116149] px-5 text-xs font-bold text-white hover:bg-[#0b4936] transition shadow-sm disabled:opacity-50 cursor-pointer"
          >
            {isSubscribing ? (
              <>
                <span className="inline-block size-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Connecting...
              </>
            ) : statusMessage?.type === "success" ? (
              <>
                <CheckCircle2 size={14} />
                Reminder Active
              </>
            ) : (
              <>
                <Bell size={14} />
                Enable 7:00 AM Reminder
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss reminder prompt"
            className="size-9 inline-flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer shrink-0"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
