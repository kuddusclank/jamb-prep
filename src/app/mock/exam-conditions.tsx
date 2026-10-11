"use client";

import { getDefaultBrowserSessionManager } from "@/lib/auth/session-manager";
import { interruptionTransition } from "@/features/exam-engine/domain/interruption";
import { useEffect, useState } from "react";
import { recordMockInterruption } from "@/lib/client-actions";

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

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-5 py-2 text-xs text-slate-600">
      <p>{enabled ? "Exam Conditions · interruptions recorded separately from your score" : "Standard mock · no interruption monitoring"}</p>
      {enabled && interrupted && active && <div role="status" className="mt-3 rounded-xl bg-amber-100 p-4 text-amber-950">
        <p className="font-semibold">Your mock was interrupted. The timer is still running.</p>
        <p className="mt-1">Return to fullscreen when ready. This event does not establish malpractice.</p>
      </div>}
      <button type="button" className="min-h-11 rounded-full border border-slate-200 px-4 text-slate-700" onClick={() => {
        if (!document.documentElement.requestFullscreen) { setMessage("Fullscreen is unavailable on this browser."); return; }
        document.documentElement.requestFullscreen().catch(() => setMessage("Fullscreen was declined. You can retry; your timer continues."));
      }}>Enter / return to fullscreen</button>
      {message && <p role="status" className="mt-2">{message}</p>}
    </div>
  );
}
