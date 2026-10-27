"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  Compass,
  GraduationCap,
  Lock,
  Search,
  Target,
  X,
} from "lucide-react";
import Link from "@/components/pending-link";
import { useBrowserAccount } from "@/components/browser-account-boundary";
import {
  CANONICAL_JAMB_SUBJECTS,
  type CanonicalSubjectCode,
  getCourseById,
  JAMB_COURSE_COMBINATIONS,
  type JambCourseCombination,
  resolveCourseElectives,
  searchCourseCombinations,
} from "@/lib/curriculum/jamb-course-combinations";
import {
  buildLockedCombinationFromCourse,
  COMBO_PROMPT_DISMISSED_SESSION_KEY,
  getLockedCombination,
  saveLockedCombination,
} from "@/lib/curriculum/locked-combination-storage";

let hasInteractedWithInlineCombinationFinder = false;

export function Reveal({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element || !('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        element.animate([{ opacity: 0.4, transform: 'translateY(16px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 450, easing: 'ease-out' });
        observer.disconnect();
      }
    }, { threshold: 0.12 });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return <div ref={ref} className={className}>{children}</div>;
}

/**
 * 10-Second Smart Prompt Dialog for Guest Visitors on `/` (C03)
 * Uses native `<dialog closedby="any">` + `showModal()` with fallback backdrop click dismissal.
 */
export function CombinationPromptDialog() {
  const router = useRouter();
  const account = useBrowserAccount();
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [shouldRender, setShouldRender] = useState(false);

  const isAuthenticated = Boolean(account.identity?.user);

  function markDismissed() {
    try {
      window.sessionStorage.setItem(COMBO_PROMPT_DISMISSED_SESSION_KEY, "1");
    } catch {
      // Ignore storage errors
    }
  }

  function closePrompt() {
    markDismissed();
    const dialog = dialogRef.current;
    if (dialog && dialog.open) {
      dialog.close();
    }
    setShouldRender(false);
  }

  useEffect(() => {
    if (isAuthenticated) return;

    // Suppress prompt inside installed PWA / standalone environments
    if (typeof window !== "undefined") {
      const isStandalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        Boolean((navigator as Navigator & { standalone?: boolean }).standalone) ||
        window.location.search.includes("source=pwa") ||
        document.referrer.includes("android-app://");
      if (isStandalone) return;
    }

    try {
      if (window.sessionStorage.getItem(COMBO_PROMPT_DISMISSED_SESSION_KEY) === "1") {
        return;
      }
    } catch {
      // Ignore storage errors
    }

    if (getLockedCombination() !== null) {
      return;
    }

    const timer = window.setTimeout(() => {
      if (isAuthenticated || hasInteractedWithInlineCombinationFinder) {
        return;
      }
      if (getLockedCombination() !== null) {
        return;
      }
      try {
        if (window.sessionStorage.getItem(COMBO_PROMPT_DISMISSED_SESSION_KEY) === "1") {
          return;
        }
      } catch {
        // Ignore
      }
      setShouldRender(true);
    }, 10_000);

    return () => window.clearTimeout(timer);
  }, [isAuthenticated]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!shouldRender || !dialog) return;

    if (!dialog.open && typeof dialog.showModal === "function") {
      try {
        dialog.showModal();
      } catch {
        // Fallback if already open
      }
    }

    // Fallback for browsers that do not yet support `closedby="any"` on HTMLDialogElement
    function handleDialogClick(event: MouseEvent) {
      if (!dialog) return;
      if (event.target === dialog) {
        const rect = dialog.getBoundingClientRect();
        const isInDialog =
          rect.top <= event.clientY &&
          event.clientY <= rect.top + rect.height &&
          rect.left <= event.clientX &&
          event.clientX <= rect.left + rect.width;
        if (!isInDialog) {
          dialog.close();
        }
      }
    }

    function handleDialogClose() {
      markDismissed();
      setShouldRender(false);
    }

    if (typeof HTMLDialogElement !== "undefined" && !("closedBy" in HTMLDialogElement.prototype)) {
      dialog.addEventListener("click", handleDialogClick);
    }
    dialog.addEventListener("close", handleDialogClose);

    return () => {
      dialog.removeEventListener("click", handleDialogClick);
      dialog.removeEventListener("close", handleDialogClose);
    };
  }, [shouldRender]);

  if (!shouldRender || isAuthenticated) {
    return null;
  }

  return (
    <dialog
      ref={dialogRef}
      {...({ closedby: "any" } as Record<string, string>)}
      aria-labelledby="combo-prompt-title"
      aria-describedby="combo-prompt-desc"
      className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-3xl border border-emerald-950/15 bg-white p-6 sm:p-8 text-[#092E28] shadow-2xl backdrop:bg-slate-950/55 backdrop:backdrop-blur-xs"
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e6f4ee] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#0b4936]">
          <Compass size={13} /> Official JAMB IBASS Brochure Guide
        </span>
        <button
          type="button"
          onClick={closePrompt}
          aria-label="Close prompt"
          className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
        >
          <X size={18} />
        </button>
      </div>

      <h2 id="combo-prompt-title" className="text-2xl font-extrabold tracking-tight text-slate-950">
        Don&rsquo;t know your JAMB subject combination?
      </h2>

      <p id="combo-prompt-desc" className="mt-2.5 text-sm leading-relaxed text-slate-600">
        Enter your dream university, polytechnic, or college course to get your official 4 UTME subjects, flexible elective options, and competitive target score before you start practicing.
      </p>

      <div className="mt-5 flex flex-wrap gap-1.5">
        {["Medicine & Surgery", "Computer Science", "Common Law", "Nursing Science", "Accounting", "Mass Communication"].map(
          (courseLabel) => (
            <button
              key={courseLabel}
              type="button"
              onClick={() => {
                markDismissed();
                if (dialogRef.current?.open) dialogRef.current.close();
                router.push(`/combinations?q=${encodeURIComponent(courseLabel)}`);
              }}
              className="rounded-full border border-emerald-950/10 bg-[#fafbf7] px-3 py-1 text-xs font-semibold text-slate-700 hover:border-[#116149] hover:text-[#116149] cursor-pointer"
            >
              {courseLabel}
            </button>
          )
        )}
      </div>

      <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <button
          type="button"
          onClick={() => {
            markDismissed();
            if (dialogRef.current?.open) dialogRef.current.close();
            router.push("/combinations");
          }}
          className="flex-1 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#116149] px-6 py-3 text-sm font-semibold text-white hover:bg-[#0b4936] transition cursor-pointer"
        >
          <span>Find My Course Combination</span>
          <ArrowRight size={16} />
        </button>
        <button
          type="button"
          onClick={closePrompt}
          className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-200 px-5 py-3 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
        >
          I already know my subjects
        </button>
      </div>
    </dialog>
  );
}

const QUICK_LANDING_COURSES = [
  { id: "medicine-and-surgery", label: "Medicine & Surgery" },
  { id: "computer-science", label: "Computer Science" },
  { id: "common-law", label: "Law (LL.B)" },
  { id: "nursing-science", label: "Nursing Science" },
  { id: "accounting", label: "Accounting" },
  { id: "mass-communication", label: "Mass Communication" },
  { id: "mechanical-engineering", label: "Mechanical Engineering" },
  { id: "economics", label: "Economics" },
];

const electives = [
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "Economics",
  "Government",
  "Literature in English",
];

export function SubjectPicker() {
  const router = useRouter();
  const [courseQuery, setCourseQuery] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState<string>("medicine-and-surgery");
  const [chosenFlexibleCodes, setChosenFlexibleCodes] = useState<CanonicalSubjectCode[]>([]);
  const [manualSelected, setManualSelected] = useState<string[]>([]);
  const [showManualPicker, setShowManualPicker] = useState(false);

  const searchResults = useMemo(() => {
    if (!courseQuery.trim()) return [];
    return searchCourseCombinations(courseQuery, "All").slice(0, 6);
  }, [courseQuery]);

  const activeCourse: JambCourseCombination = useMemo(() => {
    return (
      getCourseById(selectedCourseId) ??
      JAMB_COURSE_COMBINATIONS[0]
    );
  }, [selectedCourseId]);

  const resolved = useMemo(
    () => resolveCourseElectives(activeCourse, chosenFlexibleCodes),
    [activeCourse, chosenFlexibleCodes]
  );

  function selectCourse(course: JambCourseCombination) {
    hasInteractedWithInlineCombinationFinder = true;
    setSelectedCourseId(course.id);
    setChosenFlexibleCodes(
      course.flexibleSlot ? [...course.flexibleSlot.defaultCodes] : []
    );
    setCourseQuery("");
  }

  function handleLockAndRegister() {
    hasInteractedWithInlineCombinationFinder = true;
    const payload = buildLockedCombinationFromCourse(activeCourse, {
      chosenFlexibleCodes: resolved.selectedFlexibleCodes,
      source: "landing",
    });
    saveLockedCombination(payload);
    router.push(`/register?course=${encodeURIComponent(activeCourse.id)}`);
  }

  return (
    <div className="space-y-8">
      {/* Interactive Course Combination Finder Card */}
      <div className="rounded-3xl border border-emerald-950/15 bg-[#fafbf7] p-6 sm:p-8 shadow-xs">
        <div className="grid gap-8 lg:grid-cols-[1fr_1.15fr] lg:items-start">
          {/* Left Column: Course Search + Popular Pills */}
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[#e6f4ee] px-3 py-1 text-xs font-bold text-[#0b4936] mb-3">
              <GraduationCap size={14} />
              <span>{JAMB_COURSE_COMBINATIONS.length} Accredited Nigerian Courses</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-slate-950">
              Type your dream course to get your 4 UTME subjects
            </h3>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Not sure which electives JAMB requires for your course? Search below or pick a popular course to lock in your official IBASS combination.
            </p>

            {/* Search Input with Instant Autocomplete Dropdown */}
            <div className="relative mt-5">
              <Search
                size={18}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="search"
                value={courseQuery}
                onChange={(e) => {
                  hasInteractedWithInlineCombinationFinder = true;
                  setCourseQuery(e.target.value);
                }}
                placeholder="Type a course (e.g., Medicine, Computer Science, Law, Nursing)..."
                aria-label="Search your course for JAMB subject combination"
                className="w-full rounded-2xl border border-emerald-950/20 bg-white py-3.5 pl-11 pr-10 text-sm font-medium text-slate-950 shadow-2xs placeholder:text-slate-400 focus:border-[#116149] focus:outline-none"
              />
              {courseQuery && (
                <button
                  type="button"
                  onClick={() => setCourseQuery("")}
                  aria-label="Clear course search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <X size={15} />
                </button>
              )}

              {courseQuery.trim().length > 0 && (
                <div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-emerald-950/15 bg-white shadow-xl">
                  {searchResults.length === 0 ? (
                    <div className="p-4 text-xs text-slate-500">
                      No exact match in quick preview.{" "}
                      <Link
                        href={`/combinations?q=${encodeURIComponent(courseQuery)}`}
                        className="font-semibold text-[#116149] underline"
                      >
                        Search on the full Combination Finder →
                      </Link>
                    </div>
                  ) : (
                    <ul className="divide-y divide-slate-100">
                      {searchResults.map((course) => (
                        <li key={course.id}>
                          <button
                            type="button"
                            onClick={() => selectCourse(course)}
                            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm hover:bg-emerald-50/70 transition cursor-pointer"
                          >
                            <div>
                              <p className="font-semibold text-slate-900">{course.title}</p>
                              <p className="text-xs text-slate-500">{course.faculty}</p>
                            </div>
                            <span className="shrink-0 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[11px] font-bold text-amber-900">
                              Target {course.recommendedTargetScore}+
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {/* Popular Course Quick-Pick Pills */}
            <div className="mt-4">
              <p className="text-xs font-semibold text-slate-500 mb-2">
                Popular courses:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_LANDING_COURSES.map((item) => {
                  const isSelected = activeCourse.id === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        const found = getCourseById(item.id);
                        if (found) selectCourse(found);
                      }}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                        isSelected
                          ? "bg-[#116149] text-white"
                          : "border border-emerald-950/15 bg-white text-slate-700 hover:border-[#116149] hover:text-[#116149]"
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-emerald-950/10 flex flex-wrap items-center justify-between gap-3 text-xs">
              <Link
                href="/combinations"
                className="inline-flex items-center gap-1.5 font-bold text-[#116149] hover:underline"
              >
                <span>Explore all {JAMB_COURSE_COMBINATIONS.length} courses on the Combination Finder</span>
                <ArrowRight size={14} />
              </Link>
              <button
                type="button"
                onClick={() => setShowManualPicker((v) => !v)}
                className="font-medium text-slate-500 hover:text-slate-800 underline cursor-pointer"
              >
                {showManualPicker ? "Hide manual subject picker" : "Or pick 3 subjects manually"}
              </button>
            </div>
          </div>

          {/* Right Column: Live Resolved 4-Subject Combination & Lock-In CTA */}
          <div className="rounded-2xl border border-emerald-950/15 bg-white p-5 sm:p-6 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[#116149]">
                {activeCourse.faculty}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-900">
                <Target size={12} /> Target: {activeCourse.recommendedTargetScore}+ ({activeCourse.competitiveScoreRange})
              </span>
            </div>

            <h4 className="text-xl font-extrabold text-slate-950 mb-4">
              {activeCourse.title}
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-4">
              <div className="flex items-center justify-between gap-2 rounded-xl bg-[#116149] px-3.5 py-3 text-white">
                <span className="text-sm font-semibold">Use of English</span>
                <span className="inline-flex items-center gap-1 rounded bg-white/15 px-2 py-0.5 text-[10px] font-bold">
                  <Lock size={10} /> Compulsory
                </span>
              </div>

              {resolved.electives.map((elective) => (
                <div
                  key={elective.code}
                  className={`flex items-center justify-between gap-2 rounded-xl border px-3.5 py-3 ${
                    elective.isCore
                      ? "border-emerald-950/15 bg-emerald-950/[0.03]"
                      : "border-[#116149]/40 bg-[#e6f4ee]/60"
                  }`}
                >
                  <span className="text-sm font-semibold text-slate-900 truncate">
                    {elective.name}
                  </span>
                  <span className="inline-flex shrink-0 items-center gap-1 rounded bg-emerald-950/10 px-2 py-0.5 text-[10px] font-bold text-emerald-950">
                    {elective.isCore ? "Core" : "Flexible"}
                  </span>
                </div>
              ))}
            </div>

            {activeCourse.flexibleSlot && (
              <div className="mb-4 rounded-xl border border-dashed border-[#116149]/30 bg-[#fafcf9] p-3">
                <p className="text-xs font-bold text-[#0b4936] mb-2">
                  {activeCourse.flexibleSlot.slotLabel}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {activeCourse.flexibleSlot.allowedCodes.map((code) => {
                    const isSelected = resolved.selectedFlexibleCodes.includes(code);
                    return (
                      <button
                        key={code}
                        type="button"
                        onClick={() => {
                          hasInteractedWithInlineCombinationFinder = true;
                          if (activeCourse.flexibleSlot?.pickCount === 1) {
                            setChosenFlexibleCodes([code]);
                          } else {
                            setChosenFlexibleCodes((prev) => {
                              const current =
                                prev.length === 2
                                  ? [...prev]
                                  : [...resolved.selectedFlexibleCodes];
                              if (current.includes(code)) return current;
                              return [current[current.length - 1], code];
                            });
                          }
                        }}
                        className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition cursor-pointer ${
                          isSelected
                            ? "bg-[#116149] text-white"
                            : "border border-emerald-950/15 bg-white text-slate-700 hover:border-[#116149]"
                        }`}
                      >
                        {isSelected && <Check size={11} />}
                        <span>{CANONICAL_JAMB_SUBJECTS[code]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <p className="text-xs text-slate-500 mb-5 leading-relaxed">
              {activeCourse.ibassNote}
            </p>

            <button
              type="button"
              onClick={handleLockAndRegister}
              className="w-full inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#116149] px-6 py-3 text-sm font-semibold text-white hover:bg-[#0b4936] transition cursor-pointer"
            >
              <span>Lock In {activeCourse.title} &amp; Start Registration</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Optional Manual 3-Elective Preview Picker */}
      {showManualPicker && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
            Manual Subject Preview
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex min-h-20 items-center justify-between gap-3 rounded-xl bg-[#116149] p-5 text-white">
              <span className="font-medium">
                Use of English
                <small className="mt-1 block text-emerald-100">Always included</small>
              </span>
              <Check size={18} />
            </div>
            {electives.map((subject) => {
              const active = manualSelected.includes(subject);
              return (
                <button
                  type="button"
                  key={subject}
                  aria-pressed={active}
                  disabled={!active && manualSelected.length === 3}
                  onClick={() =>
                    setManualSelected((current) =>
                      active ? current.filter((s) => s !== subject) : [...current, subject]
                    )
                  }
                  className={`flex min-h-20 items-center justify-between gap-3 rounded-xl border p-5 text-left text-sm font-medium transition-colors disabled:opacity-50 ${
                    active
                      ? "border-emerald-700 bg-emerald-50"
                      : "border-slate-200 bg-white enabled:hover:border-emerald-700"
                  }`}
                >
                  {subject}
                  <span
                    className={`flex size-5 shrink-0 items-center justify-center rounded-full border ${
                      active
                        ? "border-emerald-700 bg-emerald-700 text-white"
                        : "border-slate-300"
                    }`}
                  >
                    {active && <Check size={12} />}
                  </span>
                </button>
              );
            })}
          </div>
          <p role="status" className="mt-5 text-sm text-slate-600">
            {manualSelected.length === 3
              ? `Your preview combination: English, ${manualSelected.join(", ")}.`
              : `${manualSelected.length} of 3 electives selected. Choose three to preview your combination.`}
          </p>
        </div>
      )}
    </div>
  );
}

export function MobileMenu() {
  const account = useBrowserAccount();
  const user = account.identity?.user;
  const isPremium = false; // Entitlement-specific navigation is deferred to T08.
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  if (!mounted) {
    return (
      <div className="relative md:hidden">
        <button
          type="button"
          aria-expanded={false}
          className="min-h-11 rounded-full border border-emerald-950/15 px-4 text-sm font-semibold cursor-pointer"
        >
          Menu
        </button>
      </div>
    );
  }

  return (
    <div ref={menuRef} className="relative md:hidden">
      <button 
        type="button" 
        aria-expanded={open} 
        aria-controls="mobile-menu" 
        onClick={() => setOpen(!open)} 
        className="min-h-11 rounded-full border border-emerald-950/15 px-4 text-sm font-semibold cursor-pointer"
      >
        {open ? 'Close' : 'Menu'}
      </button>
      {open && (
        <nav 
          id="mobile-menu" 
          aria-label="Mobile navigation" 
          className="absolute top-14 right-0 z-50 w-64 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl"
        >
          {user ? (
            <>
              <div className="border-b border-slate-100 pb-2 mb-2 px-3">
                <p className="text-xs text-slate-500">Signed in as</p>
                <div className="flex items-center justify-between gap-1 mt-0.5">
                  <p className="text-sm font-bold text-emerald-900 truncate">{user.displayName || user.email}</p>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                    isPremium ? "bg-[#116149] text-white" : "bg-slate-200 text-slate-700"
                  }`}>
                    {isPremium ? "PRO" : "FREE"}
                  </span>
                </div>
              </div>
              <Link 
                onClick={() => setOpen(false)} 
                href="/dashboard" 
                className="flex min-h-11 items-center justify-between rounded-lg px-3 text-sm font-semibold text-[#116149] hover:bg-emerald-50"
              >
                Dashboard <ArrowRight size={14}/>
              </Link>
              <Link 
                onClick={() => setOpen(false)} 
                href="/profile" 
                className="flex min-h-11 items-center justify-between rounded-lg px-3 text-sm hover:bg-emerald-50 font-medium"
              >
                Profile & Settings <ArrowRight size={14}/>
              </Link>
              <Link 
                onClick={() => setOpen(false)} 
                href="/practice" 
                className="flex min-h-11 items-center justify-between rounded-lg px-3 text-sm hover:bg-emerald-50"
              >
                Topic Practice <ArrowRight size={14}/>
              </Link>
              <Link 
                onClick={() => setOpen(false)} 
                href="/mock" 
                className="flex min-h-11 items-center justify-between rounded-lg px-3 text-sm hover:bg-emerald-50"
              >
                CBT Mock Exam <ArrowRight size={14}/>
              </Link>
              <Link 
                onClick={() => setOpen(false)} 
                href="/combinations" 
                className="flex min-h-11 items-center justify-between rounded-lg px-3 text-sm hover:bg-emerald-50"
              >
                Course Combinations <ArrowRight size={14}/>
              </Link>
              <Link 
                onClick={() => setOpen(false)} 
                href="/analytics" 
                className="flex min-h-11 items-center justify-between rounded-lg px-3 text-sm hover:bg-emerald-50"
              >
                Performance Coach <ArrowRight size={14}/>
              </Link>
              {!isPremium ? (
                <Link 
                  onClick={() => setOpen(false)} 
                  href="/pricing" 
                  className="flex min-h-11 items-center justify-between rounded-lg px-3 text-sm hover:bg-emerald-50 font-medium text-emerald-800"
                >
                  Plans <ArrowRight size={14}/>
                </Link>
              ) : (
                <Link 
                  onClick={() => setOpen(false)} 
                  href="/profile#subscription" 
                  className="flex min-h-11 items-center justify-between rounded-lg px-3 text-sm hover:bg-emerald-50 font-medium text-emerald-800"
                >
                  Manage Subscription <ArrowRight size={14}/>
                </Link>
              )}
              {!isPremium && (
                <Link 
                  onClick={() => setOpen(false)} 
                  href="/referrals" 
                  className="flex min-h-11 items-center justify-between rounded-lg px-3 text-sm text-amber-800 hover:bg-amber-50"
                >
                  Invite friends <ArrowRight size={14}/>
                </Link>
              )}
            </>
          ) : (
            <>
              {[
                ['Check Combination', '/combinations'],
                ['How it works', '#how-it-works'],
                ['Pricing', '#pricing'],
                ['FAQs', '#faq'],
                ['For Schools', '/schools'],
                ['Getting started', '#get-started'],
              ].map(([name, href]) => (
                <a 
                  key={href} 
                  onClick={() => setOpen(false)} 
                  href={href} 
                  className="flex min-h-11 items-center justify-between rounded-lg px-3 text-sm hover:bg-emerald-50"
                >
                  {name}<ArrowRight size={14}/>
                </a>
              ))}
              <div className="border-t border-slate-100 pt-2 mt-2">
                <Link 
                  onClick={() => setOpen(false)} 
                  href="/login" 
                  className="flex min-h-11 items-center justify-between rounded-lg px-3 text-sm font-semibold text-[#116149] hover:bg-emerald-50"
                >
                  Sign In <ArrowRight size={14}/>
                </Link>
                <Link 
                  onClick={() => setOpen(false)} 
                  href="/register" 
                  className="flex min-h-11 items-center justify-between rounded-lg px-3 text-sm font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 mt-1"
                >
                  Create Account <ArrowRight size={14}/>
                </Link>
              </div>
            </>
          )}
        </nav>
      )}
    </div>
  );
}
