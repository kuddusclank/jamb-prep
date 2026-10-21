"use client";

import { getDefaultBrowserSessionManager } from "@/lib/auth/session-manager";
import { interruptionTransition } from "@/features/exam-engine/domain/interruption";
import { useEffect, useState } from "react";
import { recordMockInterruption } from "@/lib/client-actions";
import { AlertTriangle } from "lucide-react";

export function ExamConditions({ attemptId, enabled, active }: { attemptId: string; enabled: boolean; active: boolean }) {
  const [interrupted, setInterrupted] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!enabled || !active) return;
    let episode: string | null = null;
    let writes = Promise.resolve();
    const key = `mock-interruption:${getDefaultBrowserSessionManager().getState().user?.id}:${attemptId}`;
    try { episode = sessionStorage.getItem(key); } catch {}
    function record(id: string, ended: boolean) {
      writes = writes.then(() => recordMockInterruption(attemptId, id, ended)).catch(() => {
        setMessage("Some interruption details could not sync. Your academic score is unaffected.");
      });
    }
    function check() {
      const away = document.hidden || !document.fullscreenElement;
      setInterrupted(away);
      const transition = interruptionTransition(Boolean(episode), document.hidden, Boolean(document.fullscreenElement));
      if (transition === "start") {
        episode = crypto.randomUUID();
        try { sessionStorage.setItem(key, episode); } catch {}
        record(episode, false);
      } else if (transition === "end" && episode) {
        record(episode, true);
        episode = null;
        try { sessionStorage.removeItem(key); } catch {}
      }
    }
    check();
    document.addEventListener("visibilitychange", check);
    document.addEventListener("fullscreenchange", check);
    return () => {
      document.removeEventListener("visibilitychange", check);
      document.removeEventListener("fullscreenchange", check);
    };
  }, [attemptId, enabled, active]);

  if (enabled && interrupted && active) {
    return (
      <div role="status" className="bg-amber-100 border-b border-amber-300 px-4 py-2.5 text-xs text-amber-950 flex flex-wrap items-center justify-between gap-2 z-20 shadow-xs">
        <div className="flex items-center gap-2">
          <AlertTriangle size={15} className="text-amber-800 shrink-0" />
          <span><strong>Mock interrupted</strong> · Timer is still running. Return to fullscreen when ready.</span>
        </div>
        <button
          type="button"
          className="px-3.5 py-1.5 rounded-lg bg-amber-900 hover:bg-amber-800 text-white font-bold text-xs shrink-0 cursor-pointer transition active:scale-95"
          onClick={() => {
            const el = document.documentElement as unknown as { requestFullscreen?: () => Promise<void>; webkitRequestFullscreen?: () => void };
            if (el.requestFullscreen) {
              el.requestFullscreen().catch(() => setMessage("Fullscreen was declined. You can retry; your timer continues."));
            } else if (el.webkitRequestFullscreen) {
              el.webkitRequestFullscreen();
            } else {
              setMessage("Fullscreen is unavailable on this browser.");
            }
          }}
        >
          Return to fullscreen
        </button>
      </div>
    );
  }

  if (message) {
    return (
      <div role="status" className="bg-slate-100 border-b border-slate-200 px-4 py-1.5 text-xs text-slate-600 flex items-center justify-between">
        <span>{message}</span>
        <button type="button" onClick={() => setMessage("")} className="text-slate-400 hover:text-slate-700 text-sm cursor-pointer font-bold">×</button>
      </div>
    );
  }

  return null;
}
