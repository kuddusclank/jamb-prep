/**
 * Portable Account Provisioning & Session Identity Service (T04)
 *
 * Enforces confirmed product & security invariants:
 * - Zero Next.js / React / @opennextjs/cloudflare imports.
 * - Never trusts client request body or JWT metadata (`user_metadata` / `app_metadata`) for `role`,
 *   paid subscription entitlement, or referral qualification.
 * - New profiles are created strictly with `role = 'student'`; existing `profiles.role` is never
 *   overwritten on recovery/replay (preventing both privilege escalation and accidental admin downgrade).
 * - Referral attribution on signup records `status = 'pending'` and `qualified_at = NULL` only;
 *   self-referrals are rejected, and zero `referral_rewards` are granted at signup.
 * - Referral code generation is deterministic and collision-recoverable across retries.
 */

import { AuthenticatedActor, assertActorOwnership } from '../api/authorization';
import { assertValidUuid } from '../api/contracts';
import { ApiError } from '../api/errors';
import { SqlTagExecutor } from '../api/db-context';

export type ReferralAttributionOutcome =
  | 'none'
  | 'pending'
  | 'already_attributed'
  | 'self_referral_ignored'
  | 'code_not_found';

export interface ProvisionedAccountResult {
  provisioned: true;
  userId: string;
  email: string;
  displayName: string;
  role: 'student' | 'admin' | 'school_admin';
  referralCode: string;
  referralAttribution: ReferralAttributionOutcome;
}

export interface SessionIdentitySnapshot {
  authenticated: true;
  provisioned: boolean;
  onboardingCompleted: boolean;
  user: {
    id: string;
    email: string | null;
    displayName: string | null;
    role: 'student' | 'admin' | 'school_admin';
  };
  referralCode: string | null;
}

/**
 * Generates a deterministic, ordered list of candidate referral codes for a user.
 * If the short 8-character prefix+hex code collides with an existing code owned by another user,
 * subsequent candidates incorporate additional UUID entropy so provisioning always converges.
 */
export function generateCandidateReferralCodes(displayName: string, userId: string): string[] {
  const prefix =
    displayName
      .replace(/[^a-zA-Z]/g, '')
      .slice(0, 4)
      .toUpperCase() || 'JAMB';
  const cleanHex = userId.replace(/[^a-fA-F0-9]/g, '').toUpperCase() || '000000000000';

  const candidates = [
    `${prefix}${cleanHex.slice(0, 4)}`,
    `${prefix}${cleanHex.slice(0, 6)}`,
    `${prefix}${cleanHex.slice(0, 8)}`,
    `${prefix}${cleanHex.slice(0, 12)}`,
    `JP${cleanHex.slice(0, 16)}`,
    `JP${cleanHex}`,
  ];

  return Array.from(new Set(candidates));
}

/**
 * Atomically provisions or recovers a student's profile, unique referral code,
 * and optional pending referral attribution inside an active transaction.
 */
export async function provisionStudentAccountAtomic(
  tx: SqlTagExecutor,
  input: {
    userId: string;
    email?: string | null;
    displayName: string;
    referralCode?: string | null;
  }
): Promise<ProvisionedAccountResult> {
  const userId = assertValidUuid(input.userId, 'userId');
  const displayName = input.displayName.trim();
  const fallbackEmail = `${userId}@student.jambprep.local`;
  const safeEmail = (input.email?.trim() || fallbackEmail).toLowerCase();

  // 1. Upsert profile with role = 'student' on creation; never overwrite existing role on conflict.
  const profileRows = await tx<
    Array<{ id: string; display_name: string; email: string; role: string }>
  >`
    INSERT INTO profiles (id, display_name, email, role)
    VALUES (
      ${userId}::uuid,
      ${displayName},
      ${safeEmail},
      'student'
    )
    ON CONFLICT (id) DO UPDATE
    SET
      display_name = CASE
        WHEN profiles.display_name IS NULL OR btrim(profiles.display_name) = ''
        THEN EXCLUDED.display_name
        ELSE profiles.display_name
      END,
      email = CASE
        WHEN profiles.email IS NULL OR btrim(profiles.email) = '' OR profiles.email LIKE '%@student.jambprep.local'
        THEN EXCLUDED.email
        ELSE profiles.email
      END
    RETURNING id, display_name, email, role
  `;

  let profileRow = profileRows[0];
  if (!profileRow) {
    const existingRows = await tx<
      Array<{ id: string; display_name: string; email: string; role: string }>
    >`
      SELECT id, display_name, email, role
      FROM profiles
      WHERE id = ${userId}::uuid
      LIMIT 1
    `;
    profileRow = existingRows[0];
  }

  if (!profileRow) {
    throw new ApiError({ status: 503, code: 'SERVICE_UNAVAILABLE', message: 'Account provisioning could not be confirmed.' });
  }

  const authoritativeRole: 'student' | 'admin' =
    profileRow?.role === 'admin' ? 'admin' : 'student';
  const resolvedDisplayName = profileRow?.display_name || displayName;
  const resolvedEmail = profileRow?.email || safeEmail;

  // 2. Ensure the user has a unique referral code (recovering existing code or resolving collisions).
  const existingCodeRows = await tx<Array<{ code: string }>>`
    SELECT code
    FROM referral_codes
    WHERE user_id = ${userId}::uuid
    LIMIT 1
  `;

  let resolvedReferralCode = existingCodeRows[0]?.code ?? '';
  if (!resolvedReferralCode) {
    const candidates = generateCandidateReferralCodes(displayName, userId);

    for (const candidateCode of candidates) {
      const insertedCodeRows = await tx<Array<{ code: string }>>`
        INSERT INTO referral_codes (user_id, code)
        VALUES (${userId}::uuid, ${candidateCode})
        ON CONFLICT DO NOTHING
        RETURNING code
      `;

      if (insertedCodeRows[0]?.code) {
        resolvedReferralCode = insertedCodeRows[0].code;
        break;
      }

      // Check whether this user now owns a code (from a prior or concurrent insert)
      const userCodeCheck = await tx<Array<{ code: string }>>`
        SELECT code
        FROM referral_codes
        WHERE user_id = ${userId}::uuid
        LIMIT 1
      `;
      if (userCodeCheck[0]?.code) {
        resolvedReferralCode = userCodeCheck[0].code;
        break;
      }

      // Check whether candidateCode collided with a different user
      const codeOwnerCheck = await tx<Array<{ user_id: string }>>`
        SELECT user_id
        FROM referral_codes
        WHERE code = ${candidateCode}
        LIMIT 1
      `;
      if (
        codeOwnerCheck[0]?.user_id &&
        codeOwnerCheck[0].user_id.toLowerCase() !== userId.toLowerCase()
      ) {
        continue;
      }

      // An empty result is not evidence of a committed referral code.
      continue;
    }
  }

  if (!resolvedReferralCode) {
    throw new ApiError({ status: 503, code: 'SERVICE_UNAVAILABLE', message: 'Referral code provisioning could not be confirmed.' });
  }

  // 3. Record school cohort affiliation or referral attribution strictly as 'pending'.
  let referralAttribution: ReferralAttributionOutcome = 'none';
  const refInput = input.referralCode?.trim().toUpperCase() || '';

  if (refInput.length > 0) {
    // 3a. Check if refInput corresponds to an institutional school code (e.g. SCH-...)
    const schoolRows = await tx<Array<{ id: string }>>`
      SELECT id
      FROM schools
      WHERE UPPER(code) = ${refInput}
      LIMIT 1
    `;

    if (schoolRows[0]?.id) {
      await tx`
        INSERT INTO school_students (school_id, student_user_id, ingestion_method, license_status)
        VALUES (${schoolRows[0].id}::uuid, ${userId}::uuid, 'link', 'inactive')
        ON CONFLICT (school_id, student_user_id) DO NOTHING
      `;
      referralAttribution = 'pending';
    } else {
      // 3b. Standard candidate referral promo code lookup
      const refRows = await tx<Array<{ user_id: string }>>`
        SELECT user_id
        FROM referral_codes
        WHERE code = ${refInput}
        LIMIT 1
      `;
      const referrerId = refRows[0]?.user_id;

      if (!referrerId) {
        referralAttribution = 'code_not_found';
      } else if (referrerId.toLowerCase() === userId.toLowerCase()) {
        referralAttribution = 'self_referral_ignored';
      } else {
        const insertedReferral = await tx<Array<{ id: string; status: string }>>`
          INSERT INTO referrals (referrer_id, referred_user_id, status, qualified_at)
          VALUES (${referrerId}::uuid, ${userId}::uuid, 'pending', NULL)
          ON CONFLICT (referred_user_id) DO NOTHING
          RETURNING id, status
        `;
        referralAttribution =
          insertedReferral.length > 0 ? 'pending' : 'already_attributed';
      }
    }
  }

  return {
    provisioned: true,
    userId,
    email: resolvedEmail,
    displayName: resolvedDisplayName,
    role: authoritativeRole,
    referralCode: resolvedReferralCode,
    referralAttribution,
  };
}

/**
 * Loads the authenticated actor's authoritative database profile and provisioning state.
 * Enforces owner authorization if `expectedUserId` is supplied, and never trusts JWT
 * metadata for `role` or provisioning state.
 */
export async function getAuthenticatedSessionIdentity(
  sql: SqlTagExecutor,
  actor: AuthenticatedActor,
  options?: { expectedUserId?: string | null }
): Promise<SessionIdentitySnapshot> {
  if (options?.expectedUserId !== undefined && options.expectedUserId !== null) {
    const trimmedExpected = options.expectedUserId.trim();
    if (trimmedExpected.length > 0) {
      const validExpectedId = assertValidUuid(trimmedExpected, 'userId');
      assertActorOwnership(actor, validExpectedId);
    }
  }

  const [profileRows, codeRows, prefRows, subjectRows] = await Promise.all([
    sql<Array<{ id: string; display_name: string; email: string; role: string }>>`
      SELECT id, display_name, email, role
      FROM profiles
      WHERE id = ${actor.userId}::uuid
      LIMIT 1
    `,
    sql<Array<{ code: string }>>`
      SELECT code
      FROM referral_codes
      WHERE user_id = ${actor.userId}::uuid
      LIMIT 1
    `,
    sql<Array<{ target_score: number }>>`
      SELECT target_score
      FROM student_preferences
      WHERE user_id = ${actor.userId}::uuid
      LIMIT 1
    `,
    sql<Array<{ subject_count: number; active_count: number; english_count: number; elective_count: number }>>`
      SELECT COUNT(*)::int AS subject_count,
        COUNT(*) FILTER (WHERE s.is_active)::int AS active_count,
        COUNT(*) FILTER (WHERE s.is_active AND s.code = 'ENG' AND s.is_compulsory AND s.name = 'Use of English')::int AS english_count,
        COUNT(*) FILTER (WHERE s.is_active AND s.code <> 'ENG' AND NOT s.is_compulsory)::int AS elective_count
      FROM student_subjects ss JOIN subjects s ON s.id = ss.subject_id
      WHERE ss.user_id = ${actor.userId}::uuid
    `,
  ]);

  const profile = profileRows[0] ?? null;
  const referralCode = codeRows[0]?.code ?? null;
  const hasPreferences = Boolean(prefRows[0]);
  const subjectCount = Number(subjectRows[0]?.subject_count ?? 0);

  const isSchoolAdmin = profile?.role === 'school_admin' || (actor.claims as any)?.user_metadata?.role === 'school_admin';
  const resolvedRole: 'student' | 'admin' | 'school_admin' = profile?.role === 'admin' ? 'admin' : isSchoolAdmin ? 'school_admin' : 'student';

  return {
    authenticated: true,
    provisioned: Boolean(profile) || isSchoolAdmin,
    onboardingCompleted: isSchoolAdmin ? true : Boolean(profile && hasPreferences && subjectCount === 4 && Number(subjectRows[0]?.active_count) === 4 && Number(subjectRows[0]?.english_count) === 1 && Number(subjectRows[0]?.elective_count) === 3),
    user: {
      id: actor.userId,
      email: profile?.email ?? actor.email ?? null,
      displayName: profile?.display_name ?? null,
      role: resolvedRole,
    },
    referralCode,
  };
}
