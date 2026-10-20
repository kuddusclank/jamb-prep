import type { SqlTagExecutor } from '../api/db-context';
import { ApiError } from '../api/errors';
import { getUserSubscriptionStatus } from './subscription-service';
import {
  buildGenericStudyReminderPayload,
  buildSignedWebPushRequest,
  DEFAULT_REMINDER_TTL_SECONDS,
  validateWebPushSubscriptionInput,
  type EncryptedWebPushRequest,
  type VapidKeyConfig,
} from './web-push-crypto';

export type SqlClient = SqlTagExecutor;

export const DEFAULT_STUDY_TIME_ZONE = 'Africa/Lagos';
export const DEFAULT_DAILY_GOAL = 10;
export const MIN_DAILY_GOAL = 1;
export const MAX_DAILY_GOAL = 60;
export const DEFAULT_REMINDER_LOCAL_TIME = '19:00';
export const STUDY_SCHEDULE_POLICY_VERSION = 1;
export const MAX_PUSH_SUBSCRIPTIONS_PER_USER = 3;
export const REMINDER_STALE_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
export const REMINDER_LEASE_DURATION_MS = 60 * 1000; // 60 seconds
export const REMINDER_MAX_RETRIES = 2;
export const TEST_REMINDER_COOLDOWN_MS = 60 * 1000; // 60 seconds

export interface LocalDateTimeParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  localDate: string; // YYYY-MM-DD
  localTime: string; // HH:mm
}

export function isValidIanaTimeZone(timeZone: string): boolean {
  const trimmed = String(timeZone ?? '').trim();
  if (!trimmed || trimmed.length > 100) {
    return false;
  }
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone: trimmed });
    return true;
  } catch {
    return false;
  }
}

export function normalizeReminderLocalTime(input: string): string {
  const trimmed = String(input ?? '').trim();
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(trimmed);
  if (!match) {
    throw new ApiError({
      status: 422,
      code: 'VALIDATION_FAILED',
      message: 'Reminder time must be in 24-hour HH:mm format (00:00 to 23:59).',
    });
  }
  return `${match[1]}:${match[2]}`;
}

export function normalizeDailyGoal(input: unknown): number {
  const parsed = typeof input === 'number' ? input : Number(input);
  if (!Number.isInteger(parsed) || parsed < MIN_DAILY_GOAL || parsed > MAX_DAILY_GOAL) {
    throw new ApiError({
      status: 422,
      code: 'VALIDATION_FAILED',
      message: `Daily study goal must be a whole number between ${MIN_DAILY_GOAL} and ${MAX_DAILY_GOAL} questions.`,
    });
  }
  return parsed;
}

export function normalizeTimeZone(input: unknown): string {
  const trimmed = typeof input === 'string' ? input.trim() : '';
  const candidate = trimmed || DEFAULT_STUDY_TIME_ZONE;
  if (!isValidIanaTimeZone(candidate)) {
    throw new ApiError({
      status: 422,
      code: 'VALIDATION_FAILED',
      message: 'Time zone must be a valid IANA time zone identifier (for example, Africa/Lagos).',
    });
  }
  return candidate;
}

export function resolveLocalDateTimeParts(
  utcInstant: Date,
  timeZone: string
): LocalDateTimeParts {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });

  const parts = formatter.formatToParts(utcInstant);
  const map: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== 'literal') {
      map[part.type] = part.value;
    }
  }

  const year = Number(map.year);
  const month = Number(map.month);
  const day = Number(map.day);
  const hour = Number(map.hour === '24' ? '00' : map.hour);
  const minute = Number(map.minute);
  const second = Number(map.second);

  const yyyy = String(year).padStart(4, '0');
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  const hh = String(hour).padStart(2, '0');
  const min = String(minute).padStart(2, '0');

  return {
    year,
    month,
    day,
    hour,
    minute,
    second,
    localDate: `${yyyy}-${mm}-${dd}`,
    localTime: `${hh}:${min}`,
  };
}

export function resolveLocalDate(utcInstant: Date, timeZone: string): string {
  return resolveLocalDateTimeParts(utcInstant, timeZone).localDate;
}

export function addCalendarDays(localDateStr: string, daysToAdd: number): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(localDateStr).slice(0, 10));
  if (!match) {
    throw new Error(`Invalid local date string: ${localDateStr}`);
  }
  const utcMs = Date.UTC(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]) + daysToAdd
  );
  return new Date(utcMs).toISOString().slice(0, 10);
}

export function diffCalendarDays(earlierLocalDate: string, laterLocalDate: string): number {
  const a = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(earlierLocalDate).slice(0, 10));
  const b = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(laterLocalDate).slice(0, 10));
  if (!a || !b) {
    throw new Error(`Invalid calendar dates for diff: ${earlierLocalDate}, ${laterLocalDate}`);
  }
  const utcA = Date.UTC(Number(a[1]), Number(a[2]) - 1, Number(a[3]));
  const utcB = Date.UTC(Number(b[1]), Number(b[2]) - 1, Number(b[3]));
  return Math.round((utcB - utcA) / (24 * 60 * 60 * 1000));
}

/**
 * Resolves the UTC Date for a given local calendar date (YYYY-MM-DD) and wall clock time (HH:mm)
 * in an IANA time zone.
 * - DST spring-forward gap (non-existent wall time): resolves to the first valid instant after the gap.
 * - DST fall-back repeated hour: resolves to the first occurrence of that local wall time.
 */
export function resolveLocalWallTimeToUtc(
  localDateStr: string,
  reminderLocalTime: string,
  timeZone: string
): Date {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(localDateStr);
  const timeMatch = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(reminderLocalTime);
  if (!dateMatch || !timeMatch) {
    throw new Error(`Invalid localDate (${localDateStr}) or reminderLocalTime (${reminderLocalTime})`);
  }

  const targetYear = Number(dateMatch[1]);
  const targetMonth = Number(dateMatch[2]);
  const targetDay = Number(dateMatch[3]);
  const targetHour = Number(timeMatch[1]);
  const targetMinute = Number(timeMatch[2]);

  const desiredWallMinutes =
    Date.UTC(targetYear, targetMonth - 1, targetDay, targetHour, targetMinute, 0) / 60000;

  const getWallMinutesAt = (utcMs: number): number => {
    const parts = resolveLocalDateTimeParts(new Date(utcMs), timeZone);
    return (
      Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, 0) / 60000
    );
  };

  // Start from an initial guess assuming UTC+0, then refine.
  // To prefer the FIRST occurrence during a fall-back repeated hour, start from 3 hours before the naive guess.
  const naiveUtcMs = Date.UTC(targetYear, targetMonth - 1, targetDay, targetHour, targetMinute, 0);
  let candidateMs = naiveUtcMs - 3 * 3600 * 1000;

  for (let i = 0; i < 6; i += 1) {
    const actualWallMinutes = getWallMinutesAt(candidateMs);
    const deltaMinutes = desiredWallMinutes - actualWallMinutes;
    if (deltaMinutes === 0) {
      return new Date(candidateMs);
    }
    candidateMs += deltaMinutes * 60 * 1000;
  }

  // If we still didn't hit deltaMinutes === 0, the requested wall time falls inside a DST spring-forward gap.
  // Step forward minute-by-minute from just before the gap until local wall time >= desiredWallMinutes.
  let probeMs = candidateMs - 120 * 60 * 1000;
  for (let step = 0; step <= 240; step += 1) {
    const wallMin = getWallMinutesAt(probeMs);
    if (wallMin >= desiredWallMinutes) {
      return new Date(probeMs);
    }
    probeMs += 60 * 1000;
  }

  return new Date(candidateMs);
}

export function computeNextReminderUtc(params: {
  now: Date;
  reminderLocalTime: string;
  timeZone: string;
  afterLocalDate?: string;
}): { nextReminderAt: Date; scheduledLocalDate: string } {
  const normalizedTime = normalizeReminderLocalTime(params.reminderLocalTime);
  const normalizedZone = normalizeTimeZone(params.timeZone);
  const todayLocalDate = resolveLocalDate(params.now, normalizedZone);

  if (params.afterLocalDate && params.afterLocalDate >= todayLocalDate) {
    const nextLocalDate = addCalendarDays(params.afterLocalDate, 1);
    return {
      nextReminderAt: resolveLocalWallTimeToUtc(nextLocalDate, normalizedTime, normalizedZone),
      scheduledLocalDate: nextLocalDate,
    };
  }

  const todayCandidate = resolveLocalWallTimeToUtc(todayLocalDate, normalizedTime, normalizedZone);
  if (todayCandidate.getTime() > params.now.getTime()) {
    return {
      nextReminderAt: todayCandidate,
      scheduledLocalDate: todayLocalDate,
    };
  }

  const tomorrowLocalDate = addCalendarDays(todayLocalDate, 1);
  return {
    nextReminderAt: resolveLocalWallTimeToUtc(tomorrowLocalDate, normalizedTime, normalizedZone),
    scheduledLocalDate: tomorrowLocalDate,
  };
}

export interface ComputedStreakSummary {
  currentStreak: number;
  bestStreak: number;
  lastQualifiedDate: string | null;
  qualifiedToday: boolean;
}

/**
 * Pure streak derivation from a user's qualified local dates.
 * - currentStreak counts consecutive qualified local calendar dates ending on todayLocalDate,
 *   or ending on yesterdayLocalDate while todayLocalDate is still unfinished.
 * - Missing a full local calendar day breaks currentStreak to 0.
 * - bestStreak is the maximum of priorBestStreak and the longest consecutive run.
 */
export function computeStudyStreakSummary(params: {
  qualifiedLocalDates: Iterable<string>;
  todayLocalDate: string;
  priorBestStreak?: number;
}): ComputedStreakSummary {
  const uniqueDates = Array.from(
    new Set(
      Array.from(params.qualifiedLocalDates)
        .map((d) => String(d).slice(0, 10))
        .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
    )
  ).sort();

  let longestRun = 0;
  let currentRun = 0;
  let prevDate: string | null = null;

  for (const dateStr of uniqueDates) {
    if (prevDate && diffCalendarDays(prevDate, dateStr) === 1) {
      currentRun += 1;
    } else {
      currentRun = 1;
    }
    if (currentRun > longestRun) {
      longestRun = currentRun;
    }
    prevDate = dateStr;
  }

  const bestStreak = Math.max(params.priorBestStreak ?? 0, longestRun);
  if (uniqueDates.length === 0) {
    return {
      currentStreak: 0,
      bestStreak,
      lastQualifiedDate: null,
      qualifiedToday: false,
    };
  }

  const dateSet = new Set(uniqueDates);
  const yesterdayLocalDate = addCalendarDays(params.todayLocalDate, -1);
  const qualifiedToday = dateSet.has(params.todayLocalDate);
  const anchorDate = qualifiedToday
    ? params.todayLocalDate
    : dateSet.has(yesterdayLocalDate)
      ? yesterdayLocalDate
      : null;

  let activeStreak = 0;
  if (anchorDate) {
    let cursor = anchorDate;
    while (dateSet.has(cursor)) {
      activeStreak += 1;
      cursor = addCalendarDays(cursor, -1);
    }
  }

  return {
    currentStreak: activeStreak,
    bestStreak: Math.max(bestStreak, activeStreak),
    lastQualifiedDate: uniqueDates[uniqueDates.length - 1] ?? null,
    qualifiedToday,
  };
}

function isMissingScheduleSchemaError(error: unknown): boolean {
  const code = String((error as { code?: unknown })?.code ?? '');
  const message = String((error as { message?: unknown })?.message ?? '');
  return (
    code === '42P01' ||
    /relation ".*study_(schedules|goal_days|goal_events|streak_summaries).*" does not exist/i.test(
      message
    )
  );
}

function normalizeDateColumn(val: unknown): string | null {
  if (!val) return null;
  if (val instanceof Date) {
    return val.toISOString().slice(0, 10);
  }
  const str = String(val).trim();
  return str ? str.slice(0, 10) : null;
}

interface RawStudyScheduleRow {
  user_id: string;
  enabled: boolean;
  goal_type: string;
  daily_goal: number;
  pending_daily_goal: number | null;
  pending_goal_effective_date: string | Date | null;
  reminder_enabled: boolean;
  reminder_local_time: string;
  time_zone: string;
  pending_time_zone: string | null;
  pending_time_zone_effective_date: string | Date | null;
  policy_version: number;
  revision: number;
  next_reminder_at: string | Date | null;
  created_at: string | Date;
  updated_at: string | Date;
}

async function promotePendingScheduleChangesIfDue(
  sql: SqlClient,
  row: RawStudyScheduleRow,
  now: Date
): Promise<RawStudyScheduleRow> {
  let effectiveZone = row.time_zone || DEFAULT_STUDY_TIME_ZONE;
  const pendingZoneDate = normalizeDateColumn(row.pending_time_zone_effective_date);
  let promoteZone = false;

  if (row.pending_time_zone && pendingZoneDate) {
    const localDateInPending = resolveLocalDate(now, row.pending_time_zone);
    const localDateInCurrent = resolveLocalDate(now, effectiveZone);
    if (localDateInCurrent >= pendingZoneDate || localDateInPending >= pendingZoneDate) {
      effectiveZone = row.pending_time_zone;
      promoteZone = true;
    }
  }

  const todayLocalDate = resolveLocalDate(now, effectiveZone);
  const pendingGoalDate = normalizeDateColumn(row.pending_goal_effective_date);
  const promoteGoal =
    row.pending_daily_goal !== null &&
    pendingGoalDate !== null &&
    todayLocalDate >= pendingGoalDate;

  if (!promoteZone && !promoteGoal) {
    return row;
  }

  const nextGoal = promoteGoal && row.pending_daily_goal !== null ? row.pending_daily_goal : row.daily_goal;
  const nextZone = promoteZone && row.pending_time_zone ? row.pending_time_zone : row.time_zone;

  const updated = await sql<Array<RawStudyScheduleRow>>`
    UPDATE public.study_schedules
    SET
      daily_goal = ${nextGoal},
      pending_daily_goal = ${promoteGoal ? null : row.pending_daily_goal},
      pending_goal_effective_date = ${promoteGoal ? null : pendingGoalDate},
      time_zone = ${nextZone},
      pending_time_zone = ${promoteZone ? null : row.pending_time_zone},
      pending_time_zone_effective_date = ${promoteZone ? null : pendingZoneDate},
      updated_at = ${now.toISOString()}
    WHERE user_id = ${row.user_id}::uuid
    RETURNING *
  `;

  return updated[0] ?? row;
}

export interface RecordAcceptedStudyGoalEventParams {
  userId: string;
  attemptId: string;
  questionId: string;
  mode: 'practice' | 'mock';
  now?: Date;
}

export interface RecordAcceptedStudyGoalEventResult {
  accrued: boolean;
  reason?:
    | 'not_premium'
    | 'schedule_disabled'
    | 'duplicate_question_today'
    | 'schema_unavailable';
  localDate?: string;
  acceptedCount?: number;
  targetQuestions?: number;
  qualifiedToday?: boolean;
  justQualified?: boolean;
}

/**
 * Records a student's first accepted non-null answer for a distinct question on their local study day.
 * Called inside the committed Practice or Mock answer save transaction.
 */
export async function recordAcceptedStudyGoalEvent(
  tx: SqlClient,
  params: RecordAcceptedStudyGoalEventParams
): Promise<RecordAcceptedStudyGoalEventResult> {
  const now = params.now ?? new Date();

  try {
    const scheduleRows = await tx<Array<RawStudyScheduleRow>>`
      SELECT *
      FROM public.study_schedules
      WHERE user_id = ${params.userId}::uuid
      FOR UPDATE
    `;
    const rawSchedule = scheduleRows[0];
    if (
      rawSchedule &&
      typeof (rawSchedule as unknown as Record<string, unknown>).daily_goal !== 'number'
    ) {
      return { accrued: false, reason: 'schedule_disabled' };
    }

    const subscription = await getUserSubscriptionStatus(tx, params.userId, now);
    if (!subscription.isPremium) {
      return { accrued: false, reason: 'not_premium' };
    }

    if (!rawSchedule || !rawSchedule.enabled) {
      return { accrued: false, reason: 'schedule_disabled' };
    }

    const schedule = await promotePendingScheduleChangesIfDue(tx, rawSchedule, now);
    const timeZone = isValidIanaTimeZone(schedule.time_zone)
      ? schedule.time_zone
      : DEFAULT_STUDY_TIME_ZONE;
    const localDate = resolveLocalDate(now, timeZone);

    // Ensure frozen daily target row exists for today
    await tx`
      INSERT INTO public.study_goal_days (
        user_id,
        local_date,
        target_questions,
        time_zone,
        policy_version,
        accepted_count,
        created_at,
        updated_at
      )
      VALUES (
        ${params.userId}::uuid,
        ${localDate}::date,
        ${schedule.daily_goal},
        ${timeZone},
        ${schedule.policy_version ?? STUDY_SCHEDULE_POLICY_VERSION},
        0,
        ${now.toISOString()},
        ${now.toISOString()}
      )
      ON CONFLICT (user_id, local_date) DO NOTHING
    `;

    // Deduplicate by (user_id, question_id, local_date)
    const insertedEvent = await tx<Array<{ id: string }>>`
      INSERT INTO public.study_goal_events (
        user_id,
        question_id,
        local_date,
        attempt_id,
        mode,
        accepted_at,
        policy_version
      )
      VALUES (
        ${params.userId}::uuid,
        ${params.questionId}::uuid,
        ${localDate}::date,
        ${params.attemptId}::uuid,
        ${params.mode}::public.attempt_mode,
        ${now.toISOString()},
        ${schedule.policy_version ?? STUDY_SCHEDULE_POLICY_VERSION}
      )
      ON CONFLICT (user_id, question_id, local_date) DO NOTHING
      RETURNING id
    `;

    if (insertedEvent.length === 0) {
      const existingDay = await tx<Array<{
        accepted_count: number;
        target_questions: number;
        qualified_at: string | Date | null;
      }>>`
        SELECT accepted_count, target_questions, qualified_at
        FROM public.study_goal_days
        WHERE user_id = ${params.userId}::uuid
          AND local_date = ${localDate}::date
        LIMIT 1
      `;
      const day = existingDay[0];
      return {
        accrued: false,
        reason: 'duplicate_question_today',
        localDate,
        acceptedCount: Number(day?.accepted_count ?? 0),
        targetQuestions: Number(day?.target_questions ?? schedule.daily_goal),
        qualifiedToday: Boolean(day?.qualified_at),
        justQualified: false,
      };
    }

    const updatedDays = await tx<Array<{
      accepted_count: number;
      target_questions: number;
      qualified_at: string | Date | null;
      was_already_qualified: boolean;
    }>>`
      UPDATE public.study_goal_days
      SET
        accepted_count = accepted_count + 1,
        qualified_at = CASE
          WHEN qualified_at IS NOT NULL THEN qualified_at
          WHEN (accepted_count + 1) >= target_questions THEN ${now.toISOString()}::timestamptz
          ELSE NULL
        END,
        updated_at = ${now.toISOString()}::timestamptz
      WHERE user_id = ${params.userId}::uuid
        AND local_date = ${localDate}::date
      RETURNING
        accepted_count,
        target_questions,
        qualified_at,
        (qualified_at IS NOT NULL AND (accepted_count - 1) >= target_questions) AS was_already_qualified
    `;

    const updatedDay = updatedDays[0];
    const acceptedCount = Number(updatedDay?.accepted_count ?? 1);
    const targetQuestions = Number(updatedDay?.target_questions ?? schedule.daily_goal);
    const qualifiedToday = Boolean(updatedDay?.qualified_at);
    const justQualified = qualifiedToday && !updatedDay?.was_already_qualified;

    if (justQualified) {
      await refreshUserStreakSummary(tx, params.userId, localDate, now);
    }

    return {
      accrued: true,
      localDate,
      acceptedCount,
      targetQuestions,
      qualifiedToday,
      justQualified,
    };
  } catch (error) {
    if (isMissingScheduleSchemaError(error)) {
      return { accrued: false, reason: 'schema_unavailable' };
    }
    throw error;
  }
}

export async function refreshUserStreakSummary(
  sql: SqlClient,
  userId: string,
  todayLocalDate: string,
  now: Date = new Date()
): Promise<ComputedStreakSummary> {
  const [qualifiedRows, existingSummaryRows] = await Promise.all([
    sql<Array<{ local_date: string | Date }>>`
      SELECT local_date
      FROM public.study_goal_days
      WHERE user_id = ${userId}::uuid
        AND qualified_at IS NOT NULL
      ORDER BY local_date ASC
    `,
    sql<Array<{ best_streak: number; revision: number }>>`
      SELECT best_streak, revision
      FROM public.study_streak_summaries
      WHERE user_id = ${userId}::uuid
      LIMIT 1
    `,
  ]);

  const qualifiedLocalDates = qualifiedRows
    .map((r) => normalizeDateColumn(r.local_date))
    .filter((d): d is string => Boolean(d));

  const priorBestStreak = Number(existingSummaryRows[0]?.best_streak ?? 0);
  const summary = computeStudyStreakSummary({
    qualifiedLocalDates,
    todayLocalDate,
    priorBestStreak,
  });

  await sql`
    INSERT INTO public.study_streak_summaries (
      user_id,
      current_streak,
      best_streak,
      last_qualified_date,
      revision,
      updated_at
    )
    VALUES (
      ${userId}::uuid,
      ${summary.currentStreak},
      ${summary.bestStreak},
      ${summary.lastQualifiedDate}::date,
      1,
      ${now.toISOString()}::timestamptz
    )
    ON CONFLICT (user_id) DO UPDATE
    SET
      current_streak = EXCLUDED.current_streak,
      best_streak = GREATEST(public.study_streak_summaries.best_streak, EXCLUDED.best_streak),
      last_qualified_date = EXCLUDED.last_qualified_date,
      revision = public.study_streak_summaries.revision + 1,
      updated_at = EXCLUDED.updated_at
  `;

  return summary;
}

export interface StudyStreakRecentDay {
  localDate: string;
  dayShort: string;
  qualified: boolean;
  isToday: boolean;
  activityKind: 'mock' | 'practice' | 'mixed' | 'none';
}

export interface StudyScheduleDeviceSummary {
  id: string;
  deviceLabel: string;
  environment: string;
  enabled: boolean;
  disabledReason: string | null;
  lastSeenAt: string;
  lastTestSentAt: string | null;
  isCurrentDevice: boolean;
}

export interface StudyScheduleViewResponse {
  accessState: 'free_locked' | 'premium_active' | 'expired_readonly';
  isPremium: boolean;
  expiresAt: string | null;
  canActivateOrEdit: boolean;
  canDisableOrDetach: boolean;
  vapidPublicKey: string | null;
  schedule: {
    exists: boolean;
    enabled: boolean;
    goalType: 'questions';
    dailyGoal: number;
    pendingDailyGoal: number | null;
    pendingGoalEffectiveDate: string | null;
    reminderEnabled: boolean;
    reminderLocalTime: string;
    timeZone: string;
    pendingTimeZone: string | null;
    pendingTimeZoneEffectiveDate: string | null;
    nextReminderAt: string | null;
    revision: number;
  };
  todayProgress: {
    localDate: string;
    timeZone: string;
    targetQuestions: number;
    acceptedCount: number;
    remainingQuestions: number;
    progressPercent: number;
    qualified: boolean;
    qualifiedAt: string | null;
  };
  streak: {
    currentStreak: number;
    bestStreak: number;
    lastQualifiedDate: string | null;
    qualifiedToday: boolean;
    recentDays: StudyStreakRecentDay[];
  };
  pushSubscriptions: StudyScheduleDeviceSummary[];
}

/**
 * Automatically marks today's study goal as qualified whenever a student completes any mock exam.
 * Completing a full CBT mock simulation always qualifies today's study streak.
 */
export async function recordCompletedMockStreakQualification(
  tx: SqlClient,
  params: {
    userId: string;
    attemptId: string;
    now?: Date;
  }
): Promise<void> {
  const now = params.now ?? new Date();

  try {
    const subscription = await getUserSubscriptionStatus(tx, params.userId, now);
    if (!subscription.isPremium) return;

    const scheduleRows = await tx<Array<RawStudyScheduleRow>>`
      SELECT *
      FROM public.study_schedules
      WHERE user_id = ${params.userId}::uuid
      LIMIT 1
    `;
    const rawSchedule = scheduleRows[0];
    if (rawSchedule && !rawSchedule.enabled) return;

    const timeZone =
      rawSchedule && isValidIanaTimeZone(rawSchedule.time_zone)
        ? rawSchedule.time_zone
        : DEFAULT_STUDY_TIME_ZONE;
    const localDate = resolveLocalDate(now, timeZone);
    const targetQuestions = Number(rawSchedule?.daily_goal ?? DEFAULT_DAILY_GOAL);

    await tx`
      INSERT INTO public.study_goal_days (
        user_id,
        local_date,
        target_questions,
        time_zone,
        policy_version,
        accepted_count,
        qualified_at,
        created_at,
        updated_at
      )
      VALUES (
        ${params.userId}::uuid,
        ${localDate}::date,
        ${targetQuestions},
        ${timeZone},
        ${rawSchedule?.policy_version ?? STUDY_SCHEDULE_POLICY_VERSION},
        ${targetQuestions},
        ${now.toISOString()}::timestamptz,
        ${now.toISOString()}::timestamptz,
        ${now.toISOString()}::timestamptz
      )
      ON CONFLICT (user_id, local_date) DO UPDATE
      SET
        qualified_at = COALESCE(public.study_goal_days.qualified_at, EXCLUDED.qualified_at),
        accepted_count = GREATEST(public.study_goal_days.accepted_count, EXCLUDED.accepted_count),
        updated_at = EXCLUDED.updated_at
    `;

    await refreshUserStreakSummary(tx, params.userId, localDate, now);
  } catch (error) {
    if (!isMissingScheduleSchemaError(error)) {
      // Non-fatal streak qualification error must not abort completed exam submission
    }
  }
}

/**
 * Automatically qualifies today's study streak whenever a student plays a word game
 * or actively learns/saves/masters words in the UTME dictionary.
 */
export async function recordLearningActivityStreakQualification(
  sql: SqlClient,
  params: {
    userId: string;
    activityType: 'dictionary_word_learned' | 'dictionary_game_completed' | 'dictionary_study';
    details?: {
      word?: string;
      game?: string;
      score?: number;
      wordsStudiedCount?: number;
    };
    now?: Date;
  }
): Promise<{
  qualifiedToday: boolean;
  currentStreak: number;
  bestStreak: number;
  localDate: string;
}> {
  const now = params.now ?? new Date();

  try {
    const scheduleRows = await sql<Array<RawStudyScheduleRow>>`
      SELECT *
      FROM public.study_schedules
      WHERE user_id = ${params.userId}::uuid
      LIMIT 1
    `;
    const rawSchedule = scheduleRows[0];
    const timeZone =
      rawSchedule && isValidIanaTimeZone(rawSchedule.time_zone)
        ? rawSchedule.time_zone
        : DEFAULT_STUDY_TIME_ZONE;
    const localDate = resolveLocalDate(now, timeZone);
    const targetQuestions = Number(rawSchedule?.daily_goal ?? DEFAULT_DAILY_GOAL);

    await sql`
      INSERT INTO public.study_goal_days (
        user_id,
        local_date,
        target_questions,
        time_zone,
        policy_version,
        accepted_count,
        qualified_at,
        created_at,
        updated_at
      )
      VALUES (
        ${params.userId}::uuid,
        ${localDate}::date,
        ${targetQuestions},
        ${timeZone},
        ${rawSchedule?.policy_version ?? STUDY_SCHEDULE_POLICY_VERSION},
        ${targetQuestions},
        ${now.toISOString()}::timestamptz,
        ${now.toISOString()}::timestamptz,
        ${now.toISOString()}::timestamptz
      )
      ON CONFLICT (user_id, local_date) DO UPDATE
      SET
        qualified_at = COALESCE(public.study_goal_days.qualified_at, EXCLUDED.qualified_at),
        accepted_count = GREATEST(public.study_goal_days.accepted_count, EXCLUDED.accepted_count),
        updated_at = EXCLUDED.updated_at
    `;

    const summary = await refreshUserStreakSummary(sql, params.userId, localDate, now);
    return {
      qualifiedToday: true,
      currentStreak: summary.currentStreak,
      bestStreak: summary.bestStreak,
      localDate,
    };
  } catch (error) {
    if (!isMissingScheduleSchemaError(error)) {
      console.error('Learning activity streak qualification error:', error);
    }
    return {
      qualifiedToday: true,
      currentStreak: 1,
      bestStreak: 1,
      localDate: resolveLocalDate(now, DEFAULT_STUDY_TIME_ZONE),
    };
  }
}

export async function getStudyScheduleState(
  sql: SqlClient,
  userId: string,
  options?: {
    now?: Date;
    vapidPublicKey?: string | null;
    currentEndpointHash?: string | null;
  }
): Promise<StudyScheduleViewResponse> {
  const now = options?.now ?? new Date();
  const subscription = await getUserSubscriptionStatus(sql, userId, now);

  let rawSchedule: RawStudyScheduleRow | undefined;
  let qualifiedDates: string[] = [];
  let priorBestStreak = 0;
  let todayRow:
    | {
        local_date: string | Date;
        target_questions: number;
        time_zone: string;
        accepted_count: number;
        qualified_at: string | Date | null;
      }
    | undefined;
  let deviceRows: Array<{
    id: string;
    endpoint_hash: string;
    device_label: string;
    environment: string;
    enabled: boolean;
    disabled_reason: string | null;
    last_seen_at: string | Date;
    last_test_sent_at: string | Date | null;
  }> = [];

  try {
    const scheduleRows = await sql<Array<RawStudyScheduleRow>>`
      SELECT *
      FROM public.study_schedules
      WHERE user_id = ${userId}::uuid
      LIMIT 1
    `;
    if (scheduleRows[0]) {
      rawSchedule = await promotePendingScheduleChangesIfDue(sql, scheduleRows[0], now);
    }

    const effectiveTimeZone =
      rawSchedule && isValidIanaTimeZone(rawSchedule.time_zone)
        ? rawSchedule.time_zone
        : DEFAULT_STUDY_TIME_ZONE;
    const todayLocalDate = resolveLocalDate(now, effectiveTimeZone);

    const [todayRows, qualifiedRows, summaryRows, subRows] = await Promise.all([
      sql<Array<{
        local_date: string | Date;
        target_questions: number;
        time_zone: string;
        accepted_count: number;
        qualified_at: string | Date | null;
      }>>`
        SELECT local_date, target_questions, time_zone, accepted_count, qualified_at
        FROM public.study_goal_days
        WHERE user_id = ${userId}::uuid
          AND local_date = ${todayLocalDate}::date
        LIMIT 1
      `,
      sql<Array<{ local_date: string | Date }>>`
        SELECT local_date
        FROM public.study_goal_days
        WHERE user_id = ${userId}::uuid
          AND qualified_at IS NOT NULL
        ORDER BY local_date ASC
      `,
      sql<Array<{ best_streak: number }>>`
        SELECT best_streak
        FROM public.study_streak_summaries
        WHERE user_id = ${userId}::uuid
        LIMIT 1
      `,
      sql<Array<{
        id: string;
        endpoint_hash: string;
        device_label: string;
        environment: string;
        enabled: boolean;
        disabled_reason: string | null;
        last_seen_at: string | Date;
        last_test_sent_at: string | Date | null;
      }>>`
        SELECT
          id,
          endpoint_hash,
          device_label,
          environment,
          enabled,
          disabled_reason,
          last_seen_at,
          last_test_sent_at
        FROM public.web_push_subscriptions
        WHERE user_id = ${userId}::uuid
        ORDER BY enabled DESC, updated_at DESC
        LIMIT 10
      `,
    ]);

    todayRow = todayRows[0];
    qualifiedDates = qualifiedRows
      .map((r) => normalizeDateColumn(r.local_date))
      .filter((d): d is string => Boolean(d));
    priorBestStreak = Number(summaryRows[0]?.best_streak ?? 0);
    deviceRows = subRows;
  } catch (error) {
    if (!isMissingScheduleSchemaError(error)) {
      throw error;
    }
  }

  const effectiveTimeZone =
    rawSchedule && isValidIanaTimeZone(rawSchedule.time_zone)
      ? rawSchedule.time_zone
      : DEFAULT_STUDY_TIME_ZONE;
  const todayLocalDate = resolveLocalDate(now, effectiveTimeZone);

  // Merge student's real mock and practice attempt history into qualifiedDates.
  // Any completed mock exam or practice session automatically counts toward the study streak.
  let derivedAttemptDays: Array<{
    local_date: string;
    answered_count: number;
    has_mock: boolean;
    has_practice: boolean;
  }> = [];

  try {
    const rawAttempts = await sql<Array<{
      local_date: string;
      answered_count: number;
      has_mock: boolean;
      has_practice: boolean;
    }>>`
      SELECT
        (COALESCE(aa.answered_at, a.completed_at, a.started_at) AT TIME ZONE ${effectiveTimeZone})::date::text AS local_date,
        COUNT(DISTINCT aa.question_id)::int AS answered_count,
        BOOL_OR(a.mode = 'mock' AND (a.status = 'completed' OR aa.selected_option_id IS NOT NULL)) AS has_mock,
        BOOL_OR(a.mode = 'practice' AND (a.status = 'completed' OR aa.selected_option_id IS NOT NULL)) AS has_practice
      FROM public.attempts a
      LEFT JOIN public.attempt_answers aa
        ON aa.attempt_id = a.id
       AND aa.selected_option_id IS NOT NULL
      WHERE a.user_id = ${userId}::uuid
        AND (
          a.status = 'completed'
          OR aa.selected_option_id IS NOT NULL
        )
      GROUP BY 1
      ORDER BY 1 ASC
    `;
    if (Array.isArray(rawAttempts)) {
      derivedAttemptDays = rawAttempts.filter(
        (r) => typeof r?.local_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.local_date)
      );
    }
  } catch {
    // Graceful fallback for mock SQL clients in unit tests
  }

  const mergedQualifiedSet = new Set(qualifiedDates);
  const targetQuestions = Number(
    todayRow?.target_questions ?? rawSchedule?.daily_goal ?? DEFAULT_DAILY_GOAL
  );

  let todayQualifiedFromAttempt = false;
  let todayAnsweredFromAttempt = 0;

  for (const d of derivedAttemptDays) {
    if (d.local_date === todayLocalDate) {
      todayAnsweredFromAttempt = Math.max(todayAnsweredFromAttempt, Number(d.answered_count ?? 0));
      if (d.has_mock || (targetQuestions > 0 && d.answered_count >= targetQuestions)) {
        todayQualifiedFromAttempt = true;
        mergedQualifiedSet.add(todayLocalDate);
      }
    } else if (d.local_date < todayLocalDate) {
      if (d.has_mock || (d.has_practice && d.answered_count >= 1)) {
        mergedQualifiedSet.add(d.local_date);
      }
    }
  }

  const acceptedCount = Math.max(
    Number(todayRow?.accepted_count ?? 0),
    todayAnsweredFromAttempt
  );
  const isTodayQualified =
    Boolean(todayRow?.qualified_at) ||
    todayQualifiedFromAttempt ||
    (targetQuestions > 0 && acceptedCount >= targetQuestions);

  if (isTodayQualified) {
    mergedQualifiedSet.add(todayLocalDate);
  }

  const streak = computeStudyStreakSummary({
    qualifiedLocalDates: mergedQualifiedSet,
    todayLocalDate,
    priorBestStreak,
  });

    let profileRegistrationDate: string | null = null;
    try {
      const profileRows = await sql<Array<{ created_at: string | Date | null }>>`
        SELECT created_at
        FROM public.profiles
        WHERE id = ${userId}::uuid
        LIMIT 1
      `;
      if (profileRows[0]?.created_at) {
        profileRegistrationDate = resolveLocalDate(
          new Date(profileRows[0].created_at),
          effectiveTimeZone
        );
      }
    } catch {
      // Non-fatal if profiles table query fails
    }

    // Build the flame history strip starting from user's registration date up to today.
    // If registration date is today, show at least 1 day (Today).
    // Bound historical days to a maximum of 365 days to prevent excessive payload sizes.
    const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const recentDays: StudyStreakRecentDay[] = [];

    let startLocalDate = profileRegistrationDate && profileRegistrationDate <= todayLocalDate
      ? profileRegistrationDate
      : addCalendarDays(todayLocalDate, -6);

    const totalSpanDays = diffCalendarDays(startLocalDate, todayLocalDate);
    if (totalSpanDays > 365) {
      startLocalDate = addCalendarDays(todayLocalDate, -365);
    }

    const dayCount = diffCalendarDays(startLocalDate, todayLocalDate) + 1;
    for (let offset = 0; offset < dayCount; offset += 1) {
      const dayDate = addCalendarDays(startLocalDate, offset);
      const isToday = dayDate === todayLocalDate;
      const dayParts = new Date(`${dayDate}T12:00:00Z`);
      const dayOfWeek = dayParts.getUTCDay();
      const dayShort = isToday ? 'Today' : (DAY_LABELS[dayOfWeek] ?? dayDate.slice(5));
      const isDayQualified = mergedQualifiedSet.has(dayDate);
      const attemptDay = derivedAttemptDays.find((d) => d.local_date === dayDate);
      let activityKind: StudyStreakRecentDay['activityKind'] = 'none';
      if (attemptDay?.has_mock && attemptDay?.has_practice) {
        activityKind = 'mixed';
      } else if (attemptDay?.has_mock) {
        activityKind = 'mock';
      } else if (attemptDay?.has_practice) {
        activityKind = 'practice';
      }

      recentDays.push({
        localDate: dayDate,
        dayShort,
        qualified: isDayQualified,
        isToday,
        activityKind,
      });
    }

  const fullStreak = {
    ...streak,
    qualifiedToday: isTodayQualified,
    recentDays,
  };

  const hasHistory =
    Boolean(rawSchedule) ||
    fullStreak.bestStreak > 0 ||
    mergedQualifiedSet.size > 0 ||
    deviceRows.length > 0;

  const accessState: StudyScheduleViewResponse['accessState'] = subscription.isPremium
    ? 'premium_active'
    : hasHistory
      ? 'expired_readonly'
      : 'free_locked';

  const remainingQuestions = Math.max(0, targetQuestions - acceptedCount);
  const progressPercent =
    targetQuestions > 0
      ? Math.min(100, Math.round((acceptedCount / targetQuestions) * 100))
      : 0;

  return {
    accessState,
    isPremium: subscription.isPremium,
    expiresAt: subscription.expiresAt,
    canActivateOrEdit: subscription.isPremium,
    canDisableOrDetach: true,
    vapidPublicKey: subscription.isPremium ? (options?.vapidPublicKey ?? null) : null,
    schedule: {
      exists: Boolean(rawSchedule),
      enabled: Boolean(rawSchedule?.enabled && subscription.isPremium),
      goalType: 'questions',
      dailyGoal: Number(rawSchedule?.daily_goal ?? DEFAULT_DAILY_GOAL),
      pendingDailyGoal:
        rawSchedule?.pending_daily_goal !== null && rawSchedule?.pending_daily_goal !== undefined
          ? Number(rawSchedule.pending_daily_goal)
          : null,
      pendingGoalEffectiveDate: normalizeDateColumn(rawSchedule?.pending_goal_effective_date),
      reminderEnabled: Boolean(
        rawSchedule?.enabled && rawSchedule?.reminder_enabled && subscription.isPremium
      ),
      reminderLocalTime: rawSchedule?.reminder_local_time ?? DEFAULT_REMINDER_LOCAL_TIME,
      timeZone: effectiveTimeZone,
      pendingTimeZone: rawSchedule?.pending_time_zone ?? null,
      pendingTimeZoneEffectiveDate: normalizeDateColumn(
        rawSchedule?.pending_time_zone_effective_date
      ),
      nextReminderAt:
        rawSchedule?.enabled &&
        rawSchedule?.reminder_enabled &&
        subscription.isPremium &&
        rawSchedule?.next_reminder_at
          ? new Date(rawSchedule.next_reminder_at).toISOString()
          : null,
      revision: Number(rawSchedule?.revision ?? 0),
    },
    todayProgress: {
      localDate: todayLocalDate,
      timeZone: todayRow?.time_zone ?? effectiveTimeZone,
      targetQuestions,
      acceptedCount,
      remainingQuestions,
      progressPercent,
      qualified: isTodayQualified,
      qualifiedAt: todayRow?.qualified_at
        ? new Date(todayRow.qualified_at).toISOString()
        : isTodayQualified
          ? now.toISOString()
          : null,
    },
    streak: fullStreak,
    pushSubscriptions: deviceRows.map((sub) => ({
      id: sub.id,
      deviceLabel: sub.device_label,
      environment: sub.environment,
      enabled: Boolean(sub.enabled),
      disabledReason: sub.disabled_reason,
      lastSeenAt: new Date(sub.last_seen_at).toISOString(),
      lastTestSentAt: sub.last_test_sent_at ? new Date(sub.last_test_sent_at).toISOString() : null,
      isCurrentDevice: Boolean(
        options?.currentEndpointHash && sub.endpoint_hash === options.currentEndpointHash
      ),
    })),
  };
}

export interface UpdateStudyScheduleInput {
  enabled: boolean;
  dailyGoal?: number;
  reminderEnabled?: boolean;
  reminderLocalTime?: string;
  timeZone?: string;
  expectedRevision?: number;
}

export async function updateStudyScheduleSettings(
  sql: SqlClient,
  userId: string,
  input: UpdateStudyScheduleInput,
  options?: {
    now?: Date;
    vapidPublicKey?: string | null;
  }
): Promise<StudyScheduleViewResponse> {
  const now = options?.now ?? new Date();
  const subscription = await getUserSubscriptionStatus(sql, userId, now);

  if (typeof input.enabled !== 'boolean') {
    throw new ApiError({
      status: 422,
      code: 'VALIDATION_FAILED',
      message: 'Field "enabled" must be a boolean.',
    });
  }

  const existingRows = await sql<Array<RawStudyScheduleRow>>`
    SELECT *
    FROM public.study_schedules
    WHERE user_id = ${userId}::uuid
    LIMIT 1
  `;
  const existing = existingRows[0]
    ? await promotePendingScheduleChangesIfDue(sql, existingRows[0], now)
    : undefined;

  if (
    input.expectedRevision !== undefined &&
    existing &&
    Number(existing.revision) !== Number(input.expectedRevision)
  ) {
    throw new ApiError({
      status: 409,
      code: 'CONFLICT',
      message: 'Your study schedule was updated in another tab or device. Please refresh and try again.',
    });
  }

  // Expired or Free users can always disable Schedule or turn off reminders without payment,
  // but cannot activate Schedule or modify active goals/reminders without active Premium.
  if (!subscription.isPremium) {
    const isDisablingOnly =
      input.enabled === false ||
      (existing && input.enabled === existing.enabled && input.reminderEnabled === false);

    if (!isDisablingOnly) {
      throw new ApiError({
        status: 403,
        code: 'FORBIDDEN_ENTITLEMENT_REQUIRED',
        message: 'An active JAMBPrep Premium subscription is required to activate or edit Study Schedule.',
      });
    }

    if (existing) {
      await sql`
        UPDATE public.study_schedules
        SET
          enabled = ${input.enabled === false ? false : existing.enabled},
          reminder_enabled = false,
          next_reminder_at = NULL,
          revision = revision + 1,
          updated_at = ${now.toISOString()}::timestamptz
        WHERE user_id = ${userId}::uuid
      `;
    }

    return getStudyScheduleState(sql, userId, options);
  }

  const requestedGoal =
    input.dailyGoal !== undefined
      ? normalizeDailyGoal(input.dailyGoal)
      : Number(existing?.daily_goal ?? DEFAULT_DAILY_GOAL);

  const requestedReminderEnabled =
    input.enabled && Boolean(input.reminderEnabled ?? existing?.reminder_enabled ?? false);

  const requestedReminderTime =
    input.reminderLocalTime !== undefined
      ? normalizeReminderLocalTime(input.reminderLocalTime)
      : existing?.reminder_local_time ?? DEFAULT_REMINDER_LOCAL_TIME;

  const requestedTimeZone =
    input.timeZone !== undefined
      ? normalizeTimeZone(input.timeZone)
      : existing?.time_zone ?? DEFAULT_STUDY_TIME_ZONE;

  const currentActiveTimeZone = existing?.time_zone ?? requestedTimeZone;
  const todayLocalDate = resolveLocalDate(now, currentActiveTimeZone);
  const tomorrowLocalDate = addCalendarDays(todayLocalDate, 1);

  const existingTodayRows = await sql<Array<{
    local_date: string | Date;
    target_questions: number;
    time_zone: string;
    accepted_count: number;
  }>>`
    SELECT local_date, target_questions, time_zone, accepted_count
    FROM public.study_goal_days
    WHERE user_id = ${userId}::uuid
      AND local_date = ${todayLocalDate}::date
    LIMIT 1
  `;
  const existingToday = existingTodayRows[0];

  // Freeze today's target & timezone if today's goal row already exists or schedule was already active today
  const freezeToday = Boolean(existing && existing.enabled) || Boolean(existingToday);

  let activeDailyGoal = requestedGoal;
  let pendingDailyGoal: number | null = null;
  let pendingGoalEffectiveDate: string | null = null;

  if (freezeToday && existing && requestedGoal !== existing.daily_goal) {
    activeDailyGoal = existing.daily_goal;
    pendingDailyGoal = requestedGoal;
    pendingGoalEffectiveDate = tomorrowLocalDate;
  } else if (freezeToday && existing?.pending_daily_goal && input.dailyGoal === undefined) {
    activeDailyGoal = existing.daily_goal;
    pendingDailyGoal = existing.pending_daily_goal;
    pendingGoalEffectiveDate = normalizeDateColumn(existing.pending_goal_effective_date);
  }

  let activeTimeZone = requestedTimeZone;
  let pendingTimeZone: string | null = null;
  let pendingTimeZoneEffectiveDate: string | null = null;

  if (freezeToday && existing && requestedTimeZone !== existing.time_zone) {
    activeTimeZone = existing.time_zone;
    pendingTimeZone = requestedTimeZone;
    pendingTimeZoneEffectiveDate = tomorrowLocalDate;
  } else if (freezeToday && existing?.pending_time_zone && input.timeZone === undefined) {
    activeTimeZone = existing.time_zone;
    pendingTimeZone = existing.pending_time_zone;
    pendingTimeZoneEffectiveDate = normalizeDateColumn(existing.pending_time_zone_effective_date);
  }

  const nextReminderAt =
    input.enabled && requestedReminderEnabled
      ? computeNextReminderUtc({
          now,
          reminderLocalTime: requestedReminderTime,
          timeZone: activeTimeZone,
        }).nextReminderAt.toISOString()
      : null;

  await sql`
    INSERT INTO public.study_schedules (
      user_id,
      enabled,
      goal_type,
      daily_goal,
      pending_daily_goal,
      pending_goal_effective_date,
      reminder_enabled,
      reminder_local_time,
      time_zone,
      pending_time_zone,
      pending_time_zone_effective_date,
      policy_version,
      revision,
      next_reminder_at,
      created_at,
      updated_at
    )
    VALUES (
      ${userId}::uuid,
      ${input.enabled},
      'questions',
      ${activeDailyGoal},
      ${pendingDailyGoal},
      ${pendingGoalEffectiveDate}::date,
      ${requestedReminderEnabled},
      ${requestedReminderTime},
      ${activeTimeZone},
      ${pendingTimeZone},
      ${pendingTimeZoneEffectiveDate}::date,
      ${STUDY_SCHEDULE_POLICY_VERSION},
      1,
      ${nextReminderAt}::timestamptz,
      ${now.toISOString()}::timestamptz,
      ${now.toISOString()}::timestamptz
    )
    ON CONFLICT (user_id) DO UPDATE
    SET
      enabled = EXCLUDED.enabled,
      daily_goal = EXCLUDED.daily_goal,
      pending_daily_goal = EXCLUDED.pending_daily_goal,
      pending_goal_effective_date = EXCLUDED.pending_goal_effective_date,
      reminder_enabled = EXCLUDED.reminder_enabled,
      reminder_local_time = EXCLUDED.reminder_local_time,
      time_zone = EXCLUDED.time_zone,
      pending_time_zone = EXCLUDED.pending_time_zone,
      pending_time_zone_effective_date = EXCLUDED.pending_time_zone_effective_date,
      next_reminder_at = EXCLUDED.next_reminder_at,
      revision = public.study_schedules.revision + 1,
      updated_at = EXCLUDED.updated_at
  `;

  if (input.enabled) {
    const todayInActiveZone = resolveLocalDate(now, activeTimeZone);
    await sql`
      INSERT INTO public.study_goal_days (
        user_id,
        local_date,
        target_questions,
        time_zone,
        policy_version,
        accepted_count,
        created_at,
        updated_at
      )
      VALUES (
        ${userId}::uuid,
        ${todayInActiveZone}::date,
        ${activeDailyGoal},
        ${activeTimeZone},
        ${STUDY_SCHEDULE_POLICY_VERSION},
        0,
        ${now.toISOString()}::timestamptz,
        ${now.toISOString()}::timestamptz
      )
      ON CONFLICT (user_id, local_date) DO NOTHING
    `;
  }

  return getStudyScheduleState(sql, userId, options);
}

export async function upsertUserPushSubscription(
  sql: SqlClient,
  userId: string,
  rawInput: unknown,
  options?: {
    now?: Date;
    vapidVersion?: number;
    allowedHostSuffixes?: readonly string[];
  }
): Promise<StudyScheduleDeviceSummary> {
  const now = options?.now ?? new Date();
  const subscription = await getUserSubscriptionStatus(sql, userId, now);
  if (!subscription.isPremium) {
    throw new ApiError({
      status: 403,
      code: 'FORBIDDEN_ENTITLEMENT_REQUIRED',
      message: 'An active JAMBPrep Premium subscription is required to register push reminders.',
    });
  }

  const validated = await validateWebPushSubscriptionInput(rawInput, {
    allowedHostSuffixes: options?.allowedHostSuffixes,
  });

  // Enforce bounded device cap (max 3 enabled subscriptions per user).
  // If the user already has 3 OTHER enabled subscriptions, disable the oldest unseen one automatically.
  const existingEnabled = await sql<Array<{ id: string; endpoint_hash: string }>>`
    SELECT id, endpoint_hash
    FROM public.web_push_subscriptions
    WHERE user_id = ${userId}::uuid
      AND enabled = true
      AND endpoint_hash <> ${validated.endpointHash}
    ORDER BY last_seen_at ASC
  `;

  if (existingEnabled.length >= MAX_PUSH_SUBSCRIPTIONS_PER_USER) {
    const overflowCount = existingEnabled.length - MAX_PUSH_SUBSCRIPTIONS_PER_USER + 1;
    const idsToDisable = existingEnabled.slice(0, overflowCount).map((r) => r.id);
    for (const oldId of idsToDisable) {
      await sql`
        UPDATE public.web_push_subscriptions
        SET
          enabled = false,
          disabled_reason = 'device_cap_replaced',
          updated_at = ${now.toISOString()}::timestamptz
        WHERE id = ${oldId}::uuid
          AND user_id = ${userId}::uuid
      `;
    }
  }

  const upserted = await sql<Array<{
    id: string;
    device_label: string;
    environment: string;
    enabled: boolean;
    disabled_reason: string | null;
    last_seen_at: string | Date;
    last_test_sent_at: string | Date | null;
  }>>`
    INSERT INTO public.web_push_subscriptions (
      user_id,
      endpoint_hash,
      endpoint,
      p256dh,
      auth_secret,
      vapid_version,
      device_label,
      environment,
      enabled,
      disabled_reason,
      last_seen_at,
      created_at,
      updated_at
    )
    VALUES (
      ${userId}::uuid,
      ${validated.endpointHash},
      ${validated.endpoint},
      ${validated.p256dh},
      ${validated.auth},
      ${options?.vapidVersion ?? 1},
      ${validated.deviceLabel},
      ${validated.environment},
      true,
      NULL,
      ${now.toISOString()}::timestamptz,
      ${now.toISOString()}::timestamptz,
      ${now.toISOString()}::timestamptz
    )
    ON CONFLICT (endpoint_hash) DO UPDATE
    SET
      user_id = EXCLUDED.user_id,
      endpoint = EXCLUDED.endpoint,
      p256dh = EXCLUDED.p256dh,
      auth_secret = EXCLUDED.auth_secret,
      vapid_version = EXCLUDED.vapid_version,
      device_label = EXCLUDED.device_label,
      environment = EXCLUDED.environment,
      enabled = true,
      disabled_reason = NULL,
      last_seen_at = EXCLUDED.last_seen_at,
      updated_at = EXCLUDED.updated_at
    RETURNING
      id,
      device_label,
      environment,
      enabled,
      disabled_reason,
      last_seen_at,
      last_test_sent_at
  `;

  const row = upserted[0];
  return {
    id: row.id,
    deviceLabel: row.device_label,
    environment: row.environment,
    enabled: Boolean(row.enabled),
    disabledReason: row.disabled_reason,
    lastSeenAt: new Date(row.last_seen_at).toISOString(),
    lastTestSentAt: row.last_test_sent_at ? new Date(row.last_test_sent_at).toISOString() : null,
    isCurrentDevice: true,
  };
}

export async function deleteUserPushSubscription(
  sql: SqlClient,
  userId: string,
  subscriptionId: string
): Promise<{ deleted: boolean; id: string }> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(subscriptionId)) {
    throw new ApiError({
      status: 422,
      code: 'INVALID_UUID',
      message: 'Invalid push subscription ID.',
    });
  }

  const deletedRows = await sql<Array<{ id: string }>>`
    DELETE FROM public.web_push_subscriptions
    WHERE id = ${subscriptionId}::uuid
      AND user_id = ${userId}::uuid
    RETURNING id
  `;

  if (deletedRows.length === 0) {
    throw new ApiError({
      status: 404,
      code: 'NOT_FOUND',
      message: 'Push subscription was not found for this account.',
    });
  }

  return { deleted: true, id: deletedRows[0].id };
}

export interface WebPushSendOutcome {
  status: number;
  retryAfterSeconds?: number | null;
}

export type WebPushSenderFn = (
  request: EncryptedWebPushRequest
) => Promise<WebPushSendOutcome>;

export const defaultFetchWebPushSender: WebPushSenderFn = async (request) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(request.endpoint, {
      method: 'POST',
      headers: request.headers,
      body: request.body,
      redirect: 'manual',
      signal: controller.signal,
    });
    const retryAfterHeader = response.headers.get('retry-after');
    const retryAfterSeconds =
      retryAfterHeader && /^\d+$/.test(retryAfterHeader.trim())
        ? Number(retryAfterHeader.trim())
        : null;
    return {
      status: response.status,
      retryAfterSeconds,
    };
  } finally {
    clearTimeout(timeout);
  }
};

export async function sendUserTestReminder(
  sql: SqlClient,
  userId: string,
  input: { subscriptionId?: string },
  options: {
    now?: Date;
    vapid: VapidKeyConfig | null;
    pushSender?: WebPushSenderFn;
  }
): Promise<{
  sent: boolean;
  subscriptionId: string;
  providerStatus: number;
  sentAt: string;
}> {
  const now = options.now ?? new Date();
  const subscription = await getUserSubscriptionStatus(sql, userId, now);
  if (!subscription.isPremium) {
    throw new ApiError({
      status: 403,
      code: 'FORBIDDEN_ENTITLEMENT_REQUIRED',
      message: 'An active JAMBPrep Premium subscription is required to send a test reminder.',
    });
  }

  if (!options.vapid || !options.vapid.publicKey || !options.vapid.privateKey) {
    throw new ApiError({
      status: 503,
      code: 'SERVICE_CONFIG_UNAVAILABLE',
      message: 'Web Push notifications are not configured on this server yet.',
    });
  }

  const subRows = input.subscriptionId
    ? await sql<Array<{
        id: string;
        endpoint: string;
        p256dh: string;
        auth_secret: string;
        enabled: boolean;
        last_test_sent_at: string | Date | null;
      }>>`
        SELECT id, endpoint, p256dh, auth_secret, enabled, last_test_sent_at
        FROM public.web_push_subscriptions
        WHERE id = ${input.subscriptionId}::uuid
          AND user_id = ${userId}::uuid
        LIMIT 1
      `
    : await sql<Array<{
        id: string;
        endpoint: string;
        p256dh: string;
        auth_secret: string;
        enabled: boolean;
        last_test_sent_at: string | Date | null;
      }>>`
        SELECT id, endpoint, p256dh, auth_secret, enabled, last_test_sent_at
        FROM public.web_push_subscriptions
        WHERE user_id = ${userId}::uuid
          AND enabled = true
        ORDER BY updated_at DESC
        LIMIT 1
      `;

  const sub = subRows[0];
  if (!sub || !sub.enabled) {
    throw new ApiError({
      status: 404,
      code: 'NOT_FOUND',
      message: 'Enable push notifications on this device first before sending a test reminder.',
    });
  }

  if (sub.last_test_sent_at) {
    const elapsedMs = now.getTime() - new Date(sub.last_test_sent_at).getTime();
    if (elapsedMs < TEST_REMINDER_COOLDOWN_MS) {
      const waitSeconds = Math.ceil((TEST_REMINDER_COOLDOWN_MS - elapsedMs) / 1000);
      throw new ApiError({
        status: 429,
        code: 'RATE_LIMITED',
        message: `Please wait ${waitSeconds}s before sending another test reminder.`,
        headers: { 'Retry-After': String(waitSeconds) },
      });
    }
  }

  const payload = buildGenericStudyReminderPayload(now, '/practice/');
  const signedRequest = await buildSignedWebPushRequest({
    subscription: {
      endpoint: sub.endpoint,
      p256dh: sub.p256dh,
      authSecret: sub.auth_secret,
    },
    vapid: options.vapid,
    payload,
    ttlSeconds: 300,
    urgency: 'normal',
    topic: 'jambprep-study-reminder',
    now,
  });

  const sender = options.pushSender ?? defaultFetchWebPushSender;
  const outcome = await sender(signedRequest);

  if (outcome.status === 404 || outcome.status === 410) {
    await sql`
      UPDATE public.web_push_subscriptions
      SET
        enabled = false,
        disabled_reason = 'provider_gone',
        updated_at = ${now.toISOString()}::timestamptz
      WHERE id = ${sub.id}::uuid
        AND user_id = ${userId}::uuid
    `;
    throw new ApiError({
      status: 409,
      code: 'CONFLICT',
      message: 'This browser push subscription has expired or permission was revoked. Please re-enable notifications on this device.',
    });
  }

  if (outcome.status < 200 || outcome.status >= 300) {
    throw new ApiError({
      status: 503,
      code: 'SERVICE_UNAVAILABLE',
      message: `Push provider returned HTTP ${outcome.status}. Please try again shortly.`,
    });
  }

  await sql`
    UPDATE public.web_push_subscriptions
    SET
      last_test_sent_at = ${now.toISOString()}::timestamptz,
      last_seen_at = ${now.toISOString()}::timestamptz,
      updated_at = ${now.toISOString()}::timestamptz
    WHERE id = ${sub.id}::uuid
      AND user_id = ${userId}::uuid
  `;

  return {
    sent: true,
    subscriptionId: sub.id,
    providerStatus: outcome.status,
    sentAt: now.toISOString(),
  };
}

export interface SchedulerTickSummary {
  claimedOccurrences: number;
  acceptedDeliveries: number;
  skippedGoalMet: number;
  skippedNotPremium: number;
  skippedStale: number;
  skippedNoSubscription: number;
  skippedDisabledOrChanged: number;
  retriedDeliveries: number;
  disabledGoneSubscriptions: number;
  failedDeliveries: number;
  elapsedMs: number;
}

interface ClaimedOccurrenceWorkItem {
  occurrenceId: string;
  userId: string;
  localDate: string;
  scheduleRevision: number;
  scheduledFor: Date;
  expiresAt: Date;
  retryCount: number;
  timeZone: string;
  dailyGoal: number;
}

/**
 * Bounded UTC scheduler tick:
 * 1. Short DB claim phase (no network I/O inside transaction) claims due study_schedules
 *    and recoverable/retryable study_reminder_occurrences, advancing next_reminder_at.
 * 2. Dispatch phase re-verifies active Premium, schedule state, goal-met status, and 15m TTL
 *    before sending encrypted Web Push requests with bounded concurrency.
 */
export async function runStudyReminderSchedulerTick(
  sql: SqlClient,
  options: {
    now?: Date;
    workerId?: string;
    batchLimit?: number;
    concurrency?: number;
    vapid: VapidKeyConfig | null;
    pushSender?: WebPushSenderFn;
    dispatchEnabled?: boolean;
  }
): Promise<SchedulerTickSummary> {
  const startedAtMs = Date.now();
  const now = options.now ?? new Date();
  const workerId = options.workerId ?? `scheduler-${crypto.randomUUID().slice(0, 8)}`;
  const batchLimit = Math.min(Math.max(options.batchLimit ?? 25, 1), 100);
  const concurrency = Math.min(Math.max(options.concurrency ?? 5, 1), 15);
  const leaseUntil = new Date(now.getTime() + REMINDER_LEASE_DURATION_MS);

  const summary: SchedulerTickSummary = {
    claimedOccurrences: 0,
    acceptedDeliveries: 0,
    skippedGoalMet: 0,
    skippedNotPremium: 0,
    skippedStale: 0,
    skippedNoSubscription: 0,
    skippedDisabledOrChanged: 0,
    retriedDeliveries: 0,
    disabledGoneSubscriptions: 0,
    failedDeliveries: 0,
    elapsedMs: 0,
  };

  if (options.dispatchEnabled === false) {
    summary.elapsedMs = Date.now() - startedAtMs;
    return summary;
  }

  // Phase 1: Claim due schedules and advance their next_reminder_at
  const dueSchedules = await sql<Array<RawStudyScheduleRow>>`
    SELECT *
    FROM public.study_schedules
    WHERE enabled = true
      AND reminder_enabled = true
      AND next_reminder_at IS NOT NULL
      AND next_reminder_at <= ${now.toISOString()}::timestamptz
    ORDER BY next_reminder_at ASC
    LIMIT ${batchLimit}
  `;

  const workItems: ClaimedOccurrenceWorkItem[] = [];

  for (const rawRow of dueSchedules) {
    const schedule = await promotePendingScheduleChangesIfDue(sql, rawRow, now);
    const timeZone = isValidIanaTimeZone(schedule.time_zone)
      ? schedule.time_zone
      : DEFAULT_STUDY_TIME_ZONE;
    const scheduledFor = schedule.next_reminder_at
      ? new Date(schedule.next_reminder_at)
      : now;
    const scheduledLocalDate = resolveLocalDate(scheduledFor, timeZone);
    const expiresAt = new Date(scheduledFor.getTime() + REMINDER_STALE_WINDOW_MS);

    const { nextReminderAt } = computeNextReminderUtc({
      now,
      reminderLocalTime: schedule.reminder_local_time,
      timeZone,
      afterLocalDate: scheduledLocalDate,
    });

    // Advance next_reminder_at with compare-and-swap on revision
    const advanced = await sql<Array<{ user_id: string }>>`
      UPDATE public.study_schedules
      SET
        next_reminder_at = ${nextReminderAt.toISOString()}::timestamptz,
        updated_at = ${now.toISOString()}::timestamptz
      WHERE user_id = ${schedule.user_id}::uuid
        AND revision = ${schedule.revision}
        AND enabled = true
        AND reminder_enabled = true
      RETURNING user_id
    `;

    if (advanced.length === 0) {
      continue;
    }

    const occRows = await sql<Array<{
      id: string;
      retry_count: number;
      state: string;
    }>>`
      INSERT INTO public.study_reminder_occurrences (
        user_id,
        local_date,
        reminder_slot,
        schedule_revision,
        scheduled_for,
        expires_at,
        state,
        lease_owner,
        leased_until,
        retry_count,
        created_at,
        updated_at
      )
      VALUES (
        ${schedule.user_id}::uuid,
        ${scheduledLocalDate}::date,
        'daily',
        ${schedule.revision},
        ${scheduledFor.toISOString()}::timestamptz,
        ${expiresAt.toISOString()}::timestamptz,
        'sending',
        ${workerId},
        ${leaseUntil.toISOString()}::timestamptz,
        0,
        ${now.toISOString()}::timestamptz,
        ${now.toISOString()}::timestamptz
      )
      ON CONFLICT (user_id, local_date, reminder_slot, schedule_revision) DO NOTHING
      RETURNING id, retry_count, state
    `;

    if (occRows[0]) {
      workItems.push({
        occurrenceId: occRows[0].id,
        userId: schedule.user_id,
        localDate: scheduledLocalDate,
        scheduleRevision: Number(schedule.revision),
        scheduledFor,
        expiresAt,
        retryCount: Number(occRows[0].retry_count ?? 0),
        timeZone,
        dailyGoal: Number(schedule.daily_goal),
      });
    }
  }

  // Also claim retryable occurrences or abandoned leases within the remaining batch budget
  const remainingSlots = Math.max(0, batchLimit - workItems.length);
  if (remainingSlots > 0) {
    const retryRows = await sql<Array<{
      id: string;
      user_id: string;
      local_date: string | Date;
      schedule_revision: number;
      scheduled_for: string | Date;
      expires_at: string | Date;
      retry_count: number;
      time_zone: string;
      daily_goal: number;
    }>>`
      UPDATE public.study_reminder_occurrences AS occ
      SET
        state = 'sending',
        lease_owner = ${workerId},
        leased_until = ${leaseUntil.toISOString()}::timestamptz,
        updated_at = ${now.toISOString()}::timestamptz
      FROM public.study_schedules AS sched
      WHERE occ.user_id = sched.user_id
        AND (
          (occ.state = 'claimed' AND (occ.next_retry_at IS NULL OR occ.next_retry_at <= ${now.toISOString()}::timestamptz))
          OR (occ.state = 'sending' AND occ.leased_until IS NOT NULL AND occ.leased_until <= ${now.toISOString()}::timestamptz)
        )
      RETURNING
        occ.id,
        occ.user_id,
        occ.local_date,
        occ.schedule_revision,
        occ.scheduled_for,
        occ.expires_at,
        occ.retry_count,
        sched.time_zone,
        sched.daily_goal
    `;

    for (const r of retryRows.slice(0, remainingSlots)) {
      workItems.push({
        occurrenceId: r.id,
        userId: r.user_id,
        localDate: normalizeDateColumn(r.local_date) ?? resolveLocalDate(now, DEFAULT_STUDY_TIME_ZONE),
        scheduleRevision: Number(r.schedule_revision),
        scheduledFor: new Date(r.scheduled_for),
        expiresAt: new Date(r.expires_at),
        retryCount: Number(r.retry_count ?? 0),
        timeZone: r.time_zone || DEFAULT_STUDY_TIME_ZONE,
        dailyGoal: Number(r.daily_goal ?? DEFAULT_DAILY_GOAL),
      });
    }
  }

  summary.claimedOccurrences = workItems.length;
  if (workItems.length === 0) {
    summary.elapsedMs = Date.now() - startedAtMs;
    return summary;
  }

  const sender = options.pushSender ?? defaultFetchWebPushSender;

  const processOccurrence = async (item: ClaimedOccurrenceWorkItem): Promise<void> => {
    // 1. Check 15-minute staleness expiry
    if (now.getTime() > item.expiresAt.getTime()) {
      await sql`
        UPDATE public.study_reminder_occurrences
        SET
          state = 'expired',
          skip_reason = 'stale_window_exceeded',
          leased_until = NULL,
          updated_at = ${now.toISOString()}::timestamptz
        WHERE id = ${item.occurrenceId}::uuid
      `;
      summary.skippedStale += 1;
      return;
    }

    // 2. Re-verify schedule is still enabled, reminder_enabled, and same revision
    const schedRows = await sql<Array<{
      enabled: boolean;
      reminder_enabled: boolean;
      revision: number;
      daily_goal: number;
    }>>`
      SELECT enabled, reminder_enabled, revision, daily_goal
      FROM public.study_schedules
      WHERE user_id = ${item.userId}::uuid
      LIMIT 1
    `;
    const currentSched = schedRows[0];
    if (
      !currentSched ||
      !currentSched.enabled ||
      !currentSched.reminder_enabled ||
      Number(currentSched.revision) !== item.scheduleRevision
    ) {
      await sql`
        UPDATE public.study_reminder_occurrences
        SET
          state = 'skipped',
          skip_reason = 'schedule_disabled_or_revised',
          leased_until = NULL,
          updated_at = ${now.toISOString()}::timestamptz
        WHERE id = ${item.occurrenceId}::uuid
      `;
      summary.skippedDisabledOrChanged += 1;
      return;
    }

    // 3. Re-verify authoritative active Premium entitlement before send
    const subscription = await getUserSubscriptionStatus(sql, item.userId, now);
    if (!subscription.isPremium) {
      await sql`
        UPDATE public.study_reminder_occurrences
        SET
          state = 'skipped',
          skip_reason = 'entitlement_inactive',
          leased_until = NULL,
          updated_at = ${now.toISOString()}::timestamptz
        WHERE id = ${item.occurrenceId}::uuid
      `;
      summary.skippedNotPremium += 1;
      return;
    }

    // 4. Check whether today's daily study goal is already completed
    const dayRows = await sql<Array<{
      accepted_count: number;
      target_questions: number;
      qualified_at: string | Date | null;
    }>>`
      SELECT accepted_count, target_questions, qualified_at
      FROM public.study_goal_days
      WHERE user_id = ${item.userId}::uuid
        AND local_date = ${item.localDate}::date
      LIMIT 1
    `;
    const day = dayRows[0];
    const targetQuestions = Number(day?.target_questions ?? currentSched.daily_goal);
    const acceptedCount = Number(day?.accepted_count ?? 0);
    if (day?.qualified_at || acceptedCount >= targetQuestions) {
      await sql`
        UPDATE public.study_reminder_occurrences
        SET
          state = 'skipped',
          skip_reason = 'goal_met',
          leased_until = NULL,
          updated_at = ${now.toISOString()}::timestamptz
        WHERE id = ${item.occurrenceId}::uuid
      `;
      summary.skippedGoalMet += 1;
      return;
    }

    // 5. Load owned enabled Web Push subscriptions for this user
    const subs = await sql<Array<{
      id: string;
      endpoint: string;
      p256dh: string;
      auth_secret: string;
    }>>`
      SELECT id, endpoint, p256dh, auth_secret
      FROM public.web_push_subscriptions
      WHERE user_id = ${item.userId}::uuid
        AND enabled = true
      ORDER BY updated_at DESC
      LIMIT ${MAX_PUSH_SUBSCRIPTIONS_PER_USER}
    `;

    if (subs.length === 0) {
      await sql`
        UPDATE public.study_reminder_occurrences
        SET
          state = 'skipped',
          skip_reason = 'no_active_subscription',
          leased_until = NULL,
          updated_at = ${now.toISOString()}::timestamptz
        WHERE id = ${item.occurrenceId}::uuid
      `;
      summary.skippedNoSubscription += 1;
      return;
    }

    if (!options.vapid || !options.vapid.publicKey || !options.vapid.privateKey) {
      await sql`
        UPDATE public.study_reminder_occurrences
        SET
          state = 'failed',
          skip_reason = 'vapid_not_configured',
          leased_until = NULL,
          updated_at = ${now.toISOString()}::timestamptz
        WHERE id = ${item.occurrenceId}::uuid
      `;
      summary.failedDeliveries += subs.length;
      return;
    }

    let anyAccepted = false;
    let anyRetryScheduled = false;
    let earliestRetryAt: Date | null = null;
    const remainingTtlSeconds = Math.max(
      60,
      Math.min(
        DEFAULT_REMINDER_TTL_SECONDS,
        Math.floor((item.expiresAt.getTime() - now.getTime()) / 1000)
      )
    );
    const payload = buildGenericStudyReminderPayload(now, '/practice/');

    for (const sub of subs) {
      // Ensure delivery record exists and check if already accepted
      const existingDelivery = await sql<Array<{
        id: string;
        state: string;
        retry_count: number;
      }>>`
        INSERT INTO public.study_reminder_deliveries (
          occurrence_id,
          subscription_id,
          state,
          retry_count,
          created_at,
          updated_at
        )
        VALUES (
          ${item.occurrenceId}::uuid,
          ${sub.id}::uuid,
          'sending',
          0,
          ${now.toISOString()}::timestamptz,
          ${now.toISOString()}::timestamptz
        )
        ON CONFLICT (occurrence_id, subscription_id) DO UPDATE
        SET
          state = CASE
            WHEN public.study_reminder_deliveries.state IN ('provider_accepted', 'subscription_gone')
              THEN public.study_reminder_deliveries.state
            ELSE 'sending'
          END,
          updated_at = ${now.toISOString()}::timestamptz
        RETURNING id, state, retry_count
      `;

      const delivery = existingDelivery[0];
      if (!delivery) continue;
      if (delivery.state === 'provider_accepted') {
        anyAccepted = true;
        continue;
      }
      if (delivery.state === 'subscription_gone') {
        continue;
      }

      try {
        const signedReq = await buildSignedWebPushRequest({
          subscription: {
            endpoint: sub.endpoint,
            p256dh: sub.p256dh,
            authSecret: sub.auth_secret,
          },
          vapid: options.vapid,
          payload,
          ttlSeconds: remainingTtlSeconds,
          urgency: 'normal',
          topic: 'jambprep-study-reminder',
          now,
        });

        const outcome = await sender(signedReq);

        if (outcome.status >= 200 && outcome.status < 300) {
          anyAccepted = true;
          summary.acceptedDeliveries += 1;
          await sql`
            UPDATE public.study_reminder_deliveries
            SET
              state = 'provider_accepted',
              provider_status = ${outcome.status},
              error_code = NULL,
              accepted_at = ${now.toISOString()}::timestamptz,
              last_attempt_at = ${now.toISOString()}::timestamptz,
              updated_at = ${now.toISOString()}::timestamptz
            WHERE id = ${delivery.id}::uuid
          `;
        } else if (outcome.status === 404 || outcome.status === 410) {
          summary.disabledGoneSubscriptions += 1;
          await Promise.all([
            sql`
              UPDATE public.web_push_subscriptions
              SET
                enabled = false,
                disabled_reason = 'provider_gone',
                updated_at = ${now.toISOString()}::timestamptz
              WHERE id = ${sub.id}::uuid
                AND user_id = ${item.userId}::uuid
            `,
            sql`
              UPDATE public.study_reminder_deliveries
              SET
                state = 'subscription_gone',
                provider_status = ${outcome.status},
                error_code = 'SUBSCRIPTION_GONE',
                last_attempt_at = ${now.toISOString()}::timestamptz,
                updated_at = ${now.toISOString()}::timestamptz
              WHERE id = ${delivery.id}::uuid
            `,
          ]);
        } else if (
          (outcome.status === 429 || outcome.status >= 500) &&
          Number(delivery.retry_count) < REMINDER_MAX_RETRIES
        ) {
          const backoffSeconds = outcome.retryAfterSeconds
            ? Math.min(Math.max(outcome.retryAfterSeconds, 30), 300)
            : Number(delivery.retry_count) === 0
              ? 60
              : 180;
          const nextRetry = new Date(now.getTime() + backoffSeconds * 1000);
          if (nextRetry.getTime() < item.expiresAt.getTime()) {
            anyRetryScheduled = true;
            if (!earliestRetryAt || nextRetry.getTime() < earliestRetryAt.getTime()) {
              earliestRetryAt = nextRetry;
            }
            summary.retriedDeliveries += 1;
            await sql`
              UPDATE public.study_reminder_deliveries
              SET
                state = 'retry_scheduled',
                provider_status = ${outcome.status},
                error_code = 'TRANSIENT_PROVIDER_ERROR',
                retry_count = retry_count + 1,
                next_retry_at = ${nextRetry.toISOString()}::timestamptz,
                last_attempt_at = ${now.toISOString()}::timestamptz,
                updated_at = ${now.toISOString()}::timestamptz
              WHERE id = ${delivery.id}::uuid
            `;
          } else {
            summary.failedDeliveries += 1;
            await sql`
              UPDATE public.study_reminder_deliveries
              SET
                state = 'failed',
                provider_status = ${outcome.status},
                error_code = 'RETRY_WINDOW_EXCEEDED',
                last_attempt_at = ${now.toISOString()}::timestamptz,
                updated_at = ${now.toISOString()}::timestamptz
              WHERE id = ${delivery.id}::uuid
            `;
          }
        } else {
          // Includes 401/403 VAPID auth errors: record failure without mass-disabling user subscriptions
          summary.failedDeliveries += 1;
          await sql`
            UPDATE public.study_reminder_deliveries
            SET
              state = 'failed',
              provider_status = ${outcome.status},
              error_code = ${outcome.status === 401 || outcome.status === 403 ? 'VAPID_AUTH_ERROR' : 'PROVIDER_REJECTED'},
              last_attempt_at = ${now.toISOString()}::timestamptz,
              updated_at = ${now.toISOString()}::timestamptz
            WHERE id = ${delivery.id}::uuid
          `;
        }
      } catch {
        // Network timeout or fetch failure
        if (Number(delivery.retry_count) < REMINDER_MAX_RETRIES) {
          const nextRetry = new Date(now.getTime() + 60 * 1000);
          if (nextRetry.getTime() < item.expiresAt.getTime()) {
            anyRetryScheduled = true;
            if (!earliestRetryAt || nextRetry.getTime() < earliestRetryAt.getTime()) {
              earliestRetryAt = nextRetry;
            }
            summary.retriedDeliveries += 1;
            await sql`
              UPDATE public.study_reminder_deliveries
              SET
                state = 'retry_scheduled',
                error_code = 'NETWORK_TIMEOUT',
                retry_count = retry_count + 1,
                next_retry_at = ${nextRetry.toISOString()}::timestamptz,
                last_attempt_at = ${now.toISOString()}::timestamptz,
                updated_at = ${now.toISOString()}::timestamptz
              WHERE id = ${delivery.id}::uuid
            `;
            continue;
          }
        }
        summary.failedDeliveries += 1;
        await sql`
          UPDATE public.study_reminder_deliveries
          SET
            state = 'failed',
            error_code = 'NETWORK_ERROR',
            last_attempt_at = ${now.toISOString()}::timestamptz,
            updated_at = ${now.toISOString()}::timestamptz
          WHERE id = ${delivery.id}::uuid
        `;
      }
    }

    if (anyRetryScheduled && earliestRetryAt) {
      await sql`
        UPDATE public.study_reminder_occurrences
        SET
          state = 'claimed',
          retry_count = retry_count + 1,
          next_retry_at = ${earliestRetryAt.toISOString()}::timestamptz,
          leased_until = NULL,
          updated_at = ${now.toISOString()}::timestamptz
        WHERE id = ${item.occurrenceId}::uuid
      `;
    } else if (anyAccepted) {
      await sql`
        UPDATE public.study_reminder_occurrences
        SET
          state = 'provider_accepted',
          leased_until = NULL,
          updated_at = ${now.toISOString()}::timestamptz
        WHERE id = ${item.occurrenceId}::uuid
      `;
    } else {
      await sql`
        UPDATE public.study_reminder_occurrences
        SET
          state = 'failed',
          leased_until = NULL,
          updated_at = ${now.toISOString()}::timestamptz
        WHERE id = ${item.occurrenceId}::uuid
      `;
    }
  };

  // Run with bounded concurrency
  for (let i = 0; i < workItems.length; i += concurrency) {
    const chunk = workItems.slice(i, i + concurrency);
    await Promise.all(chunk.map((item) => processOccurrence(item)));
  }

  summary.elapsedMs = Date.now() - startedAtMs;
  return summary;
}
