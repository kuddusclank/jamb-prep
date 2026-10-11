/**
 * Persistent & Transactional Idempotency Foundation (T03 / Plan Section 5.8)
 *
 * Enforces:
 * - Scoped to (user_id, operation, idempotency_key) with Web Crypto SHA-256 request_hash.
 * - Concurrent in-flight request with same key -> 409 IDEMPOTENCY_CONFLICT_IN_PROGRESS.
 * - Reused key with different payload hash -> 422 IDEMPOTENCY_KEY_PAYLOAD_MISMATCH.
 * - Completed request with matching payload hash -> replays stored status and body with Idempotent-Replayed: true.
 * - Aborted/failed mutation -> never persists completed state; releases pending claim so legitimate retries succeed.
 */

import { RequestDbContext, SqlTagExecutor } from './db-context';
import { ApiError, ApiHttpStatus } from './errors';

const IDEMPOTENCY_KEY_REGEX = /^[A-Za-z0-9_.:-]{8,128}$/;
export const DEFAULT_IDEMPOTENCY_TTL_SECONDS = 24 * 60 * 60; // 24 hours

export type IdempotencyRecordStatus = 'pending' | 'completed';

export interface IdempotencyRecord {
  userId: string;
  operation: string;
  idempotencyKey: string;
  requestHash: string;
  status: IdempotencyRecordStatus;
  responseStatus: ApiHttpStatus | null;
  responseBody: unknown;
  createdAt: string;
  expiresAt: string;
}

export type IdempotencyClaimOutcome =
  | { kind: 'acquired' }
  | { kind: 'replayed'; responseStatus: ApiHttpStatus; responseBody: unknown }
  | { kind: 'conflict_pending' }
  | { kind: 'hash_mismatch' };

export interface IdempotencyStore {
  claimOrLookup(params: {
    userId: string;
    operation: string;
    idempotencyKey: string;
    requestHash: string;
    nowIso?: string;
    ttlSeconds?: number;
  }): Promise<IdempotencyClaimOutcome>;

  markCompleted(params: {
    userId: string;
    operation: string;
    idempotencyKey: string;
    requestHash: string;
    responseStatus: ApiHttpStatus;
    responseBody: unknown;
  }): Promise<void>;

  releasePending(params: {
    userId: string;
    operation: string;
    idempotencyKey: string;
    requestHash: string;
  }): Promise<void>;
}

/**
 * Extracts and validates the Idempotency-Key header.
 */
export function extractIdempotencyKey(
  request: Request,
  options?: { required?: boolean }
): string | null {
  const raw = request.headers.get('idempotency-key');
  if (raw === null || raw.trim().length === 0) {
    if (options?.required) {
      throw new ApiError({
        status: 400,
        code: 'MISSING_IDEMPOTENCY_KEY',
        message: 'Idempotency-Key header is required for this mutation.',
      });
    }
    return null;
  }

  const trimmed = raw.trim();
  if (!IDEMPOTENCY_KEY_REGEX.test(trimmed)) {
    throw new ApiError({
      status: 400,
      code: 'INVALID_IDEMPOTENCY_KEY',
      message: 'Idempotency-Key must be 8 to 128 characters using letters, digits, or _ . : -.',
    });
  }

  return trimmed;
}

/**
 * Computes a deterministic SHA-256 hex digest over the operation name and canonical request payload.
 */
export async function computeRequestHash(
  operation: string,
  canonicalPayload: string
): Promise<string> {
  const input = `${operation}:${canonicalPayload}`;
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const hashBytes = new Uint8Array(digest);
  let hex = '';
  for (let i = 0; i < hashBytes.length; i++) {
    hex += hashBytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

/**
 * Maps missing database table/column/constraint errors (e.g. when `api_idempotency_keys`
 * has not yet been provisioned in PostgreSQL) to a fail-closed 503 SERVICE_UNAVAILABLE ApiError.
 */
function rethrowIdempotencyPrerequisiteError(err: unknown): never {
  if (err instanceof ApiError) {
    throw err;
  }
  const code =
    err && typeof err === 'object' && 'code' in err
      ? String((err as { code?: unknown }).code)
      : '';
  const message = err instanceof Error ? err.message : '';

  if (
    code === '42P01' ||
    code === '42703' ||
    code === '42P10' ||
    (/api_idempotency_keys/i.test(message) && /does not exist/i.test(message))
  ) {
    throw new ApiError({
      status: 503,
      code: 'SERVICE_UNAVAILABLE',
      message: 'Idempotency persistence prerequisite is not provisioned.',
    });
  }

  throw err;
}

/**
 * PostgreSQL-backed IdempotencyStore using `api_idempotency_keys` table.
 * Can operate on either a request-scoped SQL client or a transaction executor.
 */
export function createSqlIdempotencyStore(sql: SqlTagExecutor): IdempotencyStore {
  return {
    async claimOrLookup({
      userId,
      operation,
      idempotencyKey,
      requestHash,
      nowIso = new Date().toISOString(),
      ttlSeconds = DEFAULT_IDEMPOTENCY_TTL_SECONDS,
    }): Promise<IdempotencyClaimOutcome> {
      const expiresIso = new Date(Date.parse(nowIso) + ttlSeconds * 1000).toISOString();

      let inserted: Array<{
        request_hash: string;
        status: IdempotencyRecordStatus;
        response_status: number | null;
        response_body: unknown;
        inserted_or_reset: boolean;
      }>;

      try {
        // Atomic upsert that replaces expired rows or inserts a new pending claim;
        // if an active row already exists, returns its current state via follow-up read.
        inserted = await sql<
          Array<{
            request_hash: string;
            status: IdempotencyRecordStatus;
            response_status: number | null;
            response_body: unknown;
            inserted_or_reset: boolean;
          }>
        >`
          WITH upsert AS (
            INSERT INTO api_idempotency_keys (
              user_id,
              operation,
              idempotency_key,
              request_hash,
              status,
              response_status,
              response_body,
              created_at,
              expires_at
            )
            VALUES (
              ${userId}::uuid,
              ${operation},
              ${idempotencyKey},
              ${requestHash},
              'pending',
              NULL,
              NULL,
              ${nowIso}::timestamptz,
              ${expiresIso}::timestamptz
            )
            ON CONFLICT (user_id, operation, idempotency_key) DO UPDATE
            SET
              request_hash = EXCLUDED.request_hash,
              status = 'pending',
              response_status = NULL,
              response_body = NULL,
              created_at = EXCLUDED.created_at,
              expires_at = EXCLUDED.expires_at
            WHERE api_idempotency_keys.expires_at <= ${nowIso}::timestamptz
            RETURNING request_hash, status, response_status, response_body, TRUE AS inserted_or_reset
          )
          SELECT request_hash, status, response_status, response_body, inserted_or_reset
          FROM upsert
          UNION ALL
          SELECT
            k.request_hash,
            k.status,
            k.response_status,
            k.response_body,
            FALSE AS inserted_or_reset
          FROM api_idempotency_keys k
          WHERE k.user_id = ${userId}::uuid
            AND k.operation = ${operation}
            AND k.idempotency_key = ${idempotencyKey}
            AND NOT EXISTS (SELECT 1 FROM upsert)
          LIMIT 1
        `;
      } catch (err) {
        rethrowIdempotencyPrerequisiteError(err);
      }

      const row = inserted[0];
      if (!row) {
        return { kind: 'conflict_pending' };
      }
      if (row.inserted_or_reset) {
        return { kind: 'acquired' };
      }

      if (row.request_hash !== requestHash) {
        return { kind: 'hash_mismatch' };
      }

      if (row.status === 'pending') {
        return { kind: 'conflict_pending' };
      }

      return {
        kind: 'replayed',
        responseStatus: (row.response_status as ApiHttpStatus) || 200,
        responseBody: row.response_body,
      };
    },

    async markCompleted({
      userId,
      operation,
      idempotencyKey,
      requestHash,
      responseStatus,
      responseBody,
    }): Promise<void> {
      const serializedBody = JSON.stringify(responseBody ?? null);
      let updated: Array<{ idempotency_key: string }>;
      try {
        updated = await sql<Array<{ idempotency_key: string }>>`
          UPDATE api_idempotency_keys
          SET
            status = 'completed',
            response_status = ${responseStatus},
            response_body = ${serializedBody}::text::jsonb
          WHERE user_id = ${userId}::uuid
            AND operation = ${operation}
            AND idempotency_key = ${idempotencyKey}
            AND request_hash = ${requestHash}
            AND status = 'pending'
          RETURNING idempotency_key
        `;
      } catch (err) {
        rethrowIdempotencyPrerequisiteError(err);
      }

      if (updated.length === 0) {
        throw new ApiError({
          status: 409,
          code: 'IDEMPOTENCY_CONFLICT_IN_PROGRESS',
          message: 'Idempotency claim could not be finalized due to concurrent state change.',
        });
      }
    },

    async releasePending({ userId, operation, idempotencyKey, requestHash }): Promise<void> {
      try {
        await sql`
          DELETE FROM api_idempotency_keys
          WHERE user_id = ${userId}::uuid
            AND operation = ${operation}
            AND idempotency_key = ${idempotencyKey}
            AND status = 'pending'
            AND request_hash = ${requestHash}
        `;
      } catch (err) {
        rethrowIdempotencyPrerequisiteError(err);
      }
    },
  };
}

export interface IdempotentExecutionResult<T> {
  replayed: boolean;
  status: ApiHttpStatus;
  body: T;
  headers?: Record<string, string>;
}

/**
 * Executes a mutation wrapped with idempotency protection.
 * - Throws 422 on payload hash mismatch.
 * - Throws 409 if an identical key is currently pending.
 * - Returns replayed response with Idempotent-Replayed: true if already completed.
 * - Releases pending claim if the underlying action throws, so client retries are not locked out.
 */
export async function executeIdempotentMutation<T>(params: {
  store: IdempotencyStore;
  userId: string;
  operation: string;
  idempotencyKey: string;
  canonicalPayload: string;
  nowIso?: string;
  execute: () => Promise<{ status?: ApiHttpStatus; body: T }>;
}): Promise<IdempotentExecutionResult<T>> {
  const requestHash = await computeRequestHash(params.operation, params.canonicalPayload);

  const claim = await params.store.claimOrLookup({
    userId: params.userId,
    operation: params.operation,
    idempotencyKey: params.idempotencyKey,
    requestHash,
    nowIso: params.nowIso,
  });

  if (claim.kind === 'hash_mismatch') {
    throw new ApiError({
      status: 422,
      code: 'IDEMPOTENCY_KEY_PAYLOAD_MISMATCH',
      message: 'Idempotency-Key was already used with a different request payload.',
    });
  }

  if (claim.kind === 'conflict_pending') {
    throw new ApiError({
      status: 409,
      code: 'IDEMPOTENCY_CONFLICT_IN_PROGRESS',
      message: 'A request with this Idempotency-Key is currently in progress.',
    });
  }

  if (claim.kind === 'replayed') {
    return {
      replayed: true,
      status: claim.responseStatus,
      body: claim.responseBody as T,
      headers: {
        'Idempotent-Replayed': 'true',
      },
    };
  }

  try {
    const result = await params.execute();
    const status = result.status ?? 200;

    await params.store.markCompleted({
      userId: params.userId,
      operation: params.operation,
      idempotencyKey: params.idempotencyKey,
      requestHash,
      responseStatus: status,
      responseBody: result.body,
    });

    return {
      replayed: false,
      status,
      body: result.body,
    };
  } catch (err) {
    try {
      await params.store.releasePending({
        userId: params.userId,
        operation: params.operation,
        idempotencyKey: params.idempotencyKey,
        requestHash,
      });
    } catch {
      // Preserve primary mutation error
    }
    throw err;
  }
}


/** Claim, database mutation, and replay result commit together.
 * The callback must use the supplied executor and must not call external providers.
 * The SQL table/unique constraint must be provisioned in the later schema phase.
 */
export async function executeTransactionalIdempotentMutation<T>(params: {
  db: RequestDbContext;
  userId: string;
  operation: string;
  idempotencyKey: string;
  canonicalPayload: string;
  nowIso?: string;
  prepare?: (tx: SqlTagExecutor) => Promise<void>;
  execute: (tx: SqlTagExecutor) => Promise<{ status?: ApiHttpStatus; body: T }>;
}): Promise<IdempotentExecutionResult<T>> {
  return params.db.runSerializableTransaction(async (tx) => {
    if (params.prepare) {
      // Check prerequisites before preparing a new account; all work still rolls back together.
      try { await tx`SELECT user_id, operation, idempotency_key, request_hash, status, response_status, response_body, created_at, expires_at FROM api_idempotency_keys LIMIT 0`; }
      catch (error) { rethrowIdempotencyPrerequisiteError(error); }
      await params.prepare(tx);
    }
    return executeIdempotentMutation({
      ...params,
      store: createSqlIdempotencyStore(tx),
      execute: () => params.execute(tx),
    });
  });
}
