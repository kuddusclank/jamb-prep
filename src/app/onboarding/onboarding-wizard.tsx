"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { getAccountCoordinator, OnboardingData } from "@/lib/auth/account-coordinator";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "@/components/pending-link";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Building2,
  Check,
  CheckCircle2,
  Compass,
  GraduationCap,
  Loader2,
  Sparkles,
  Target,
  X,
} from "lucide-react";
import { ResourceStatus } from "@/lib/api/use-api-resource";
import {
  clearLockedCombination,
  clearOnboardingDraft,
  getLockedCombination,
  getOnboardingDraft,
  type LockedCourseCombination,
  saveLockedCombination,
  saveOnboardingDraft,
  buildLockedCombinationFromCourse,
} from "@/lib/curriculum/locked-combination-storage";
import {
  getCourseById,
  JAMB_COURSE_COMBINATIONS,
  POPULAR_COURSE_IDS,
  resolveCourseElectives,
} from "@/lib/curriculum/jamb-course-combinations";

const TARGET_PRESETS = [
  { score: 220, label: "Foundation Benchmark", description: "Standard pass threshold" },
  { score: 250, label: "Competitive Target", description: "Broad university cut-offs" },
  { score: 280, label: "High Demand Faculty", description: "Engineering, Pharmacy, Finance" },
  { score: 320, label: "Merit Distinction", description: "Medicine, Law, Dentistry, CompSci" },
];

const POPULAR_INSTITUTIONS = [
  "University of Lagos (UNILAG)",
  "University of Ibadan (UI)",
  "Obafemi Awolowo University (OAU)",
  "Ahmadu Bello University (ABU)",
  "University of Nigeria, Nsukka (UNN)",
  "University of Ilorin (UNILORIN)",
  "Federal University of Technology, Akure (FUTA)",
  "Lagos State University (LASU)",
  "Covenant University",
];

const QUICK_COURSE_PRESETS = [
  { id: "medicine-and-surgery", label: "Medicine & Surgery" },
  { id: "computer-science", label: "Computer Science" },
  { id: "common-law", label: "Law (LL.B)" },
  { id: "nursing-science", label: "Nursing" },
  { id: "accounting", label: "Accounting" },
  { id: "mechanical-engineering", label: "Mechanical Eng" },
];

function OnboardingWizardInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Wizard Step: 1 = Subject Combination, 2 = Academic Goals & Targets
  const initialStep = searchParams.get("step") === "2" ? 2 : 1;
  const [step, setStep] = useState<1 | 2>(initialStep);

  const [selectedElectives, setSelectedElectives] = useState<string[]>([]);
  const [targetScore, setTargetScore] = useState<number>(280);
  const [targetInstitution, setTargetInstitution] = useState<string>("");
  const [targetCourse, setTargetCourse] = useState<string>("");
  const [lockedCombo, setLockedCombo] = useState<LockedCourseCombination | null>(null);

  const [catalog, setCatalog] = useState<OnboardingData | null>(null);
  const [state, setState] = useState<{ error?: string } | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);

  // Sync step with URL without full page reloads
  const goToStep = (newStep: 1 | 2) => {
    setStep(newStep);
    const url = new URL(window.location.href);
    url.searchParams.set("step", String(newStep));
    window.history.replaceState({}, "", url.toString());
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

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

  function handleQuickCourseSelect(courseId: string) {
    const course = getCourseById(courseId);
    if (!course) return;

    const resolved = resolveCourseElectives(course);
    const available = new Set(electives);
    const matched = resolved.electiveNames.filter((name) => available.has(name));

    if (matched.length === 3) {
      setSelectedElectives(matched);
      setTargetScore(course.recommendedTargetScore);
      setTargetCourse(course.title);

      const locked = buildLockedCombinationFromCourse(course, {
        source: "onboarding-return",
      });
      saveLockedCombination(locked);
      setLockedCombo(locked);
    }
  }

  function handleClearLockedCourse() {
    clearLockedCombination();
    setLockedCombo(null);
  }

  const toggleElective = (subject: string) => {
    if (selectedElectives.includes(subject)) {
      setSelectedElectives((prev) => prev.filter((s) => s !== subject));
    } else if (selectedElectives.length < 3) {
      setSelectedElectives((prev) => [...prev, subject]);
    }
  };

  const isStep1Complete = selectedElectives.length === 3;

  const formAction = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (step === 1) {
      if (isStep1Complete) {
        goToStep(2);
      }
      return;
    }

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

  if (!catalog) {
    return (
      <div className="py-8">
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
      </div>
    );
  }

  return (
    <form onSubmit={formAction} className="space-y-6">
      {/* 2-Step Progress Header */}
      <div className="border-b border-slate-100 pb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span
              className={`flex size-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                step === 1
                  ? "bg-[#116149] text-white"
                  : isStep1Complete
                  ? "bg-emerald-100 text-[#116149]"
                  : "bg-slate-100 text-slate-400"
              }`}
            >
              {isStep1Complete && step === 2 ? <Check size={14} /> : "1"}
            </span>
            <span
              className={`text-xs font-semibold ${
                step === 1 ? "text-[#092E28]" : "text-slate-500"
              }`}
            >
              Subjects
            </span>
            <span className="text-slate-300">/</span>
            <span
              className={`flex size-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                step === 2
                  ? "bg-[#116149] text-white"
                  : "bg-slate-100 text-slate-400"
              }`}
            >
              2
            </span>
            <span
              className={`text-xs font-semibold ${
                step === 2 ? "text-[#092E28]" : "text-slate-500"
              }`}
            >
              Academic Goals
            </span>
          </div>

          <span className="text-[11px] font-medium text-slate-500">
            Step {step} of 2
          </span>
        </div>

        {/* Dynamic Step Titles */}
        {step === 1 ? (
          <div>
            <p className="text-[10px] font-bold tracking-[0.14em] text-[#116149] uppercase">
              STEP 1: UTME EXAMINATION SUBJECTS
            </p>
            <h1 className="mt-1 text-2xl sm:text-3xl font-semibold tracking-tight text-[#092E28]">
              Select your <span className="serif-accent text-[#116149]">4 UTME subjects</span>
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm text-slate-600 leading-relaxed">
              Use of English is compulsory for all candidates. Choose your 3 elective subjects, or pick your intended course below to apply them automatically.
            </p>
          </div>
        ) : (
          <div>
            <p className="text-[10px] font-bold tracking-[0.14em] text-[#116149] uppercase">
              STEP 2: ACADEMIC GOALS &amp; TARGETS
            </p>
            <h1 className="mt-1 text-2xl sm:text-3xl font-semibold tracking-tight text-[#092E28]">
              Where are you <span className="serif-accent text-[#116149]">heading?</span>
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm text-slate-600 leading-relaxed">
              Set your target course, dream higher institution, and score goal so your CBT mock diagnostics and study coach calibrate to official cut-offs.
            </p>
          </div>
        )}
      </div>

      {state?.error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-800"
        >
          {state.error}
        </div>
      )}

      {/* Hidden inputs to pass selected values */}
      <input
        type="hidden"
        name="electives"
        value={JSON.stringify(selectedElectives)}
      />
      <input type="hidden" name="targetScore" value={targetScore} />

      {/* ========================================================================= */}
      {/* STEP 1: SUBJECT COMBINATION VIEW                                          */}
      {/* ========================================================================= */}
      {step === 1 && (
        <div className="space-y-6">
          {/* Locked Course Combination Banner or Assistant */}
          {lockedCombo ? (
            <div className="rounded-2xl border-2 border-[#116149]/35 bg-[#eef8f3] p-4 text-xs text-[#092E28]">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-bold text-[#0b4936] text-sm">
                    <GraduationCap size={16} className="shrink-0 text-[#116149]" />
                    <span>Official Combination Applied: {lockedCombo.courseTitle}</span>
                  </div>
                  <p className="text-slate-700 leading-relaxed">
                    <strong>4 Subjects:</strong> Use of English,{" "}
                    {lockedCombo.electiveNames.join(", ")} ·{" "}
                    <strong>Recommended Target:</strong>{" "}
                    {lockedCombo.recommendedTargetScore}/400
                  </p>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                  <button
                    type="button"
                    onClick={handleNavigateToCombinationFinder}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#116149]/30 bg-white px-3 py-1.5 text-xs font-semibold text-[#116149] hover:bg-emerald-50 transition cursor-pointer"
                  >
                    <span>Change course</span>
                    <ArrowRight size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={handleClearLockedCourse}
                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                    title="Clear course lock"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-emerald-950/15 bg-[#fafbf7] p-4 text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-[#e6f4ee] text-[#116149]">
                    <Compass size={17} />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      Need official IBASS combination guidance?
                    </p>
                    <p className="text-slate-600 mt-0.5 leading-relaxed">
                      Tap a popular course below to auto-select your 3 electives, or explore all 427 courses in our directory.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleNavigateToCombinationFinder}
                  className="self-start sm:self-auto shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-[#116149] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#0b4936] transition cursor-pointer"
                >
                  <Compass size={13} />
                  <span>Browse 427 Courses</span>
                  <ArrowRight size={13} />
                </button>
              </div>

              {/* Quick Select Popular Courses Chips */}
              <div className="mt-3.5 pt-3 border-t border-slate-200/80">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                  Quick 1-Tap Course Presets:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_COURSE_PRESETS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleQuickCourseSelect(p.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:border-[#116149] hover:bg-emerald-50 text-slate-700 hover:text-[#116149] text-xs font-medium transition cursor-pointer"
                    >
                      <Sparkles size={11} className="text-amber-500" />
                      <span>{p.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Subjects Selection Matrix */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Choose 3 Electives
              </label>
              <span
                className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                  selectedElectives.length === 3
                    ? "bg-emerald-100 text-[#116149]"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {selectedElectives.length}/3 Electives Selected
              </span>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-2">
              {/* Use of English - Fixed Compulsory */}
              <div className="flex min-h-14 items-center justify-between gap-3 rounded-2xl bg-[#116149] p-3.5 sm:p-4 text-white shadow-xs">
                <div>
                  <span className="font-semibold text-sm">Use of English</span>
                  <small className="mt-0.5 block text-xs text-emerald-100">
                    Compulsory for all candidates
                  </small>
                </div>
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-800 text-white font-bold text-xs">
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
                    className={`flex min-h-14 items-center justify-between gap-3 rounded-2xl border p-3.5 sm:p-4 text-left text-sm font-medium transition-all ${
                      active
                        ? "border-[#116149] bg-emerald-50/70 text-[#092E28] ring-1 ring-[#116149]"
                        : "border-slate-200 bg-white text-slate-700 enabled:hover:border-slate-300"
                    } ${disabled ? "opacity-35 cursor-not-allowed" : "cursor-pointer"}`}
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
                <span className="text-[#116149] font-medium flex items-center gap-1.5">
                  <CheckCircle2 size={14} />
                  <span>
                    Your 4 subjects: <strong>Use of English</strong>, {selectedElectives.join(", ")}.
                  </span>
                </span>
              ) : (
                <span>
                  Please select {3 - selectedElectives.length} more subject{3 - selectedElectives.length === 1 ? "" : "s"} to continue.
                </span>
              )}
            </p>
          </div>

          {/* Step 1 Next Button */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
            <button
              type="button"
              disabled={!isStep1Complete}
              onClick={() => goToStep(2)}
              className="w-full sm:w-auto min-h-12 inline-flex items-center justify-center gap-2 rounded-full bg-[#116149] px-7 text-sm font-semibold text-white transition hover:bg-[#0b4936] hover:-translate-y-0.5 disabled:opacity-40 disabled:hover:translate-y-0 cursor-pointer"
            >
              <span>Continue to Academic Goals</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 2: ACADEMIC GOALS & TARGET SCORE VIEW                                */}
      {/* ========================================================================= */}
      {step === 2 && (
        <div className="space-y-6">
          {/* Summary of Selected Subjects Pill Bar */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700">Selected Subjects:</span>
              <div className="flex flex-wrap gap-1.5">
                <span className="px-2 py-0.5 rounded-md bg-[#116149] text-white font-medium text-[11px]">
                  Use of English
                </span>
                {selectedElectives.map((el) => (
                  <span
                    key={el}
                    className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 font-medium text-[11px]"
                  >
                    {el}
                  </span>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={() => goToStep(1)}
              className="text-[#116149] font-bold hover:underline shrink-0 cursor-pointer self-start sm:self-auto"
            >
              Modify subjects
            </button>
          </div>

          {/* Section: Target Course of Study */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="targetCourse" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                1. Target Course of Study
              </label>
              <button
                type="button"
                onClick={handleNavigateToCombinationFinder}
                className="text-xs font-semibold text-[#116149] hover:underline cursor-pointer"
              >
                Browse IBASS brochure →
              </button>
            </div>
            <div className="relative">
              <input
                id="targetCourse"
                name="targetCourse"
                value={targetCourse}
                onChange={(e) => setTargetCourse(e.target.value)}
                type="text"
                placeholder="e.g. Medicine and Surgery, Computer Science, Law"
                className="w-full min-h-12 rounded-xl border border-slate-300 bg-white px-4 text-sm text-[#092E28] placeholder:text-slate-400 focus:border-[#116149] focus:outline-hidden transition-colors"
              />
            </div>
            <p className="text-[11px] text-slate-500">
              Your mock results and question blueprints will highlight key high-frequency topics for this course.
            </p>
          </div>

          {/* Section: First Choice Higher Institution */}
          <div className="space-y-2 pt-2">
            <label htmlFor="targetInstitution" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              2. Target University or Polytechnic
            </label>
            <div className="relative">
              <input
                id="targetInstitution"
                name="targetInstitution"
                value={targetInstitution}
                onChange={(e) => setTargetInstitution(e.target.value)}
                type="text"
                placeholder="e.g. University of Lagos (UNILAG)"
                className="w-full min-h-12 rounded-xl border border-slate-300 bg-white px-4 text-sm text-[#092E28] placeholder:text-slate-400 focus:border-[#116149] focus:outline-hidden transition-colors"
              />
            </div>

            {/* Quick Suggestion Chips for Nigerian Universities */}
            <div className="pt-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                Popular Institutions (Tap to choose):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {POPULAR_INSTITUTIONS.slice(0, 6).map((inst) => (
                  <button
                    key={inst}
                    type="button"
                    onClick={() => setTargetInstitution(inst)}
                    className={`px-2.5 py-1 rounded-lg border text-[11px] transition cursor-pointer ${
                      targetInstitution === inst
                        ? "border-[#116149] bg-emerald-50 text-[#116149] font-semibold"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    {inst.split("(")[1]?.replace(")", "") || inst}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section: Target UTME Score */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                3. Set Your Target UTME Score
              </label>
              <div className="flex items-center gap-1.5 text-base font-bold text-[#116149]">
                <Target size={17} />
                <span>{targetScore} / 400</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {TARGET_PRESETS.map((preset) => (
                <button
                  type="button"
                  key={preset.score}
                  aria-pressed={targetScore === preset.score}
                  onClick={() => setTargetScore(preset.score)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    targetScore === preset.score
                      ? "border-[#116149] bg-emerald-50 text-[#092E28] ring-1 ring-[#116149]"
                      : "border-slate-200 bg-white hover:border-slate-300 text-slate-700"
                  }`}
                >
                  <div className="text-lg font-bold">{preset.score}</div>
                  <div className="text-xs font-semibold text-slate-800 mt-0.5">{preset.label}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{preset.description}</div>
                </button>
              ))}
            </div>

            <div className="mt-3 space-y-1">
              <input
                type="range"
                aria-label="Target UTME score"
                min={180}
                max={380}
                step={5}
                value={targetScore}
                onChange={(e) => setTargetScore(Number(e.target.value))}
                className="w-full accent-[#116149] cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>180 Min</span>
                <span>280 Recommended</span>
                <span>380 Max</span>
              </div>
            </div>
          </div>

          {/* Step 2 Action Buttons */}
          <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => goToStep(1)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            >
              <ArrowLeft size={16} />
              <span>Back to Subjects</span>
            </button>

            <button
              type="submit"
              disabled={isPending}
              className="w-full sm:w-auto min-h-12 inline-flex items-center justify-center gap-2 rounded-full bg-[#116149] px-8 text-sm font-semibold text-white transition hover:bg-[#0b4936] hover:-translate-y-0.5 disabled:opacity-50 cursor-pointer shadow-sm"
            >
              {isPending ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  <span>Saving your profile...</span>
                </>
              ) : (
                <>
                  <span>Complete Setup &amp; Enter Dashboard</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </form>
  );
}

export function OnboardingWizard() {
  return (
    <Suspense fallback={<div className="py-8 text-center text-xs text-slate-400">Loading your profile setup...</div>}>
      <OnboardingWizardInner />
    </Suspense>
  );
}
