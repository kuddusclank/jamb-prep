/**
 * Automated Unit & Regression Test Suite for JAMB Course -> Subject Combination Finder (C00-C06)
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  CANONICAL_JAMB_SUBJECTS,
  COURSE_FACULTIES,
  getCourseById,
  getSubjectNameByCode,
  JAMB_COURSE_COMBINATIONS,
  POPULAR_COURSE_IDS,
  resolveCourseElectives,
  searchCourseCombinations,
} from '../src/lib/curriculum/jamb-course-combinations.ts';
import {
  buildLockedCombinationFromCourse,
  clearLockedCombination,
  clearOnboardingDraft,
  getLockedCombination,
  getOnboardingDraft,
  LOCKED_COMBINATION_STORAGE_KEY,
  LOCKED_COMBINATION_TTL_MS,
  ONBOARDING_DRAFT_STORAGE_KEY,
  saveLockedCombination,
  saveOnboardingDraft,
} from '../src/lib/curriculum/locked-combination-storage.ts';
import {
  ACTIVE_USER_STORAGE_KEY,
  clearPrivateBrowserState,
  syncBrowserUserStorage,
} from '../src/lib/auth/storage-cleanup.ts';

function createMemoryStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    get length() {
      return map.size;
    },
    key(index) {
      return Array.from(map.keys())[index] ?? null;
    },
    getItem(k) {
      return map.has(k) ? map.get(k) : null;
    },
    setItem(k, v) {
      map.set(String(k), String(v));
    },
    removeItem(k) {
      map.delete(String(k));
    },
  };
}

test('C06.1: JAMB_COURSE_COMBINATIONS has 420+ accredited courses across all 9 faculties and maps 1:1 to the 25 canonical database subjects', () => {
  assert.equal(
    JAMB_COURSE_COMBINATIONS.length >= 420,
    true,
    `Expected at least 420 courses, found ${JAMB_COURSE_COMBINATIONS.length}`
  );

  // Verify 1:1 mapping against bmad/current-subject-blueprint-verification.json
  const blueprintPath = path.join(
    process.cwd(),
    'bmad/current-subject-blueprint-verification.json'
  );
  const blueprintData = JSON.parse(fs.readFileSync(blueprintPath, 'utf8'));
  const dbSubjects = new Map(
    blueprintData.subjects.map((s) => [s.code, s.name])
  );

  assert.equal(Object.keys(CANONICAL_JAMB_SUBJECTS).length, 25);
  for (const [code, name] of Object.entries(CANONICAL_JAMB_SUBJECTS)) {
    assert.equal(
      dbSubjects.get(code),
      name,
      `Subject code ${code} name "${name}" does not match database "${dbSubjects.get(code)}"`
    );
    assert.equal(getSubjectNameByCode(code), name);
  }

  // Verify every faculty has courses and all course IDs are unique
  const seenIds = new Set();
  const facultyCounts = new Map(COURSE_FACULTIES.map((f) => [f, 0]));

  for (const course of JAMB_COURSE_COMBINATIONS) {
    assert.equal(seenIds.has(course.id), false, `Duplicate course id: ${course.id}`);
    seenIds.add(course.id);
    assert.equal(
      facultyCounts.has(course.faculty),
      true,
      `Invalid faculty "${course.faculty}" on ${course.id}`
    );
    facultyCounts.set(course.faculty, (facultyCounts.get(course.faculty) ?? 0) + 1);
    assert.equal(course.compulsoryCode, 'ENG');
    assert.equal(
      course.recommendedTargetScore >= 180 &&
        course.recommendedTargetScore <= 320 &&
        course.recommendedTargetScore % 5 === 0,
      true,
      `Invalid target score ${course.recommendedTargetScore} on ${course.id}`
    );
    assert.equal(course.ibassNote.length > 10, true, `Empty ibassNote on ${course.id}`);
  }

  for (const [fac, count] of facultyCounts.entries()) {
    assert.equal(count >= 10, true, `Faculty "${fac}" has fewer than 10 courses (${count})`);
  }

  // Verify all POPULAR_COURSE_IDS exist
  for (const popId of POPULAR_COURSE_IDS) {
    assert.equal(Boolean(getCourseById(popId)), true, `Missing popular course id: ${popId}`);
  }
});

test('C06.2: every course resolves to Use of English + 3 distinct valid electives by default and validates custom flexible selections', () => {
  for (const course of JAMB_COURSE_COMBINATIONS) {
    const resolved = resolveCourseElectives(course);
    assert.equal(
      resolved.isComplete,
      true,
      `Course ${course.id} did not resolve to a complete 3-elective combination`
    );
    assert.equal(resolved.compulsory.code, 'ENG');
    assert.equal(resolved.compulsory.name, 'Use of English');
    assert.equal(resolved.electives.length, 3);
    assert.equal(new Set(resolved.electiveCodes).size, 3);
    assert.equal(new Set(resolved.electiveNames).size, 3);
    assert.equal(resolved.electiveCodes.includes('ENG'), false);
  }

  // Test flexible slot customization on Computer Science (MTH + PHY core, 1 flexible from BIO|CHM|AGR|ECN|GEO)
  const compSci = getCourseById('computer-science');
  assert.ok(compSci);
  assert.ok(compSci.flexibleSlot);
  assert.equal(compSci.flexibleSlot.pickCount, 1);

  const withEcon = resolveCourseElectives(compSci, ['ECN']);
  assert.equal(withEcon.isComplete, true);
  assert.deepEqual(withEcon.electiveCodes, ['MTH', 'PHY', 'ECN']);
  assert.deepEqual(withEcon.electiveNames, ['Mathematics', 'Physics', 'Economics']);

  // Passing an invalid/disallowed flexible code (e.g. LIT or duplicate MTH) falls back to default (CHM)
  const withInvalid = resolveCourseElectives(compSci, ['LIT']);
  assert.equal(withInvalid.isComplete, true);
  assert.deepEqual(withInvalid.electiveCodes, ['MTH', 'PHY', 'CHM']);

  const withDuplicateCore = resolveCourseElectives(compSci, ['MTH']);
  assert.equal(withDuplicateCore.isComplete, true);
  assert.deepEqual(withDuplicateCore.electiveCodes, ['MTH', 'PHY', 'CHM']);
});

test('C06.3: fuzzy search accurately matches exact names, partial queries, faculty filters, and Nigerian student slang aliases', () => {
  const mbbsResults = searchCourseCombinations('mbbs');
  assert.ok(mbbsResults.length > 0);
  assert.equal(mbbsResults[0].id, 'medicine-and-surgery');

  const compSciResults = searchCourseCombinations('comp sci');
  assert.ok(compSciResults.length > 0);
  assert.equal(compSciResults[0].id, 'computer-science');

  const massCommResults = searchCourseCombinations('mass comm');
  assert.ok(massCommResults.length > 0);
  assert.equal(massCommResults[0].id, 'mass-communication');

  const lawResults = searchCourseCombinations('llb');
  assert.ok(lawResults.length > 0);
  assert.equal(lawResults[0].id, 'common-law');

  const nursingResults = searchCourseCombinations('bnsc');
  assert.ok(nursingResults.length > 0);
  assert.equal(nursingResults[0].id, 'nursing-science');

  const acctResults = searchCourseCombinations('ican');
  assert.ok(acctResults.length > 0);
  assert.equal(acctResults[0].id, 'accounting');

  // Faculty filter check
  const lawFacultyOnly = searchCourseCombinations('', 'Law');
  assert.ok(lawFacultyOnly.length >= 10);
  assert.equal(lawFacultyOnly.every((c) => c.faculty === 'Law'), true);

  const popularOnly = searchCourseCombinations('', 'Popular');
  assert.equal(popularOnly.length, POPULAR_COURSE_IDS.length);
});

test('C06.4: locked-combination-storage saves, validates, expires after 7-day TTL, preserves across guest signup, and clears on authenticated logout/account-switch', () => {
  const localStorage = createMemoryStorage();
  const sessionStorage = createMemoryStorage();
  const env = { localStorage, sessionStorage };

  const medCourse = getCourseById('medicine-and-surgery');
  assert.ok(medCourse);

  const now = new Date('2026-10-24T12:00:00.000Z');
  const payload = buildLockedCombinationFromCourse(medCourse, {
    source: 'landing',
    now,
  });

  saveLockedCombination(payload, env);
  const loaded = getLockedCombination({ env, nowMs: now.getTime() + 60_000 });
  assert.ok(loaded);
  assert.equal(loaded.courseId, 'medicine-and-surgery');
  assert.equal(loaded.courseTitle, 'Medicine and Surgery');
  assert.deepEqual(loaded.electiveCodes, ['BIO', 'CHM', 'PHY']);
  assert.deepEqual(loaded.electiveNames, ['Biology', 'Chemistry', 'Physics']);
  assert.equal(loaded.recommendedTargetScore, 300);

  // Guest -> Sign Up -> Onboarding transition (previousUserId is null) MUST preserve locked combination
  const guestToUserSync = syncBrowserUserStorage('user-111', env);
  assert.equal(guestToUserSync.switched, true);
  assert.ok(
    getLockedCombination({ env, nowMs: now.getTime() + 120_000 }),
    'Pre-signup locked combination must survive initial guest -> user transition'
  );

  // Save onboarding draft on /onboarding before visiting /combinations?from=onboarding
  saveOnboardingDraft(
    {
      targetInstitution: 'University of Lagos (UNILAG)',
      targetCourse: 'Medicine and Surgery',
      targetScore: 300,
      selectedElectives: ['Biology', 'Chemistry', 'Physics'],
    },
    env
  );
  const draft = getOnboardingDraft(env);
  assert.ok(draft);
  assert.equal(draft.targetInstitution, 'University of Lagos (UNILAG)');

  // Expired TTL (> 7 days) returns null and cleans up key
  const expired = getLockedCombination({
    env,
    nowMs: now.getTime() + LOCKED_COMBINATION_TTL_MS + 1000,
  });
  assert.equal(expired, null);
  assert.equal(localStorage.getItem(LOCKED_COMBINATION_STORAGE_KEY), null);

  // Re-save and verify authenticated logout clears both locked combination and onboarding draft
  saveLockedCombination(payload, env);
  assert.equal(localStorage.getItem(ACTIVE_USER_STORAGE_KEY), 'user-111');
  clearPrivateBrowserState({
    reason: 'logout',
    previousUserId: 'user-111',
    nextUserId: null,
    storageEnv: env,
  });
  assert.equal(getLockedCombination({ env, nowMs: now.getTime() }), null);
  assert.equal(getOnboardingDraft(env), null);
  assert.equal(sessionStorage.getItem(ONBOARDING_DRAFT_STORAGE_KEY), null);

  // Explicit clear helpers
  saveLockedCombination(payload, env);
  clearLockedCombination(env);
  assert.equal(getLockedCombination({ env, nowMs: now.getTime() }), null);
  clearOnboardingDraft(env);
  assert.equal(getOnboardingDraft(env), null);
});
