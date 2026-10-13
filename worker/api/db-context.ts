/**
 * Request-Scoped Direct Hyperdrive Database Lifecycle & Transaction Manager (T03)
 *
 * Requirements:
 * - Zero Next.js / @opennextjs/cloudflare imports.
 * - Lazy per-request client creation; zero module-scope persistent DB connections or student state.
 * - Preserves prepare: true under Hyperdrive, max: 1, idle_timeout: 10, connect_timeout: 5, fetch_types: false.
 * - Real committed transactions (runCommittedTransaction, runSerializableTransaction with bounded 40001/40P01 retries).
 * - Never acknowledges an aborted mutation; zero spike rollback sentinels or benchmark schemas.
 * - Safe cleanup() for ctx.waitUntil that never causes an unhandled rejection.
 */

import postgres from 'postgres';
import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../../src/db/schema';
import { ApiError, databaseErrorToApiError } from './errors';

export type DrizzleSchemaDb = PostgresJsDatabase<typeof schema>;

export interface DatabaseBindingEnv {
  HYPERDRIVE?: { connectionString: string };
  DATABASE_URL?: string;
}

export interface SqlTagExecutor {
  <T extends readonly (object | undefined)[] = Record<string, unknown>[]>(
    template: TemplateStringsArray,
    ...parameters: readonly any[]
  ): Promise<T>;
}

export interface RequestDbContext {
  readonly sql: SqlTagExecutor;
  readonly db: DrizzleSchemaDb;
  readonly isHyperdrive: boolean;
  runCommittedTransaction<T>(fn: (tx: SqlTagExecutor) => Promise<T>): Promise<T>;
  runSerializableTransaction<T>(
    fn: (tx: SqlTagExecutor) => Promise<T>,
    options?: { maxAttempts?: number }
  ): Promise<T>;
  cleanup(): Promise<void>;
}

export type DbContextFactory = (env: DatabaseBindingEnv) => RequestDbContext;

/**
 * Checks whether an unknown error is a retryable PostgreSQL serialization/deadlock failure
 * (SQLSTATE 40001 serialization_failure or 40P01 deadlock_detected).
 */
export function isRetryableSerializationError(err: unknown): boolean {
  if (!err || typeof err !== 'object') {
    return false;
  }
  const code = (err as { code?: unknown }).code;
  return code === '40001' || code === '40P01';
}

/** Retry only confirmed transaction rollbacks. Network/commit uncertainty is never replayed here.
 * Callbacks must perform database work only; provider calls remain outside transactions.
 */
export async function runDatabaseTransaction<T>(execute: () => Promise<T>, maxAttempts = 3, pause: (ms: number) => Promise<void> = ms => new Promise(resolve => setTimeout(resolve, ms))): Promise<T> {
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 3) throw new ApiError({ status: 422, code: 'VALIDATION_FAILED', message: 'Transaction attempts must be an integer between 1 and 3.' });
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try { return await execute(); }
    catch (error) {
      if (isRetryableSerializationError(error) && attempt < maxAttempts) {
        await pause(20 * attempt + Math.floor(Math.random() * 30));
        continue;
      }
      throw databaseErrorToApiError(error) ?? new ApiError({ status: 500, code: 'TRANSACTION_COMMIT_FAILED', message: 'We couldn’t confirm your save. Please retry the same request.', cause: error });
    }
  }
  throw new Error('Unreachable transaction retry state');
}

/**
 * Creates a request-scoped database context backed by Direct Hyperdrive (or DATABASE_URL fallback).
 * Fails closed with 503 DATABASE_UNAVAILABLE when connection bindings are missing.
 */
export function createRequestDbContext(env: DatabaseBindingEnv): RequestDbContext {
  const hyperdriveConn = env.HYPERDRIVE?.connectionString?.trim();
  const directConn = env.DATABASE_URL?.trim();
  const connectionString = hyperdriveConn || directConn;

  if (!connectionString) {
    throw new ApiError({
      status: 503,
      code: 'DATABASE_UNAVAILABLE',
      message: 'Database connection binding is unavailable.',
    });
  }

  const isHyperdrive = Boolean(hyperdriveConn);

  const sql = postgres(connectionString, {
    max: 1,
    idle_timeout: 10,
    connect_timeout: 10,
    prepare: isHyperdrive ? true : false,
    fetch_types: false,
    ...(isHyperdrive ? {} : { ssl: { rejectUnauthorized: true } }),
    connection: { statement_timeout: 25000, lock_timeout: 10000 },
  });

  let db: RequestDbContext['db'] | undefined;
  let closed = false;

  return {
    sql: sql as unknown as SqlTagExecutor,
    get db() { return db ??= drizzle(sql, { schema }); },
    isHyperdrive,

    async runCommittedTransaction<T>(fn: (tx: SqlTagExecutor) => Promise<T>): Promise<T> {
      return runDatabaseTransaction(() => sql.begin(async tx => fn(tx as unknown as SqlTagExecutor)) as Promise<T>);
    },

    async runSerializableTransaction<T>(fn: (tx: SqlTagExecutor) => Promise<T>, options?: { maxAttempts?: number }): Promise<T> {
      return runDatabaseTransaction(() => sql.begin('isolation level serializable', async tx => fn(tx as unknown as SqlTagExecutor)) as Promise<T>, options?.maxAttempts);
    },

    async cleanup(): Promise<void> {
      if (closed) {
        return;
      }
      closed = true;
      try {
        await sql.end({ timeout: 5 });
      } catch {
        // Swallow socket teardown errors inside waitUntil so no unhandled rejection occurs.
      }
    },
  };
}

export interface LazyDbHolder {
  getDb(): RequestDbContext;
  readonly isAllocated: boolean;
  cleanup(): Promise<void>;
}

/**
 * Creates a lazy per-request DB holder so that preflight, unauthenticated, or invalid
 * requests never allocate a database client.
 */
export function createLazyDbHolder(
  env: DatabaseBindingEnv,
  factory: DbContextFactory = createRequestDbContext
): LazyDbHolder {
  let instance: RequestDbContext | null = null;

  return {
    getDb(): RequestDbContext {
      if (!instance) {
        instance = factory(env);
      }
      return instance;
    },
    get isAllocated(): boolean {
      return instance !== null;
    },
    async cleanup(): Promise<void> {
      if (!instance) {
        return;
      }
      try {
        await instance.cleanup();
      } catch {
        // Guaranteed never to reject inside ctx.waitUntil.
      }
    },
  };
}
