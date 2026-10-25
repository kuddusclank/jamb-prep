/**
 * Locked Course Combination & Onboarding Draft Storage Coordinator (C01)
 *
 * Manages cross-route persistence of a student's locked JAMB course combination
 * (`localStorage` key `jambprep_locked_combination_v1` with 7-day TTL) and
 * in-progress `/onboarding` form draft (`sessionStorage` key `jambprep_onboarding_draft_v1`).
 */

import {
  CANONICAL_JAMB_SUBJECTS,
  type CanonicalSubjectCode,
  type CanonicalSubjectName,
  type CourseFaculty,
  type JambCourseCombination,
  resolveCourseElectives,
} from './jamb-course-combinations';
import {
  type BrowserStorageEnvironment,
  registerPrivateCacheClearer,
  type StorageLike,
} from '../auth/storage-cleanup';

export const LOCKED_COMBINATION_STORAGE_KEY = 'jambprep_locked_combination_v1';
export const ONBOARDING_DRAFT_STORAGE_KEY = 'jambprep_onboarding_draft_v1';
export const COMBO_PROMPT_DISMISSED_SESSION_KEY = 'jambprep_combo_prompt_dismissed_v1';

/** 7 days in milliseconds */
export const LOCKED_COMBINATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type LockedCombinationSource = 'landing' | 'combinations-page' | 'onboarding-return';

export interface LockedCourseCombination {
  version: 1;
  courseId: string;
  courseTitle: string;
  faculty: CourseFaculty;
  compulsorySubject: 'Use of English';
  /** Exactly 3 canonical database subject names (excluding Use of English) */
  electiveNames: [CanonicalSubjectName, CanonicalSubjectName, CanonicalSubjectName];
  /** Corresponding 3-letter codes, e.g. ["BIO", "CHM", "PHY"] */
  electiveCodes: [CanonicalSubjectCode, CanonicalSubjectCode, CanonicalSubjectCode];
  recommendedTargetScore: number;
  competitiveScoreRange: string;
  ibassNote: string;
  lockedAtIso: string;
  source: LockedCombinationSource;
}

export interface OnboardingDraft {
  targetInstitution?: string;
  targetCourse?: string;
  targetScore?: number;
  selectedElectives?: string[];
  updatedAtIso: string;
}

function getLocalStorage(env?: BrowserStorageEnvironment): StorageLike | null {
  if (env && 'localStorage' in env) {
    return env.localStorage ?? null;
  }
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function getSessionStorage(env?: BrowserStorageEnvironment): StorageLike | null {
  if (env && 'sessionStorage' in env) {
    return env.sessionStorage ?? null;
  }
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function isValidElectiveCode(code: unknown): code is CanonicalSubjectCode {
  return (
    typeof code === 'string' &&
    code !== 'ENG' &&
    Object.prototype.hasOwnProperty.call(CANONICAL_JAMB_SUBJECTS, code)
  );
}

/**
 * Helper to construct a `LockedCourseCombination` payload from a `JambCourseCombination`
 * and optional user-selected flexible subject codes.
 */
export function buildLockedCombinationFromCourse(
  course: JambCourseCombination,
  options?: {
    chosenFlexibleCodes?: readonly string[];
    source?: LockedCombinationSource;
    now?: Date;
  }
): LockedCourseCombination {
  const resolved = resolveCourseElectives(course, options?.chosenFlexibleCodes);
  if (!resolved.isComplete || resolved.electiveCodes.length !== 3) {
    throw new Error(`Incomplete elective combination for course ${course.id}`);
  }

  return {
    version: 1,
    courseId: course.id,
    courseTitle: course.title,
    faculty: course.faculty,
    compulsorySubject: 'Use of English',
    electiveCodes: [
      resolved.electiveCodes[0],
      resolved.electiveCodes[1],
      resolved.electiveCodes[2],
    ],
    electiveNames: [
      resolved.electiveNames[0],
      resolved.electiveNames[1],
      resolved.electiveNames[2],
    ],
    recommendedTargetScore: course.recommendedTargetScore,
    competitiveScoreRange: course.competitiveScoreRange,
    ibassNote: course.ibassNote,
    lockedAtIso: (options?.now ?? new Date()).toISOString(),
    source: options?.source ?? 'combinations-page',
  };
}

/**
 * Saves a locked course combination to `localStorage`.
 */
export function saveLockedCombination(
  input: LockedCourseCombination,
  env?: BrowserStorageEnvironment
): void {
  const store = getLocalStorage(env);
  if (!store) return;

  const uniqueCodes = new Set(input.electiveCodes);
  if (
    input.electiveCodes.length !== 3 ||
    uniqueCodes.size !== 3 ||
    !input.electiveCodes.every(isValidElectiveCode)
  ) {
    return;
  }

  const canonicalNames = input.electiveCodes.map(
    (code) => CANONICAL_JAMB_SUBJECTS[code]
  ) as [CanonicalSubjectName, CanonicalSubjectName, CanonicalSubjectName];

  const payload: LockedCourseCombination = {
    ...input,
    version: 1,
    compulsorySubject: 'Use of English',
    electiveNames: canonicalNames,
    lockedAtIso: input.lockedAtIso || new Date().toISOString(),
  };

  try {
    store.setItem(LOCKED_COMBINATION_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage quota / private mode failures
  }
}

/**
 * Reads and validates the active locked course combination from `localStorage`.
 * Returns `null` (and cleans up the key) if missing, malformed, or older than 7 days.
 */
export function getLockedCombination(
  options?: {
    env?: BrowserStorageEnvironment;
    nowMs?: number;
  }
): LockedCourseCombination | null {
  const store = getLocalStorage(options?.env);
  if (!store) return null;

  try {
    const raw = store.getItem(LOCKED_COMBINATION_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<LockedCourseCombination>;
    if (
      !parsed ||
      parsed.version !== 1 ||
      typeof parsed.courseId !== 'string' ||
      !parsed.courseId.trim() ||
      typeof parsed.courseTitle !== 'string' ||
      !parsed.courseTitle.trim() ||
      !Array.isArray(parsed.electiveCodes) ||
      parsed.electiveCodes.length !== 3 ||
      typeof parsed.recommendedTargetScore !== 'number' ||
      typeof parsed.lockedAtIso !== 'string'
    ) {
      store.removeItem(LOCKED_COMBINATION_STORAGE_KEY);
      return null;
    }

    const lockedAtMs = Date.parse(parsed.lockedAtIso);
    const nowMs = options?.nowMs ?? Date.now();
    if (!Number.isFinite(lockedAtMs) || nowMs - lockedAtMs > LOCKED_COMBINATION_TTL_MS) {
      store.removeItem(LOCKED_COMBINATION_STORAGE_KEY);
      return null;
    }

    const codes = parsed.electiveCodes;
    const uniqueCodes = new Set(codes);
    if (uniqueCodes.size !== 3 || !codes.every(isValidElectiveCode)) {
      store.removeItem(LOCKED_COMBINATION_STORAGE_KEY);
      return null;
    }

    const canonicalNames = codes.map((code) => CANONICAL_JAMB_SUBJECTS[code]) as [
      CanonicalSubjectName,
      CanonicalSubjectName,
      CanonicalSubjectName,
    ];

    return {
      version: 1,
      courseId: parsed.courseId,
      courseTitle: parsed.courseTitle,
      faculty: (parsed.faculty as CourseFaculty) ?? 'Sciences & Computing',
      compulsorySubject: 'Use of English',
      electiveCodes: [codes[0], codes[1], codes[2]],
      electiveNames: canonicalNames,
      recommendedTargetScore: parsed.recommendedTargetScore,
      competitiveScoreRange:
        typeof parsed.competitiveScoreRange === 'string' ? parsed.competitiveScoreRange : '220 - 260+',
      ibassNote: typeof parsed.ibassNote === 'string' ? parsed.ibassNote : '',
      lockedAtIso: parsed.lockedAtIso,
      source:
        parsed.source === 'landing' ||
        parsed.source === 'combinations-page' ||
        parsed.source === 'onboarding-return'
          ? parsed.source
          : 'combinations-page',
    };
  } catch {
    try {
      store.removeItem(LOCKED_COMBINATION_STORAGE_KEY);
    } catch {
      // Ignore
    }
    return null;
  }
}

/**
 * Clears the locked course combination from `localStorage`.
 */
export function clearLockedCombination(env?: BrowserStorageEnvironment): void {
  const store = getLocalStorage(env);
  if (!store) return;
  try {
    store.removeItem(LOCKED_COMBINATION_STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}

/**
 * Saves an in-progress `/onboarding` draft (e.g., `targetInstitution`, `targetScore`,
 * `selectedElectives`) to `sessionStorage` before navigating to `/combinations?from=onboarding`.
 */
export function saveOnboardingDraft(
  draft: Omit<OnboardingDraft, 'updatedAtIso'>,
  env?: BrowserStorageEnvironment
): void {
  const store = getSessionStorage(env);
  if (!store) return;
  try {
    const payload: OnboardingDraft = {
      ...draft,
      updatedAtIso: new Date().toISOString(),
    };
    store.setItem(ONBOARDING_DRAFT_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Retrieves the saved `/onboarding` draft from `sessionStorage`, if any.
 */
export function getOnboardingDraft(env?: BrowserStorageEnvironment): OnboardingDraft | null {
  const store = getSessionStorage(env);
  if (!store) return null;
  try {
    const raw = store.getItem(ONBOARDING_DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<OnboardingDraft>;
    if (!parsed || typeof parsed !== 'object') {
      store.removeItem(ONBOARDING_DRAFT_STORAGE_KEY);
      return null;
    }
    return {
      targetInstitution:
        typeof parsed.targetInstitution === 'string' ? parsed.targetInstitution : undefined,
      targetCourse: typeof parsed.targetCourse === 'string' ? parsed.targetCourse : undefined,
      targetScore: typeof parsed.targetScore === 'number' ? parsed.targetScore : undefined,
      selectedElectives: Array.isArray(parsed.selectedElectives)
        ? parsed.selectedElectives.filter((item): item is string => typeof item === 'string')
        : undefined,
      updatedAtIso:
        typeof parsed.updatedAtIso === 'string' ? parsed.updatedAtIso : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

/**
 * Clears any saved `/onboarding` draft from `sessionStorage`.
 */
export function clearOnboardingDraft(env?: BrowserStorageEnvironment): void {
  const store = getSessionStorage(env);
  if (!store) return;
  try {
    store.removeItem(ONBOARDING_DRAFT_STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}

// Register cleanup callback so logout or account switch cleans up in-memory/browser state when appropriate.
registerPrivateCacheClearer(() => {
  clearOnboardingDraft();
});
