import {loadMockReadySubjects} from './mock-ready-subjects';
import { ApiError } from '../api/errors';
import { onboardingPutSchema, assertValidUuid, OnboardingPutRequest } from '../api/contracts';
import { SqlTagExecutor } from '../api/db-context';

/** Runs inside the idempotency transaction; locks the actor's profile before replacing selections. */
export async function saveStudentOnboardingAtomic(tx: SqlTagExecutor, userId: string, input: OnboardingPutRequest, now: Date) {
  assertValidUuid(userId);
  const parsed = onboardingPutSchema.safeParse(input);
  if (!parsed.success) throw new ApiError({ status: 422, code: 'VALIDATION_FAILED', message: 'Select three distinct electives and a valid target score.' });
  const data = parsed.data;
  const profile = await tx`SELECT id FROM profiles WHERE id = ${userId}::uuid FOR UPDATE`;
  if (!profile.length) throw new ApiError({ status: 409, code: 'CONFLICT', message: 'Complete account registration before choosing subjects.' });
  const names = ['Use of English', ...data.electives];
  const subjects = await tx<Array<{ id: string; name: string; code: string; is_compulsory: boolean }>>`
    SELECT id, name, code, is_compulsory FROM subjects
    WHERE is_active = TRUE AND name = ANY(ARRAY(SELECT jsonb_array_elements_text(${JSON.stringify(names)}::text::jsonb)))
    ORDER BY id FOR SHARE
  `;
  const english = subjects.filter((s) => s.code === 'ENG' && s.is_compulsory && s.name === 'Use of English');
  if (subjects.length !== 4 || new Set(subjects.map((s) => s.id)).size !== 4 || english.length !== 1 || subjects.some((s) => s.name !== 'Use of English' && (s.is_compulsory || s.code === 'ENG')) || names.some((name) => subjects.filter((s) => s.name === name).length !== 1)) {
    throw new ApiError({ status: 422, code: 'VALIDATION_FAILED', message: 'Choose Use of English and three available elective subjects.' });
  }
  const ready=await loadMockReadySubjects(tx,subjects.map(subject=>subject.id));
  if(ready.length!==4)throw new ApiError({status:422,code:'VALIDATION_FAILED',message:'One of these subjects is not ready for full mocks. Refresh and choose from the available subjects.'});
  await tx`INSERT INTO student_preferences (user_id, target_score, exam_year, target_institution, target_course, updated_at)
    VALUES (${userId}::uuid, ${data.targetScore}, ${now.getUTCFullYear()}, ${data.targetInstitution ?? null}, ${data.targetCourse ?? null}, ${now.toISOString()}::timestamptz)
    ON CONFLICT (user_id) DO UPDATE SET target_score = EXCLUDED.target_score,
      target_institution = CASE WHEN ${data.targetInstitution !== undefined} THEN EXCLUDED.target_institution ELSE student_preferences.target_institution END,
      target_course = CASE WHEN ${data.targetCourse !== undefined} THEN EXCLUDED.target_course ELSE student_preferences.target_course END, updated_at = EXCLUDED.updated_at`;
  await tx`DELETE FROM student_subjects WHERE user_id = ${userId}::uuid`;
  for (const subject of subjects) await tx`INSERT INTO student_subjects (user_id, subject_id) VALUES (${userId}::uuid, ${subject.id}::uuid)`;
  await qualifyOnboardingReferral(tx, userId, now.toISOString());
  return { saved: true, targetScore: data.targetScore, subjects: names };
}

async function qualifyOnboardingReferral(tx: SqlTagExecutor, userId: string, nowIso: string) {
  const rows = await tx<Array<{ referrer_id: string }>>`SELECT referrer_id FROM referrals WHERE referred_user_id=${userId}::uuid AND referrer_id<>${userId}::uuid AND status='pending'`;
  const referrer = rows[0]?.referrer_id; if (!referrer) return;
  await tx`SELECT id FROM profiles WHERE id=${referrer}::uuid FOR UPDATE`;
  await tx`UPDATE referrals SET status='qualified',qualified_at=${nowIso}::timestamptz WHERE referred_user_id=${userId}::uuid AND status='pending'`;
  await tx`INSERT INTO referral_rewards (user_id,reward_type,status,created_at)
    SELECT ${referrer}::uuid,'FIRST_MONTH_50_PERCENT','available',${nowIso}::timestamptz
    WHERE (SELECT COUNT(DISTINCT referred_user_id) FROM referrals WHERE referrer_id=${referrer}::uuid AND status='qualified')>=2
    AND NOT EXISTS (SELECT 1 FROM referral_rewards WHERE user_id=${referrer}::uuid AND reward_type='FIRST_MONTH_50_PERCENT')
    AND NOT EXISTS (SELECT 1 FROM payment_transactions WHERE user_id=${referrer}::uuid AND status='success')`;
}
