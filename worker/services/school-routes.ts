import type { RouteDefinition } from '../api/router';
import { readBoundedJsonBody } from '../api/contracts';
import { ApiError } from '../api/errors';
import { paystackRequest, validateCheckoutUrl, type PaymentEnv } from './paystack-service';
import { enqueueCohortActivation, processActivationBatch } from './school-activation-service';

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

      // 4. Query all enrolled students from school_students left-joined with profiles + practice & mock progress
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
        mock_avg_score: number | null;
        practice_accuracy: number | null;
        total_practice_questions: number | null;
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
          p.email,
          (SELECT round(avg(ar.total_score)) FROM attempt_results ar WHERE ar.user_id = ss.student_user_id) as mock_avg_score,
          (SELECT round(avg(m.accuracy_percent)) FROM student_topic_mastery m WHERE m.user_id = ss.student_user_id) as practice_accuracy,
          (SELECT sum(m.total_attempted) FROM student_topic_mastery m WHERE m.user_id = ss.student_user_id) as total_practice_questions
        FROM school_students ss
        LEFT JOIN profiles p ON ss.student_user_id = p.id
        WHERE ss.school_id = ${school.id}::uuid
        ORDER BY ss.created_at DESC
      `;

      const formatted = enrolledRows.map((row) => {
        const isSelfRegistered = row.ingestion_method === 'link';
        let defaultPassword: string | null = null;

        if (!isSelfRegistered) {
          const parts = (row.name || '').trim().split(/\s+/);
          const lastName = parts.length > 1 ? parts[parts.length - 1] : parts[0] || '';
          defaultPassword = lastName.toUpperCase();
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
          const lastName = parts.length > 1 ? parts[parts.length - 1] : parts[0] || '';
          const defaultPassword = method === 'link' ? null : lastName.toUpperCase();

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

  // 3. POST /api/v1/schools/students/drilldown — Individual candidate diagnostic drilldown
  {
    id: 'schools.students.drilldown',
    method: 'POST',
    pattern: '/api/v1/schools/students/drilldown',
    auth: 'public',
    maxBodyBytes: 32 * 1024,
    handler: async (ctx) => {
      const dbCtx = ctx.getDb();
      const { data } = await readBoundedJsonBody(ctx.request, { maxBytes: 32 * 1024 });
      const studentId = (typeof (data as any)?.studentId === 'string' ? (data as any).studentId.trim() : '') || null;

      if (!studentId) {
        throw new ApiError({
          status: 400,
          code: 'BAD_REQUEST',
          message: 'Student ID is required.',
        });
      }

      // 1. Resolve student and profile
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
          ss.license_status,
          p.display_name AS name,
          p.email
        FROM school_students ss
        LEFT JOIN profiles p ON ss.student_user_id = p.id
        WHERE ss.id = ${studentId}::uuid OR ss.student_user_id = ${studentId}::uuid OR p.id = ${studentId}::uuid
        LIMIT 1
      `;

      const student = studentRows[0] || null;
      const targetUserId = student?.student_user_id || (studentId.length === 36 ? studentId : null);

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

      let rawMocks: Array<{
        total_score: number;
        english_score: number;
        subject2_score: number;
        subject3_score: number;
        subject4_score: number;
        time_spent_seconds: number;
        topic_breakdown: any;
        created_at: string;
      }> = [];

      if (targetUserId) {
        // Fetch practice mastery and stats
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

        // Fetch mock results
        rawMocks = await dbCtx.sql<Array<{
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

          // Weak & strong topics from latest mock breakdown
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

        // Mock history list
        mockHistory = rawMocks.map((m, idx) => ({
          date: new Date(m.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
          examName: `UTME Standard CBT Simulation #${rawMocks.length - idx}`,
          score: m.total_score,
          timeSpent: `${Math.round(m.time_spent_seconds / 60)} mins`,
        }));
      }

      const latest = rawMocks[0] || null;

      const drilldown = {
        studentId,
        name: student?.name || 'Candidate',
        email: student?.email || '',
        studentIdentifier: student?.student_identifier || null,
        licenseStatus: student?.license_status || 'inactive',
        subjects: [
          {
            name: 'Use of English',
            code: 'ENG',
            score: latest ? latest.english_score : null,
            maxScore: 100,
            accuracy: latest && typeof latest.english_score === 'number' ? `${latest.english_score}%` : '—',
            status: latest ? 'completed' : 'unattempted',
          },
          {
            name: 'Mathematics',
            code: 'MTH',
            score: latest ? latest.subject2_score : null,
            maxScore: 100,
            accuracy: latest && typeof latest.subject2_score === 'number' ? `${latest.subject2_score}%` : '—',
            status: latest ? 'completed' : 'unattempted',
          },
          {
            name: 'Physics',
            code: 'PHY',
            score: latest ? latest.subject3_score : null,
            maxScore: 100,
            accuracy: latest && typeof latest.subject3_score === 'number' ? `${latest.subject3_score}%` : '—',
            status: latest ? 'completed' : 'unattempted',
          },
          {
            name: 'Chemistry',
            code: 'CHM',
            score: latest ? latest.subject4_score : null,
            maxScore: 100,
            accuracy: latest && typeof latest.subject4_score === 'number' ? `${latest.subject4_score}%` : '—',
            status: latest ? 'completed' : 'unattempted',
          },
        ],
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

  // 4. POST /api/v1/schools/diagnostics/summary — Cohort syllabus diagnostics
  {
    id: 'schools.diagnostics.summary',
    method: 'POST',
    pattern: '/api/v1/schools/diagnostics/summary',
    auth: 'public',
    maxBodyBytes: 32 * 1024,
    handler: async (ctx) => {
      const dbCtx = ctx.getDb();

      const topicRows = await dbCtx.sql<Array<{
        id: string;
        subject: string;
        topic: string;
        total_attempted: string;
        total_correct: string;
        accuracy_rate: string;
      }>>`
        SELECT
          t.id,
          s.code as subject,
          t.title as topic,
          sum(m.total_attempted) as total_attempted,
          sum(m.total_correct) as total_correct,
          round((sum(m.total_correct)::float / nullif(sum(m.total_attempted), 0)::float) * 100) as accuracy_rate
        FROM student_topic_mastery m
        JOIN topics t ON m.topic_id = t.id
        JOIN subjects s ON m.subject_id = s.id
        GROUP BY t.id, s.code, t.title
        HAVING sum(m.total_attempted) > 0
        ORDER BY accuracy_rate ASC, total_attempted DESC
        LIMIT 50
      `;

      const diagnosticTopics = topicRows.map((r) => {
        const rate = Number(r.accuracy_rate) || 0;
        let status: 'urgent_remedial' | 'revision_recommended' | 'exam_ready' = 'revision_recommended';
        let recommendedAction = 'Schedule group tutorial and past-question drill.';

        if (rate < 50) {
          status = 'urgent_remedial';
          recommendedAction = 'Critical gap: Re-teach core syllabus principles before next mock.';
        } else if (rate >= 70) {
          status = 'exam_ready';
          recommendedAction = 'Mastered topic: Candidate retention is on track for UTME.';
        }

        return {
          id: r.id,
          subject: r.subject,
          topic: r.topic,
          accuracyRate: rate,
          questionsAttempted: Number(r.total_attempted) || 0,
          status,
          recommendedAction,
        };
      });

      const revisionTimetable = diagnosticTopics
        .filter((t) => t.status === 'urgent_remedial')
        .slice(0, 5)
        .map((t, i) => {
          const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
          return {
            day: days[i % days.length],
            subject: t.subject,
            topic: t.topic,
            priority: 'High',
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

  // 5. POST /api/v1/schools/mocks/schedule — Schedule school CBT lab mock test
  {
    id: 'schools.mocks.schedule',
    method: 'POST',
    pattern: '/api/v1/schools/mocks/schedule',
    auth: 'public',
    maxBodyBytes: 32 * 1024,
    handler: async (ctx) => {
      const { data } = await readBoundedJsonBody(ctx.request, { maxBytes: 32 * 1024 });
      const body = (data || {}) as Record<string, any>;

      const title = (typeof body.title === 'string' ? body.title.trim() : '') || 'Term UTME Mock Examination';
      const scheduledDate = (typeof body.scheduledDate === 'string' ? body.scheduledDate.trim() : '') || new Date().toISOString();
      const durationMinutes = Number(body.durationMinutes) || 120;
      const totalQuestions = Number(body.totalQuestions) || 180;
      const hotkeyNavigationEnabled = body.hotkeyNavigationEnabled ?? true;

      const randomSuffix = Math.random().toString(36).slice(-4).toUpperCase();
      const labSessionCode = `LAB-SCH-${randomSuffix}`;

      const session = {
        id: `mock-sess-${Date.now()}`,
        title,
        labSessionCode,
        scheduledDate,
        durationMinutes,
        totalQuestions,
        hotkeyNavigationEnabled,
        proctorKey: `PRC-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        status: 'scheduled',
        createdAt: new Date().toISOString(),
      };

      return {
        status: 200,
        body: {
          success: true,
          session,
        },
      };
    },
  },

  // 6. POST /api/v1/schools/checkout/initialize — Initialize Paystack checkout for school cohort
  {
    id: 'schools.checkout.initialize',
    method: 'POST',
    pattern: '/api/v1/schools/checkout/initialize',
    auth: 'student',
    maxBodyBytes: 32 * 1024,
    handler: async (ctx) => {
      const actor = ctx.actor!;
      const dbCtx = ctx.getDb();
      const { data } = await readBoundedJsonBody(ctx.request, { maxBytes: 32 * 1024 });
      const body = (data || {}) as Record<string, any>;

      const studentCount = Number(body.studentCount);
      const durationMonths = Number(body.durationMonths || 3);
      const studentIds = Array.isArray(body.studentIds) ? body.studentIds : [];

      if (!Number.isInteger(studentCount) || studentCount < 1) {
        throw new ApiError({ status: 400, code: 'VALIDATION_FAILED', message: 'Student count must be at least 1.' });
      }
      if (!Number.isInteger(durationMonths) || durationMonths < 1 || durationMonths > 12) {
        throw new ApiError({ status: 400, code: 'VALIDATION_FAILED', message: 'Duration must be between 1 and 12 calendar months.' });
      }

      // Locate School record
      const meta = ((actor.claims as any).user_metadata || {}) as Record<string, any>;
      const metaSchoolCode = (typeof meta.school_code === 'string' ? meta.school_code.trim().toUpperCase() : '') || null;

      const schoolRows = await dbCtx.sql<Array<{ id: string; name: string; code: string }>>`
        SELECT s.id, s.name, s.code
        FROM schools s
        WHERE s.admin_id = ${actor.userId}::uuid
           OR EXISTS (SELECT 1 FROM school_members sm WHERE sm.school_id = s.id AND sm.user_id = ${actor.userId}::uuid)
           ${metaSchoolCode ? dbCtx.sql`OR UPPER(s.code) = ${metaSchoolCode}` : dbCtx.sql``}
        LIMIT 1
      `;

      if (!schoolRows[0]) {
        throw new ApiError({ status: 404, code: 'NOT_FOUND', message: 'No school partnership found for your account.' });
      }

      const school = schoolRows[0];
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
          })}::jsonb
        )
      `;

      const env = ctx.env as any;
      const paystackSecret = env.PAYSTACK_SECRET_KEY?.trim() || '';
      const appOrigin = env.PUBLIC_APP_ORIGIN || 'https://jambprep.pages.dev';
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
          // Fall through to callback URL if gateway call fails
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

  // 7. POST /api/v1/schools/checkout/verify — Verify Paystack settlement & execute batch activation
  {
    id: 'schools.checkout.verify',
    method: 'POST',
    pattern: '/api/v1/schools/checkout/verify',
    auth: 'student',
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

      // Resolve school metadata
      const schoolRows = await dbCtx.sql<Array<{ id: string; name: string; code: string }>>`
        SELECT id, name, code FROM schools WHERE id = ${order.school_id}::uuid LIMIT 1
      `;
      const school = schoolRows[0] || { id: order.school_id, name: 'Partner School', code: 'SCH-0000' };

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

      // Verify on Paystack Gateway if key is configured
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
            throw new ApiError({ status: 400, code: 'PAYMENT_FAILED', message: 'Payment has not been confirmed by Paystack.' });
          }

          const paidAmount = Number(verifyData.amount);
          if (paidAmount < order.total_amount_kobo) {
            throw new ApiError({ status: 400, code: 'BAD_REQUEST', message: 'Paid amount does not match invoice.' });
          }
        } catch (verifyErr) {
          if (verifyErr instanceof ApiError) throw verifyErr;
          console.warn('Gateway verification fallback notice:', verifyErr);
        }
      }

      // 1. Enqueue activation jobs into school_activation_jobs
      const metadata = order.metadata || {};
      const targetedIds = Array.isArray(metadata.studentIds) ? metadata.studentIds : [];

      await enqueueCohortActivation(dbCtx, {
        orderId: order.id,
        schoolId: order.school_id,
        durationMonths: order.duration_months,
        studentCount: order.student_count,
        targetedIds,
      });

      // 2. Process batch of activation jobs (50 students per chunk)
      const progress = await processActivationBatch(dbCtx, order.id, 50);

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

  // 8. POST /api/v1/schools/checkout/webhook — Paystack Webhook Handler with HMAC verification
  {
    id: 'schools.checkout.webhook',
    method: 'POST',
    pattern: '/api/v1/schools/checkout/webhook',
    auth: 'public',
    maxBodyBytes: 64 * 1024,
    handler: async (ctx) => {
      const dbCtx = ctx.getDb();
      const env = ctx.env as any;
      const paystackSecret = env.PAYSTACK_SECRET_KEY?.trim() || '';

      const rawBody = await ctx.request.text();
      const signature = ctx.request.headers.get('x-paystack-signature');

      // Verify HMAC-SHA512 signature
      if (paystackSecret) {
        const isValid = await verifyPaystackHmacSignature(rawBody, signature, paystackSecret);
        if (!isValid) {
          throw new ApiError({ status: 401, code: 'UNAUTHORIZED', message: 'Invalid webhook signature.' });
        }
      }

      let payload: Record<string, any> = {};
      try {
        payload = JSON.parse(rawBody);
      } catch {
        throw new ApiError({ status: 400, code: 'MALFORMED_JSON', message: 'Invalid JSON payload.' });
      }

      if (payload.event === 'charge.success') {
        const data = payload.data || {};
        const reference = data.reference;

        if (reference && typeof reference === 'string') {
          const orderRows = await dbCtx.sql<Array<{
            id: string;
            school_id: string;
            duration_months: number;
            student_count: number;
            status: string;
            metadata: any;
          }>>`
            SELECT id, school_id, duration_months, student_count, status, metadata
            FROM school_orders
            WHERE reference = ${reference}
            LIMIT 1
          `;

          if (orderRows[0] && orderRows[0].status !== 'completed') {
            const order = orderRows[0];
            const metadata = order.metadata || {};
            const targetedIds = Array.isArray(metadata.studentIds) ? metadata.studentIds : [];

            // Enqueue activation jobs
            await enqueueCohortActivation(dbCtx, {
              orderId: order.id,
              schoolId: order.school_id,
              durationMonths: order.duration_months,
              studentCount: order.student_count,
              targetedIds,
            });

            // Process activation chunk
            await processActivationBatch(dbCtx, order.id, 50);
          }
        }
      }

      return {
        status: 200,
        body: { received: true },
      };
    },
  },
];
