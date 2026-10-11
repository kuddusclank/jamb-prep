/**
 * Benchmarking Handlers for All Six Spike Scenarios (T01)
 *
 * Requirements (F1, F3, F4, F6):
 * - Fail-closed preview secret protection: x-spike-secret required; no fallback secret.
 * - Dedicated test subject verification (claims.sub === SPIKE_TEST_SUBJECT_ID).
 * - All five student scenarios authenticated with bearer JWT.
 * - Streamed byte bounds (128 KB) cancelling streams before allocating excess memory.
 * - Raw-bytes SHA-512 HMAC verification over original Uint8Array bytes.
 * - Authoritative answer validation (active state, ownership, server deadline,
 *   question/option membership, monotonic revision acknowledgement).
 * - Authoritative server-stored scoring to 400 points.
 * - Generic safe errors; zero leaking of tokens, secrets, or internal errors.
 */

import { verifySupabaseJwt, VerifyJwtOptions, readBoundedStream } from './auth';
import { SpikeDatabaseClient, SpikeEnv, BENCHMARK_SCHEMA_PATTERN } from './db';
import {
  SPIKE_TEST_SUBJECT_ID,
  SPIKE_TEST_ATTEMPT_ID,
  SYNTHETIC_HMAC_SECRET,
} from './fixtures/mock-data';

export const MAX_BODY_BYTES = 128 * 1024; // 128 KB

/**
 * Standard JSON response helper
 */
export function jsonResponse(
  data: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      ...extraHeaders,
    },
  });
}

/** Attempt identifiers are UUIDs; anything else is rejected generically before database access. */
export const ATTEMPT_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * JSON response for a body already serialized by trusted, validated code paths.
 */
export function rawJsonResponse(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}

/**
 * Constant-time string equality check to prevent timing attacks
 */
export function timingSafeEqualString(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Compute raw-bytes HMAC SHA-512 hex signature via Web Crypto (F6)
 */
export async function computeHmacSha512HexFromBytes(
  secret: string,
  bytes: Uint8Array
): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: { name: 'SHA-512' } },
    false,
    ['sign']
  );
  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    bytes as unknown as BufferSource
  );
  const hexArray = Array.from(new Uint8Array(signatureBuffer)).map((b) =>
    b.toString(16).padStart(2, '0')
  );
  return hexArray.join('');
}

/**
 * Backward compatibility helper for strings
 */
export async function computeHmacSha512Hex(secret: string, text: string): Promise<string> {
  return computeHmacSha512HexFromBytes(secret, new TextEncoder().encode(text));
}

/**
 * Streamed reader enforcing exact max-bytes ceiling (F6)
 */
export async function readBoundedBodyBytes(
  request: Request,
  maxBytes = MAX_BODY_BYTES
): Promise<Uint8Array> {
  const contentLength = request.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > maxBytes) {
    throw new Error('PAYLOAD_TOO_LARGE');
  }
  return await readBoundedStream(request.body, maxBytes);
}

/**
 * Verify preview spike secret header (F1: Fail-closed; no default secret fallback)
 */
export function verifySpikeSecret(request: Request, env: SpikeEnv): boolean {
  const headerSecret = request.headers.get('x-spike-secret');
  if (!env.SPIKE_SECRET || env.SPIKE_SECRET.trim().length === 0) {
    return false;
  }
  if (!headerSecret) {
    return false;
  }
  return timingSafeEqualString(headerSecret, env.SPIKE_SECRET);
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Extract and verify bearer JWT and check dedicated test subject (R2, R3)
 */
export async function authenticateStudent(
  request: Request,
  env: SpikeEnv,
  jwtOptionsOverrides?: Partial<VerifyJwtOptions>
): Promise<{ success: boolean; userId?: string; error?: string }> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { success: false, error: 'MISSING_BEARER_TOKEN' };
  }

  const token = authHeader.slice(7).trim();
  const supabaseUrl = env.SUPABASE_URL || 'https://bqumnaoiiukifvanoonm.supabase.co';

  const result = await verifySupabaseJwt(token, {
    supabaseUrl,
    ...jwtOptionsOverrides,
  });

  if (!result.valid || !result.claims) {
    return { success: false, error: result.error || 'INVALID_TOKEN' };
  }

  // Enforce configured dedicated test subject without fictional fallbacks (R2)
  const expectedSubject = env.SPIKE_TEST_SUBJECT_ID;
  if (!expectedSubject || !UUID_REGEX.test(expectedSubject)) {
    return { success: false, error: 'SPIKE_CONFIGURATION_UNAVAILABLE' };
  }
  if (result.claims.sub !== expectedSubject) {
    return { success: false, error: 'FORBIDDEN_SUBJECT_MISMATCH' };
  }

  return { success: true, userId: result.claims.sub };
}

/**
 * Route Dispatcher for Feasibility Spike Endpoints
 * Refactored (R3): Accepts lazy database client getter. DB allocation is deferred
 * until AFTER student JWT authentication passes; auth/HMAC-only scenarios never allocate a DB client.
 */
export async function handleSpikeRoutes(
  request: Request,
  env: SpikeEnv,
  dbOrGetter: SpikeDatabaseClient | (() => SpikeDatabaseClient),
  jwtOptionsOverrides?: Partial<VerifyJwtOptions>
): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method.toUpperCase();

  // 1. Enforce Preview Secret on all spike endpoints
  if (!verifySpikeSecret(request, env)) {
    return jsonResponse({ error: 'UNAUTHORIZED_SPIKE' }, 401);
  }

  let resolvedDb: SpikeDatabaseClient | null = null;
  function getDb(): SpikeDatabaseClient {
    if (resolvedDb) return resolvedDb;
    if (typeof dbOrGetter === 'function') {
      resolvedDb = dbOrGetter();
    } else {
      resolvedDb = dbOrGetter;
    }
    return resolvedDb;
  }

  try {
    const benchmarkSchemaRaw = request.headers.get('x-spike-benchmark-schema') || undefined;
    let benchmarkSchema: string | undefined;
    if (benchmarkSchemaRaw) {
      if (!BENCHMARK_SCHEMA_PATTERN.test(benchmarkSchemaRaw)) {
        return jsonResponse({ error: 'INVALID_BENCHMARK_SCHEMA' }, 400);
      }
      benchmarkSchema = benchmarkSchemaRaw;
    }

    if (path === '/api/spike/db-probe' && method === 'GET') {
      const auth = await authenticateStudent(request, env, jwtOptionsOverrides);
      if (!auth.success) return jsonResponse({error: 'UNAUTHORIZED_PROBE'}, 401);
      try {
        const db = getDb();
        if (!db.connectionProbe) return jsonResponse({error: 'PROBE_UNAVAILABLE'}, 503);
        return jsonResponse({success: true, ...(await db.connectionProbe()), interpretation: 'First query includes connection acquisition; second reuses the client. Neither isolates TCP/TLS handshake or server execution alone.'});
      } catch (error) {
        const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
        const allowed = ['CONNECTION_CLOSED', 'CONNECT_TIMEOUT', 'CONNECTION_DESTROYED', 'CONNECTION_ENDED'];
        return jsonResponse({error: 'DATABASE_PROBE_FAILED', category: allowed.includes(code) ? code : 'DATABASE_ERROR'}, 503);
      }
    }

    // -------------------------------------------------------------
    // Scenario 1: POST /api/spike/auth-jwt
    // Web Crypto verification of signed Supabase JWT + claims validation
    // Zero DB client creation needed (R3)
    // -------------------------------------------------------------
    if (path === '/api/spike/auth-jwt' && method === 'POST') {
      const auth = await authenticateStudent(request, env, jwtOptionsOverrides);
      if (!auth.success || !auth.userId) {
        return jsonResponse(
          { error: auth.error },
          auth.error === 'SPIKE_CONFIGURATION_UNAVAILABLE'
            ? 503
            : auth.error === 'FORBIDDEN_SUBJECT_MISMATCH'
            ? 403
            : 401
        );
      }
      return jsonResponse({
        success: true,
        userId: auth.userId,
      });
    }

    // -------------------------------------------------------------
    // Scenario 2: GET /api/spike/db-read
    // Authenticated Hyperdrive read (profile + entitlement)
    // -------------------------------------------------------------
    if (path === '/api/spike/db-read' && method === 'GET') {
      const auth = await authenticateStudent(request, env, jwtOptionsOverrides);
      if (!auth.success || !auth.userId) {
        return jsonResponse(
          { error: auth.error },
          auth.error === 'SPIKE_CONFIGURATION_UNAVAILABLE'
            ? 503
            : auth.error === 'FORBIDDEN_SUBJECT_MISMATCH'
            ? 403
            : 401
        );
      }

      let db: SpikeDatabaseClient;
      try {
        db = getDb();
      } catch {
        return jsonResponse({ error: 'DATABASE_CONNECTION_UNAVAILABLE' }, 503);
      }

      const data = await db.getProfileAndEntitlement(auth.userId, benchmarkSchema);
      return jsonResponse({
        success: true,
        isMock: db.isMock,
        profile: data.profile,
        entitlement: data.entitlement,
        timings: db.lastTimings ?? null,
      });
    }

    // -------------------------------------------------------------
    // Scenario 3: POST /api/spike/answer-write
    // Timely answer write validation (ownership, deadline, SQL upsert rollback)
    // -------------------------------------------------------------
    if (path === '/api/spike/answer-write' && method === 'POST') {
      const auth = await authenticateStudent(request, env, jwtOptionsOverrides);
      if (!auth.success || !auth.userId) {
        return jsonResponse(
          { error: auth.error },
          auth.error === 'SPIKE_CONFIGURATION_UNAVAILABLE'
            ? 503
            : auth.error === 'FORBIDDEN_SUBJECT_MISMATCH'
            ? 403
            : 401
        );
      }

      const bodyBytes = await readBoundedBodyBytes(request);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let payload: any;

      try {
        payload = JSON.parse(new TextDecoder().decode(bodyBytes));
      } catch {
        return jsonResponse({ error: 'INVALID_JSON_BODY' }, 400);
      }

      if (
        !payload ||
        typeof payload !== 'object' ||
        !payload.attemptId ||
        typeof payload.attemptId !== 'string' ||
        !payload.questionId ||
        typeof payload.questionId !== 'string' ||
        !payload.selectedOptionId ||
        typeof payload.selectedOptionId !== 'string'
      ) {
        return jsonResponse({ error: 'MISSING_OR_INVALID_REQUIRED_FIELDS' }, 400);
      }

      const revision = payload.revision !== undefined ? payload.revision : 1;
      if (!Number.isSafeInteger(revision) || revision <= 0) {
        return jsonResponse({ error: 'INVALID_REVISION_NUMBER' }, 400);
      }

      let db: SpikeDatabaseClient;
      try {
        db = getDb();
      } catch {
        return jsonResponse({ error: 'DATABASE_CONNECTION_UNAVAILABLE' }, 503);
      }

      // Authoritative server receipt time (F3)
      const serverReceivedAt = new Date().toISOString();

      try {
        const result = await db.upsertAnswerInRollback({
          attemptId: payload.attemptId,
          userId: auth.userId,
          questionId: payload.questionId,
          selectedOptionId: payload.selectedOptionId,
          revision,
          serverReceivedAt,
          benchmarkSchema,
        });

        return jsonResponse({
          success: result.success,
          isMock: db.isMock,
          serverReceivedAt,
          ackRevision: result.ackRevision,
          rolledBack: result.rolledBack,
          timings: db.lastTimings ?? null,
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg === 'ATTEMPT_NOT_FOUND_OR_FORBIDDEN') {
          return jsonResponse({ error: 'ATTEMPT_NOT_FOUND_OR_FORBIDDEN' }, 403);
        }
        if (
          msg === 'ATTEMPT_ALREADY_COMPLETED' ||
          msg === 'ATTEMPT_DEADLINE_EXCEEDED' ||
          msg === 'QUESTION_NOT_IN_ATTEMPT' ||
          msg === 'OPTION_NOT_IN_QUESTION' ||
          msg === 'STALE_REVISION_REJECTED' ||
          msg === 'INVALID_REVISION_NUMBER'
        ) {
          return jsonResponse({ error: msg }, 400);
        }
        return jsonResponse({ error: 'WRITE_VALIDATION_FAILED' }, 500);
      }
    }

    // -------------------------------------------------------------
    // Scenario 4: GET /api/spike/mock-payload
    // Full 180-question payload serialization with ZERO answer-key leakage (F1, F4)
    // -------------------------------------------------------------
    if (path === '/api/spike/mock-payload' && method === 'GET') {
      const auth = await authenticateStudent(request, env, jwtOptionsOverrides);
      if (!auth.success || !auth.userId) {
        return jsonResponse(
          { error: auth.error },
          auth.error === 'SPIKE_CONFIGURATION_UNAVAILABLE'
            ? 503
            : auth.error === 'FORBIDDEN_SUBJECT_MISMATCH'
            ? 403
            : 401
        );
      }

      const attemptId = url.searchParams.get('attemptId') || SPIKE_TEST_ATTEMPT_ID;
      if (!ATTEMPT_ID_PATTERN.test(attemptId)) {
        return jsonResponse({ error: 'ATTEMPT_NOT_FOUND_OR_FORBIDDEN' }, 403);
      }

      let db: SpikeDatabaseClient;
      try {
        db = getDb();
      } catch {
        return jsonResponse({ error: 'DATABASE_CONNECTION_UNAVAILABLE' }, 503);
      }

      try {
        // T02 aggregation comparison: questionsJson is SQL-built from an explicit field allowlist and
        // guarded by assertSafePayloadJson (array framing, size, forbidden answer-key fields).
        // It is embedded verbatim to avoid parse/re-serialize cost.
        const payload = await db.getAttemptPayloadJson(attemptId, auth.userId, benchmarkSchema);
        const body =
          '{"success":true,"attemptId":' + JSON.stringify(payload.attemptId) +
          ',"totalQuestions":' + String(payload.totalQuestions) +
          ',"questions":' + payload.questionsJson +
          ',"timings":' + JSON.stringify(db.lastTimings ?? null) + '}';
        return rawJsonResponse(body);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg === 'ATTEMPT_NOT_FOUND_OR_FORBIDDEN') {
          return jsonResponse({ error: 'ATTEMPT_NOT_FOUND_OR_FORBIDDEN' }, 403);
        }
        return jsonResponse({ error: 'INTERNAL_SERVER_ERROR' }, 500);
      }
    }

    // -------------------------------------------------------------
    // Scenario 5: POST /api/spike/mock-score
    // Authoritative server scoring transaction evaluating stored answers to 400 pts (F4)
    // -------------------------------------------------------------
    if (path === '/api/spike/mock-score' && method === 'POST') {
      const auth = await authenticateStudent(request, env, jwtOptionsOverrides);
      if (!auth.success || !auth.userId) {
        return jsonResponse(
          { error: auth.error },
          auth.error === 'SPIKE_CONFIGURATION_UNAVAILABLE'
            ? 503
            : auth.error === 'FORBIDDEN_SUBJECT_MISMATCH'
            ? 403
            : 401
        );
      }

      const bodyBytes = await readBoundedBodyBytes(request);
      let attemptId = SPIKE_TEST_ATTEMPT_ID;

      if (bodyBytes.length > 0) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const parsed: any = JSON.parse(new TextDecoder().decode(bodyBytes));
          if (parsed && typeof parsed.attemptId === 'string') {
            attemptId = parsed.attemptId;
          }
        } catch {
          return jsonResponse({ error: 'INVALID_JSON_BODY' }, 400);
        }
      }

      if (!ATTEMPT_ID_PATTERN.test(attemptId)) {
        return jsonResponse({ error: 'ATTEMPT_NOT_FOUND_OR_FORBIDDEN' }, 403);
      }

      let db: SpikeDatabaseClient;
      try {
        db = getDb();
      } catch {
        return jsonResponse({ error: 'DATABASE_CONNECTION_UNAVAILABLE' }, 503);
      }

      try {
        const scoreResult = await db.scoreAttemptInRollback({
          attemptId,
          userId: auth.userId,
          serverSubmittedAt: new Date().toISOString(),
          benchmarkSchema,
        });

        return jsonResponse({
          success: true,
          attemptId,
          totalScore: scoreResult.totalScore,
          subjectScores: scoreResult.subjectScores,
          totalCorrect: scoreResult.totalCorrect,
          totalAnsweredTimely: scoreResult.totalAnsweredTimely,
          rolledBack: scoreResult.rolledBack,
          timings: db.lastTimings ?? null,
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg === 'ATTEMPT_NOT_FOUND_OR_FORBIDDEN') {
          return jsonResponse({ error: 'ATTEMPT_NOT_FOUND_OR_FORBIDDEN' }, 403);
        }
        if (msg === 'ATTEMPT_ALREADY_COMPLETED') {
          return jsonResponse({ error: 'ATTEMPT_ALREADY_COMPLETED' }, 400);
        }
        return jsonResponse({ error: 'INTERNAL_SERVER_ERROR' }, 500);
      }
    }

    // -------------------------------------------------------------
    // Scenario 6: POST /api/spike/webhook-hmac
    // Raw-bytes SHA-512 HMAC signature verification with synthetic test key (F6)
    // -------------------------------------------------------------
    if (path === '/api/spike/webhook-hmac' && method === 'POST') {
      const signatureHeader = request.headers.get('x-paystack-signature');
      if (!signatureHeader) {
        return jsonResponse({ error: 'MISSING_SIGNATURE_HEADER' }, 400);
      }

      const rawBytes = await readBoundedBodyBytes(request);
      if (rawBytes.length === 0) {
        return jsonResponse({ error: 'EMPTY_WEBHOOK_BODY' }, 400);
      }

      const secret = env.SYNTHETIC_HMAC_SECRET || SYNTHETIC_HMAC_SECRET;
      const expectedSignature = await computeHmacSha512HexFromBytes(secret, rawBytes);

      if (!timingSafeEqualString(signatureHeader.toLowerCase(), expectedSignature.toLowerCase())) {
        return jsonResponse({ error: 'INVALID_WEBHOOK_SIGNATURE' }, 400);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let eventData: any = {};
      try {
        eventData = JSON.parse(new TextDecoder().decode(rawBytes));
      } catch {
        return jsonResponse({ error: 'INVALID_JSON_BODY' }, 400);
      }

      return jsonResponse({
        success: true,
        event: eventData.event,
        reference: eventData.data?.reference,
      });
    }

    return jsonResponse({ error: 'NOT_FOUND' }, 404);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === 'PAYLOAD_TOO_LARGE') {
      return jsonResponse({ error: 'PAYLOAD_TOO_LARGE' }, 413);
    }
    // Return generic error; prevent stack trace or credential leakage
    return jsonResponse({ error: 'INTERNAL_SERVER_ERROR' }, 500);
  }
}
