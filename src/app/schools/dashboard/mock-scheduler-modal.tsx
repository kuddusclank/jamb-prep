"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  X, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Printer, 
  Copy, 
  Check,
  Zap,
  ArrowRight
} from "lucide-react";

interface MockSchedulerModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolName: string;
  schoolCode: string;
  activeCandidatesCount: number;
  onScheduled?: (session: any) => void;
}

export function MockSchedulerModal({
  isOpen,
  onClose,
  schoolName,
  schoolCode,
  activeCandidatesCount,
  onScheduled,
}: MockSchedulerModalProps) {
  const [title, setTitle] = useState("");
  const [timingMode, setTimingMode] = useState<"immediate" | "scheduled">("immediate");
  const [scheduledDateTime, setScheduledDateTime] = useState("");
  const [hotkeyMode, setHotkeyMode] = useState(true);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scheduledSession, setScheduledSession] = useState<any | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const handlePrint = () => {
    document.body.classList.add("printing-mock-scheduler");
    window.print();
  };

  useEffect(() => {
    const handleAfterPrint = () => {
      document.body.classList.remove("printing-mock-scheduler");
    };
    window.addEventListener("afterprint", handleAfterPrint);
    return () => {
      window.removeEventListener("afterprint", handleAfterPrint);
      document.body.classList.remove("printing-mock-scheduler");
    };
  }, []);

  if (!isOpen) return null;

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsPending(true);

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "https://jambprep-api-foundation.abdulquddus-akanbi.workers.dev";
      const supabase = createClient();
      const sessionRes = await supabase.auth.getSession();
      const token = sessionRes?.data?.session?.access_token;

      if (!token) {
        throw new Error("Your administrator session has expired. Please sign in again to schedule a computer lab mock.");
      }

      const payload = {
        title,
        scheduledDate: timingMode === "immediate" ? new Date().toISOString() : scheduledDateTime,
        durationMinutes: 120,
        totalQuestions: 180,
        hotkeyNavigationEnabled: hotkeyMode,
      };

      const res = await fetch(`${apiBase}/api/v1/schools/mocks/schedule`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const sessionData = await res.json().catch(() => ({}));
      if (!res.ok || !sessionData?.session) {
        const msg =
          (typeof sessionData?.error === "string" && sessionData.error) ||
          sessionData?.error?.message ||
          sessionData?.message ||
          "Could not schedule the CBT lab mock session. Please try again.";
        throw new Error(msg);
      }

      if (!Array.isArray(sessionData.instructions)) {
        sessionData.instructions = [
          "Ensure all laboratory desktop monitors are connected to the school LAN or internet.",
          "Students simply visit /mock; their school mock card appears automatically.",
          "No manual session codes or passwords required.",
          "Strict lab hours are enforced based on the scheduled start time and duration.",
          "Scores automatically synchronize to the live ranked leaderboard on your administrator dashboard.",
        ];
      }

      setScheduledSession(sessionData);
      setIsPending(false);
      if (onScheduled && sessionData?.session) {
        onScheduled(sessionData.session);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "A network error occurred.");
      setIsPending(false);
    }
  };

  const handleCopyCode = (code: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  return (
    <div 
      data-print-target="mock-scheduler"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200 print:static print:p-0 print:bg-white print:backdrop-blur-none print:z-auto print:block print:w-full print:h-auto"
    >
      <div 
        data-print-dialog="true"
        className="relative w-full max-w-lg rounded-2xl bg-white p-6 sm:p-7 text-slate-900 border border-slate-200 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto print:max-h-none print:overflow-visible print:p-0 print:border-none print:shadow-none print:max-w-none print:w-full"
        role="dialog"
        aria-modal="true"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 flex size-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer print:hidden"
          aria-label="Close modal"
        >
          <X size={16} />
        </button>

        {!scheduledSession ? (
          <form onSubmit={handleScheduleSubmit} className="space-y-4">
            <div className="space-y-1.5 pb-4 border-b border-slate-100">
              <div className="inline-flex items-center gap-1.5 rounded-md bg-[#EAF4EF] border border-[#12664F]/20 px-2 py-0.5 text-[11px] font-medium text-[#12664F]">
                <Clock size={12} />
                <span>Synchronized CBT Lab Session</span>
              </div>
              <h2 className="text-lg font-semibold text-slate-900">
                Launch Synchronized Computer Lab Mock
              </h2>
              <p className="text-xs text-slate-500 font-normal">
                Simulate official JAMB examination conditions across your computer laboratory desktop workstations.
              </p>
            </div>

            {error && (
              <div role="alert" className="rounded-xl border border-red-200 bg-red-50/70 p-3 text-xs text-red-800 flex items-start gap-2.5">
                <AlertCircle size={15} className="shrink-0 text-red-600 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Exam Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700 block">
                Mock Examination Title
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Term 2 Grand UTME Simulation"
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#12664F]/20 focus:border-[#12664F] transition-all"
              />
            </div>

            {/* Launch Timing */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-700 block">
                Session Commencement
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setTimingMode("immediate")}
                  className={`p-3.5 rounded-xl border text-left transition cursor-pointer ${
                    timingMode === "immediate"
                      ? "border-[#12664F] bg-[#EAF4EF]/70 ring-1 ring-[#12664F]"
                      : "border-slate-200 bg-slate-50/60 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-medium text-xs text-slate-900">
                    <Zap size={14} className="text-[#12664F]" />
                    <span>Launch Immediately</span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-normal block mt-1">Students can start immediately on /mock</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTimingMode("scheduled")}
                  className={`p-3.5 rounded-xl border text-left transition cursor-pointer ${
                    timingMode === "scheduled"
                      ? "border-[#12664F] bg-[#EAF4EF]/70 ring-1 ring-[#12664F]"
                      : "border-slate-200 bg-slate-50/60 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-medium text-xs text-slate-900">
                    <Calendar size={14} className="text-slate-500" />
                    <span>Schedule Date/Time</span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-normal block mt-1">Strict lab hours countdown</span>
                </button>
              </div>

              {timingMode === "scheduled" && (
                <input
                  type="datetime-local"
                  required
                  value={scheduledDateTime}
                  onChange={(e) => setScheduledDateTime(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 mt-2 focus:outline-none focus:ring-2 focus:ring-[#12664F]/20 focus:border-[#12664F] transition-all"
                />
              )}
            </div>

            {/* Examination Parameters Badge */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-xs space-y-3">
              <span className="font-semibold text-slate-800 block text-[11px] uppercase tracking-wider">
                Standard UTME Simulation Parameters
              </span>
              <div className="grid grid-cols-2 gap-2.5 text-[11px] text-slate-500">
                <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200">
                  <span>Duration:</span>
                  <span className="font-medium text-slate-900">120 Minutes (2h)</span>
                </div>
                <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200">
                  <span>Questions:</span>
                  <span className="font-medium text-slate-900">180 Questions</span>
                </div>
                <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200">
                  <span>Eligible Candidates:</span>
                  <span className="font-medium text-[#12664F]">{activeCandidatesCount} Enrolled</span>
                </div>
                <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200">
                  <span>Navigation:</span>
                  <span className="font-medium text-slate-900">8-Key Hotkeys</span>
                </div>
              </div>

              {/* Hotkey Mode Switch */}
              <label className="flex items-center gap-2.5 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hotkeyMode}
                  onChange={(e) => setHotkeyMode(e.target.checked)}
                  className="rounded border-slate-300 text-[#12664F] focus:ring-[#12664F] size-3.5"
                />
                <span className="text-[11px] text-slate-500 font-normal">
                  Enforce strict 8-key examination navigation (A, B, C, D, P, N, S, R keyboard shortcuts).
                </span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-600 hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="inline-flex items-center gap-2 rounded-xl bg-[#12664F] px-5 py-2.5 text-xs font-medium text-white hover:bg-[#0B3028] transition cursor-pointer disabled:opacity-50"
              >
                {isPending ? (
                  <>
                    <Loader2 size={14} className="animate-spin text-white" />
                    <span>Scheduling Session...</span>
                  </>
                ) : (
                  <>
                    <span>Schedule Lab Mock Session</span>
                    <ArrowRight size={13} />
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          /* Success / Active Lab Session View */
          <div className="space-y-5">
            <div className="text-center space-y-1.5">
              <span className="flex size-12 items-center justify-center rounded-xl bg-[#EAF4EF] text-[#12664F] mx-auto border border-[#12664F]/15">
                <CheckCircle2 size={24} />
              </span>
              <h2 className="text-base sm:text-lg font-semibold text-slate-900">Lab Mock Session Activated!</h2>
              <p className="text-xs text-slate-500 font-normal">{scheduledSession.session.title}</p>
            </div>

            {/* Session Code & Automatic Binding */}
            <div className="rounded-xl border border-[#12664F]/30 bg-[#EAF4EF]/60 p-5 text-center space-y-2.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#12664F] block">
                Candidate Lab Entry Code
              </span>
              <p className="font-mono text-3xl font-semibold text-[#0B3028] tracking-widest">
                {scheduledSession.session.labSessionCode}
              </p>
              <p className="text-[11px] text-slate-600 font-normal max-w-sm mx-auto">
                Candidates can enter this session code on their screens, or simply log in and click <strong>&quot;Start Official School Mock&quot;</strong> during lab hours.
              </p>
              <button
                type="button"
                onClick={() => handleCopyCode(scheduledSession.session.labSessionCode)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-1.5 text-xs font-medium text-slate-700 border border-slate-200 hover:bg-slate-50 transition cursor-pointer"
              >
                {copiedCode ? <Check size={13} className="text-[#12664F]" /> : <Copy size={13} />}
                <span>{copiedCode ? "Copied" : "Copy Session Code"}</span>
              </button>
            </div>

            {/* Proctoring Briefing Card */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-2.5 text-xs">
              <div className="flex items-center justify-between font-medium text-slate-800 pb-2 border-b border-slate-200/80">
                <span>Teacher Proctor Reference</span>
                <span className="font-mono text-xs font-semibold text-[#12664F] bg-white px-2.5 py-0.5 rounded-md border border-slate-200">
                  {scheduledSession.session.proctorKey}
                </span>
              </div>
              <ul className="space-y-1.5 text-[11px] text-slate-500 pt-1 font-normal">
                {(scheduledSession.instructions || []).map((ins: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-[#12664F] font-semibold">•</span>
                    <span>{ins}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex items-center justify-between pt-2 print:hidden border-t border-slate-100">
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                <Printer size={14} />
                <span>Print Proctoring Sheet</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl bg-[#12664F] px-5 py-2.5 text-xs font-medium text-white hover:bg-[#0B3028] transition cursor-pointer"
              >
                View Leaderboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
