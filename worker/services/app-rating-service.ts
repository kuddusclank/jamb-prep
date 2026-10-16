import type { RouteDefinition } from '../api/router';
import { assertValidUuid, readBoundedJsonBody } from '../api/contracts';
import { ApiError } from '../api/errors';
import { executeTransactionalIdempotentMutation, extractIdempotencyKey } from '../api/idempotency';
import type { SqlTagExecutor } from '../api/db-context';

const invalid = (message: string): never => {
  throw new ApiError({ status: 422, code: 'VALIDATION_FAILED', message });
};

export function parseAppRatingInput(value: Record<string, unknown>): { rating: number; comment: string | null } {
  if (!Number.isInteger(value.rating) || Number(value.rating) < 1 || Number(value.rating) > 5) {
    return invalid('Choose a rating from 1 to 5.');
  }
  if (value.comment !== undefined && value.comment !== null && typeof value.comment !== 'string') {
    return invalid('Feedback must be text.');
  }
  const comment = typeof value.comment === 'string' ? value.comment.trim() : '';
  if (comment.length > 500) return invalid('Feedback must be 500 characters or fewer.');
  return { rating: Number(value.rating), comment: comment || null };
}

export async function getAttemptAppRating(sql: SqlTagExecutor, userId: string, attemptId: string) {
  const rows = await sql<Array<{ mode: string; status: string; has_result: boolean; submitted: boolean }>>`
    SELECT a.mode, a.status, (ar.attempt_id IS NOT NULL) AS has_result,
      EXISTS (SELECT 1 FROM student_app_ratings r WHERE r.attempt_id = a.id) AS submitted
    FROM attempts a
    LEFT JOIN attempt_results ar ON ar.attempt_id = a.id
    WHERE a.id = ${attemptId}::uuid AND a.user_id = ${userId}::uuid
    LIMIT 1
  `;
  const attempt = rows[0];
  if (!attempt) throw new ApiError({ status: 404, code: 'NOT_FOUND', message: 'Exam attempt not found.' });
  return {
    eligible: attempt.mode === 'mock' && attempt.status === 'completed' && attempt.has_result,
    submitted: attempt.submitted,
  };
}

export async function listAdminAppRatings(sql: SqlTagExecutor, page: number, limit: number) {
  const offset = (page - 1) * limit;
  const [summary] = await sql<Array<{ total: number; average_rating: number | null; one_star: number; two_star: number; three_star: number; four_star: number; five_star: number }>>`
    SELECT COUNT(*)::int AS total, ROUND(AVG(rating)::numeric, 2)::float AS average_rating,
      COUNT(*) FILTER (WHERE rating = 1)::int AS one_star,
      COUNT(*) FILTER (WHERE rating = 2)::int AS two_star,
      COUNT(*) FILTER (WHERE rating = 3)::int AS three_star,
      COUNT(*) FILTER (WHERE rating = 4)::int AS four_star,
      COUNT(*) FILTER (WHERE rating = 5)::int AS five_star
    FROM student_app_ratings
  `;
  const ratings = await sql`
    SELECT r.id, r.rating, r.comment, r.created_at, r.attempt_id,
      p.display_name AS student_name, p.email AS student_email
    FROM student_app_ratings r
    JOIN profiles p ON p.id = r.user_id
    ORDER BY r.created_at DESC, r.id DESC
    LIMIT ${limit} OFFSET ${offset}
  `;
  const total = Number(summary?.total ?? 0);
  return {
    summary: {
      total,
      averageRating: summary?.average_rating === null ? null : Number(summary?.average_rating),
      distribution: [
        { rating: 1, count: Number(summary?.one_star ?? 0) },
        { rating: 2, count: Number(summary?.two_star ?? 0) },
        { rating: 3, count: Number(summary?.three_star ?? 0) },
        { rating: 4, count: Number(summary?.four_star ?? 0) },
        { rating: 5, count: Number(summary?.five_star ?? 0) },
      ],
    },
    ratings,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export const APP_RATING_ROUTES: RouteDefinition[] = [
  {
    id: 'exams.attempts.app-rating.get', method: 'GET',
    pattern: '/api/v1/exams/attempts/:attemptId/app-rating', auth: 'student',
    handler: async (ctx) => ({
      status: 200,
      body: await getAttemptAppRating(ctx.getDb().sql, ctx.actor!.userId, assertValidUuid(ctx.params.attemptId, 'attemptId')),
    }),
  },
  {
    id: 'exams.attempts.app-rating.post', method: 'POST',
    pattern: '/api/v1/exams/attempts/:attemptId/app-rating', auth: 'student', idempotency: 'required', maxBodyBytes: 4096,
    handler: async (ctx) => {
      const attemptId = assertValidUuid(ctx.params.attemptId, 'attemptId');
      const { data, rawText } = await readBoundedJsonBody(ctx.request, { maxBytes: 4096 });
      const input = parseAppRatingInput(data);
      const outcome = await executeTransactionalIdempotentMutation({
        db: ctx.getDb(), userId: ctx.actor!.userId,
        operation: `app-rating.${attemptId}`, canonicalPayload: rawText,
        idempotencyKey: extractIdempotencyKey(ctx.request, { required: true })!,
        execute: async (tx) => {
          const [attempt] = await tx<Array<{ id: string }>>`
            SELECT a.id FROM attempts a JOIN attempt_results ar ON ar.attempt_id = a.id
            WHERE a.id = ${attemptId}::uuid AND a.user_id = ${ctx.actor!.userId}::uuid
              AND a.mode = 'mock' AND a.status = 'completed' LIMIT 1
          `;
          if (!attempt) throw new ApiError({ status: 409, code: 'CONFLICT', message: 'Only a completed, graded mock can be rated.' });
          const inserted = await tx<Array<{ id: string }>>`
            INSERT INTO student_app_ratings (user_id, attempt_id, rating, comment)
            VALUES (${ctx.actor!.userId}::uuid, ${attemptId}::uuid, ${input.rating}, ${input.comment})
            ON CONFLICT (attempt_id) DO NOTHING RETURNING id
          `;
          if (inserted.length) return { body: { submitted: true, alreadySubmitted: false } };
          return { body: { submitted: true, alreadySubmitted: true } };
        },
      });
      return { status: 200, body: outcome.body, headers: outcome.headers };
    },
  },
  {
    id: 'admin.app-ratings.get', method: 'GET', pattern: '/api/v1/admin/app-ratings', auth: 'admin',
    handler: async (ctx) => {
      const page = Number(ctx.url.searchParams.get('page') ?? 1);
      const limit = Number(ctx.url.searchParams.get('limit') ?? 20);
      if (!Number.isInteger(page) || page < 1 || page > 10000 || !Number.isInteger(limit) || limit < 1 || limit > 100) {
        return invalid('Choose a valid rating page and page size.');
      }
      return { status: 200, body: await listAdminAppRatings(ctx.getDb().sql, page, limit) };
    },
  },
];
