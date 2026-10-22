import type { RouteDefinition } from '../api/router';
import { readBoundedJsonBody } from '../api/contracts';
import { ApiError } from '../api/errors';

export const SCHOOL_ROUTES: ReadonlyArray<RouteDefinition> = [
  // 1. GET /api/v1/schools/students — Load authoritative school roster & sync institution profile
  {
    id: 'schools.students.get',
    method: 'GET',
    pattern: '/api/v1/schools/students',
    auth: 'student',
    handler: async (ctx) => {
      const actor = ctx.actor!;
      const dbCtx = ctx.getDb();

      const meta = ((actor.claims as any).user_metadata || {}) as Record<string, any>;
      const metaSchoolCode = (typeof meta.school_code === 'string' ? meta.school_code.trim().toUpperCase() : '') || null;
      const metaSchoolName = (typeof meta.school_name === 'string' ? meta.school_name.trim() : '') || 'LecternIQ Partner School';
      const metaState = (typeof meta.state === 'string' ? meta.state.trim() : '') || 'Lagos';
      const metaSchoolType = (typeof meta.school_type === 'string' ? meta.school_type.trim() : '') || 'secondary_school';

      // 1. Locate school record by admin ownership, membership, or registered school_code
      let schoolRows = await dbCtx.sql<Array<{ id: string; name: string; code: string; type: string; state: string }>>`
        SELECT s.id, s.name, s.code, s.type, s.state
        FROM schools s
        WHERE s.admin_id = ${actor.userId}::uuid
           OR EXISTS (SELECT 1 FROM school_members sm WHERE sm.school_id = s.id AND sm.user_id = ${actor.userId}::uuid)
           ${metaSchoolCode ? dbCtx.sql`OR UPPER(s.code) = ${metaSchoolCode}` : dbCtx.sql``}
        LIMIT 1
      `;

      // 2. Ensure school admin profile exists in profiles table
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
      `;

      // 3. Auto-provision school record if admin has code in metadata but record is missing
      if (!schoolRows[0] && metaSchoolCode) {
        const slug = metaSchoolName.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 48) || 'school';
        schoolRows = await dbCtx.sql<Array<{ id: string; name: string; code: string; type: string; state: string }>>`
          INSERT INTO schools (name, slug, code, type, state, admin_id)
          VALUES (${metaSchoolName}, ${slug}, ${metaSchoolCode}, ${metaSchoolType}, ${metaState}, ${actor.userId}::uuid)
          ON CONFLICT (code) DO UPDATE SET admin_id = ${actor.userId}::uuid
          RETURNING id, name, code, type, state
        `;
      }

      const school = schoolRows[0];
      if (!school) {
        return {
          status: 200,
          body: {
            students: [],
            school: null,
          },
        };
      }

      // 4. Query all enrolled students from school_students left-joined with profiles
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
      }>>`
        SELECT
          ss.id,
          ss.student_user_id,
          ss.student_identifier,
          ss.ingestion_method,
          ss.license_status,
          ss.license_expires_at,
          ss.created_at,
          p.display_name AS name,
          p.email
        FROM school_students ss
        LEFT JOIN profiles p ON ss.student_user_id = p.id
        WHERE ss.school_id = ${school.id}::uuid
        ORDER BY ss.created_at DESC
      `;

      const formatted = enrolledRows.map((row) => {
        const parts = (row.name || '').trim().split(/\s+/);
        const lastName = parts.length > 1 ? parts[parts.length - 1] : parts[0] || 'CANDIDATE';
        const cleanPass = lastName.toUpperCase();
        const defaultPassword = cleanPass.length >= 6 ? cleanPass : `${cleanPass}123456`.slice(0, 6);

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
        },
      };
    },
  },

  // 2. POST /api/v1/schools/students — Ingest candidates (manual single candidate or CSV batch)
  {
    id: 'schools.students.post',
    method: 'POST',
    pattern: '/api/v1/schools/students',
    auth: 'student',
    maxBodyBytes: 128 * 1024,
    handler: async (ctx) => {
      const actor = ctx.actor!;
      const dbCtx = ctx.getDb();
      const { data } = await readBoundedJsonBody(ctx.request, { maxBytes: 128 * 1024, allowArrayRoot: true });
      const body = data as any;

      const meta = ((actor.claims as any).user_metadata || {}) as Record<string, any>;
      const metaSchoolCode = (typeof meta.school_code === 'string' ? meta.school_code.trim().toUpperCase() : '') || null;

      // Locate school
      const schoolRows = await dbCtx.sql<Array<{ id: string; code: string }>>`
        SELECT s.id, s.code
        FROM schools s
        WHERE s.admin_id = ${actor.userId}::uuid
           OR EXISTS (SELECT 1 FROM school_members sm WHERE sm.school_id = s.id AND sm.user_id = ${actor.userId}::uuid)
           ${metaSchoolCode ? dbCtx.sql`OR UPPER(s.code) = ${metaSchoolCode}` : dbCtx.sql``}
        LIMIT 1
      `;

      const school = schoolRows[0];
      if (!school) {
        throw new ApiError({
          status: 404,
          code: 'NOT_FOUND',
          message: 'No institutional school record found for your account.',
        });
      }

      const candidates: Array<{
        name: string;
        email: string;
        studentIdentifier?: string | null;
        ingestionMethod?: string;
      }> = Array.isArray(body?.students)
        ? body.students
        : body?.email
        ? [
            {
              name: `${body.firstName || ''} ${body.lastName || ''}`.trim() || body.name || 'Candidate',
              email: body.email,
              studentIdentifier: body.studentIdentifier || null,
              ingestionMethod: body.ingestionMethod || 'manual',
            },
          ]
        : [];

      if (candidates.length === 0) {
        throw new ApiError({
          status: 400,
          code: 'BAD_REQUEST',
          message: 'Please provide at least one candidate with a valid email address.',
        });
      }

      const results = [];

      for (const cand of candidates) {
        const cleanEmail = (cand.email || '').trim().toLowerCase();
        const cleanName = (cand.name || '').trim() || 'Candidate';
        if (!cleanEmail || !cleanEmail.includes('@')) continue;

        // 1. Find or create profile
        let userRows = await dbCtx.sql<Array<{ id: string; display_name: string; email: string }>>`
          SELECT id, display_name, email FROM profiles WHERE LOWER(email) = ${cleanEmail} LIMIT 1
        `;

        let studentUserId = userRows[0]?.id;
        if (!studentUserId) {
          const inserted = await dbCtx.sql<Array<{ id: string }>>`
            INSERT INTO profiles (display_name, email, role)
            VALUES (${cleanName}, ${cleanEmail}, 'student')
            ON CONFLICT (id) DO NOTHING
            RETURNING id
          `;
          studentUserId = inserted[0]?.id;
        }

        if (studentUserId) {
          const method = cand.ingestionMethod || 'manual';
          const insertedStudent = await dbCtx.sql<Array<{ id: string; created_at: string }>>`
            INSERT INTO school_students (school_id, student_user_id, student_identifier, ingestion_method, license_status)
            VALUES (${school.id}::uuid, ${studentUserId}::uuid, ${cand.studentIdentifier || null}, ${method}, 'inactive')
            ON CONFLICT (school_id, student_user_id) DO UPDATE SET
              student_identifier = COALESCE(EXCLUDED.student_identifier, school_students.student_identifier)
            RETURNING id, created_at
          `;

          const parts = cleanName.split(/\s+/);
          const lastName = parts.length > 1 ? parts[parts.length - 1] : parts[0];
          const cleanPass = lastName.toUpperCase();
          const defaultPassword = cleanPass.length >= 6 ? cleanPass : `${cleanPass}123456`.slice(0, 6);

          results.push({
            id: insertedStudent[0]?.id || `ss-${Date.now()}`,
            studentUserId,
            name: cleanName,
            email: cleanEmail,
            studentIdentifier: cand.studentIdentifier || null,
            ingestionMethod: method,
            licenseStatus: 'inactive',
            defaultPassword,
          });
        }
      }

      return {
        status: 200,
        body: {
          success: true,
          count: results.length,
          students: results,
        },
      };
    },
  },
];
