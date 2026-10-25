'use client';

import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from '@/components/pending-link';
import { BrandMark } from '@/components/brand-mark';
import {
  BrowserAccountBoundary,
  BrowserAccountNavigation,
  useBrowserAccount,
} from '@/components/browser-account-boundary';
import { PolicyLinks } from '@/components/legal-page';
import { MobileMenu } from '../landing-interactions';
import {
  CANONICAL_JAMB_SUBJECTS,
  COURSE_FACULTIES,
  type CanonicalSubjectCode,
  type CourseFaculty,
  JAMB_COURSE_COMBINATIONS,
  type JambCourseCombination,
  POPULAR_COURSE_IDS,
  resolveCourseElectives,
  searchCourseCombinations,
} from '@/lib/curriculum/jamb-course-combinations';
import {
  buildLockedCombinationFromCourse,
  clearLockedCombination,
  COMBO_PROMPT_DISMISSED_SESSION_KEY,
  getLockedCombination,
  type LockedCourseCombination,
  saveLockedCombination,
} from '@/lib/curriculum/locked-combination-storage';
import { COMBINATIONS_FAQS } from './combinations-faq-data';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Lock,
  Search,
  Target,
  X,
} from 'lucide-react';

type FacultyFilter = CourseFaculty | 'All' | 'Popular';

const POPULAR_SUGGESTIONS: Array<{ id: string; label: string }> = [
  { id: 'medicine-and-surgery', label: 'Medicine & Surgery' },
  { id: 'computer-science', label: 'Computer Science' },
  { id: 'common-law', label: 'Law (LL.B)' },
  { id: 'nursing-science', label: 'Nursing' },
  { id: 'accounting', label: 'Accounting' },
  { id: 'mass-communication', label: 'Mass Comm' },
  { id: 'mechanical-engineering', label: 'Mechanical Eng' },
  { id: 'pharmacy', label: 'Pharmacy' },
  { id: 'economics', label: 'Economics' },
];

function CourseListRow({
  course,
  index,
  fromContext,
  isAuthenticated,
  isCurrentlyLocked,
  initialFlexibleCodes,
  onLockIn,
}: {
  course: JambCourseCombination;
  index: number;
  fromContext: 'onboarding' | 'register' | null;
  isAuthenticated: boolean;
  isCurrentlyLocked: boolean;
  initialFlexibleCodes?: CanonicalSubjectCode[];
  onLockIn: (course: JambCourseCombination, chosenFlexibleCodes: CanonicalSubjectCode[]) => void;
}) {
  const [chosenFlexible, setChosenFlexible] = useState<CanonicalSubjectCode[]>(() => {
    if (initialFlexibleCodes && initialFlexibleCodes.length > 0) {
      return initialFlexibleCodes;
    }
    return course.flexibleSlot ? [...course.flexibleSlot.defaultCodes] : [];
  });

  const [isExpanded, setIsExpanded] = useState(false);

  const resolved = useMemo(
    () => resolveCourseElectives(course, chosenFlexible),
    [course, chosenFlexible]
  );

  function handleToggleFlexibleCode(code: CanonicalSubjectCode) {
    if (!course.flexibleSlot) return;
    const pickCount = course.flexibleSlot.pickCount;

    if (pickCount === 1) {
      setChosenFlexible([code]);
      return;
    }

    setChosenFlexible((prev) => {
      const current = prev.length === pickCount ? [...prev] : [...resolved.selectedFlexibleCodes];
      if (current.includes(code)) return current;
      return [current[current.length - 1], code];
    });
  }

  const ctaLabel =
    fromContext === 'onboarding'
      ? `Lock In & Continue`
      : fromContext === 'register'
        ? `Lock In & Sign Up`
        : isAuthenticated
          ? `Use in Profile`
          : `Lock In Course`;

  return (
    <div
      id={`course-${course.id}`}
      style={
        index >= 10
          ? {
              contentVisibility: 'auto',
              containIntrinsicSize: 'auto none auto 88px',
            }
          : undefined
      }
      className={`p-4 sm:p-5 transition-colors ${
        isCurrentlyLocked ? 'bg-[#f4f9f5]' : 'hover:bg-slate-50/70'
      }`}
    >
      {/* Primary List Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Course Info */}
        <div className="lg:w-1/3 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">
              {course.faculty}
            </span>
            {isCurrentlyLocked && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-[#116149] px-2 py-0.5 text-[10px] font-bold text-white">
                <Check size={11} /> Locked In
              </span>
            )}
          </div>
          <h3 className="text-base font-bold text-slate-900 truncate">
            {course.title}
          </h3>
          <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
            {course.ibassNote}
          </p>
        </div>

        {/* 4 Subjects: Clean Horizontal Tags */}
        <div className="lg:w-5/12 flex-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 lg:hidden">
            4 Required UTME Subjects
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Slot 1: Use of English */}
            <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-[#116149] border border-emerald-950/10">
              <Lock size={10} />
              Use of English
            </span>

            {/* Slots 2-4: Electives */}
            {resolved.electives.map((e) => (
              <span
                key={e.code}
                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium border ${
                  e.isCore
                    ? 'bg-white border-slate-200 text-slate-800'
                    : 'bg-[#eef8f3] border-[#116149]/25 text-[#116149] font-semibold'
                }`}
              >
                {e.name}
              </span>
            ))}

            {/* Customizer Toggle for Flexible Slots */}
            {course.flexibleSlot && (
              <button
                type="button"
                onClick={() => setIsExpanded((prev) => !prev)}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
              >
                <span>{isExpanded ? 'Close' : 'Swap subject'}</span>
                {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
            )}
          </div>
        </div>

        {/* Target Score & Primary Action */}
        <div className="lg:w-1/4 flex items-center justify-between lg:justify-end gap-3 shrink-0">
          <div className="text-left lg:text-right">
            <span className="inline-block text-xs font-semibold text-slate-700 bg-slate-100 rounded-md px-2 py-0.5">
              Target: {course.recommendedTargetScore}+
            </span>
            <span className="block text-[11px] text-slate-400 mt-0.5">
              {course.competitiveScoreRange}
            </span>
          </div>

          <button
            type="button"
            onClick={() => onLockIn(course, resolved.selectedFlexibleCodes)}
            className="h-9 px-4 rounded-xl bg-[#116149] text-xs font-semibold text-white hover:bg-[#0b4936] transition shadow-2xs inline-flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <span>{ctaLabel}</span>
            <ArrowRight size={13} />
          </button>
        </div>
      </div>

      {/* Expandable Flexible Elective Drawer (clean inline accordion) */}
      {isExpanded && course.flexibleSlot && (
        <div className="mt-3 pt-3 border-t border-slate-100 pl-1">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
            <span className="text-xs font-medium text-slate-600">
              {course.flexibleSlot.slotLabel}:
            </span>
            <span className="text-[11px] text-slate-400">
              Selected: {resolved.selectedFlexibleCodes.length}/{course.flexibleSlot.pickCount}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {course.flexibleSlot.allowedCodes.map((code) => {
              const isSelected = resolved.selectedFlexibleCodes.includes(code);
              const subjectName = CANONICAL_JAMB_SUBJECTS[code];
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => handleToggleFlexibleCode(code)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium transition cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'bg-white border border-slate-200 text-slate-700 hover:border-slate-400'
                  }`}
                >
                  {isSelected && <span className="mr-1">✓</span>}
                  {subjectName}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function CombinationsFinderInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const account = useBrowserAccount();
  const session = account.session;
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const fromParam = searchParams.get('from');
  const fromContext: 'onboarding' | 'register' | null =
    fromParam === 'onboarding'
      ? 'onboarding'
      : fromParam === 'register'
        ? 'register'
        : null;

  const initialCourseParam = searchParams.get('course') ?? searchParams.get('q') ?? '';

  const [query, setQuery] = useState(initialCourseParam);
  const [selectedFaculty, setSelectedFaculty] = useState<FacultyFilter>('All');
  const [lockedCombo, setLockedCombo] = useState<LockedCourseCombination | null>(null);

  useEffect(() => {
    setLockedCombo(getLockedCombination());
    try {
      window.sessionStorage.setItem(COMBO_PROMPT_DISMISSED_SESSION_KEY, '1');
    } catch {
      // Ignore storage access errors
    }
  }, []);

  useEffect(() => {
    if (initialCourseParam) {
      setQuery(initialCourseParam.replace(/-/g, ' '));
    }
  }, [initialCourseParam]);

  // Keyboard shortcut "/" to focus search input
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const filteredCourses = useMemo(
    () => searchCourseCombinations(query, selectedFaculty),
    [query, selectedFaculty]
  );

  const PAGE_SIZE = 25;
  const [currentPage, setCurrentPage] = useState(1);

  // Reset to first page when search query or faculty filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [query, selectedFaculty]);

  const totalPages = Math.max(1, Math.ceil(filteredCourses.length / PAGE_SIZE));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, filteredCourses.length);

  const paginatedCourses = useMemo(
    () => filteredCourses.slice(startIndex, endIndex),
    [filteredCourses, startIndex, endIndex]
  );

  function handlePageChange(newPage: number) {
    if (newPage < 1 || newPage > totalPages) return;
    setCurrentPage(newPage);
    const container = document.getElementById('directory-list');
    if (container) {
      container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  const paginationItems = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (safePage <= 4) {
      return [1, 2, 3, 4, 5, 'ellipsis', totalPages];
    }
    if (safePage >= totalPages - 3) {
      return [
        1,
        'ellipsis',
        totalPages - 4,
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages,
      ];
    }
    return [1, 'ellipsis', safePage - 1, safePage, safePage + 1, 'ellipsis', totalPages];
  }, [safePage, totalPages]);

  const facultyCounts = useMemo(() => {
    const counts: Record<string, number> = {
      All: JAMB_COURSE_COMBINATIONS.length,
      Popular: POPULAR_COURSE_IDS.length,
    };
    for (const fac of COURSE_FACULTIES) {
      counts[fac] = JAMB_COURSE_COMBINATIONS.filter((c) => c.faculty === fac).length;
    }
    return counts;
  }, []);

  function handleLockInCourse(
    course: JambCourseCombination,
    chosenFlexibleCodes: CanonicalSubjectCode[]
  ) {
    const payload = buildLockedCombinationFromCourse(course, {
      chosenFlexibleCodes,
      source: fromContext === 'onboarding' ? 'onboarding-return' : 'combinations-page',
    });
    saveLockedCombination(payload);
    setLockedCombo(payload);

    if (fromContext === 'onboarding') {
      router.push('/onboarding');
      return;
    }
    if (fromContext === 'register') {
      router.push(`/register?course=${encodeURIComponent(course.id)}`);
      return;
    }
    if (session.status === 'authenticated') {
      router.push('/onboarding?edit=1');
      return;
    }
    router.push(`/register?course=${encodeURIComponent(course.id)}`);
  }

  function handleClearLocked() {
    clearLockedCombination();
    setLockedCombo(null);
  }

  const isAuthenticated = session.status === 'authenticated';

  return (
    <div className="min-h-screen flex flex-col bg-[#fafbf7] text-[#092E28]">
      <a href="#main" className="skip-link">
        Skip to content
      </a>

      {/* Sticky Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-[#fafbf7]/95 backdrop-blur-md">
        <div className="shell flex h-20 items-center justify-between gap-4">
          <Link
            href={isAuthenticated ? '/dashboard' : '/'}
            aria-label="JAMBPrep home"
            className="flex items-center gap-2 text-xl font-bold tracking-tight"
          >
            <span className="flex size-9 items-center justify-center rounded-xl bg-[#116149] text-white">
              <BrandMark size={36} />
            </span>
            <span>JAMBPrep</span>
          </Link>

          <nav
            aria-label="Main navigation"
            className="hidden items-center gap-8 text-sm text-slate-600 md:flex"
          >
            <Link
              href="/combinations"
              aria-current="page"
              className="font-bold text-[#116149] transition-colors"
            >
              Check Combination
            </Link>
            <Link href="/" className="hover:text-[#116149] transition-colors">
              Home
            </Link>
            <Link href="/pricing" className="hover:text-[#116149] transition-colors">
              Pricing
            </Link>
            <a href="#faq" className="hover:text-[#116149] transition-colors">
              FAQs
            </a>
            <Link
              href="/schools"
              className="hover:text-[#116149] font-medium text-[#116149] transition-colors"
            >
              For Schools
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <BrowserAccountNavigation />
            <MobileMenu />
          </div>
        </div>
      </header>

      {/* Context-Aware Return Banner when arriving from /onboarding or /register */}
      {fromContext && (
        <div className="bg-[#102f29] text-white border-b border-emerald-800">
          <div className="shell py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-[#d6ed9f]" />
              <span>
                <strong>
                  {fromContext === 'onboarding'
                    ? 'Registration Setup'
                    : 'Sign-Up Setup'}
                  :
                </strong>{' '}
                Select your course below to lock in your official 4 subjects.
              </span>
            </div>
            <Link
              href={fromContext === 'onboarding' ? '/onboarding' : '/register'}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3.5 py-1 text-xs font-semibold text-white hover:bg-white/20 transition"
            >
              <ArrowLeft size={13} />
              <span>
                {fromContext === 'onboarding'
                  ? 'Back to Setup'
                  : 'Back to Sign Up'}
              </span>
            </Link>
          </div>
        </div>
      )}

      <main id="main" className="flex-1 py-10 sm:py-14">
        <div className="shell">
          {/* Breadcrumb Navigation */}
          <nav aria-label="Breadcrumb" className="mb-6 text-xs text-slate-500">
            <ol className="flex items-center gap-1.5 flex-wrap">
              <li>
                <Link href="/" className="hover:text-[#116149] transition-colors">
                  Home
                </Link>
              </li>
              <li aria-hidden="true" className="text-slate-400">/</li>
              <li className="font-semibold text-slate-800" aria-current="page">
                JAMB Subject Combinations
              </li>
            </ol>
          </nav>

          {/* Header Title Section */}
          <div className="max-w-3xl mb-8">
            <p className="eyebrow mb-2">
              <span className="size-2 rounded-full bg-[#116149]" />
              OFFICIAL JAMB IBASS BROCHURE DIRECTORY · 427 COURSES
            </p>
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900 leading-tight">
              JAMB Course &amp; <span className="serif-accent text-[#116149]">Subject Directory</span>
            </h1>
            <p className="mt-2 text-sm sm:text-base text-slate-600 leading-relaxed">
              Look up any accredited course in Nigeria to verify compulsory core subjects, flexible elective choices, and competitive UTME target scores.
            </p>
          </div>

          {/* Search Box */}
          <div className="mb-6 max-w-2xl">
            <div className="relative">
              <Search
                size={18}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                ref={searchInputRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by course name, alias, or keyword..."
                aria-label="Search courses"
                className="w-full h-12 rounded-xl border border-slate-300 bg-white pl-11 pr-24 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#116149] focus:ring-1 focus:ring-[#116149] focus:outline-none transition shadow-2xs"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    searchInputRef.current?.focus();
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-200 cursor-pointer"
                >
                  Clear
                </button>
              ) : (
                <span className="pointer-events-none hidden sm:inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-400 absolute right-3 top-1/2 -translate-y-1/2">
                  Press /
                </span>
              )}
            </div>

            {/* Trending Suggestions */}
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
              <span className="font-medium mr-1 text-slate-400">Popular:</span>
              {POPULAR_SUGGESTIONS.map((item) => {
                const isActive =
                  query.trim().toLowerCase() === item.label.toLowerCase() ||
                  query.trim().toLowerCase() === item.id.replace(/-/g, ' ');
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setSelectedFaculty('All');
                      setQuery(item.label);
                    }}
                    className={`rounded-md px-2 py-0.5 transition cursor-pointer ${
                      isActive
                        ? 'bg-slate-900 text-white font-medium'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Currently Locked Course Banner */}
          {lockedCombo && (
            <div className="mb-6 rounded-2xl border border-[#116149]/40 bg-[#f4f9f5] p-4 text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <div className="font-bold text-[#116149] flex items-center gap-1.5">
                    <CheckCircle2 size={15} />
                    <span>Locked Combination: {lockedCombo.courseTitle}</span>
                  </div>
                  <p className="text-slate-600 mt-0.5">
                    Use of English + {lockedCombo.electiveNames.join(', ')} · Target:{' '}
                    {lockedCombo.recommendedTargetScore}/400
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={
                      fromContext === 'onboarding'
                        ? '/onboarding'
                        : fromContext === 'register'
                          ? `/register?course=${encodeURIComponent(lockedCombo.courseId)}`
                          : isAuthenticated
                            ? '/onboarding?edit=1'
                            : `/register?course=${encodeURIComponent(lockedCombo.courseId)}`
                    }
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#116149] px-3.5 text-xs font-semibold text-white hover:bg-[#0b4936] transition"
                  >
                    <span>Continue</span>
                    <ArrowRight size={13} />
                  </Link>
                  <button
                    type="button"
                    onClick={handleClearLocked}
                    className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-500 hover:bg-slate-50 cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Minimal Faculty Navigation Tabs */}
          <div className="mb-6">
            <div
              role="tablist"
              aria-label="Filter by faculty"
              className="flex items-center gap-1.5 overflow-x-auto pb-2 no-scrollbar border-b border-slate-200/80"
            >
              {(['All', 'Popular', ...COURSE_FACULTIES] as const).map((fac) => {
                const active = selectedFaculty === fac;
                return (
                  <button
                    key={fac}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setSelectedFaculty(fac)}
                    className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition cursor-pointer ${
                      active
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <span>{fac === 'All' ? 'All Courses' : fac === 'Popular' ? '★ Popular' : fac}</span>
                    <span
                      className={`text-[10px] ${
                        active ? 'text-slate-300' : 'text-slate-400'
                      }`}
                    >
                      {facultyCounts[fac] ?? 0}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Results Summary Bar */}
          <div
            id="directory-list"
            className="flex items-center justify-between text-xs text-slate-500 mb-3 px-1 scroll-mt-24"
          >
            <span>
              Showing{' '}
              <strong>
                {filteredCourses.length === 0 ? 0 : startIndex + 1}–{endIndex}
              </strong>{' '}
              of {filteredCourses.length} accredited courses
              {totalPages > 1 && (
                <span className="ml-1 text-slate-400">
                  · Page {safePage} of {totalPages}
                </span>
              )}
            </span>
            <span className="hidden sm:inline text-slate-400">
              {filteredCourses.length > PAGE_SIZE ? `${PAGE_SIZE} per page` : 'Sorted by relevance'}
            </span>
          </div>

          {/* Clean High-Density Minimalist Directory List Container */}
          {filteredCourses.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center max-w-md mx-auto my-8">
              <BookOpen size={32} className="mx-auto text-slate-400 mb-2" />
              <h2 className="text-base font-bold text-slate-900">
                No matching courses found
              </h2>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                Try a different keyword or reset to view all courses.
              </p>
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setSelectedFaculty('All');
                }}
                className="h-9 px-4 rounded-lg bg-slate-900 text-xs font-semibold text-white hover:bg-slate-800 transition cursor-pointer"
              >
                Reset Search
              </button>
            </div>
          ) : (
            <>
              <div className="rounded-2xl border border-slate-200/80 bg-white divide-y divide-slate-100 overflow-hidden shadow-2xs">
                {paginatedCourses.map((course, idx) => (
                  <CourseListRow
                    key={course.id}
                    course={course}
                    index={idx}
                    fromContext={fromContext}
                    isAuthenticated={isAuthenticated}
                    isCurrentlyLocked={lockedCombo?.courseId === course.id}
                    initialFlexibleCodes={
                      lockedCombo?.courseId === course.id
                        ? lockedCombo.electiveCodes.filter(
                            (c) => !course.coreElectiveCodes.includes(c)
                          )
                        : undefined
                    }
                    onLockIn={handleLockInCourse}
                  />
                ))}
              </div>

              {/* Minimalist Bottom Pagination Bar */}
              {totalPages > 1 && (
                <nav
                  aria-label="Course directory pagination"
                  className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 py-2 text-xs"
                >
                  <div className="text-slate-500 text-center sm:text-left">
                    Showing <span className="font-semibold text-slate-800">{startIndex + 1}</span> to{' '}
                    <span className="font-semibold text-slate-800">{endIndex}</span> of{' '}
                    <span className="font-semibold text-slate-800">{filteredCourses.length}</span> courses
                    <span className="ml-1 text-slate-400">
                      (Page {safePage} of {totalPages})
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handlePageChange(safePage - 1)}
                      disabled={safePage === 1}
                      aria-label="Previous page"
                      className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-medium hover:bg-slate-50 disabled:opacity-35 disabled:pointer-events-none transition flex items-center gap-1 cursor-pointer"
                    >
                      <ChevronLeft size={14} />
                      <span className="hidden sm:inline">Prev</span>
                    </button>

                    <div className="flex items-center gap-1">
                      {paginationItems.map((item, idx) => {
                        if (item === 'ellipsis') {
                          return (
                            <span
                              key={`ellipsis-${idx}`}
                              className="px-1 text-slate-400 select-none"
                            >
                              …
                            </span>
                          );
                        }
                        const pageNum = item as number;
                        const isCurrent = pageNum === safePage;
                        return (
                          <button
                            key={pageNum}
                            type="button"
                            onClick={() => handlePageChange(pageNum)}
                            aria-current={isCurrent ? 'page' : undefined}
                            className={`h-8 min-w-[32px] px-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                              isCurrent
                                ? 'bg-slate-900 text-white shadow-2xs'
                                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      onClick={() => handlePageChange(safePage + 1)}
                      disabled={safePage === totalPages}
                      aria-label="Next page"
                      className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-medium hover:bg-slate-50 disabled:opacity-35 disabled:pointer-events-none transition flex items-center gap-1 cursor-pointer"
                    >
                      <span className="hidden sm:inline">Next</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </nav>
              )}
            </>
          )}

          {/* SEO Authority FAQ Section */}
          <section id="faq" aria-labelledby="faq-heading" className="mt-16 pt-12 border-t border-slate-200/80 scroll-mt-24">
            <div className="max-w-3xl mb-8">
              <p className="eyebrow mb-2">
                <span className="size-2 rounded-full bg-[#116149]" />
                OFFICIAL IBASS GUIDANCE &amp; ADMISSIONS FAQ
              </p>
              <h2 id="faq-heading" className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 leading-tight">
                Frequently Asked <span className="serif-accent text-[#116149]">Questions</span>
              </h2>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Clear answers to frequent candidate questions regarding official JAMB UTME 4-subject requirements, flexible electives, O&apos;Level requirements, and cutoff scores across Nigerian universities.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white divide-y divide-slate-100 overflow-hidden shadow-2xs">
              {COMBINATIONS_FAQS.map((faqItem, idx) => (
                <details key={idx} className="group p-5 hover:bg-slate-50/50 transition-colors">
                  <summary className="cursor-pointer font-semibold text-slate-900 flex items-center justify-between gap-4 text-sm sm:text-base list-none">
                    <span>{faqItem.question}</span>
                    <span className="shrink-0 size-6 rounded-full bg-slate-100 group-open:bg-emerald-50 text-slate-500 group-open:text-[#116149] flex items-center justify-center text-xs font-bold transition">
                      +
                    </span>
                  </summary>
                  <p className="mt-3 text-xs sm:text-sm text-slate-600 leading-relaxed pl-1">
                    {faqItem.answer}
                  </p>
                </details>
              ))}
            </div>
          </section>
        </div>
      </main>

      {/* Minimalist Footer */}
      <footer className="shell flex flex-col justify-between gap-4 py-8 border-t border-slate-200/80 text-xs text-slate-500 sm:flex-row mt-16">
        <div className="flex items-center gap-4">
          <span className="font-bold text-slate-800">JAMBPrep by LecternIQ</span>
          <a href="#faq" className="hover:text-[#116149] transition-colors">FAQs</a>
        </div>
        <p className="max-w-md text-slate-500">
          Independent UTME brochure directory. Not affiliated with the Joint Admissions and Matriculation Board.
        </p>
        <PolicyLinks className="sm:justify-end" />
      </footer>
    </div>
  );
}

export function CombinationsClient() {
  return (
    <BrowserAccountBoundary mode="public">
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center bg-[#fafbf7] text-slate-500 text-xs">
            Loading course directory...
          </div>
        }
      >
        <CombinationsFinderInner />
      </Suspense>
    </BrowserAccountBoundary>
  );
}
