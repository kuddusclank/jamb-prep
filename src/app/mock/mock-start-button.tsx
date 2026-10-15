"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { startMockAttempt } from "@/lib/client-actions";
import { buildCanonicalExamUrl } from "@/lib/routing/deep-links";

export function MockStartButton({canStart=true,activeAttemptId=null}:{canStart?:boolean;activeAttemptId?:string|null}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [conditions, setConditions] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState("");

  const [fullscreenSupported, setFullscreenSupported] = useState<boolean | null>(null);
  useEffect(() => {
    setFullscreenSupported(Boolean(document.fullscreenEnabled && document.documentElement.requestFullscreen));
  }, []);

  function handleStart() {
    setError("");
    if(activeAttemptId){router.push(buildCanonicalExamUrl(activeAttemptId));return;}
    if(!canStart)return;
    // Invoke synchronously from the click to preserve browser user activation.
    const fullscreen = conditions
      ? document.fullscreenEnabled && document.documentElement.requestFullscreen
        ? document.documentElement.requestFullscreen()
        : Promise.reject(new Error("Fullscreen is unavailable. Choose Standard mock on this device."))
      : Promise.resolve();
    startTransition(async () => {
      try {
        await fullscreen;
      } catch {
        setError("Fullscreen was unavailable or declined. Choose Standard mock, or try again. No new attempt has started.");
        return;
      }
      try {
        const payload = await startMockAttempt(conditions);
        router.push(buildCanonicalExamUrl(payload.attemptId));
      } catch (error) {
        setError(error instanceof Error ? error.message : "We could not start your mock. Please retry.");
        if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
      }
    });
  }

  return (
    <div className="w-full space-y-5">
      <fieldset disabled={isPending} className="space-y-3">
        <legend className="mb-3 font-semibold">Choose your mock experience</legend>
        <label className="flex min-h-24 cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/50 p-5 has-checked:border-emerald-700 has-checked:bg-emerald-50/60">
          <input type="radio" name="mock-mode" checked={!conditions} onChange={() => { setConditions(false); setError(""); }} className="mt-1" />
          <span><strong>Standard mock</strong><span className="block text-sm text-slate-600">Timed practice. Fullscreen is optional; no interruption monitoring.</span></span>
        </label>
        <label className="flex min-h-24 cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/50 p-5 has-checked:border-emerald-700 has-checked:bg-emerald-50/60">
          <input type="radio" name="mock-mode" checked={conditions} disabled={fullscreenSupported !== true} onChange={() => { setConditions(true); setError(""); }} className="mt-1" />
          <span><strong>Exam Conditions</strong><span className="block text-sm text-slate-600">{fullscreenSupported === false ? "Unavailable in this browser. Choose Standard mock; it works without fullscreen." : "Fullscreen required. Hiding the page or leaving fullscreen records an interruption, separately from your score."}</span></span>
        </label>
      </fieldset>
      <p className="text-sm text-slate-600">Close unrelated tabs and applications and complete the mock independently. We cannot check your other tabs. No microphone or camera is used. The timer continues during interruptions.</p>
      <label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} disabled={isPending} className="mt-1" />I understand these rules. Interruptions alone do not establish malpractice.</label>
      {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p>}
      <button type="button" onClick={handleStart} disabled={isPending || (!activeAttemptId&&(!accepted||!canStart))} className="w-full min-h-12 rounded-full bg-[#116149] px-6 py-3 font-semibold text-white disabled:opacity-50">
        {isPending ? "Preparing your mock…" : activeAttemptId?"Resume saved mock":canStart?"Start mock":"Mock bank not ready"}
      </button>
      <p className="text-xs text-slate-500">An existing active mock resumes with its original mode and timer.</p>
    </div>
  );
}
