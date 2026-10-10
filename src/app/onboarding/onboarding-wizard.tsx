"use client";

import { useState, useActionState } from "react";
import { saveOnboardingAction } from "@/app/actions/onboarding";
import { Check, ArrowRight, Loader2, Target } from "lucide-react";

const electives = [
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "Economics",
  "Government",
  "Literature in English",
];

const targetPresets = [
  { score: 220, label: "Personal target" },
  { score: 250, label: "Personal target" },
  { score: 280, label: "Personal target" },
  { score: 310, label: "Personal target" },
];

export function OnboardingWizard() {
  const [selectedElectives, setSelectedElectives] = useState<string[]>([]);
  const [targetScore, setTargetScore] = useState<number>(280);
  const [state, formAction, isPending] = useActionState(saveOnboardingAction, null);

  const toggleElective = (subject: string) => {
    if (selectedElectives.includes(subject)) {
      setSelectedElectives((prev) => prev.filter((s) => s !== subject));
    } else if (selectedElectives.length < 3) {
      setSelectedElectives((prev) => [...prev, subject]);
    }
  };

  const isReady = selectedElectives.length === 3;

  return (
    <form action={formAction} className="space-y-8">
      {state?.error && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-800">
          {state.error}
        </div>
      )}

      {/* Hidden input to pass selected electives */}
      <input type="hidden" name="electives" value={JSON.stringify(selectedElectives)} />
      <input type="hidden" name="targetScore" value={targetScore} />

      {/* Section 1: Subject Selection */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
            1. Select Your 4 Subjects
          </label>
          <span className="text-xs font-semibold text-[#116149]">
            {selectedElectives.length}/3 Electives Selected
          </span>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2">
          {/* Use of English - Fixed */}
          <div className="flex min-h-16 items-center justify-between gap-3 rounded-2xl bg-[#116149] p-4 text-white shadow-sm">
            <div>
              <span className="font-semibold text-sm">Use of English</span>
              <small className="mt-0.5 block text-xs text-emerald-100">Compulsory for all candidates</small>
            </div>
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-800 text-white">
              <Check size={14} />
            </span>
          </div>

          {/* 7 Electives */}
          {electives.map((subject) => {
            const active = selectedElectives.includes(subject);
            const disabled = !active && selectedElectives.length >= 3;

            return (
              <button
                type="button"
                key={subject}
                aria-pressed={active}
                disabled={disabled}
                onClick={() => toggleElective(subject)}
                className={`flex min-h-16 items-center justify-between gap-3 rounded-2xl border p-4 text-left text-sm font-medium transition-all ${
                  active
                    ? "border-[#116149] bg-emerald-50 text-[#092E28]"
                    : "border-slate-200 bg-white text-slate-700 enabled:hover:border-slate-300"
                } ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
              >
                <span>{subject}</span>
                <span
                  className={`flex size-6 shrink-0 items-center justify-center rounded-full border transition-colors ${
                    active
                      ? "border-[#116149] bg-[#116149] text-white"
                      : "border-slate-300 bg-white text-transparent"
                  }`}
                >
                  <Check size={14} />
                </span>
              </button>
            );
          })}
        </div>

        <p className="mt-3 text-xs text-slate-500">
          {selectedElectives.length === 3 ? (
            <span className="text-emerald-800 font-medium">
              ✓ Ready: English, {selectedElectives.join(", ")}.
            </span>
          ) : (
            `Choose ${3 - selectedElectives.length} more subject${3 - selectedElectives.length === 1 ? "" : "s"} to complete your combination.`
          )}
        </p>
      </div>

      {/* Section 2: Target Score */}
      <div className="border-t border-slate-100 pt-6">
        <div className="flex items-center justify-between mb-3">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
            2. Set Your Target UTME Score
          </label>
          <div className="flex items-center gap-1.5 text-sm font-bold text-[#116149]">
            <Target size={16} />
            <span>{targetScore} / 400</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {targetPresets.map((preset) => (
            <button
              type="button"
              key={preset.score}
              aria-pressed={targetScore === preset.score}
              onClick={() => setTargetScore(preset.score)}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                targetScore === preset.score
                  ? "border-[#116149] bg-emerald-50 text-[#092E28]"
                  : "border-slate-200 bg-white hover:border-slate-300 text-slate-700"
              }`}
            >
              <div className="text-lg font-bold">{preset.score}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">{preset.label}</div>
            </button>
          ))}
        </div>

        <div className="mt-4">
          <input
            type="range"
            aria-label="Target UTME score"
            min={150}
            max={380}
            step={5}
            value={targetScore}
            onChange={(e) => setTargetScore(Number(e.target.value))}
            className="w-full accent-[#116149] cursor-pointer"
          />
        </div>
      </div>

      {/* Section 3: Aspirations (Optional) */}
      <div className="border-t border-slate-100 pt-6">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
          3. First Choice Institution & Course <span className="font-normal text-slate-400 lowercase">(optional)</span>
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <input
              name="targetInstitution"
              aria-label="First-choice institution"
              type="text"
              placeholder="e.g. University of Lagos (UNILAG)"
              className="w-full min-h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-[#092E28] placeholder:text-slate-400 focus:border-[#116149] focus:outline-none transition-colors"
            />
          </div>
          <div>
            <input
              name="targetCourse"
              aria-label="Course of study"
              type="text"
              placeholder="e.g. Personal target"
              className="w-full min-h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-[#092E28] placeholder:text-slate-400 focus:border-[#116149] focus:outline-none transition-colors"
            />
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={!isReady || isPending}
        className="w-full min-h-12 inline-flex items-center justify-center gap-2 rounded-full bg-[#116149] px-6 text-sm font-semibold text-white transition hover:bg-[#0b4936] hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 cursor-pointer"
      >
        {isPending ? (
          <>
            <Loader2 className="animate-spin" size={16} /> Saving your setup...
          </>
        ) : (
          <>
            Complete Setup & Enter Dashboard <ArrowRight size={16} />
          </>
        )}
      </button>
    </form>
  );
}
