"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useApiResource } from "@/lib/api/use-api-resource";
import { getAccountCoordinator } from "@/lib/auth/account-coordinator";

interface RatingStatus { eligible: boolean; submitted: boolean; }

export function MockResultRatingPrompt({ attemptId }: { attemptId: string }) {
  const resource = useApiResource<RatingStatus>(`/api/v1/exams/attempts/${attemptId}/app-rating`);
  const [visible, setVisible] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!resource.data?.eligible || resource.data.submitted) return;
    const storageKey = `jambprep_rating_dismissed:${attemptId}`;
    try {
      if (window.sessionStorage.getItem(storageKey)) return;
    } catch { /* The prompt remains available if storage is disabled. */ }
    const timeout = window.setTimeout(() => setVisible(true), 20_000);
    return () => window.clearTimeout(timeout);
  }, [attemptId, resource.data]);

  useEffect(() => {
    if (!visible) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        try { window.sessionStorage.setItem(`jambprep_rating_dismissed:${attemptId}`, "1"); } catch { /* Optional persistence. */ }
        setVisible(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [attemptId, visible]);

  function dismiss() {
    try { window.sessionStorage.setItem(`jambprep_rating_dismissed:${attemptId}`, "1"); } catch { /* Optional persistence. */ }
    setVisible(false);
  }

  async function submit() {
    if (rating < 1 || saving) return;
    setSaving(true);
    setMessage(null);
    try {
      await getAccountCoordinator().mutate(`/api/v1/exams/attempts/${attemptId}/app-rating`, { rating, comment }, "POST");
      resource.retry();
      setMessage("Thanks for helping us improve JAMBPrep.");
      window.setTimeout(() => setVisible(false), 1400);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "We could not save your rating. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (!visible) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/20 p-4 sm:items-center" onMouseDown={(event) => { if (event.target === event.currentTarget) dismiss(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="app-rating-title" className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">One quick question</p>
            <h2 id="app-rating-title" className="mt-1 text-lg font-semibold text-slate-900">How was your mock experience?</h2>
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="shrink-0 -mr-1 -mt-1 flex size-8 items-center justify-center rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer active:scale-95"
            aria-label="Close rating prompt"
          >
            <X size={18} />
          </button>
        </div>
        <fieldset className="mt-4">
          <legend className="sr-only">Rate your experience from 1 to 5</legend>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((value) => (
              <label key={value} className="cursor-pointer">
                <input className="peer sr-only" type="radio" name={`rating-${attemptId}`} value={value} checked={rating === value} onChange={() => setRating(value)} aria-label={`${value} out of 5`} />
                <span aria-label={`${value} out of 5`} className={`flex min-h-11 min-w-11 items-center justify-center rounded-xl border text-lg transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-emerald-700 ${rating >= value ? "border-amber-300 bg-amber-50 text-amber-600" : "border-slate-200 text-slate-400 hover:bg-slate-50"}`}>★</span>
              </label>
            ))}
          </div>
        </fieldset>
        <label className="mt-4 block text-sm font-medium text-slate-700" htmlFor="mock-rating-comment">Anything we should improve? <span className="font-normal text-slate-400">(optional)</span></label>
        <textarea id="mock-rating-comment" value={comment} onChange={(event) => setComment(event.target.value)} maxLength={500} rows={2} className="mt-2 w-full resize-y rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15" placeholder="Share a short note" />
        {message && <p role="status" className="mt-2 text-sm text-slate-600">{message}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={dismiss} className="min-h-11 rounded-full px-4 text-sm font-medium text-slate-600 hover:bg-slate-100">Maybe later</button>
          <button type="button" disabled={rating < 1 || saving} onClick={() => void submit()} className="min-h-11 rounded-full bg-[#116149] px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{saving ? "Sending…" : "Send rating"}</button>
        </div>
      </section>
    </div>
  );
}
