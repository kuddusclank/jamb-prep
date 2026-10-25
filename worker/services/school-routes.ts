import type { RouteDefinition } from '../api/router';
import { readBoundedJsonBody, assertValidUuid } from '../api/contracts';
import { ApiError } from '../api/errors';
import { paystackRequest, validateCheckoutUrl, type PaymentEnv } from './paystack-service';
import { enqueueCohortActivation, processActivationBatch } from './school-activation-service';

type SqlTagFn = <T = any>(strings: TemplateStringsArray, ...values: any[]) => Promise<T>;

const UUID_PATTERN = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

const disconnectPasswordFailures = new Map<string, { count: number; windowStartMs: number }>();
const MAX_PASSWORD_FAILURES = 5;
const PASSWORD_FAILURE_WINDOW_MS = 10 * 60 * 1000;

export function resetDisconnectPasswordFailuresForTest(): void {
  disconnectPasswordFailures.clear();
}

async function runSchoolTx<T>(dbCtx: any, callback: (sql: SqlTagFn) => Promise<T>): Promise<T> {
  if (typeof dbCtx.runCommittedTransaction === 'function') {
    return await dbCtx.runCommittedTransaction(callback);
  }
  return await callback(dbCtx.sql);
}

function uuidListCsv(ids: string[]): string {
  return ids.filter((id) => UUID_PATTERN.test(id)).join(',');
}

export function buildUniqueSchoolSlug(schoolName: string, schoolCode: string): string {
  const baseSlug =
    schoolName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 36) || 'school';
  const codeSuffix =
    schoolCode
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'inst';
  return `${baseSlug}-${codeSuffix}`;
}

export function generateCollisionSafeSchoolCode(schoolName: string): string {
  const prefix =
    schoolName
      .replace(/[^a-zA-Z0-9]/g, '')
      .slice(0, 4)
      .toUpperCase() || 'XYZ';
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const randomBytes = new Uint8Array(6);
  crypto.getRandomValues(randomBytes);
  const suffix = Array.from(randomBytes, (b) => alphabet[b % alphabet.length]).join('');
  return `SCH-${prefix}${suffix}`;
}

async function verifyPaystackHmacSignature(bodyText: string, signature: string | null, secretKey: string): Promise<boolean> {
  if (!signature || !secretKey) return false;
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secretKey),
      { name: 'HMAC', hash: 'SHA-512' },
      false,
      ['sign']
    );
    const signatureBytes = await crypto.subtle.sign('HMAC', key, encoder.encode(bodyText));
    const hex = Array.from(new Uint8Array(signatureBytes))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    return hex.toLowerCase() === signature.trim().toLowerCase();
  } catch {
    return false;
  }
}

/** Order metadata may be a jsonb object or (for older rows) a JSON-encoded string. */
function parseOrderStudentIds(metadata: unknown): string[] {
  let value: any = metadata;
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      return [];
    }
  }
  return Array.isArray(value?.studentIds) ? value.studentIds.filter((id: unknown) => typeof id === 'string') : [];
}

function resolveCheckoutAppOrigin(request: Request, env: any): string {
  const reqOrigin = request.headers.get('Origin')?.trim().replace(/\/+$/, '') || '';
  if (
    reqOrigin === 'https://jambprep.pages.dev' ||
    reqOrigin === 'https://jambprep.lecterniq.com' ||
    /^https:\/\/[a-z0-9-]+\.jambprep\.pages\.dev$/i.test(reqOrigin) ||
    reqOrigin === 'http://localhost:3000' ||
    reqOrigin === 'http://127.0.0.1:3000'
  ) {
    return reqOrigin;
  }
  return env?.PUBLIC_APP_ORIGIN || 'https://jambprep.pages.dev';
}

/**
 * Shared helper that resolves the authenticated school administrator's institution,
 * auto-provisioning the `schools` and `school_members` records when metadata is present.
 */
export async function resolveCallerSchool(
  actor: { userId: string; email?: string | null; claims?: any },
  dbCtx: any,
  options: { autoProvision?: boolean } = { autoProvision: true }
): Promise<{ id: string; name: string; code: string; type: string; state: string; admin_id: string } | null> {
  const meta = ((actor.claims as any)?.user_metadata || {}) as Record<string, any>;
  const metaSchoolCode = (typeof meta.school_code === 'string' ? meta.school_code.trim().toUpperCase() : '') || null;
  const metaSchoolName = (typeof meta.school_name === 'string' ? meta.school_name.trim() : '') || 'LecternIQ Partner School';
  const metaState = (typeof meta.state === 'string' ? meta.state.trim() : '') || 'Lagos';
  const metaSchoolType = (typeof meta.school_type === 'string' ? meta.school_type.trim() : '') || 'secondary_school';

  let schoolRows = await dbCtx.sql<Array<{ id: string; name: string; code: string; type: string; state: string; admin_id: string }>>`
    SELECT s.id, s.name, s.code, s.type, s.state, s.admin_id
    FROM schools s
    WHERE s.admin_id = ${actor.userId}::uuid
       OR EXISTS (SELECT 1 FROM school_members sm WHERE sm.school_id = s.id AND sm.user_id = ${actor.userId}::uuid)
    LIMIT 1
  `;

  if (options.autoProvision && !schoolRows[0] && metaSchoolCode) {
    if (meta.role === 'student') {
      return null;
    }

    const enrolledStudentCheck = await dbCtx.sql<Array<{ id: string }>>`
      SELECT id FROM school_students WHERE student_user_id = ${actor.userId}::uuid LIMIT 1
    `;
    if (enrolledStudentCheck.length > 0) {
      return null;
    }

    await dbCtx.sql`
      INSERT INTO profiles (id, display_name, email, role)
      VALUES (
        ${actor.userId}::uuid,
        ${meta.display_name || actor.email || 'School Administrator'},
        ${actor.email || `${actor.userId}@admin.jambprep.local`},
        'school_admin'
      )
      ON CONFLICT (id) DO UPDATE SET
        role = 'school_admin',
        display_name = COALESCE(NULLIF(profiles.display_name, ''), EXCLUDED.display_name)
      WHERE NOT EXISTS (SELECT 1 FROM school_students ss WHERE ss.student_user_id = ${actor.userId}::uuid)
    `;

    let candidateCode = metaSchoolCode;
    for (let attempt = 0; attempt < 3; attempt++) {
      const slug = buildUniqueSchoolSlug(metaSchoolName, candidateCode);
      schoolRows = await dbCtx.sql<Array<{ id: string; name: string; code: string; type: string; state: string; admin_id: string }>>`
        INSERT INTO schools (name, slug, code, type, state, admin_id, contact_email)
        VALUES (${metaSchoolName}, ${slug}, ${candidateCode}, ${metaSchoolType}, ${metaState}, ${actor.userId}::uuid, ${actor.email || null})
        ON CONFLICT (code) DO UPDATE SET
          updated_at = NOW()
        WHERE schools.admin_id = ${actor.userId}::uuid
        RETURNING id, name, code, type, state, admin_id
      `;
      if (schoolRows[0]) break;
      candidateCode = generateCollisionSafeSchoolCode(metaSchoolName);
    }

    if (schoolRows[0]) {
      await dbCtx.sql`
        INSERT INTO school_members (school_id, user_id, role)
        VALUES (${schoolRows[0].id}::uuid, ${actor.userId}::uuid, 'owner')
        ON CONFLICT (school_id, user_id) DO NOTHING
      `;
      if (schoolRows[0].code !== metaSchoolCode) {
        await dbCtx.sql`
          UPDATE auth.users
          SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('school_code', ${schoolRows[0].code}::text),
              updated_at = NOW()
          WHERE id = ${actor.userId}::uuid
        `.catch(() => {});
      }
    }
  }

  return schoolRows[0] || null;
}

/**
 * Settles a school cohort order (`SCH-ORD-*`) idempotently when triggered from
 * either `/api/v1/webhooks/paystack` or `/api/v1/schools/checkout/webhook`.
 */
export async function settleSchoolOrderFromWebhook(
  dbCtx: any,
  reference: string,
  paidAmountKobo?: number
): Promise<{ handled: boolean; alreadySettled?: boolean; orderId?: string }> {
  const orderRows = await dbCtx.sql<Array<{
    id: string;
    school_id: string;
    duration_months: number;
    student_count: number;
    total_amount_kobo: number;
    status: string;
    metadata: any;
  }>>`
    SELECT id, school_id, duration_months, student_count, total_amount_kobo, status, metadata
    FROM school_orders
    WHERE reference = ${reference}
    LIMIT 1
  `;

  const order = orderRows[0];
  if (!order) {
    return { handled: false };
  }

  if (order.status === 'completed') {
    return { handled: true, alreadySettled: true, orderId: order.id };
  }

  if (typeof paidAmountKobo === 'number' && paidAmountKobo > 0 && paidAmountKobo < order.total_amount_kobo) {
    throw new ApiError({
      status: 400,
      code: 'BAD_REQUEST',
      message: 'Webhook paid amount is less than the school order total.',
    });
  }

  const targetedIds = parseOrderStudentIds(order.metadata);

  await enqueueCohortActivation(dbCtx, {
    orderId: order.id,
    schoolId: order.school_id,
    durationMonths: order.duration_months,
    studentCount: order.student_count,
    targetedIds,
  });

  await processActivationBatch(dbCtx, order.id, 100);
  return { handled: true, alreadySettled: false, orderId: order.id };
}

/**
 * Before creating a new order, settle any earlier order for this school that Paystack
 * reports as paid but which was never activated (for example after a failed verify call).
 * Returns the reference of the first order it settled, or null.
 */
async function settleEarlierPaidOrder(
  dbCtx: any,
  env: PaymentEnv,
  schoolId: string
): Promise<string | null> {
  const open = await dbCtx.sql`
    SELECT id, reference, duration_months, student_count, total_amount_kobo, metadata
    FROM school_orders
    WHERE school_id = ${schoolId}::uuid
      AND status IN ('pending', 'processing')
      AND created_at > now() - interval '14 days'
    ORDER BY created_at DESC
    LIMIT 10
  ` as Array<{
    id: string;
    reference: string;
    duration_months: number;
    student_count: number;
    total_amount_kobo: number;
    metadata: unknown;
  }>;

  for (const order of open) {
    try {
      const verified = await paystackRequest(env, `/transaction/verify/${encodeURIComponent(order.reference)}`, undefined);
      if (verified.status !== 'success' || Number(verified.amount) < order.total_amount_kobo) continue;

      await enqueueCohortActivation(dbCtx, {
        orderId: order.id,
        schoolId,
        durationMonths: order.duration_months,
        studentCount: order.student_count,
        targetedIds: parseOrderStudentIds(order.metadata),
      });
      await processActivationBatch(dbCtx, order.id, 100);
      return order.reference;
    } catch (err) {
      console.warn('Earlier order reconciliation notice:', order.reference, err);
    }
  }
  return null;
}

export const SCHOOL_ROUTES: ReadonlyArray<RouteDefinition> = [
  // 0. POST /api/v1/schools/register — Eagerly provision `schools` & `school_members` right at registration
  {
    id: 'schools.register.post',
    method: 'POST',
    pattern: '/api/v1/schools/register',
    auth: 'student_live_session',
    maxBodyBytes: 32 * 1024,
    handler: async (ctx) => {
      const actor = ctx.actor!;
      const dbCtx = ctx.getDb();
      const { data } = await readBoundedJsonBody(ctx.request, { maxBytes: 32 * 1024 });
      const body = (data || {}) as Record<string, any>;

      const meta = ((actor.claims as any)?.user_metadata || {}) as Record<string, any>;
      if (meta.role === 'student') {
        throw new ApiError({
          status: 403,
          code: 'FORBIDDEN',
          message: 'Student accounts cannot register or claim a school partnership.',
        });
      }

      const enrolledStudentCheck = await dbCtx.sql<Array<{ id: string }>>`
        SELECT id FROM school_students WHERE student_user_id = ${actor.userId}::uuid LIMIT 1
      `;
      if (enrolledStudentCheck.length > 0) {
        throw new ApiError({
          status: 403,
          code: 'FORBIDDEN',
          message: 'Enrolled school candidates cannot register or claim a school partnership.',
        });
      }

      const schoolName = (typeof body.schoolName === 'string' ? body.schoolName.trim() : '') || (typeof meta.school_name === 'string' ? meta.school_name.trim() : '') || 'LecternIQ Partner School';
      const requestedCode = ((typeof body.schoolCode === 'string' ? body.schoolCode.trim() : '') || (typeof meta.school_code === 'string' ? meta.school_code.trim() : '') || generateCollisionSafeSchoolCode(schoolName)).toUpperCase();
      const schoolType = (typeof body.schoolType === 'string' ? body.schoolType.trim() : '') || (typeof meta.school_type === 'string' ? meta.school_type.trim() : '') || 'secondary_school';
      const state = (typeof body.state === 'string' ? body.state.trim() : '') || (typeof meta.state === 'string' ? meta.state.trim() : '') || 'Lagos';
      const adminName = (typeof body.adminName === 'string' ? body.adminName.trim() : '') || (typeof meta.display_name === 'string' ? meta.display_name.trim() : '') || 'School Administrator';
      const phone = typeof body.phone === 'string' ? body.phone.trim() : null;

      await dbCtx.sql`
        INSERT INTO profiles (id, display_name, email, role)
        VALUES (
          ${actor.userId}::uuid,
          ${adminName},
          ${actor.email || `${actor.userId}@admin.jambprep.local`},
          'school_admin'
        )
        ON CONFLICT (id) DO UPDATE SET
          role = 'school_admin',
          display_name = COALESCE(NULLIF(EXCLUDED.display_name, ''), profiles.display_name)
        WHERE NOT EXISTS (SELECT 1 FROM school_students ss WHERE ss.student_user_id = ${actor.userId}::uuid)
      `;

      let candidateCode = requestedCode;
      let schoolRows: Array<{ id: string; name: string; code: string; type: string; state: string }> = [];
      const metaCodeUpper = typeof meta.school_code === 'string' ? meta.school_code.trim().toUpperCase() : '';
      const allowCollisionRetry = !body.schoolCode || metaCodeUpper === requestedCode;

      for (let attempt = 0; attempt < 3; attempt++) {
        const slug = buildUniqueSchoolSlug(schoolName, candidateCode);
        schoolRows = await dbCtx.sql<Array<{ id: string; name: string; code: string; type: string; state: string }>>`
          INSERT INTO schools (name, slug, code, type, state, admin_id, contact_phone, contact_email)
          VALUES (${schoolName}, ${slug}, ${candidateCode}, ${schoolType}, ${state}, ${actor.userId}::uuid, ${phone}, ${actor.email || null})
          ON CONFLICT (code) DO UPDATE SET
            name = EXCLUDED.name,
            updated_at = NOW()
          WHERE schools.admin_id = ${actor.userId}::uuid
          RETURNING id, name, code, type, state
        `;
        if (schoolRows[0]) break;
        if (!allowCollisionRetry) {
          throw new ApiError({
            status: 409,
            code: 'CONFLICT',
            message: `School code ${candidateCode} is already registered to another institution.`,
          });
        }
        candidateCode = generateCollisionSafeSchoolCode(schoolName);
      }

      if (!schoolRows[0]) {
        throw new ApiError({
          status: 409,
          code: 'CONFLICT',
          message: 'Could not allocate a unique school code. Please retry registration.',
        });
      }

      const school = schoolRows[0];
      await dbCtx.sql`
        INSERT INTO school_members (school_id, user_id, role)
        VALUES (${school.id}::uuid, ${actor.userId}::uuid, 'owner')
        ON CONFLICT (school_id, user_id) DO NOTHING
      `;

      await dbCtx.sql`
        UPDATE auth.users
        SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object(
              'school_code', ${school.code}::text,
              'school_id', ${school.id}::text
            ),
            updated_at = NOW()
        WHERE id = ${actor.userId}::uuid
      `.catch(() => {});

      return {
        status: 200,
        body: {
          success: true,
          school,
        },
      };
    },
  },

  // 1. GET /api/v1/schools/students — Load authoritative school roster & sync institution profile
  {
    id: 'schools.students.get',
    method: 'GET',
    pattern: '/api/v1/schools/students',
    auth: 'student',
    handler: async (ctx) => {
      const actor = ctx.actor!;
      const dbCtx = ctx.getDb();

      const school = await resolveCallerSchool(actor, dbCtx, { autoProvision: true });
      if (!school) {
        return {
          status: 200,
          body: {
            students: [],
            school: null,
            activeLabMock: null,
          },
        };
      }

      // Opportunistically mark past-due active licences as 'expired' in the DB
      await dbCtx.sql`
        UPDATE school_students
        SET license_status = 'expired'
        WHERE school_id = ${school.id}::uuid
          AND license_status = 'active'
          AND license_expires_at IS NOT NULL
          AND license_expires_at <= NOW()
      `.catch(() => {});

      // Fetch any persisted scheduled lab mock from the school admin's metadata
      const adminMetaRows = await dbCtx.sql<Array<{ active_lab_mock: any }>>`
        SELECT raw_user_meta_data->'active_lab_mock' AS active_lab_mock
        FROM auth.users
        WHERE id = ${school.admin_id}::uuid
        LIMIT 1
      `.catch(() => []);
      const activeLabMock = adminMetaRows[0]?.active_lab_mock || null;

      // Query all enrolled students from school_students left-joined with profiles + pre-aggregated practice & mock progress
      const enrolledRows = await dbCtx.sql<Array<{
        id: string;
        student_user_id: string;
        student_identifier: string | null;
        ingestion_method: string;
        license_status: string;
        license_expires_at: string | null;
        created_at: string;
        name: string | null;
        email: string | null;
        custom_default_password: string | null;
        custom_password_set: boolean | null;
        mock_avg_score: number | null;
        practice_accuracy: number | null;
        total_practice_questions: number | null;
        subjects?: string[] | string | null;
      }>>`
        SELECT
          ss.id,
          ss.student_user_id,
          ss.student_identifier,
          ss.ingestion_method,
          CASE
            WHEN ss.license_status = 'active' AND ss.license_expires_at IS NOT NULL AND ss.license_expires_at <= NOW()
            THEN 'expired'
            ELSE ss.license_status
          END AS license_status,
          ss.license_expires_at,
          ss.created_at,
          p.display_name AS name,
          p.email,
          au.raw_user_meta_data->>'default_password' AS custom_default_password,
          COALESCE((au.raw_user_meta_data->>'custom_password_set')::boolean, false) AS custom_password_set,
          ar_agg.mock_avg_score,
          stm_agg.practice_accuracy,
          stm_agg.total_practice_questions,
          COALESCE(sub_agg.subjects, '[]'::json) AS subjects
        FROM school_students ss
        LEFT JOIN profiles p ON ss.student_user_id = p.id
        LEFT JOIN auth.users au ON ss.student_user_id = au.id
        LEFT JOIN (
          SELECT ar.user_id, round(avg(ar.total_score)) AS mock_avg_score
          FROM attempt_results ar
          JOIN school_students ss2 ON ss2.student_user_id = ar.user_id AND ss2.school_id = ${school.id}::uuid
          GROUP BY ar.user_id
        ) ar_agg ON ar_agg.user_id = ss.student_user_id
        LEFT JOIN (
          SELECT m.user_id, round(avg(m.accuracy_percent)) AS practice_accuracy, sum(m.total_attempted) AS total_practice_questions
          FROM student_topic_mastery m
          JOIN school_students ss3 ON ss3.student_user_id = m.user_id AND ss3.school_id = ${school.id}::uuid
          GROUP BY m.user_id
        ) stm_agg ON stm_agg.user_id = ss.student_user_id
        LEFT JOIN (
          SELECT sub.user_id, json_agg(s.code ORDER BY s.is_compulsory DESC, s.display_order ASC, s.code ASC) AS subjects
          FROM student_subjects sub
          JOIN subjects s ON sub.subject_id = s.id
          JOIN school_students ss4 ON ss4.student_user_id = sub.user_id AND ss4.school_id = ${school.id}::uuid
          GROUP BY sub.user_id
        ) sub_agg ON sub_agg.user_id = ss.student_user_id
        WHERE ss.school_id = ${school.id}::uuid
        ORDER BY ss.created_at DESC
      `;

      const formatted = enrolledRows.map((row) => {
        const isSelfRegistered = row.ingestion_method === 'link' || Boolean(row.custom_password_set);
        let defaultPassword: string | null = null;

        if (!isSelfRegistered) {
          if (row.custom_default_password) {
            defaultPassword = row.custom_default_password;
          } else {
            const parts = (row.name || '').trim().split(/\s+/);
            const lastName = parts.length > 1 ? parts[parts.length - 1] : parts[0] || '';
            defaultPassword = lastName.toUpperCase();
          }
        }

        let parsedSubjects: string[] = [];
        if (Array.isArray(row.subjects)) {
          parsedSubjects = row.subjects;
        } else if (typeof row.subjects === 'string') {
          try {
            const parsed = JSON.parse(row.subjects);
            if (Array.isArray(parsed)) parsedSubjects = parsed;
            else parsedSubjects = row.subjects.replace(/[{}"\s]/g, '').split(',').filter(Boolean);
          } catch {
            parsedSubjects = row.subjects.replace(/[{}"\s]/g, '').split(',').filter(Boolean);
          }
        }

        return {
          id: row.id,
          studentUserId: row.student_user_id,
          name: row.name || row.email || 'Candidate',
          email: row.email || '',
          studentIdentifier: row.student_identifier,
          ingestionMethod: row.ingestion_method,
          licenseStatus: row.license_status,
          licenseExpiresAt: row.license_expires_at,
          defaultPassword,
          subjects: parsedSubjects,
          averageScore: row.mock_avg_score !== null ? Number(row.mock_avg_score) : null,
          practiceAccuracy: row.practice_accuracy !== null ? Number(row.practice_accuracy) : null,
          totalPracticeQuestions: row.total_practice_questions !== null ? Number(row.total_practice_questions) : 0,
          createdAt: row.created_at,
        };
      });

      return {
        status: 200,
        body: {
          students: formatted,
          school: {
            id: school.id,
            name: school.name,
            code: school.code,
            type: school.type,
            state: school.state,
          },
          activeLabMock,
        },
      };
    },
  },

  // 2. POST /api/v1/schools/students — Ingest candidates (manual single candidate or CSV batch)
  {
    id: 'schools.students.post',
    method: 'POST',
    pattern: '/api/v1/schools/students',
    auth: 'student_live_session',
    maxBodyBytes: 128 * 1024,
    handler: async (ctx) => {
      const actor = ctx.actor!;
      const dbCtx = ctx.getDb();
      const { data } = await readBoundedJsonBody(ctx.request, { maxBytes: 128 * 1024, allowArrayRoot: true });
      const body = data as any;

      const school = await resolveCallerSchool(actor, dbCtx, { autoProvision: true });
      if (!school) {
        throw new ApiError({
          status: 404,
          code: 'NOT_FOUND',
          message: 'No institutional school record found for your account.',
        });
      }

      const rawCandidates: Array<any> = Array.isArray(body?.students)
        ? body.students
        : body?.email
        ? [body]
        : [];

      const candidates: Array<{
        name: string;
        email: string;
        studentIdentifier?: string | null;
        ingestionMethod: string;
        subjects?: string[];
      }> = rawCandidates.map((c) => {
        const first = (c.firstName || '').trim();
        const last = (c.lastName || '').trim();
        const fallbackName = (c.name || '').trim();
        const compositeName = `${first} ${last}`.trim() || fallbackName || 'Candidate';
        return {
          name: compositeName,
          email: (c.email || '').trim().toLowerCase(),
          studentIdentifier: c.studentIdentifier || null,
          ingestionMethod: c.ingestionMethod || body.ingestionMethod || 'manual',
          subjects: Array.isArray(c.subjects) ? c.subjects : undefined,
        };
      });

      if (candidates.length === 0) {
        throw new ApiError({
          status: 400,
          code: 'BAD_REQUEST',
          message: 'Please provide at least one candidate with a valid email address.',
        });
      }

      const { results, skipped } = await runSchoolTx(dbCtx, async (txSql) => {
        const ingested: Array<any> = [];
        const skippedRows: Array<{ email: string; reason: string }> = [];

        for (const cand of candidates) {
          const cleanEmail = (cand.email || '').trim().toLowerCase();
          const cleanName = (cand.name || '').trim() || 'Candidate';
          if (!cleanEmail || !cleanEmail.includes('@')) {
            if (cleanEmail) {
              skippedRows.push({ email: cleanEmail, reason: 'Invalid email address format.' });
            }
            continue;
          }

          const parts = cleanName.split(/\s+/);
          const lastName = parts.length > 1 ? parts[parts.length - 1] : parts[0] || '';
          const defaultPassword = cand.ingestionMethod === 'link' ? null : lastName.toUpperCase();

          // 1. Locate existing user in Supabase auth.users and inspect role/school ownership
          const authUserRows = await txSql<Array<{
            id: string;
            meta_role: string | null;
            profile_role: string | null;
            other_school_id: string | null;
          }>>`
            SELECT
              u.id,
              u.raw_user_meta_data->>'role' AS meta_role,
              p.role AS profile_role,
              (
                SELECT ss.school_id::text
                FROM school_students ss
                WHERE ss.student_user_id = u.id
                  AND ss.school_id != ${school.id}::uuid
                LIMIT 1
              ) AS other_school_id
            FROM auth.users u
            LEFT JOIN profiles p ON p.id = u.id
            WHERE LOWER(u.email) = ${cleanEmail}
            LIMIT 1
          `;

          const existingAuth = authUserRows[0];
          let studentUserId = existingAuth?.id;

          if (existingAuth) {
            const effectiveRole = existingAuth.profile_role || existingAuth.meta_role || 'student';
            if (effectiveRole === 'school_admin' || effectiveRole === 'admin') {
              if (candidates.length === 1) {
                throw new ApiError({
                  status: 409,
                  code: 'CONFLICT',
                  message: `Email ${cleanEmail} belongs to a school or platform administrator account and cannot be enrolled as a candidate.`,
                });
              }
              skippedRows.push({
                email: cleanEmail,
                reason: 'Belongs to a school or platform administrator account.',
              });
              continue;
            }

            if (existingAuth.other_school_id) {
              if (candidates.length === 1) {
                throw new ApiError({
                  status: 409,
                  code: 'CONFLICT',
                  message: `Candidate (${cleanEmail}) is already enrolled under another school.`,
                });
              }
              skippedRows.push({
                email: cleanEmail,
                reason: 'Already enrolled under another school.',
              });
              continue;
            }
            // Existing student account: DO NOT overwrite their encrypted_password!
          } else {
            const newUserId = crypto.randomUUID();
            const authPassword = defaultPassword || 'STUDENT';

            await txSql`
              INSERT INTO auth.users (
                instance_id,
                id,
                aud,
                role,
                email,
                encrypted_password,
                email_confirmed_at,
                confirmation_token,
                recovery_token,
                email_change_token_new,
                email_change,
                phone_change,
                phone_change_token,
                email_change_token_current,
                email_change_confirm_status,
                reauthentication_token,
                is_sso_user,
                is_anonymous,
                raw_app_meta_data,
                raw_user_meta_data,
                created_at,
                updated_at
              ) VALUES (
                '00000000-0000-0000-0000-000000000000',
                ${newUserId}::uuid,
                'authenticated',
                'authenticated',
                ${cleanEmail}::text,
                crypt(${authPassword}::text, gen_salt('bf')),
                NOW(),
                '',
                '',
                '',
                '',
                '',
                '',
                '',
                0,
                '',
                false,
                false,
                '{"provider":"email","providers":["email"]}'::jsonb,
                json_build_object(
                  'display_name', ${cleanName}::text,
                  'role', 'student',
                  'school_code', ${school.code}::text,
                  'default_password', ${authPassword}::text
                )::jsonb,
                NOW(),
                NOW()
              )
            `;

            await txSql`
              INSERT INTO auth.identities (
                id,
                user_id,
                identity_data,
                provider,
                provider_id,
                last_sign_in_at,
                created_at,
                updated_at
              ) VALUES (
                gen_random_uuid(),
                ${newUserId}::uuid,
                json_build_object('sub', ${newUserId}::text, 'email', ${cleanEmail}::text)::jsonb,
                'email',
                ${newUserId}::text,
                NOW(),
                NOW(),
                NOW()
              )
              ON CONFLICT (provider_id, provider) DO NOTHING
            `;

            studentUserId = newUserId;
          }

          // 2. Ensure profile exists in profiles table (never downgrade a non-student role)
          await txSql`
            INSERT INTO profiles (id, display_name, email, role)
            VALUES (${studentUserId}::uuid, ${cleanName}, ${cleanEmail}, 'student')
            ON CONFLICT (id) DO UPDATE SET
              display_name = COALESCE(NULLIF(EXCLUDED.display_name, ''), profiles.display_name)
          `;

          // 3. Link student into school_students
          const method = cand.ingestionMethod || 'manual';
          const insertedStudent = await txSql<Array<{ id: string; created_at: string }>>`
            INSERT INTO school_students (school_id, student_user_id, student_identifier, ingestion_method, license_status)
            VALUES (${school.id}::uuid, ${studentUserId}::uuid, ${cand.studentIdentifier || null}, ${method}, 'inactive')
            ON CONFLICT (school_id, student_user_id) DO UPDATE SET
              student_identifier = COALESCE(EXCLUDED.student_identifier, school_students.student_identifier)
            RETURNING id, created_at
          `;

          // 4. Optionally assign UTME subjects if provided during ingestion
          let assignedSubjects: string[] = [];
          if (Array.isArray(cand.subjects) && cand.subjects.length > 0) {
            const cleanCodes = Array.from(
              new Set(
                cand.subjects
                  .filter((s: unknown): s is string => typeof s === 'string' && s.trim().length > 0)
                  .map((s: string) => s.trim().toUpperCase())
              )
            );
            if (cleanCodes.length > 0) {
              const ensuredCodes = cleanCodes.includes('ENG') ? cleanCodes.slice(0, 4) : ['ENG', ...cleanCodes.slice(0, 3)];
              const codesCsv = ensuredCodes.join(',');
              const subjectRows = await txSql<Array<{ id: string; code: string }>>`
                SELECT id, code
                FROM subjects
                WHERE is_active = TRUE
                  AND code IN (SELECT unnest(string_to_array(${codesCsv}::text, ',')))
                ORDER BY is_compulsory DESC, display_order ASC, code ASC
              `;
              if (subjectRows.length > 0) {
                await txSql`
                  DELETE FROM student_subjects WHERE user_id = ${studentUserId}::uuid
                `;
                for (const sub of subjectRows) {
                  await txSql`
                    INSERT INTO student_subjects (user_id, subject_id)
                    VALUES (${studentUserId}::uuid, ${sub.id}::uuid)
                    ON CONFLICT (user_id, subject_id) DO NOTHING
                  `;
                }
                if (subjectRows.length === 4) {
                  await txSql`
                    INSERT INTO student_preferences (user_id, target_score, exam_year)
                    VALUES (${studentUserId}::uuid, 250, 2026)
                    ON CONFLICT (user_id) DO NOTHING
                  `;
                }
                assignedSubjects = subjectRows.map((s) => s.code);
              }
            }
          }

          ingested.push({
            id: insertedStudent[0]?.id || `ss-${Date.now()}`,
            studentUserId,
            name: cleanName,
            email: cleanEmail,
            studentIdentifier: cand.studentIdentifier || null,
            ingestionMethod: method,
            licenseStatus: 'inactive',
            defaultPassword,
            subjects: assignedSubjects,
          });
        }

        return { results: ingested, skipped: skippedRows };
      });

      return {
        status: 200,
        body: {
          success: true,
          count: results.length,
          skippedCount: skipped.length,
          skipped,
          students: results,
          roster: results,
        },
      };
    },
  },

  // 2B. PATCH /api/v1/schools/students — Update an enrolled candidate's profile, subjects, or surname password
  {
    id: 'schools.students.patch',
    method: 'PATCH',
    pattern: '/api/v1/schools/students',
    auth: 'student_live_session',
    maxBodyBytes: 32 * 1024,
    handler: async (ctx) => {
      const actor = ctx.actor!;
      const dbCtx = ctx.getDb();
      const { data } = await readBoundedJsonBody(ctx.request, { maxBytes: 32 * 1024 });
      const body = (data || {}) as Record<string, any>;

      const school = await resolveCallerSchool(actor, dbCtx, { autoProvision: true });
      if (!school) {
        throw new ApiError({ status: 404, code: 'NOT_FOUND', message: 'No institutional school record found for your account.' });
      }

      const studentId = typeof body.studentId === 'string' ? body.studentId.trim() : '';
      const candidateEmailLookup = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
      const isValidUuidId = UUID_PATTERN.test(studentId);
      if (!isValidUuidId && !candidateEmailLookup) {
        throw new ApiError({ status: 400, code: 'VALIDATION_FAILED', message: 'A valid candidate ID is required.' });
      }

      return await runSchoolTx(dbCtx, async (txSql) => {
        // Verify candidate belongs to this school
        const existingRows = isValidUuidId
          ? await txSql<Array<{
              id: string;
              student_user_id: string;
              student_identifier: string | null;
              ingestion_method: string;
              license_status: string;
              name: string | null;
              email: string | null;
            }>>`
              SELECT
                ss.id,
                ss.student_user_id,
                ss.student_identifier,
                ss.ingestion_method,
                ss.license_status,
                p.display_name AS name,
                p.email
              FROM school_students ss
              LEFT JOIN profiles p ON p.id = ss.student_user_id
              WHERE ss.school_id = ${school.id}::uuid
                AND (ss.id = ${studentId}::uuid OR ss.student_user_id = ${studentId}::uuid)
              LIMIT 1
            `
          : await txSql<Array<{
              id: string;
              student_user_id: string;
              student_identifier: string | null;
              ingestion_method: string;
              license_status: string;
              name: string | null;
              email: string | null;
            }>>`
              SELECT
                ss.id,
                ss.student_user_id,
                ss.student_identifier,
                ss.ingestion_method,
                ss.license_status,
                p.display_name AS name,
                p.email
              FROM school_students ss
              LEFT JOIN profiles p ON p.id = ss.student_user_id
              WHERE ss.school_id = ${school.id}::uuid
                AND LOWER(p.email) = ${candidateEmailLookup}
              LIMIT 1
            `;

        const target = existingRows[0];
        if (!target) {
          throw new ApiError({ status: 404, code: 'NOT_FOUND', message: 'Candidate not found in your school roster.' });
        }

        const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : '';
        const lastName = typeof body.lastName === 'string' ? body.lastName.trim() : '';
        const rawName = typeof body.name === 'string' ? body.name.trim() : '';
        const nextName = (`${firstName} ${lastName}`.trim() || rawName || target.name || 'Candidate').trim();
        const nextEmail = (typeof body.email === 'string' ? body.email.trim().toLowerCase() : target.email || '').trim();
        const nextIdentifier =
          body.studentIdentifier !== undefined
            ? (typeof body.studentIdentifier === 'string' && body.studentIdentifier.trim() ? body.studentIdentifier.trim() : null)
            : target.student_identifier;
        const resetPasswordToSurname = Boolean(body.resetPasswordToSurname);

        if (!nextEmail || !nextEmail.includes('@')) {
          throw new ApiError({ status: 400, code: 'VALIDATION_FAILED', message: 'Please enter a valid candidate email address.' });
        }

        // Check email collision if email changed
        if (nextEmail !== (target.email || '').toLowerCase()) {
          const emailConflict = await txSql<Array<{ id: string }>>`
            SELECT id FROM auth.users
            WHERE LOWER(email) = ${nextEmail}
              AND id != ${target.student_user_id}::uuid
            UNION
            SELECT id FROM profiles
            WHERE LOWER(email) = ${nextEmail}
              AND id != ${target.student_user_id}::uuid
            LIMIT 1
          `;
          if (emailConflict[0]) {
            throw new ApiError({
              status: 409,
              code: 'CONFLICT',
              message: `Another account already uses the email ${nextEmail}.`,
            });
          }

          await txSql`
            UPDATE auth.users
            SET email = ${nextEmail},
                updated_at = NOW()
            WHERE id = ${target.student_user_id}::uuid
          `;
          await txSql`
            UPDATE auth.identities
            SET identity_data = jsonb_set(COALESCE(identity_data, '{}'::jsonb), '{email}', to_jsonb(${nextEmail}::text)),
                updated_at = NOW()
            WHERE user_id = ${target.student_user_id}::uuid AND provider = 'email'
          `.catch(() => {});
        }

        // Compute surname default password if requested or if school-ingested (manual / csv)
        const nameParts = nextName.split(/\s+/);
        const computedSurname = (nameParts.length > 1 ? nameParts[nameParts.length - 1] : nameParts[0] || 'STUDENT').toUpperCase();
        const shouldSyncSurnamePassword = resetPasswordToSurname || target.ingestion_method !== 'link';

        if (shouldSyncSurnamePassword) {
          await txSql`
            UPDATE auth.users
            SET encrypted_password = crypt(${computedSurname}::text, gen_salt('bf')),
                raw_user_meta_data = (COALESCE(raw_user_meta_data, '{}'::jsonb) - 'custom_password_set') || jsonb_build_object(
                  'display_name', ${nextName}::text,
                  'default_password', ${computedSurname}::text
                ),
                updated_at = NOW()
            WHERE id = ${target.student_user_id}::uuid
          `;
        } else {
          await txSql`
            UPDATE auth.users
            SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object(
                  'display_name', ${nextName}::text
                ),
                updated_at = NOW()
            WHERE id = ${target.student_user_id}::uuid
          `;
        }

        // Update profiles and school_students
        await txSql`
          UPDATE profiles
          SET display_name = ${nextName},
              email = ${nextEmail},
              updated_at = NOW()
          WHERE id = ${target.student_user_id}::uuid
        `;

        await txSql`
          UPDATE school_students
          SET student_identifier = ${nextIdentifier}
          WHERE id = ${target.id}::uuid AND school_id = ${school.id}::uuid
        `;

        // Optionally update 4 UTME subjects if provided
        let updatedSubjects: string[] | null = null;
        if (Array.isArray(body.subjects)) {
          const cleanCodes = Array.from(
            new Set(
              body.subjects
                .filter((s: unknown): s is string => typeof s === 'string' && s.trim().length > 0)
                .map((s: string) => s.trim().toUpperCase())
            )
          );

          if (cleanCodes.length > 0) {
            const ensuredCodes = cleanCodes.includes('ENG') ? cleanCodes.slice(0, 4) : ['ENG', ...cleanCodes.slice(0, 3)];
            const codesCsv = ensuredCodes.join(',');
            const subjectRows = await txSql<Array<{ id: string; code: string }>>`
              SELECT id, code
              FROM subjects
              WHERE is_active = TRUE
                AND code IN (SELECT unnest(string_to_array(${codesCsv}::text, ',')))
              ORDER BY is_compulsory DESC, display_order ASC, code ASC
            `;

            if (subjectRows.length > 0) {
              await txSql`
                DELETE FROM student_subjects WHERE user_id = ${target.student_user_id}::uuid
              `;
              for (const sub of subjectRows) {
                await txSql`
                  INSERT INTO student_subjects (user_id, subject_id)
                  VALUES (${target.student_user_id}::uuid, ${sub.id}::uuid)
                  ON CONFLICT (user_id, subject_id) DO NOTHING
                `;
              }
              if (subjectRows.length === 4) {
                await txSql`
                  INSERT INTO student_preferences (user_id, target_score, exam_year)
                  VALUES (${target.student_user_id}::uuid, 250, 2026)
                  ON CONFLICT (user_id) DO NOTHING
                `;
              }
              updatedSubjects = subjectRows.map((s) => s.code);
            }
          }
        }

        if (!updatedSubjects) {
          const currentSubRows = await txSql<Array<{ code: string }>>`
            SELECT s.code
            FROM student_subjects sub
            JOIN subjects s ON s.id = sub.subject_id
            WHERE sub.user_id = ${target.student_user_id}::uuid
            ORDER BY s.is_compulsory DESC, s.display_order ASC, s.code ASC
          `;
          updatedSubjects = currentSubRows.map((r) => r.code);
        }

        const defaultPassword =
          target.ingestion_method === 'link' && !resetPasswordToSurname ? null : computedSurname;

        return {
          status: 200 as const,
          body: {
            success: true,
            student: {
              id: target.id,
              studentUserId: target.student_user_id,
              name: nextName,
              email: nextEmail,
              studentIdentifier: nextIdentifier,
              ingestionMethod: resetPasswordToSurname && target.ingestion_method === 'link' ? 'manual' : target.ingestion_method,
              licenseStatus: target.license_status,
              defaultPassword,
              subjects: updatedSubjects,
            },
          },
        };
      });
    },
  },

  // 2C. POST /api/v1/schools/students/disconnect — Single or batch disconnect from school (requires admin password)
  {
    id: 'schools.students.disconnect',
    method: 'POST',
    pattern: '/api/v1/schools/students/disconnect',
    auth: 'student_live_session',
    maxBodyBytes: 32 * 1024,
    handler: async (ctx) => {
      const actor = ctx.actor!;
      const dbCtx = ctx.getDb();
      const { data } = await readBoundedJsonBody(ctx.request, { maxBytes: 32 * 1024 });
      const body = (data || {}) as Record<string, any>;

      const rawIds: unknown[] = Array.isArray(body.studentIds)
        ? body.studentIds
        : typeof body.studentId === 'string'
        ? [body.studentId]
        : [];
      const studentIds = rawIds.filter((id): id is string => typeof id === 'string' && UUID_PATTERN.test(id.trim())).map((id) => id.trim());
      const adminPassword = typeof body.adminPassword === 'string' ? body.adminPassword : '';

      if (studentIds.length === 0) {
        throw new ApiError({
          status: 400,
          code: 'VALIDATION_FAILED',
          message: 'Please select at least one candidate to disconnect.',
        });
      }

      if (!adminPassword) {
        throw new ApiError({
          status: 400,
          code: 'VALIDATION_FAILED',
          message: 'Please enter your administrator password to confirm disconnecting candidates.',
        });
      }

      const nowMs = (ctx.now || new Date()).getTime();
      const failState = disconnectPasswordFailures.get(actor.userId);
      if (failState && nowMs - failState.windowStartMs < PASSWORD_FAILURE_WINDOW_MS && failState.count >= MAX_PASSWORD_FAILURES) {
        throw new ApiError({
          status: 429,
          code: 'RATE_LIMITED',
          message: 'Too many failed administrator password attempts. Please wait 10 minutes before trying again.',
        });
      }

      // 1. Verify school administrator's password against auth.users
      const pwdCheckRows = await dbCtx.sql<Array<{ password_valid: boolean }>>`
        SELECT (encrypted_password = crypt(${adminPassword}::text, encrypted_password)) AS password_valid
        FROM auth.users
        WHERE id = ${actor.userId}::uuid
        LIMIT 1
      `;

      if (!pwdCheckRows[0]?.password_valid) {
        const prev = disconnectPasswordFailures.get(actor.userId);
        if (!prev || nowMs - prev.windowStartMs >= PASSWORD_FAILURE_WINDOW_MS) {
          disconnectPasswordFailures.set(actor.userId, { count: 1, windowStartMs: nowMs });
        } else {
          prev.count += 1;
        }
        throw new ApiError({
          status: 403,
          code: 'FORBIDDEN',
          message: 'Incorrect administrator password. Candidates were not disconnected.',
        });
      }
      disconnectPasswordFailures.delete(actor.userId);

      // 2. Locate caller's school
      const school = await resolveCallerSchool(actor, dbCtx, { autoProvision: false });
      if (!school) {
        throw new ApiError({
          status: 404,
          code: 'NOT_FOUND',
          message: 'No institutional school record found for your account.',
        });
      }

      return await runSchoolTx(dbCtx, async (txSql) => {
        // 3. Resolve matching school_students records owned by this school
        const idsCsv = uuidListCsv(studentIds);
        const ownedRows = await txSql<Array<{ id: string; student_user_id: string }>>`
          SELECT id, student_user_id
          FROM school_students
          WHERE school_id = ${school.id}::uuid
            AND (
              id IN (SELECT unnest(string_to_array(${idsCsv}::text, ',')::uuid[]))
              OR student_user_id IN (SELECT unnest(string_to_array(${idsCsv}::text, ',')::uuid[]))
            )
        `;

        if (ownedRows.length === 0) {
          throw new ApiError({
            status: 404,
            code: 'NOT_FOUND',
            message: 'None of the selected candidates were found in your school roster.',
          });
        }

        const rowIdsCsv = uuidListCsv(ownedRows.map((r) => r.id));
        const userIdsCsv = uuidListCsv(ownedRows.map((r) => r.student_user_id));

        // 4. Remove any queued school activation jobs for these students under this school's orders
        await txSql`
          DELETE FROM school_activation_jobs
          WHERE student_user_id IN (SELECT unnest(string_to_array(${userIdsCsv}::text, ',')::uuid[]))
            AND status IN ('queued', 'failed')
            AND order_id IN (SELECT id FROM school_orders WHERE school_id = ${school.id}::uuid)
        `;

        // 5. Disconnect candidates from school_students (preserving their user account, progress, and remaining subscription days)
        await txSql`
          DELETE FROM school_students
          WHERE school_id = ${school.id}::uuid
            AND id IN (SELECT unnest(string_to_array(${rowIdsCsv}::text, ',')::uuid[]))
        `;

        // 6. Strip school affiliation from auth.users metadata and transition subscription plan_code to individual mode
        await txSql`
          UPDATE auth.users
          SET raw_user_meta_data = (COALESCE(raw_user_meta_data, '{}'::jsonb) - 'school_code' - 'school_id') || '{"disconnected_from_school": true}'::jsonb,
              updated_at = NOW()
          WHERE id IN (SELECT unnest(string_to_array(${userIdsCsv}::text, ',')::uuid[]))
        `;

        await txSql`
          UPDATE subscription_entitlements
          SET plan_code = 'INDIVIDUAL_MONTHLY_1000',
              auto_renew = false,
              updated_at = NOW()
          WHERE user_id IN (SELECT unnest(string_to_array(${userIdsCsv}::text, ',')::uuid[]))
            AND plan_code = 'SCHOOL_INSTITUTIONAL_1500'
        `;

        return {
          status: 200 as const,
          body: {
            success: true,
            disconnectedCount: ownedRows.length,
            disconnectedIds: ownedRows.map((r) => r.id),
            subscriptionMode: 'individual',
          },
        };
      });
    },
  },

  // 3. POST /api/v1/schools/students/drilldown — Individual candidate diagnostic drilldown (Tenant-Scoped)
  {
    id: 'schools.students.drilldown',
    method: 'POST',
    pattern: '/api/v1/schools/students/drilldown',
    auth: 'student',
    maxBodyBytes: 32 * 1024,
    handler: async (ctx) => {
      const actor = ctx.actor!;
      const dbCtx = ctx.getDb();
      const { data } = await readBoundedJsonBody(ctx.request, { maxBytes: 32 * 1024 });
      const studentId = (typeof (data as any)?.studentId === 'string' ? (data as any).studentId.trim() : '') || null;

      if (!studentId || !UUID_PATTERN.test(studentId)) {
        throw new ApiError({
          status: 400,
          code: 'BAD_REQUEST',
          message: 'A valid candidate ID is required.',
        });
      }

      const school = await resolveCallerSchool(actor, dbCtx, { autoProvision: false });
      if (!school) {
        throw new ApiError({
          status: 403,
          code: 'FORBIDDEN',
          message: 'You must be an authenticated school administrator to inspect candidate performance.',
        });
      }

      // 1. Resolve student and verify ownership by caller's school
      const studentRows = await dbCtx.sql<Array<{
        id: string;
        student_user_id: string;
        student_identifier: string | null;
        license_status: string;
        name: string | null;
        email: string | null;
      }>>`
        SELECT
          ss.id,
          ss.student_user_id,
          ss.student_identifier,
          CASE
            WHEN ss.license_status = 'active' AND ss.license_expires_at IS NOT NULL AND ss.license_expires_at <= NOW()
            THEN 'expired'
            ELSE ss.license_status
          END AS license_status,
          p.display_name AS name,
          p.email
        FROM school_students ss
        LEFT JOIN profiles p ON ss.student_user_id = p.id
        WHERE ss.school_id = ${school.id}::uuid
          AND (ss.id = ${studentId}::uuid OR ss.student_user_id = ${studentId}::uuid)
        LIMIT 1
      `;

      const student = studentRows[0];
      if (!student) {
        throw new ApiError({
          status: 404,
          code: 'NOT_FOUND',
          message: 'Candidate not found in your school roster.',
        });
      }

      const targetUserId = student.student_user_id;

      // 2. Fetch candidate's actual enrolled UTME subjects
      const enrolledSubjectRows = await dbCtx.sql<Array<{ code: string; name: string; is_compulsory: boolean }>>`
        SELECT s.code, s.name, s.is_compulsory
        FROM student_subjects sub
        JOIN subjects s ON s.id = sub.subject_id
        WHERE sub.user_id = ${targetUserId}::uuid
        ORDER BY s.is_compulsory DESC, s.display_order ASC, s.code ASC
        LIMIT 4
      `;

      let weakTopics: Array<{ topic: string; subject: string; errorRate: string }> = [];
      let strongTopics: Array<{ topic: string; subject: string; accuracy: string }> = [];
      let mockHistory: Array<{ date: string; examName: string; score: number; timeSpent: string }> = [];
      let latestMockTotal: number | null = null;
      let practiceSummary = {
        topicsPracticed: 0,
        totalQuestionsAttempted: 0,
        totalQuestionsCorrect: 0,
        overallPracticeAccuracy: null as number | null,
        practiceSessionsCount: 0,
      };

      const practiceRows = await dbCtx.sql<Array<{
        topics_practiced: string;
        total_questions_attempted: string;
        total_questions_correct: string;
        overall_practice_accuracy: string;
        practice_sessions_count: string;
      }>>`
        SELECT
          count(distinct m.topic_id) as topics_practiced,
          coalesce(sum(m.total_attempted), 0) as total_questions_attempted,
          coalesce(sum(m.total_correct), 0) as total_questions_correct,
          coalesce(round(avg(m.accuracy_percent)), 0) as overall_practice_accuracy,
          (SELECT count(*) FROM attempts a WHERE a.user_id = ${targetUserId}::uuid AND a.mode = 'practice') as practice_sessions_count
        FROM student_topic_mastery m
        WHERE m.user_id = ${targetUserId}::uuid
      `;

      if (practiceRows[0]) {
        practiceSummary = {
          topicsPracticed: Number(practiceRows[0].topics_practiced || 0),
          totalQuestionsAttempted: Number(practiceRows[0].total_questions_attempted || 0),
          totalQuestionsCorrect: Number(practiceRows[0].total_questions_correct || 0),
          overallPracticeAccuracy: practiceRows[0].total_questions_attempted !== '0' ? Number(practiceRows[0].overall_practice_accuracy) : null,
          practiceSessionsCount: Number(practiceRows[0].practice_sessions_count || 0),
        };
      }

      const rawMocks = await dbCtx.sql<Array<{
        total_score: number;
        english_score: number;
        subject2_score: number;
        subject3_score: number;
        subject4_score: number;
        time_spent_seconds: number;
        topic_breakdown: any;
        created_at: string;
      }>>`
        SELECT
          ar.total_score,
          ar.english_score,
          ar.subject2_score,
          ar.subject3_score,
          ar.subject4_score,
          ar.time_spent_seconds,
          ar.topic_breakdown,
          ar.created_at
        FROM attempt_results ar
        WHERE ar.user_id = ${targetUserId}::uuid
        ORDER BY ar.created_at DESC
        LIMIT 10
      `;

      const latestMock = rawMocks[0] || null;
      if (latestMock) {
        latestMockTotal = latestMock.total_score;

        const breakdown = Array.isArray(latestMock.topic_breakdown) ? latestMock.topic_breakdown : [];
        weakTopics = breakdown
          .filter((b: any) => b.correct === 0 && b.total >= 1)
          .slice(0, 5)
          .map((b: any) => ({
            topic: b.topicTitle || 'Subject Topic',
            subject: b.subjectCode || 'GENERAL',
            errorRate: '100%',
          }));

        strongTopics = breakdown
          .filter((b: any) => b.correct === b.total && b.total >= 1)
          .slice(0, 5)
          .map((b: any) => ({
            topic: b.topicTitle || 'Subject Topic',
            subject: b.subjectCode || 'GENERAL',
            accuracy: '100%',
          }));
      }

      mockHistory = rawMocks.map((m, idx) => ({
        date: new Date(m.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
        examName: `UTME Standard CBT Simulation #${rawMocks.length - idx}`,
        score: m.total_score,
        timeSpent: `${Math.round(m.time_spent_seconds / 60)} mins`,
      }));

      // Build 4-subject breakdown using the candidate's actual enrolled UTME subjects (or fallback to standard 4 if not yet onboarded)
      const subjectTemplate =
        enrolledSubjectRows.length > 0
          ? enrolledSubjectRows
          : [
              { code: 'ENG', name: 'Use of English', is_compulsory: true },
              { code: 'MTH', name: 'Mathematics', is_compulsory: false },
              { code: 'PHY', name: 'Physics', is_compulsory: false },
              { code: 'CHM', name: 'Chemistry', is_compulsory: false },
            ];

      const mockScoresBySlot = latestMock
        ? [latestMock.english_score, latestMock.subject2_score, latestMock.subject3_score, latestMock.subject4_score]
        : [null, null, null, null];

      const breakdownBySubjectCode = new Map<string, { correct: number; total: number }>();
      if (latestMock && Array.isArray(latestMock.topic_breakdown)) {
        for (const item of latestMock.topic_breakdown) {
          const code = typeof item?.subjectCode === 'string' ? item.subjectCode.trim().toUpperCase() : '';
          if (!code) continue;
          const cur = breakdownBySubjectCode.get(code) || { correct: 0, total: 0 };
          cur.correct += Number(item.correct) || 0;
          cur.total += Number(item.total) || 0;
          breakdownBySubjectCode.set(code, cur);
        }
      }

      const subjectsBreakdown = subjectTemplate.map((sub, index) => {
        const codeUpper = sub.code.toUpperCase();
        const topicAgg = breakdownBySubjectCode.get(codeUpper);
        const slotScore =
          topicAgg && topicAgg.total > 0
            ? Math.round((topicAgg.correct / topicAgg.total) * 100)
            : mockScoresBySlot[index] ?? null;
        return {
          name: sub.name,
          code: sub.code,
          score: slotScore,
          maxScore: 100,
          accuracy: typeof slotScore === 'number' ? `${slotScore}%` : '—',
          status: latestMock ? 'completed' : 'unattempted',
        };
      });

      const drilldown = {
        studentId: student.id,
        name: student.name || 'Candidate',
        email: student.email || '',
        studentIdentifier: student.student_identifier || null,
        licenseStatus: student.license_status || 'inactive',
        subjects: subjectsBreakdown,
        totalScore: latestMockTotal,
        maxPossibleScore: 400,
        percentileRank: latestMockTotal ? (latestMockTotal >= 250 ? 'Top 15% Cohort' : 'Active Cohort') : null,
        practiceSummary,
        weakTopics,
        strongTopics,
        mockHistory,
      };

      return {
        status: 200,
        body: {
          success: true,
          drilldown,
        },
      };
    },
  },

  // 4. POST /api/v1/schools/diagnostics/summary — Cohort syllabus diagnostics (Tenant-Scoped)
  {
    id: 'schools.diagnostics.summary',
    method: 'POST',
    pattern: '/api/v1/schools/diagnostics/summary',
    auth: 'student',
    maxBodyBytes: 32 * 1024,
    handler: async (ctx) => {
      const actor = ctx.actor!;
      const dbCtx = ctx.getDb();

      const school = await resolveCallerSchool(actor, dbCtx, { autoProvision: false });
      if (!school) {
        return {
          status: 200,
          body: {
            success: true,
            topics: [],
            revisionTimetable: [],
          },
        };
      }

      const topicRows = await dbCtx.sql<Array<{
        id: string;
        subject_name: string;
        subject_code: string;
        topic: string;
        total_attempted: string;
        total_correct: string;
        accuracy_rate: string;
      }>>`
        SELECT
          t.id,
          s.name as subject_name,
          s.code as subject_code,
          t.title as topic,
          sum(m.total_attempted) as total_attempted,
          sum(m.total_correct) as total_correct,
          round((sum(m.total_correct)::float / nullif(sum(m.total_attempted), 0)::float) * 100) as accuracy_rate
        FROM student_topic_mastery m
        JOIN school_students ss ON ss.student_user_id = m.user_id
        JOIN topics t ON m.topic_id = t.id
        JOIN subjects s ON m.subject_id = s.id
        WHERE ss.school_id = ${school.id}::uuid
        GROUP BY t.id, s.name, s.code, t.title
        HAVING sum(m.total_attempted) > 0
        ORDER BY accuracy_rate ASC, total_attempted DESC
        LIMIT 50
      `;

      const diagnosticTopics = topicRows.map((r) => {
        const rate = Number(r.accuracy_rate) || 0;
        let status: 'urgent_remedial' | 'revision_recommended' | 'exam_ready' = 'revision_recommended';
        let recommendedAction = 'Schedule group tutorial and past-question speed drill.';

        if (rate < 40) {
          status = 'urgent_remedial';
          recommendedAction = 'Critical gap (<40% accuracy): Re-teach core syllabus principles before next mock.';
        } else if (rate >= 70) {
          status = 'exam_ready';
          recommendedAction = 'Mastered topic (≥70% accuracy): Candidate retention is on track for UTME.';
        }

        return {
          id: r.id,
          subject: r.subject_name,
          subjectCode: r.subject_code,
          topic: r.topic,
          accuracyRate: rate,
          questionsAttempted: Number(r.total_attempted) || 0,
          status,
          recommendedAction,
        };
      });

      const revisionTimetable = diagnosticTopics
        .filter((t) => t.status === 'urgent_remedial' || t.status === 'revision_recommended')
        .slice(0, 5)
        .map((t, i) => {
          const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
          return {
            day: days[i % days.length],
            time: '45 Mins Remedial Block',
            subject: t.subject,
            topic: t.topic,
            priority: t.status === 'urgent_remedial' ? 'Urgent' : 'Moderate',
            action: t.recommendedAction,
          };
        });

      return {
        status: 200,
        body: {
          success: true,
          topics: diagnosticTopics,
          revisionTimetable,
        },
      };
    },
  },

  // 5. POST /api/v1/schools/mocks/schedule — Schedule & persist school CBT lab mock test
  {
    id: 'schools.mocks.schedule',
    method: 'POST',
    pattern: '/api/v1/schools/mocks/schedule',
    auth: 'student_live_session',
    maxBodyBytes: 32 * 1024,
    handler: async (ctx) => {
      const actor = ctx.actor!;
      const dbCtx = ctx.getDb();
      const { data } = await readBoundedJsonBody(ctx.request, { maxBytes: 32 * 1024 });
      const body = (data || {}) as Record<string, any>;

      const school = await resolveCallerSchool(actor, dbCtx, { autoProvision: true });
      if (!school) {
        throw new ApiError({
          status: 403,
          code: 'FORBIDDEN',
          message: 'You must be an authenticated school administrator to schedule a CBT laboratory mock.',
        });
      }

      const title = (typeof body.title === 'string' ? body.title.trim() : '') || 'Term UTME Mock Examination';
      const scheduledDate = (typeof body.scheduledDate === 'string' ? body.scheduledDate.trim() : '') || new Date().toISOString();
      const durationMinutes = Number(body.durationMinutes) || 120;
      const totalQuestions = Number(body.totalQuestions) || 180;
      const windowBufferMinutes = Number(body.windowBufferMinutes) || 30;
      const hotkeyNavigationEnabled = body.hotkeyNavigationEnabled ?? true;

      const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      const randomBytes = new Uint8Array(6);
      crypto.getRandomValues(randomBytes);
      const randomSuffix = Array.from(randomBytes.slice(0, 4), (b) => alphabet[b % alphabet.length]).join('');
      const labSessionCode = `LAB-SCH-${randomSuffix}`;
      const proctorSuffix = Array.from(randomBytes, (b) => alphabet[b % alphabet.length]).join('');

      // Archive any prior active mock for this school so there is only one active mock session at a time
      await dbCtx.sql`
        UPDATE school_mocks
        SET status = 'completed', updated_at = NOW()
        WHERE school_id = ${school.id}::uuid AND status = 'active'
      `.catch(() => {});

      // Insert into durable school_mocks table
      const insertedMocks = await dbCtx.sql<Array<{
        id: string;
        title: string;
        scheduled_start: string;
        duration_minutes: number;
        question_count: number;
        status: string;
        window_buffer_minutes: number;
        created_at: string;
      }>>`
        INSERT INTO school_mocks (
          school_id,
          title,
          scheduled_start,
          duration_minutes,
          question_count,
          status,
          window_buffer_minutes
        ) VALUES (
          ${school.id}::uuid,
          ${title},
          ${scheduledDate}::timestamptz,
          ${durationMinutes},
          ${totalQuestions},
          'active',
          ${windowBufferMinutes}
        )
        RETURNING id, title, scheduled_start, duration_minutes, question_count, status, window_buffer_minutes, created_at
      `;

      const persistentMock = insertedMocks[0];
      const mockId = persistentMock?.id || `mock-sess-${Date.now()}`;

      const session = {
        id: mockId,
        schoolId: school.id,
        schoolName: school.name,
        schoolCode: school.code,
        title,
        labSessionCode,
        scheduledDate,
        durationMinutes,
        totalQuestions,
        windowBufferMinutes,
        hotkeyNavigationEnabled,
        proctorKey: `PRC-${proctorSuffix}`,
        status: 'active',
        createdAt: new Date().toISOString(),
      };

      await dbCtx.sql`
        UPDATE auth.users
        SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('active_lab_mock', ${JSON.stringify(session)}::text::jsonb),
            updated_at = NOW()
        WHERE id = ${school.admin_id}::uuid
      `.catch(() => {});

      return {
        status: 200,
        body: {
          success: true,
          mock: persistentMock || session,
          session,
          instructions: [
            'Ensure all laboratory desktop monitors are connected to the school LAN or internet.',
            'Students simply visit /mock; their school mock card appears automatically.',
            'No manual session codes or passwords required.',
            'Strict lab hours are enforced based on the scheduled start time and duration.',
            'Scores automatically synchronize to the live ranked leaderboard on your administrator dashboard.',
          ],
        },
      };
    },
  },

  // 5A. GET /api/v1/schools/mocks/active — Fetch active mock exam details and ranked student leaderboard
  {
    id: 'schools.mocks.active.get',
    method: 'GET',
    pattern: '/api/v1/schools/mocks/active',
    auth: 'student_live_session',
    handler: async (ctx) => {
      const actor = ctx.actor!;
      const dbCtx = ctx.getDb();
      const school = await resolveCallerSchool(actor, dbCtx, { autoProvision: true });
      if (!school) {
        throw new ApiError({
          status: 403,
          code: 'FORBIDDEN',
          message: 'You must be an authenticated school administrator to view CBT mock diagnostics.',
        });
      }

      // Fetch active or latest mock
      const mockRows = await dbCtx.sql<Array<{
        id: string;
        title: string;
        scheduled_start: string;
        duration_minutes: number;
        question_count: number;
        window_buffer_minutes: number;
        status: string;
        created_at: string;
      }>>`
        SELECT id, title, scheduled_start, duration_minutes, question_count, window_buffer_minutes, status, created_at
        FROM school_mocks
        WHERE school_id = ${school.id}::uuid AND status = 'active'
        ORDER BY created_at DESC
        LIMIT 1
      `;

      const activeMock = mockRows[0];
      if (!activeMock) {
        return {
          status: 200,
          body: {
            hasActiveMock: false,
            mock: null,
            leaderboard: [],
            summary: null,
          },
        };
      }

      // Query enrolled candidates and their attempts for this mock
      const candidateRows = await dbCtx.sql<Array<{
        student_user_id: string;
        student_name: string;
        student_email: string;
        student_identifier: string | null;
        attempt_id: string | null;
        attempt_status: string | null;
        started_at: string | null;
        total_score: number | null;
        english_score: number | null;
        subject2_score: number | null;
        subject3_score: number | null;
        subject4_score: number | null;
        time_spent_seconds: number | null;
        completed_at: string | null;
      }>>`
        SELECT
          ss.student_user_id,
          COALESCE(p.display_name, 'Candidate') AS student_name,
          p.email AS student_email,
          ss.student_identifier,
          a.id AS attempt_id,
          a.status AS attempt_status,
          a.started_at,
          ar.total_score,
          ar.english_score,
          ar.subject2_score,
          ar.subject3_score,
          ar.subject4_score,
          ar.time_spent_seconds,
          ar.created_at AS completed_at
        FROM school_students ss
        JOIN profiles p ON p.id = ss.student_user_id
        LEFT JOIN attempts a ON a.user_id = ss.student_user_id
          AND (a.school_mock_id = ${activeMock.id}::uuid OR a.blueprint_manifest->>'schoolMockId' = ${activeMock.id}::text)
        LEFT JOIN attempt_results ar ON ar.attempt_id = a.id
        WHERE ss.school_id = ${school.id}::uuid
        ORDER BY
          CASE WHEN ar.total_score IS NOT NULL THEN 0 ELSE 1 END,
          ar.total_score DESC NULLS LAST,
          ar.time_spent_seconds ASC NULLS LAST,
          p.display_name ASC
      `;

      let currentRank = 0;
      let lastScore: number | null = null;
      let completedCount = 0;
      let inProgressCount = 0;
      let notStartedCount = 0;
      let totalScoresSum = 0;
      let highestScore: number | null = null;
      let lowestScore: number | null = null;
      let passCount = 0;

      const leaderboard = candidateRows.map((c, index) => {
        let status: 'completed' | 'in_progress' | 'not_started' = 'not_started';
        let rank: number | null = null;

        if (c.attempt_status === 'completed' && c.total_score !== null) {
          status = 'completed';
          completedCount++;
          const score = Number(c.total_score);
          totalScoresSum += score;
          if (highestScore === null || score > highestScore) highestScore = score;
          if (lowestScore === null || score < lowestScore) lowestScore = score;
          if (score >= 200) passCount++;

          if (lastScore === null || score < lastScore) {
            currentRank = index + 1;
            lastScore = score;
          }
          rank = currentRank;
        } else if (c.attempt_status === 'in_progress') {
          status = 'in_progress';
          inProgressCount++;
        } else {
          notStartedCount++;
        }

        return {
          rank,
          studentUserId: c.student_user_id,
          studentName: c.student_name,
          studentEmail: c.student_email,
          studentIdentifier: c.student_identifier,
          status,
          totalScore: c.total_score !== null ? Number(c.total_score) : null,
          englishScore: c.english_score !== null ? Number(c.english_score) : null,
          subject2Score: c.subject2_score !== null ? Number(c.subject2_score) : null,
          subject3Score: c.subject3_score !== null ? Number(c.subject3_score) : null,
          subject4Score: c.subject4_score !== null ? Number(c.subject4_score) : null,
          timeSpentSeconds: c.time_spent_seconds !== null ? Number(c.time_spent_seconds) : null,
          startedAt: c.started_at,
          completedAt: c.completed_at,
        };
      });

      const averageScore = completedCount > 0 ? Math.round(totalScoresSum / completedCount) : null;
      const passRate = completedCount > 0 ? Math.round((passCount / completedCount) * 100) : null;

      const startMs = new Date(activeMock.scheduled_start).getTime();
      const durationMs = (activeMock.duration_minutes || 120) * 60 * 1000;
      const bufferMs = (activeMock.window_buffer_minutes || 30) * 60 * 1000;
      const endMs = startMs + durationMs + bufferMs;
      const nowMs = ctx.now.getTime();

      let windowStatus: 'scheduled' | 'open' | 'expired' = 'open';
      if (nowMs < startMs) {
        windowStatus = 'scheduled';
      } else if (nowMs > endMs) {
        windowStatus = 'expired';
      }

      return {
        status: 200,
        body: {
          hasActiveMock: true,
          mock: {
            ...activeMock,
            windowStatus,
            windowEndsAt: new Date(endMs).toISOString(),
          },
          summary: {
            totalStudents: candidateRows.length,
            completedCount,
            inProgressCount,
            notStartedCount,
            averageScore,
            highestScore,
            lowestScore,
            passRate,
          },
          leaderboard,
        },
      };
    },
  },

  // 5C. POST /api/v1/schools/mocks/:mockId/end — Conclude/archive an active school mock session
  {
    id: 'schools.mocks.end',
    method: 'POST',
    pattern: '/api/v1/schools/mocks/:mockId/end',
    auth: 'student_live_session',
    handler: async (ctx) => {
      const actor = ctx.actor!;
      const dbCtx = ctx.getDb();
      const mockId = assertValidUuid(ctx.params.mockId);

      const school = await resolveCallerSchool(actor, dbCtx);
      if (!school) {
        throw new ApiError({
          status: 403,
          code: 'FORBIDDEN',
          message: 'You must be an authenticated school administrator.',
        });
      }

      await dbCtx.sql`
        UPDATE school_mocks
        SET status = 'completed', updated_at = NOW()
        WHERE id = ${mockId}::uuid AND school_id = ${school.id}::uuid
      `;

      return {
        status: 200,
        body: { success: true, message: 'Mock examination session concluded and archived.' },
      };
    },
  },

  // 5B. POST /api/v1/schools/mocks/join — Validate a whiteboard CBT Lab Session Code (`LAB-SCH-*`) for a student (retained for backward compatibility)
  {
    id: 'schools.mocks.join',
    method: 'POST',
    pattern: '/api/v1/schools/mocks/join',
    auth: 'student',
    maxBodyBytes: 16 * 1024,
    handler: async (ctx) => {
      const actor = ctx.actor!;
      const dbCtx = ctx.getDb();
      const { data } = await readBoundedJsonBody(ctx.request, { maxBytes: 16 * 1024 });
      const rawCode = typeof (data as any)?.labSessionCode === 'string' ? (data as any).labSessionCode.trim().toUpperCase() : '';

      if (!rawCode) {
        throw new ApiError({
          status: 400,
          code: 'VALIDATION_FAILED',
          message: 'Please enter the CBT Lab Session Code written on your laboratory whiteboard.',
        });
      }

      // Look up matching lab session from the student's enrolled school (or admin's school)
      const matchRows = await dbCtx.sql<Array<{
        school_id: string;
        school_name: string;
        school_code: string;
        active_lab_mock: any;
      }>>`
        SELECT
          s.id AS school_id,
          s.name AS school_name,
          s.code AS school_code,
          au.raw_user_meta_data->'active_lab_mock' AS active_lab_mock
        FROM schools s
        JOIN auth.users au ON au.id = s.admin_id
        WHERE (
            s.admin_id = ${actor.userId}::uuid
            OR EXISTS (
              SELECT 1 FROM school_students ss
              WHERE ss.school_id = s.id AND ss.student_user_id = ${actor.userId}::uuid
            )
          )
          AND (
            UPPER(au.raw_user_meta_data->'active_lab_mock'->>'labSessionCode') = ${rawCode}
            OR UPPER(s.code || '-MOCK') = ${rawCode}
          )
        LIMIT 1
      `;

      if (!matchRows[0]) {
        throw new ApiError({
          status: 404,
          code: 'NOT_FOUND',
          message: `Lab session code "${rawCode}" was not found for your school or has expired. Please check the code on the whiteboard.`,
        });
      }

      const row = matchRows[0];
      const scheduledIso = row.active_lab_mock?.scheduledDate;
      if (scheduledIso) {
        const scheduledMs = Date.parse(scheduledIso);
        const nowMs = (ctx.now || new Date()).getTime();
        if (Number.isFinite(scheduledMs) && scheduledMs - nowMs > 15 * 60 * 1000) {
          throw new ApiError({
            status: 409,
            code: 'CONFLICT',
            message: `This CBT Lab Mock session ("${row.active_lab_mock?.title || 'School Mock'}") is scheduled to open at ${new Date(scheduledMs).toLocaleString()}.`,
          });
        }
      }
      return {
        status: 200,
        body: {
          success: true,
          valid: true,
          session: row.active_lab_mock || {
            labSessionCode: rawCode,
            title: `${row.school_name} CBT Lab Mock`,
            durationMinutes: 120,
            totalQuestions: 180,
            schoolName: row.school_name,
            schoolCode: row.school_code,
          },
        },
      };
    },
  },

  // 6. POST /api/v1/schools/checkout/initialize — Initialize Paystack checkout for explicitly selected candidates
  {
    id: 'schools.checkout.initialize',
    method: 'POST',
    pattern: '/api/v1/schools/checkout/initialize',
    auth: 'student_live_session',
    maxBodyBytes: 32 * 1024,
    handler: async (ctx) => {
      const actor = ctx.actor!;
      const dbCtx = ctx.getDb();
      const { data } = await readBoundedJsonBody(ctx.request, { maxBytes: 32 * 1024 });
      const body = (data || {}) as Record<string, any>;

      const durationMonths = Number(body.durationMonths || 3);
      const requestedStudentIds: unknown[] = Array.isArray(body.studentIds) ? body.studentIds : [];

      if (!Number.isInteger(durationMonths) || durationMonths < 1 || durationMonths > 12) {
        throw new ApiError({ status: 400, code: 'VALIDATION_FAILED', message: 'Duration must be between 1 and 12 calendar months.' });
      }

      const school = await resolveCallerSchool(actor, dbCtx, { autoProvision: false });
      if (!school) {
        throw new ApiError({ status: 404, code: 'NOT_FOUND', message: 'No school partnership found for your account.' });
      }

      // Strict selection guard: require explicit candidate IDs belonging to this school
      const requestedIds = requestedStudentIds.filter((id: unknown): id is string => typeof id === 'string' && UUID_PATTERN.test(id));
      if (requestedIds.length === 0) {
        throw new ApiError({
          status: 400,
          code: 'VALIDATION_FAILED',
          message: 'Please select at least one candidate from your school roster before checking out licences.',
        });
      }

      const ownedRows = await dbCtx.sql<Array<{ id: string }>>`
        SELECT id FROM school_students
        WHERE school_id = ${school.id}::uuid
          AND id IN (SELECT unnest(string_to_array(${requestedIds.join(',')}::text, ',')::uuid[]))
      `;
      const ownedIds = new Set(ownedRows.map((row) => row.id));
      const studentIds = requestedIds.filter((id: string, index: number) => ownedIds.has(id) && requestedIds.indexOf(id) === index);

      if (studentIds.length === 0) {
        throw new ApiError({
          status: 400,
          code: 'VALIDATION_FAILED',
          message: 'The selected candidates were not found in your school roster.',
        });
      }

      const studentCount = studentIds.length;

      // Settle any earlier paid-but-unactivated order first, instead of charging again.
      const settledReference = await settleEarlierPaidOrder(dbCtx, ctx.env as PaymentEnv, school.id);
      if (settledReference) {
        const appOriginForSettled = resolveCheckoutAppOrigin(ctx.request, ctx.env);
        return {
          status: 200,
          body: {
            success: true,
            reconciled: true,
            reference: settledReference,
            authorizationUrl: `${appOriginForSettled}/schools/checkout/verify/?reference=${encodeURIComponent(settledReference)}`,
          },
        };
      }

      const ratePerStudentKobo = 150000; // ₦1,500
      const totalAmountKobo = studentCount * durationMonths * ratePerStudentKobo;
      const reference = `SCH-ORD-${Date.now()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

      // Insert pending school order
      await dbCtx.sql`
        INSERT INTO school_orders (
          school_id,
          reference,
          student_count,
          duration_months,
          rate_per_student_kobo,
          total_amount_kobo,
          status,
          metadata
        )
        VALUES (
          ${school.id}::uuid,
          ${reference},
          ${studentCount},
          ${durationMonths},
          ${ratePerStudentKobo},
          ${totalAmountKobo},
          'pending',
          ${JSON.stringify({
            studentIds,
            schoolName: school.name,
            schoolCode: school.code,
            adminEmail: actor.email,
            orderType: 'school_cohort_license',
          })}::text::jsonb
        )
      `;

      const env = ctx.env as any;
      const paystackSecret = env.PAYSTACK_SECRET_KEY?.trim() || '';
      const appOrigin = resolveCheckoutAppOrigin(ctx.request, env);
      const callbackUrl = `${appOrigin}/schools/checkout/verify/?reference=${encodeURIComponent(reference)}`;

      if (paystackSecret && /^sk_(test|live)_/.test(paystackSecret)) {
        try {
          const initResult = await paystackRequest(
            ctx.env as PaymentEnv,
            '/transaction/initialize',
            {
              email: actor.email || 'billing@school.jambprep.local',
              amount: String(totalAmountKobo),
              reference,
              callback_url: callbackUrl,
              metadata: {
                schoolId: school.id,
                schoolName: school.name,
                schoolCode: school.code,
                studentCount,
                durationMonths,
                orderType: 'school_cohort_license',
              },
            }
          );

          const authorizationUrl = validateCheckoutUrl(initResult.authorization_url);
          return {
            status: 200,
            body: {
              success: true,
              reference,
              authorizationUrl,
              quote: {
                studentCount,
                durationMonths,
                ratePerStudentKobo,
                totalAmountKobo,
                totalNaira: Math.round(totalAmountKobo / 100),
              },
            },
          };
        } catch (paystackErr) {
          console.warn('Paystack API call notice:', paystackErr);
        }
      }

      // Demo/Fallback mode when Paystack key is not live or in staging test
      return {
        status: 200,
        body: {
          success: true,
          reference,
          authorizationUrl: callbackUrl,
          isDemo: true,
          quote: {
            studentCount,
            durationMonths,
            ratePerStudentKobo,
            totalAmountKobo,
            totalNaira: Math.round(totalAmountKobo / 100),
          },
        },
      };
    },
  },

  // 7. POST /api/v1/schools/checkout/verify — Verify Paystack settlement & execute full cohort activation
  {
    id: 'schools.checkout.verify',
    method: 'POST',
    pattern: '/api/v1/schools/checkout/verify',
    auth: 'student_live_session',
    maxBodyBytes: 32 * 1024,
    handler: async (ctx) => {
      const dbCtx = ctx.getDb();
      const { data } = await readBoundedJsonBody(ctx.request, { maxBytes: 32 * 1024 });
      const body = (data || {}) as Record<string, any>;
      const reference = (typeof body.reference === 'string' ? body.reference.trim() : '') || null;

      if (!reference) {
        throw new ApiError({ status: 400, code: 'VALIDATION_FAILED', message: 'Payment reference is required.' });
      }

      const orderRows = await dbCtx.sql<Array<{
        id: string;
        school_id: string;
        reference: string;
        student_count: number;
        duration_months: number;
        total_amount_kobo: number;
        status: string;
        metadata: any;
        settled_at: string | null;
      }>>`
        SELECT id, school_id, reference, student_count, duration_months, total_amount_kobo, status, metadata, settled_at
        FROM school_orders
        WHERE reference = ${reference}
        LIMIT 1
      `;

      if (!orderRows[0]) {
        throw new ApiError({ status: 404, code: 'NOT_FOUND', message: 'School order not found for reference.' });
      }

      const order = orderRows[0];

      // Enforce school tenant ownership on order verification
      const callerSchool = await resolveCallerSchool(ctx.actor!, dbCtx, { autoProvision: false });
      if (!callerSchool || callerSchool.id !== order.school_id) {
        throw new ApiError({
          status: 403,
          code: 'FORBIDDEN',
          message: 'You are not authorized to verify or settle this school order.',
        });
      }

      const school = callerSchool;

      // Idempotency: if already completed, return existing confirmation
      if (order.status === 'completed') {
        return {
          status: 200,
          body: {
            success: true,
            alreadySettled: true,
            activatedCount: order.student_count,
            order: {
              id: order.id,
              reference: order.reference,
              studentCount: order.student_count,
              durationMonths: order.duration_months,
              totalAmountKobo: order.total_amount_kobo,
              status: order.status,
              settledAt: order.settled_at || new Date().toISOString(),
              schoolName: school.name,
              schoolCode: school.code,
            },
          },
        };
      }

      // Verify on Paystack Gateway
      const env = ctx.env as any;
      const paystackSecret = env.PAYSTACK_SECRET_KEY?.trim() || '';

      if (paystackSecret && /^sk_(test|live)_/.test(paystackSecret)) {
        try {
          const verifyData = await paystackRequest(
            ctx.env as PaymentEnv,
            `/transaction/verify/${encodeURIComponent(reference)}`,
            undefined
          );

          if (verifyData.status !== 'success') {
            throw new ApiError({
              status: 400,
              code: 'PAYMENT_FAILED',
              message: `Payment has not been confirmed by Paystack (status: ${String(verifyData.status || 'unconfirmed')}).`,
            });
          }

          const paidAmount = Number(verifyData.amount);
          if (paidAmount < order.total_amount_kobo) {
            throw new ApiError({ status: 400, code: 'BAD_REQUEST', message: 'Paid amount does not match invoice.' });
          }
        } catch (verifyErr) {
          if (verifyErr instanceof ApiError) throw verifyErr;
          throw new ApiError({
            status: 503,
            code: 'SERVICE_UNAVAILABLE',
            message: 'Payment gateway verification could not be completed. Please retry shortly.',
          });
        }
      } else if (env.ENVIRONMENT === 'production') {
        throw new ApiError({
          status: 503,
          code: 'SERVICE_CONFIG_UNAVAILABLE',
          message: 'Payment gateway secret key is not configured.',
        });
      }

      // 1. Enqueue activation jobs into school_activation_jobs
      const targetedIds = parseOrderStudentIds(order.metadata);

      await enqueueCohortActivation(dbCtx, {
        orderId: order.id,
        schoolId: order.school_id,
        durationMonths: order.duration_months,
        studentCount: order.student_count,
        targetedIds,
      });

      // 2. Drain all activation batches (100 students per chunk until completed)
      const progress = await processActivationBatch(dbCtx, order.id, 100);

      return {
        status: 200,
        body: {
          success: true,
          activatedCount: progress.completedJobs,
          progress,
          order: {
            id: order.id,
            reference: order.reference,
            studentCount: order.student_count,
            durationMonths: order.duration_months,
            totalAmountKobo: order.total_amount_kobo,
            status: progress.orderStatus,
            schoolName: school.name,
            schoolCode: school.code,
            settledAt: new Date().toISOString(),
          },
        },
      };
    },
  },

  // 8. POST /api/v1/schools/checkout/webhook — Dedicated School Paystack Webhook Handler with HMAC verification
  {
    id: 'schools.checkout.webhook',
    method: 'POST',
    pattern: '/api/v1/schools/checkout/webhook',
    auth: 'public',
    maxBodyBytes: 64 * 1024,
    handler: async (ctx) => {
      const dbCtx = ctx.getDb();
      const env = ctx.env as any;
      const paystackSecret = (env.PAYSTACK_WEBHOOK_SECRET || env.PAYSTACK_SECRET_KEY || '').trim();

      if (!paystackSecret) {
        throw new ApiError({
          status: 503,
          code: 'SERVICE_CONFIG_UNAVAILABLE',
          message: 'Paystack webhook secret is not configured.',
        });
      }

      const rawBody = await ctx.request.text();
      const signature = ctx.request.headers.get('x-paystack-signature');

      // Verify HMAC-SHA512 signature (fail-closed)
      const isValid = await verifyPaystackHmacSignature(rawBody, signature, paystackSecret);
      if (!isValid) {
        throw new ApiError({ status: 401, code: 'UNAUTHORIZED', message: 'Invalid webhook signature.' });
      }

      let payload: Record<string, any> = {};
      try {
        payload = JSON.parse(rawBody);
      } catch {
        throw new ApiError({ status: 400, code: 'MALFORMED_JSON', message: 'Invalid JSON payload.' });
      }

      if (payload.event === 'charge.success') {
        const data = payload.data || {};
        const reference = typeof data.reference === 'string' ? data.reference.trim() : '';
        if (reference) {
          await settleSchoolOrderFromWebhook(dbCtx, reference, Number(data.amount) || undefined);
        }
      }

      return {
        status: 200,
        body: { received: true },
      };
    },
  },
];
