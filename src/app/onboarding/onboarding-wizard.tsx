"use client";

import { useState, useEffect } from "react";
import { getAccountCoordinator, OnboardingData } from "@/lib/auth/account-coordinator";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Compass,
  GraduationCap,
  Loader2,
  Target,
} from "lucide-react";
import { ResourceStatus } from "@/lib/api/use-api-resource";
import {
  clearLockedCombination,
  clearOnboardingDraft,
  getLockedCombination,
  getOnboardingDraft,
  type LockedCourseCombination,
  saveOnboardingDraft,
} from "@/lib/curriculum/locked-combination-storage";

const targetPresets = [
  { score: 220, label: "Personal target" },
  { score: 250, label: "Personal target" },
  { score: 280, label: "Personal target" },
  { score: 310, label: "Personal target" },
];

export function OnboardingWizard() {
  const [selectedElectives, setSelectedElectives] = useState<string[]>([]);
  const [targetScore, setTargetScore] = useState<number>(280);
  const [targetInstitution, setTargetInstitution] = useState<string>("");
  const [targetCourse, setTargetCourse] = useState<string>("");
  const [lockedCombo, setLockedCombo] = useState<LockedCourseCombination | null>(null);
  const router = useRouter();
  const [catalog, setCatalog] = useState<OnboardingData | null>(null);
  const [state, setState] = useState<{ error?: string } | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setCatalog(null);
    setState(null);
    void getAccountCoordinator()
      .loadOnboarding()
      .then((data) => {
        if (!active) return;
        setCatalog(data);

        const available = new Set(
          data.availableSubjects
            .filter((subject) => subject.code !== "ENG" && !subject.is_compulsory)
            .map((subject) => subject.name)
        );

        const existingEnrolled = [
          ...new Set(
            data.enrolledSubjects
              .filter((subject) => available.has(subject.name))
              .map((subject) => subject.name)
          ),
        ].slice(0, 3);

        const draft = getOnboardingDraft();
        const locked = getLockedCombination();
        setLockedCombo(locked);

        // Restore institution from draft or server preferences
        const resolvedInstitution =
          draft?.targetInstitution !== undefined
            ? draft.targetInstitution
            : (data.preferences?.target_institution ?? "");
        setTargetInstitution(resolvedInstitution);

        // If a locked combination is present and either:
        // (a) the student returned from `/combinations?from=onboarding` (`onboarding-return`), or
        // (b) the student has not yet completed 3 saved subjects on the server
        if (
          locked &&
          (locked.source === "onboarding-return" || existingEnrolled.length < 3)
        ) {
          const matchedLockedElectives = locked.electiveNames.filter((name) =>
            available.has(name)
          );
          if (matchedLockedElectives.length === 3) {
            setSelectedElectives(matchedLockedElectives);
          } else if (draft?.selectedElectives && draft.selectedElectives.length > 0) {
            setSelectedElectives(
              draft.selectedElectives.filter((name) => available.has(name)).slice(0, 3)
            );
          } else {
            setSelectedElectives(existingEnrolled);
          }
          setTargetScore(locked.recommendedTargetScore);
          setTargetCourse(locked.courseTitle);
          return;
        }

        // Otherwise restore from draft if present, falling back to server values
        if (draft?.selectedElectives && draft.selectedElectives.length > 0) {
          setSelectedElectives(
            draft.selectedElectives.filter((name) => available.has(name)).slice(0, 3)
          );
        } else {
          setSelectedElectives(existingEnrolled);
        }

        setTargetScore(
          draft?.targetScore ?? data.preferences?.target_score ?? 280
        );
        setTargetCourse(
          draft?.targetCourse ?? data.preferences?.target_course ?? ""
        );
      })
      .catch((err: unknown) => {
        if (active) {
          setState({
            error:
              err instanceof Error
                ? err.message
                : "Unable to load your subject choices.",
          });
        }
      });
    return () => {
      active = false;
    };
  }, [loadAttempt]);

  const electives =
    catalog?.availableSubjects
      .filter((subject) => subject.code !== "ENG" && !subject.is_compulsory)
      .map((subject) => subject.name) ?? [];

  function handleNavigateToCombinationFinder() {
    saveOnboardingDraft({
      targetInstitution,
      targetCourse,
      targetScore,
      selectedElectives,
    });
    router.push("/combinations?from=onboarding");
  }

  const formAction = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isPending || !catalog) return;
    setIsPending(true);
    setState(null);
    try {
      await getAccountCoordinator().saveOnboarding({
        electives: selectedElectives,
        targetScore,
        targetInstitution: targetInstitution.trim() || null,
        targetCourse: targetCourse.trim() || null,
      });
      clearLockedCombination();
      clearOnboardingDraft();
      router.replace("/dashboard");
    } catch (err: unknown) {
      setState({
        error:
          err instanceof Error
            ? err.message
            : "Your setup could not be saved. Please retry.",
      });
    } finally {
      setIsPending(false);
    }
  };

  const toggleElective = (subject: string) => {
    if (selectedElectives.includes(subject)) {
      setSelectedElectives((prev) => prev.filter((s) => s !== subject));
    } else if (selectedElectives.length < 3) {
      setSelectedElectives((prev) => [...prev, subject]);
    }
  };

  const isReady =
    Boolean(
      catalog?.availableSubjects.some(
        (subject) => subject.code === "ENG" && subject.is_compulsory
      )
    ) && selectedElectives.length === 3;

  if (!catalog)
    return (
      <>
        <ResourceStatus
          error={state?.error ?? null}
          retry={() => {
            getAccountCoordinator().clear();
            setLoadAttempt((value) => value + 1);
          }}
        />
        {state?.error &&
          typeof window !== "undefined" &&
          ["localhost", "127.0.0.1"].includes(window.location.hostname) && (
            <p className="mt-4 text-sm text-slate-600">
              This local preview uses a separate test database.{" "}
              <a
                className="font-semibold text-emerald-800 underline"
                href="https://jambprep.lecterniq.com/onboarding/?edit=1"
              >
                Open the live subject selector
              </a>
            </p>
          )}
      </>
    );

  return (
    <form onSubmit={formAction} className="space-y-8">
      {state?.error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-800"
        >
          {state.error}
        </div>
      )}

      {!catalog && <p role="status">Loading subject choices…</p>}
      {!catalog && state?.error && (
        <button
          type="button"
          onClick={() => {
            getAccountCoordinator().clear();
            setLoadAttempt((value) => value + 1);
          }}
        >
          Retry loading subjects
        </button>
      )}
      {/* Hidden input to pass selected electives */}
      <input
        type="hidden"
        name="electives"
        value={JSON.stringify(selectedElectives)}
      />
      <input type="hidden" name="targetScore" value={targetScore} />

      {/* Course Combination Finder Callout / Locked Banner */}
      {lockedCombo ? (
        <div className="rounded-2xl border-2 border-[#116149] bg-[#eef8f3] p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#116149]">
                <CheckCircle2 size={15} />
                <span>Course Locked In: {lockedCombo.courseTitle}</span>
              </div>
              <p className="mt-1 text-xs sm:text-sm text-slate-700">
                <strong>Official Subjects:</strong> Use of English,{" "}
                {lockedCombo.electiveNames.join(", ")} ·{" "}
                <strong>Recommended Target:</strong>{" "}
                {lockedCombo.recommendedTargetScore}/400
              </p>
            </div>
            <button
              type="button"
              onClick={handleNavigateToCombinationFinder}
              className="self-start sm:self-auto shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-[#116149]/30 bg-white px-3.5 py-2 text-xs font-bold text-[#116149] hover:bg-emerald-50 transition cursor-pointer"
            >
              <span>Change course on Combination Finder</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-emerald-950/15 bg-[#fafbf7] p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#e6f4ee] text-[#116149]">
                <Compass size={18} />
              </span>
              <div>
                <p className="text-sm font-bold text-slate-900">
                  Not sure which subjects your course requires?
                </p>
                <p className="mt-0.5 text-xs text-slate-600 leading-relaxed">
                  Visit the Course Combination Finder to look up your course, lock in your official 4 UTME subjects, and continue your registration.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleNavigateToCombinationFinder}
              className="self-start sm:self-auto shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-[#116149] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#0b4936] transition cursor-pointer"
            >
              <span>Find &amp; Lock In My Course Combination</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

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
              <small className="mt-0.5 block text-xs text-emerald-100">
                Compulsory for all candidates
              </small>
            </div>
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-800 text-white">
              <Check size={14} />
            </span>
          </div>

          {/* 24 Electives */}
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

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5">
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
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
            3. First Choice Institution &amp; Course{" "}
            <span className="font-normal text-slate-400 lowercase">(optional)</span>
          </label>
          <button
            type="button"
            onClick={handleNavigateToCombinationFinder}
            className="inline-flex items-center gap-1 text-xs font-bold text-[#116149] hover:underline cursor-pointer"
          >
            <GraduationCap size={14} />
            <span>Select course via Combination Finder →</span>
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <input
              name="targetInstitution"
              value={targetInstitution}
              onChange={(e) => setTargetInstitution(e.target.value)}
              aria-label="First-choice institution"
              type="text"
              placeholder="e.g. University of Lagos (UNILAG)"
              className="w-full min-h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-[#092E28] placeholder:text-slate-400 focus:border-[#116149] focus:outline-none transition-colors"
            />
          </div>
          <div>
            <input
              name="targetCourse"
              value={targetCourse}
              onChange={(e) => setTargetCourse(e.target.value)}
              aria-label="Course of study"
              type="text"
              placeholder="e.g. Medicine and Surgery"
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
            Complete Setup &amp; Enter Dashboard <ArrowRight size={16} />
          </>
        )}
      </button>
    </form>
  );
}
