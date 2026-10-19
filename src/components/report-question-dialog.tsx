"use client";

import { useState, useRef, useEffect } from "react";
import { Flag } from "lucide-react";
import { getAccountCoordinator } from "@/lib/auth/account-coordinator";

interface ReportQuestionDialogProps {
  questionId: string;
  attemptId?: string | null;
  buttonClassName?: string;
  variant?: "text" | "icon";
}

export function ReportQuestionDialog({
  questionId,
  attemptId,
  buttonClassName,
  variant = "text",
}: ReportQuestionDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState<string>("wrong_key");
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => { if (isOpen && !dialogRef.current?.open) dialogRef.current?.showModal(); }, [isOpen]);
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrorMsg("");

    try {
      await getAccountCoordinator().mutate(
        "/api/v1/reports/question",
        {
          questionId,
          attemptId: attemptId || null,
          reason,
          comment: comment.trim() || null,
        },
        "POST"
      );
      setSubmitted(true);
      timerRef.current = setTimeout(() => {
        setIsOpen(false);
        setSubmitted(false);
        setComment("");
      }, 1500);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to submit report.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {variant === "icon" ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          title="Report a problem with this question"
          aria-label="Report a problem with this question"
          className={
            buttonClassName ||
            "inline-flex size-6 items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
          }
        >
          <Flag size={13} />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={buttonClassName || "text-xs text-slate-500 hover:text-rose-600 underline"}
        >
          Report a problem
        </button>
      )}

      {isOpen && (
        <dialog ref={dialogRef} onCancel={() => setIsOpen(false)} aria-labelledby="report-dialog-title" className="fixed inset-0 z-50 m-0 flex h-full max-h-none w-full max-w-none items-center justify-center border-0 bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 id="report-dialog-title" className="text-base font-bold text-slate-900">Report Question Issue</h3>
              <button
                type="button"
                aria-label="Close report dialog"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            {submitted ? (
              <div className="py-8 text-center">
                <span className="text-3xl">✓</span>
                <p className="mt-2 text-sm font-semibold text-emerald-800">
                  Thank you! Your report has been submitted to the academic team.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
                {errorMsg && (
                  <div role="alert" className="rounded-lg bg-rose-50 border border-rose-200 p-2.5 text-rose-800">
                    {errorMsg}
                  </div>
                )}

                <div>
                  <label htmlFor="report-reason" className="block font-semibold text-slate-700">
                    What is the issue?
                  </label>
                  <select
                    id="report-reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-800 focus:border-[#116149] focus:outline-hidden"
                  >
                    <option value="wrong_key">The marked correct answer is incorrect</option>
                    <option value="ambiguous_wording">The question wording is confusing or ambiguous</option>
                    <option value="multiple_or_no_correct">Multiple or no correct choices</option>
                    <option value="faulty_explanation">The explanation is inaccurate or unclear</option>
                    <option value="bad_media">Broken diagram / image formula</option>
                    <option value="wrong_topic">Question belongs to a different topic</option>
                    <option value="duplication">Duplicate question</option>
                    <option value="other">Other issue</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="report-comment" className="block font-semibold text-slate-700">
                    Additional Details (Optional)
                  </label>
                  <textarea
                    id="report-comment"
                    rows={3}
                    placeholder="Briefly describe what was inaccurate..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    maxLength={2000}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 placeholder-slate-400 focus:border-[#116149] focus:outline-hidden"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    aria-label="Close report dialog"
                onClick={() => setIsOpen(false)}
                    className="rounded-xl border border-slate-200 px-3.5 py-2 font-medium text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={busy}
                    className="rounded-xl bg-[#116149] px-4 py-2 font-semibold text-white hover:bg-[#0e4e3b] disabled:opacity-50"
                  >
                    {busy ? "Submitting…" : "Submit Report"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </dialog>
      )}
    </>
  );
}
