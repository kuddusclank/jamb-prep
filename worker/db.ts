/**
 * Request-Scoped Database Connection & Rollback Transaction Manager (T01)
 *
 * Requirements (R1, R2, C1, C2):
 * - Fail-closed: Throws DATABASE_CONNECTION_UNAVAILABLE if connection bindings are missing.
 * - Valid configured dedicated test subject required (SPIKE_TEST_SUBJECT_ID).
 * - ONE reusable rollback-fixture transaction wrapper (runInRollbackFixtureTx):
 *   - Creates & seeds pg_temp temporary tables on the reserved transaction.
 *   - Shared questions with explicit attempt-question membership for each scored attempt.
 *   - Bounded small number of bulk statements (reduced from 1,454 sequential statements).
 *   - Tiered scenario-required data seeding (profile, payload, write, score).
 *   - Instruments setup/action/rollback; response cleanup elapsed time is unavailable.
 *   - Derives active/expired timestamps dynamically via injected clock (nowMs).
 *   - Executes scenario SQL directly on reserved tx; zero outer-pool access inside tx.
 *   - Captures result, forces rollback via INTENTIONAL_SPIKE_ROLLBACK sentinel.
 *   - Returns captured result ONLY if sentinel encountered; zero synthetic fallback for SQL errors.
 * - Payload scenario fetches complete owned frozen questions, options, and passages from SQL on reserved tx.
 * - Scoring scenario reads accepted answer rows from SQL on reserved tx, writes result, and rolls back.
 * - Active state checks, row lock (FOR UPDATE), and conditional monotonic revisions enforced in SQL.
 */

import postgres from 'postgres';
import {
  SPIKE_TEST_SUBJECT_ID,
  SPIKE_TEST_ATTEMPT_ID,
  SPIKE_PERFECT_ATTEMPT_ID,
  SPIKE_ZERO_ATTEMPT_ID,
  SPIKE_EXPIRED_ATTEMPT_ID,
  SPIKE_COMPLETED_ATTEMPT_ID,
  SYNTHETIC_180_QUESTIONS,
  sanitizeExamPayload,
  scoreMockAttempt,
  generateCandidateAnswersWithAccuracy,
  deriveAttemptFixtures,
  ProfileFixture,
  EntitlementFixture,
  AttemptFixture,
  ClientQuestionItem,
} from './fixtures/mock-data';

export interface SpikeEnv {
  HYPERDRIVE?: { connectionString: string };
  DATABASE_URL?: string;
  ENVIRONMENT?: string;
  SPIKE_SECRET?: string;
  SPIKE_TEST_SUBJECT_ID?: string;
  SUPABASE_URL?: string;
  SYNTHETIC_HMAC_SECRET?: string;
}

export interface RollbackTxTimings {
  setupMs: number;
  actionMs: number;
  rollbackMs: number;
  totalElapsedMs: number;
  statementCount: number;
}

export interface RollbackFixtureOptions {
  testSubjectId: string;
  nowMs?: number;
  scenario?: 'profile' | 'payload' | 'write' | 'score' | 'all';
}

export interface SpikeDatabaseClient {
  isMock: boolean;
  lastTimings?: RollbackTxTimings;
  connectionProbe?(): Promise<{ firstQueryMs: number; secondQueryMs: number }>;
  getProfileAndEntitlement(userId: string, benchmarkSchema?: string): Promise<{
    profile: ProfileFixture | null;
    entitlement: EntitlementFixture | null;
  }>;
  getAttempt(attemptId: string): Promise<AttemptFixture | null>;
  getAttemptPayload(attemptId: string, userId: string): Promise<{
    attemptId: string;
    totalQuestions: number;
    questions: ClientQuestionItem[];
  }>;
  getAttemptPayloadJson(attemptId: string, userId: string, benchmarkSchema?: string): Promise<PayloadJsonResult>;
  upsertAnswerInRollback(params: {
    attemptId: string;
    userId: string;
    questionId: string;
    selectedOptionId: string;
    revision?: number;
    serverReceivedAt: string;
    benchmarkSchema?: string;
  }): Promise<{ success: boolean; rolledBack: boolean; ackRevision?: number; timings?: RollbackTxTimings }>;
  scoreAttemptInRollback(params: {
    attemptId: string;
    userId: string;
    serverSubmittedAt: string;
    benchmarkSchema?: string;
  }): Promise<{
    totalScore: number;
    subjectScores: Record<string, { rawCorrect: number; totalQuestions: number; scaledScore: number }>;
    totalCorrect: number;
    totalAnsweredTimely: number;
    rolledBack: boolean;
    timings?: RollbackTxTimings;
  }>;
  cleanup(): Promise<void>;
}

export interface PayloadJsonResult {
  attemptId: string;
  totalQuestions: number;
  /** Pre-serialized JSON array text built from an explicit field allowlist. */
  questionsJson: string;
  timings?: RollbackTxTimings;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const BENCHMARK_SCHEMA_PATTERN = /^jambprep_benchmark_[0-9a-f]{8,16}$/;

export function assertValidBenchmarkSchema(schema?: string): string | undefined {
  if (!schema) return undefined;
  if (!BENCHMARK_SCHEMA_PATTERN.test(schema)) {
    throw new Error('INVALID_BENCHMARK_SCHEMA');
  }
  return schema;
}

/** Object keys that must never appear in a client exam payload. Matches keys only, not escaped string content. */
const FORBIDDEN_PAYLOAD_KEY = /"(correctOptionId|correct_option_id|explanation|isCorrect|is_correct)"\s*:/;
export const MAX_PAYLOAD_JSON_BYTES = 120 * 1024;

/**
 * Framing/confidentiality/byte guard for trusted SQL-produced JSON text without parsing it.
 * SQL json_agg guarantees syntax; this guard does not validate arbitrary JSON grammar.
 * Throws a generic error when the text is not an array, is oversized or contains forbidden keys.
 */
export function assertSafePayloadJson(attemptId: unknown, totalQuestions: unknown, questionsJson: unknown): PayloadJsonResult {
  if (
    typeof attemptId !== 'string' || !UUID_REGEX.test(attemptId) ||
    !Number.isSafeInteger(totalQuestions) || (totalQuestions as number) < 0 ||
    typeof questionsJson !== 'string' || new TextEncoder().encode(questionsJson).byteLength > MAX_PAYLOAD_JSON_BYTES ||
    questionsJson[0] !== '[' || questionsJson[questionsJson.length - 1] !== ']' ||
    FORBIDDEN_PAYLOAD_KEY.test(questionsJson)
  ) {
    throw new Error('PAYLOAD_INTEGRITY_FAILED');
  }
  return { attemptId: attemptId.toLowerCase(), totalQuestions: totalQuestions as number, questionsJson };
}

/**
 * Execute a parameterized bulk insert via dynamic tagged template literal (C2)
 */
/** Retry the entire transaction on serialization/deadlock failure; never return an aborted result. */
export async function runSerializableSpikeTransaction(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sql: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  action: (tx: any) => Promise<void>
): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await sql.begin('isolation level serializable', action);
      return;
    } catch (error: unknown) {
      const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
      if (attempt === 2 || (code !== '40001' && code !== '40P01')) throw error;
    }
  }
}

export async function bulkInsert(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx: any,
  table: string,
  columns: string[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rows: any[][]
): Promise<void> {
  if (rows.length === 0) return;

  const colList = columns.join(', ');
  const strings: string[] = [`INSERT INTO ${table} (${colList}) VALUES `];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vals: any[] = [];

  for (let rIdx = 0; rIdx < rows.length; rIdx++) {
    const row = rows[rIdx];
    strings[strings.length - 1] += '(';
    for (let cIdx = 0; cIdx < row.length; cIdx++) {
      vals.push(row[cIdx]);
      if (cIdx < row.length - 1) {
        strings.push(', ');
      }
    }
    strings.push(rIdx < rows.length - 1 ? '), ' : ') ON CONFLICT DO NOTHING;');
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (strings as any).raw = strings;

  await tx(strings, ...vals);
}

/**
 * Reusable Rollback-Fixture Transaction Wrapper (R1, R2, C1, C2)
 *
 * Sets up temporary tables in pg_temp on the reserved transaction, seeds fixture rows in a bounded
 * small number of bulk statements, runs the scenario callback on that exact tx, captures the result,
 * throws an intentional rollback sentinel, and returns the result only if the sentinel was caught.
 * Zero synthetic fallback: any SQL error or unexpected exception is rethrown!
 */
export async function runInRollbackFixtureTx<T>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sql: any,
  options: RollbackFixtureOptions,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  action: (tx: any, fixtures: ReturnType<typeof deriveAttemptFixtures>, timings: RollbackTxTimings) => Promise<T>
): Promise<T> {
  let capturedResult: T | undefined;
  let actionCompleted = false;
  const nowMs = options.nowMs || Date.now();
  const fixtures = deriveAttemptFixtures(options.testSubjectId, nowMs);
  const scenario = options.scenario || 'all';

  let statementCount = 0;
  let setupMs = 0;
  let actionMs = 0;
  let rollbackMs = 0;
  let rollbackStartedAt = 0;
  const totalStart = performance.now();

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await sql.begin(async (rawTx: any) => {
      // Wrap tx to measure statement counts cleanly (C2)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tx = async (strings: any, ...vals: any[]) => {
        statementCount++;
        return await rawTx(strings, ...vals);
      };

      const setupStart = performance.now();

      // 1. Scenario-specific DDL in pg_temp on reserved tx (C1, C2)
      if (scenario === 'profile' || scenario === 'all') {
        await tx`CREATE TEMPORARY TABLE IF NOT EXISTS pg_temp.spike_profiles (
            id uuid PRIMARY KEY,
            display_name text NOT NULL,
            email text NOT NULL,
            role text NOT NULL
          ) ON COMMIT DROP;`;
        await tx`CREATE TEMPORARY TABLE IF NOT EXISTS pg_temp.spike_entitlements (
            id uuid PRIMARY KEY,
            user_id uuid NOT NULL,
            is_premium boolean NOT NULL DEFAULT false,
            status text NOT NULL,
            expires_at timestamptz NOT NULL
          ) ON COMMIT DROP;`;
      }

      if (scenario !== 'profile') {
        await tx`CREATE TEMPORARY TABLE IF NOT EXISTS pg_temp.spike_attempts (
            id uuid PRIMARY KEY,
            user_id uuid NOT NULL,
            status text NOT NULL,
            started_at timestamptz NOT NULL,
            expires_at timestamptz NOT NULL
          ) ON COMMIT DROP;`;
        await tx`CREATE TEMPORARY TABLE IF NOT EXISTS pg_temp.spike_questions (
            id text PRIMARY KEY,
            subject text NOT NULL,
            topic text NOT NULL,
            text text NOT NULL,
            passage text,
            correct_option_id text NOT NULL
          ) ON COMMIT DROP;`;
        if (scenario === 'payload' || scenario === 'write' || scenario === 'all') {
          await tx`CREATE TEMPORARY TABLE IF NOT EXISTS pg_temp.spike_question_options (
              id text PRIMARY KEY,
              question_id text NOT NULL,
              option_letter text NOT NULL,
              option_order integer NOT NULL,
              text text NOT NULL
            ) ON COMMIT DROP;`;
        }
        await tx`CREATE TEMPORARY TABLE IF NOT EXISTS pg_temp.spike_attempt_questions (
            attempt_id uuid NOT NULL,
            question_id text NOT NULL,
            question_order integer NOT NULL,
            PRIMARY KEY (attempt_id, question_id)
          ) ON COMMIT DROP;`;
      }

      if (scenario === 'write' || scenario === 'score' || scenario === 'all') {
        await tx`CREATE TEMPORARY TABLE IF NOT EXISTS pg_temp.spike_attempt_answers (
            attempt_id uuid NOT NULL,
            question_id text NOT NULL,
            selected_option_id text NOT NULL,
            revision integer NOT NULL DEFAULT 1,
            server_received_at timestamptz NOT NULL,
            PRIMARY KEY (attempt_id, question_id)
          ) ON COMMIT DROP;`;
      }

      if (scenario === 'score' || scenario === 'all') {
        await tx`CREATE TEMPORARY TABLE IF NOT EXISTS pg_temp.spike_attempt_results (
            attempt_id uuid PRIMARY KEY,
            user_id uuid NOT NULL,
            total_score integer NOT NULL,
            total_correct integer NOT NULL,
            total_answered integer NOT NULL,
            completed_at timestamptz NOT NULL
          ) ON COMMIT DROP;`;
      }

      // 2. Bulk seed profile and entitlement (C1: expired past timestamp when isPremium is false)
      if (scenario === 'profile' || scenario === 'all') {
        await tx`INSERT INTO pg_temp.spike_profiles (id, display_name, email, role)
          VALUES (${fixtures.profile.id}::uuid, ${fixtures.profile.displayName}, ${fixtures.profile.email}, ${fixtures.profile.role})
          ON CONFLICT DO NOTHING;`;

        await tx`INSERT INTO pg_temp.spike_entitlements (id, user_id, is_premium, status, expires_at)
          VALUES (${fixtures.entitlement.id}::uuid, ${fixtures.entitlement.userId}::uuid, ${fixtures.entitlement.isPremium}, ${fixtures.entitlement.status}, ${fixtures.entitlement.expiresAt}::timestamptz)
          ON CONFLICT DO NOTHING;`;
      }

      // 3. Bulk seed explicitly configured fixture attempts
      if (scenario !== 'profile') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const attemptRows: any[][] = [];
        for (const att of fixtures.attempts.values()) {
          attemptRows.push([att.id, att.userId, att.status, att.startedAt, att.expiresAt]);
        }
        await bulkInsert(
          tx,
          'pg_temp.spike_attempts',
          ['id', 'user_id', 'status', 'started_at', 'expires_at'],
          attemptRows
        );
      }

      // 4. Deterministic server-side question and option generation via SQL (C1, C2, T02-continuation)
      if (scenario === 'payload' || scenario === 'write' || scenario === 'score' || scenario === 'all') {
        // 1 single server-side generation statement for all 180 questions (zero client parameter transfer)
        await tx`
          INSERT INTO pg_temp.spike_questions (id, subject, topic, text, passage, correct_option_id)
          WITH subjects AS (
            SELECT * FROM (VALUES
              ('ENG', 60, 0),
              ('MTH', 40, 60),
              ('PHY', 40, 100),
              ('CHM', 40, 140)
            ) AS s(code, count, offset_idx)
          ),
          series AS (
            SELECT
              s.code AS subject,
              i AS item_num,
              s.offset_idx + i AS global_idx
            FROM subjects s
            CROSS JOIN generate_series(1, s.count) AS i
          )
          SELECT
            'q-' || lower(subject) || '-' || lpad(item_num::text, 3, '0') AS id,
            subject,
            lower(subject) || '-topic-' || (((item_num - 1) % 5) + 1)::text AS topic,
            'Synthetic question stem ' || global_idx::text || ' for subject ' || subject || ' testing concept #' || item_num::text || '.' AS text,
            CASE
              WHEN subject = 'ENG' AND item_num <= 15 THEN 'Comprehension passage text for English reading section.'
              ELSE NULL
            END AS passage,
            'q-' || lower(subject) || '-' || lpad(item_num::text, 3, '0') || '-opt-' || (ARRAY['a', 'b', 'c', 'd'])[(item_num - 1) % 4 + 1] AS correct_option_id
          FROM series
          ORDER BY global_idx;
        `;

        if (scenario === 'payload' || scenario === 'write' || scenario === 'all') {
          // 1 single server-side generation statement for all 720 options (zero client parameter transfer)
          await tx`
            INSERT INTO pg_temp.spike_question_options (id, question_id, option_letter, option_order, text)
            WITH subjects AS (
              SELECT * FROM (VALUES
                ('ENG', 60, 0),
                ('MTH', 40, 60),
                ('PHY', 40, 100),
                ('CHM', 40, 140)
              ) AS s(code, count, offset_idx)
            ),
            series AS (
              SELECT
                s.code AS subject,
                i AS item_num,
                s.offset_idx + i AS global_idx
              FROM subjects s
              CROSS JOIN generate_series(1, s.count) AS i
            ),
            opt_defs AS (
              SELECT * FROM (VALUES
                ('a', 'A', 1),
                ('b', 'B', 2),
                ('c', 'C', 3),
                ('d', 'D', 4)
              ) AS o(suffix, letter, ord)
            )
            SELECT
              'q-' || lower(s.subject) || '-' || lpad(s.item_num::text, 3, '0') || '-opt-' || o.suffix AS id,
              'q-' || lower(s.subject) || '-' || lpad(s.item_num::text, 3, '0') AS question_id,
              o.letter AS option_letter,
              o.ord AS option_order,
              'Option ' || o.letter || ' for question ' || s.global_idx::text AS text
            FROM series s
            CROSS JOIN opt_defs o
            ORDER BY s.global_idx, o.ord;
          `;
        }

        // 1 single server-side generation statement for attempt-question mappings (zero client parameter transfer)
        await tx`
          INSERT INTO pg_temp.spike_attempt_questions (attempt_id, question_id, question_order)
          WITH subjects AS (
            SELECT * FROM (VALUES
              ('ENG', 60, 0),
              ('MTH', 40, 60),
              ('PHY', 40, 100),
              ('CHM', 40, 140)
            ) AS s(code, count, offset_idx)
          ),
          series AS (
            SELECT
              'q-' || lower(s.code) || '-' || lpad(i::text, 3, '0') AS question_id,
              s.offset_idx + i AS question_order
            FROM subjects s
            CROSS JOIN generate_series(1, s.count) AS i
          )
          SELECT
            att.id AS attempt_id,
            ser.question_id,
            ser.question_order
          FROM pg_temp.spike_attempts att
          CROSS JOIN series ser
          ORDER BY att.id, ser.question_order;
        `;
      }

      // 5. Bulk seed answers for write and score datasets (C1, C2, T02-continuation)
      if (scenario === 'write') {
        // Pre-seed 1 existing answer row for the test question at revision 1
        const activeAtt = fixtures.attempts.get(SPIKE_TEST_ATTEMPT_ID)!;
        const pastAnsIso = new Date(new Date(activeAtt.startedAt).getTime() + 60000).toISOString();
        await tx`
          INSERT INTO pg_temp.spike_attempt_answers (attempt_id, question_id, selected_option_id, revision, server_received_at)
          VALUES (${SPIKE_TEST_ATTEMPT_ID}::uuid, 'q-eng-001', 'q-eng-001-opt-a', 1, ${pastAnsIso}::timestamptz)
          ON CONFLICT DO NOTHING;
        `;
      } else if (scenario === 'score' || scenario === 'all') {
        // 1 single server-side generation statement for all 540 scoring answers (zero client parameter arrays)
        await tx`
          INSERT INTO pg_temp.spike_attempt_answers (attempt_id, question_id, selected_option_id, revision, server_received_at)
          WITH subjects AS (
            SELECT * FROM (VALUES
              ('ENG', 60, 0),
              ('MTH', 40, 60),
              ('PHY', 40, 100),
              ('CHM', 40, 140)
            ) AS s(code, count, offset_idx)
          ),
          series AS (
            SELECT
              'q-' || lower(s.code) || '-' || lpad(i::text, 3, '0') AS question_id,
              s.offset_idx + i AS global_idx,
              'q-' || lower(s.code) || '-' || lpad(i::text, 3, '0') || '-opt-' || (ARRAY['a', 'b', 'c', 'd'])[(i - 1) % 4 + 1] AS correct_opt_id,
              'q-' || lower(s.code) || '-' || lpad(i::text, 3, '0') || '-opt-a' AS opt_a_id,
              'q-' || lower(s.code) || '-' || lpad(i::text, 3, '0') || '-opt-b' AS opt_b_id
            FROM subjects s
            CROSS JOIN generate_series(1, s.count) AS i
          ),
          scored_attempts AS (
            SELECT
              att.id AS attempt_id,
              att.started_at,
              att.expires_at,
              CASE
                WHEN att.id = ${SPIKE_TEST_ATTEMPT_ID}::uuid THEN 0.75
                WHEN att.id = ${SPIKE_PERFECT_ATTEMPT_ID}::uuid THEN 1.0
                WHEN att.id = ${SPIKE_ZERO_ATTEMPT_ID}::uuid THEN 0.0
                ELSE 0.75
              END AS accuracy,
              GREATEST(1.0, EXTRACT(EPOCH FROM (
                LEAST(to_timestamp(${nowMs}::double precision / 1000.0) - interval '500 millisecond', att.expires_at - interval '500 millisecond') - att.started_at
              ))) / 181.0 AS step_sec
            FROM pg_temp.spike_attempts att
            WHERE att.id IN (${SPIKE_TEST_ATTEMPT_ID}::uuid, ${SPIKE_PERFECT_ATTEMPT_ID}::uuid, ${SPIKE_ZERO_ATTEMPT_ID}::uuid)
          )
          SELECT
            a.attempt_id,
            s.question_id,
            CASE
              WHEN a.accuracy = 1.0 THEN s.correct_opt_id
              WHEN a.accuracy = 0.0 THEN (CASE WHEN s.correct_opt_id = s.opt_a_id THEN s.opt_b_id ELSE s.opt_a_id END)
              WHEN (s.global_idx - 1) % 4 != 0 THEN s.correct_opt_id
              ELSE (CASE WHEN s.correct_opt_id = s.opt_a_id THEN s.opt_b_id ELSE s.opt_a_id END)
            END AS selected_option_id,
            1 AS revision,
            a.started_at + (s.global_idx * a.step_sec * interval '1 second') AS server_received_at
          FROM scored_attempts a
          CROSS JOIN series s
          ORDER BY a.attempt_id, s.global_idx;
        `;
      }

      setupMs = performance.now() - setupStart;

      // 6. Execute scenario callback on reserved tx
      const actionStart = performance.now();
      const currentTimings: RollbackTxTimings = {
        setupMs,
        actionMs: 0,
        rollbackMs: 0,
        totalElapsedMs: 0,
        statementCount,
      };

      capturedResult = await action(tx, fixtures, currentTimings);
      actionMs = performance.now() - actionStart;
      actionCompleted = true;

      // 7. Force rollback sentinel
      rollbackStartedAt = performance.now();
      throw new Error('INTENTIONAL_SPIKE_ROLLBACK');
    });
  } catch (err: unknown) {

    const message = err instanceof Error ? err.message : String(err);
    if (message === 'INTENTIONAL_SPIKE_ROLLBACK' && actionCompleted) {
      rollbackMs = performance.now() - rollbackStartedAt;
      const totalElapsedMs = performance.now() - totalStart;

      // Attach timings if capturedResult is an object
      if (capturedResult && typeof capturedResult === 'object') {
        const timings: RollbackTxTimings = {
          setupMs,
          actionMs,
          rollbackMs,
          totalElapsedMs,
          statementCount,
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (capturedResult as any).timings = timings;
      }
      return capturedResult as T;
    }
    // R1: Zero synthetic fallback for SQL errors or table issues
    throw err;
  }

  throw new Error('ROLLBACK_SENTINEL_NOT_ENCOUNTERED');
}

/**
 * Creates a request-scoped database client for the spike
 */
export function createSpikeDbClient(
  env: SpikeEnv,
  forceMock = false,
  customSql?: unknown,
  nowMs?: number
): SpikeDatabaseClient {
  const testSubjectId = env.SPIKE_TEST_SUBJECT_ID;
  if (!testSubjectId || !UUID_REGEX.test(testSubjectId)) {
    throw new Error('SPIKE_CONFIGURATION_UNAVAILABLE: Valid SPIKE_TEST_SUBJECT_ID required');
  }

  if (forceMock) {
    return createMockSpikeDbClient(testSubjectId, nowMs);
  }

  const connectionString = env.HYPERDRIVE?.connectionString || env.DATABASE_URL;

  // Fail-closed: never silently select mock mode in production if binding is missing
  if (!customSql && !connectionString) {
    throw new Error('DATABASE_CONNECTION_UNAVAILABLE: HYPERDRIVE or DATABASE_URL binding required');
  }

  const isHyperdrive = Boolean(env.HYPERDRIVE?.connectionString);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sql: any =
    customSql ||
    postgres(connectionString!, {
      max: 5,
      idle_timeout: 10,
      connect_timeout: 5,
      fetch_types: false,
      prepare: isHyperdrive,
      onnotice: () => {},
    });

  let lastClientTimings: RollbackTxTimings | undefined;

  return {
    isMock: false,
    get lastTimings() {
      return lastClientTimings;
    },

    async connectionProbe() {
      const start = performance.now();
      await sql`SELECT 1 AS spike_connection_probe`;
      const firstQueryMs = performance.now() - start;
      const secondStart = performance.now();
      await sql`SELECT 1 AS spike_connection_probe`;
      return { firstQueryMs, secondQueryMs: performance.now() - secondStart };
    },

    async getProfileAndEntitlement(userId: string, benchmarkSchema?: string) {
      if (benchmarkSchema) {
        assertValidBenchmarkSchema(benchmarkSchema);
        const rows = await sql`
          SELECT p.id, p.display_name as "displayName", p.email, p.role,
                 e.id as "entitlementId", e.user_id as "entitlementUserId",
                 (e.is_premium AND e.expires_at > NOW()) as "isPremium", e.status as "entitlementStatus",
                 e.expires_at as "entitlementExpiresAt"
          FROM ${sql(benchmarkSchema)}.${sql('profiles')} p
          LEFT JOIN ${sql(benchmarkSchema)}.${sql('entitlements')} e ON e.user_id = p.id
          WHERE p.id = ${userId}::uuid
          LIMIT 1
        `;

        if (!rows || rows.length === 0) {
          return { profile: null, entitlement: null };
        }

        const row = rows[0];
        return {
          profile: {
            id: row.id,
            displayName: row.displayName,
            email: row.email,
            role: row.role,
          },
          entitlement: {
            id: row.entitlementId,
            userId: row.entitlementUserId,
            isPremium: Boolean(row.isPremium),
            status: row.entitlementStatus,
            expiresAt: row.entitlementExpiresAt ? new Date(row.entitlementExpiresAt).toISOString() : new Date(0).toISOString(),
          },
        };
      }

      const res = await runInRollbackFixtureTx(sql, { testSubjectId, nowMs, scenario: 'profile' }, async (tx) => {
        const rows = await tx`
          SELECT p.id, p.display_name as "displayName", p.email, p.role,
                 e.id as "entitlementId", e.user_id as "entitlementUserId",
                 (e.is_premium AND e.expires_at > NOW()) as "isPremium", e.status as "entitlementStatus",
                 e.expires_at as "entitlementExpiresAt"
          FROM pg_temp.spike_profiles p
          LEFT JOIN pg_temp.spike_entitlements e ON e.user_id = p.id
          WHERE p.id = ${userId}::uuid
          LIMIT 1
        `;

        if (!rows || rows.length === 0) {
          return { profile: null, entitlement: null };
        }

        const row = rows[0];
        return {
          profile: {
            id: row.id,
            displayName: row.displayName,
            email: row.email,
            role: row.role,
          },
          entitlement: {
            id: row.entitlementId,
            userId: row.entitlementUserId,
            isPremium: Boolean(row.isPremium),
            status: row.entitlementStatus,
            expiresAt: row.entitlementExpiresAt ? new Date(row.entitlementExpiresAt).toISOString() : new Date(0).toISOString(),
          },
        };
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((res as any).timings) lastClientTimings = (res as any).timings;
      return res;
    },

    async getAttempt(attemptId: string) {
      const res = await runInRollbackFixtureTx(sql, { testSubjectId, nowMs, scenario: 'payload' }, async (tx) => {
        const rows = await tx`
          SELECT id, user_id as "userId", status, started_at as "startedAt", expires_at as "expiresAt"
          FROM pg_temp.spike_attempts
          WHERE id = ${attemptId}::uuid
          LIMIT 1
        `;
        if (!rows || rows.length === 0) {
          return null;
        }
        return rows[0] as unknown as AttemptFixture;
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((res as any)?.timings) lastClientTimings = (res as any).timings;
      return res;
    },

    async getAttemptPayload(attemptId: string, userId: string) {
      const res = await runInRollbackFixtureTx(sql, { testSubjectId, nowMs, scenario: 'payload' }, async (tx) => {
        // 1. Verify attempt ownership & active state on reserved tx
        const attemptRows = await tx`
          SELECT id, user_id, status, started_at, expires_at
          FROM pg_temp.spike_attempts
          WHERE id = ${attemptId}::uuid AND user_id = ${userId}::uuid
          LIMIT 1
        `;
        if (!attemptRows || attemptRows.length === 0) {
          throw new Error('ATTEMPT_NOT_FOUND_OR_FORBIDDEN');
        }

        // 2. Fetch complete owned frozen questions, options, and passages from SQL on reserved tx (R1, C1)
        const questionRows = await tx`
          SELECT q.id as q_id, q.subject as q_subject, q.topic as q_topic,
                 aq.question_order as q_order, q.text as q_text, q.passage as q_passage,
                 o.id as o_id, o.option_letter as o_letter, o.text as o_text, o.option_order as o_order
          FROM pg_temp.spike_attempt_questions aq
          JOIN pg_temp.spike_questions q ON q.id = aq.question_id
          JOIN pg_temp.spike_question_options o ON o.question_id = q.id
          WHERE aq.attempt_id = ${attemptId}::uuid
          ORDER BY aq.question_order ASC, o.option_order ASC
        `;

        // Group into client question objects - answer keys and explanations omitted, passage preserved (C1)
        const questionMap = new Map<string, ClientQuestionItem>();
        for (const r of questionRows) {
          let q = questionMap.get(r.q_id);
          if (!q) {
            q = {
              id: r.q_id,
              subjectCode: r.q_subject,
              topicSlug: r.q_topic,
              stem: r.q_text,
              passage: r.q_passage || null,
              options: [],
            };
            questionMap.set(r.q_id, q);
          }
          q.options.push({
            id: r.o_id,
            label: r.o_letter as 'A' | 'B' | 'C' | 'D',
            text: r.o_text,
          });
        }

        const questions = Array.from(questionMap.values());
        return {
          attemptId,
          totalQuestions: questions.length,
          questions,
        };
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((res as any).timings) lastClientTimings = (res as any).timings;
      return res;
    },

    /**
     * T02 aggregation comparison: one parameterized statement verifies ownership and returns the
     * ordered 180-question payload as JSON text built from an explicit field allowlist
     * (id, subjectCode, topicSlug, stem, passage, options[id,label,text]). Answer keys and
     * explanations are never selected. The text is cast in SQL so the driver does not parse it.
     */
    async getAttemptPayloadJson(attemptId: string, userId: string, benchmarkSchema?: string) {
      if (benchmarkSchema) {
        assertValidBenchmarkSchema(benchmarkSchema);
        const rows = await sql`
          SELECT a.id::text AS attempt_id,
                 (SELECT count(*) FROM ${sql(benchmarkSchema)}.${sql('attempt_questions')} c WHERE c.attempt_id = a.id)::int AS total_questions,
                 COALESCE((
                   SELECT json_agg(json_build_object(
                            'id', q.id,
                            'subjectCode', q.subject,
                            'topicSlug', q.topic,
                            'stem', q.text,
                            'passage', q.passage,
                            'options', COALESCE((
                              SELECT json_agg(json_build_object('id', o.id, 'label', o.option_letter, 'text', o.text)
                                              ORDER BY o.option_order)
                              FROM ${sql(benchmarkSchema)}.${sql('question_options')} o
                              WHERE o.question_id = q.id
                            ), '[]'::json)
                          ) ORDER BY aq.question_order)
                   FROM ${sql(benchmarkSchema)}.${sql('attempt_questions')} aq
                   JOIN ${sql(benchmarkSchema)}.${sql('questions')} q ON q.id = aq.question_id
                   WHERE aq.attempt_id = a.id
                 ), '[]'::json)::text AS questions_json
          FROM ${sql(benchmarkSchema)}.${sql('attempts')} a
          WHERE a.id = ${attemptId}::uuid AND a.user_id = ${userId}::uuid
        `;
        if (!rows || rows.length === 0) {
          throw new Error('ATTEMPT_NOT_FOUND_OR_FORBIDDEN');
        }
        return assertSafePayloadJson(rows[0].attempt_id, rows[0].total_questions, rows[0].questions_json);
      }

      const res = await runInRollbackFixtureTx(sql, { testSubjectId, nowMs, scenario: 'payload' }, async (tx) => {
        const rows = await tx`
          SELECT a.id::text AS attempt_id,
                 (SELECT count(*) FROM pg_temp.spike_attempt_questions c WHERE c.attempt_id = a.id)::int AS total_questions,
                 COALESCE((
                   SELECT json_agg(json_build_object(
                            'id', q.id,
                            'subjectCode', q.subject,
                            'topicSlug', q.topic,
                            'stem', q.text,
                            'passage', q.passage,
                            'options', COALESCE((
                              SELECT json_agg(json_build_object('id', o.id, 'label', o.option_letter, 'text', o.text)
                                              ORDER BY o.option_order)
                              FROM pg_temp.spike_question_options o
                              WHERE o.question_id = q.id
                            ), '[]'::json)
                          ) ORDER BY aq.question_order)
                   FROM pg_temp.spike_attempt_questions aq
                   JOIN pg_temp.spike_questions q ON q.id = aq.question_id
                   WHERE aq.attempt_id = a.id
                 ), '[]'::json)::text AS questions_json
          FROM pg_temp.spike_attempts a
          WHERE a.id = ${attemptId}::uuid AND a.user_id = ${userId}::uuid
        `;
        if (!rows || rows.length === 0) {
          throw new Error('ATTEMPT_NOT_FOUND_OR_FORBIDDEN');
        }
        return assertSafePayloadJson(rows[0].attempt_id, rows[0].total_questions, rows[0].questions_json);
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((res as any).timings) lastClientTimings = (res as any).timings;
      return res;
    },

    async upsertAnswerInRollback(params) {
      if (params.benchmarkSchema) {
        assertValidBenchmarkSchema(params.benchmarkSchema);
        const rev = params.revision !== undefined ? params.revision : 1;
        if (!Number.isSafeInteger(rev) || rev <= 0) {
          throw new Error('INVALID_REVISION_NUMBER');
        }

        let writeResult: { success: boolean; rolledBack: boolean; ackRevision: number } | undefined;
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await runSerializableSpikeTransaction(sql, async (tx: any) => {
            const rows = await tx`
              WITH locked_attempt AS (
                SELECT id, user_id, status, started_at, expires_at
                FROM ${tx(params.benchmarkSchema!)}.${tx('attempts')}
                WHERE id = ${params.attemptId}::uuid
                FOR UPDATE
              ),
              ownership_check AS (
                SELECT
                  a.id,
                  a.status,
                  a.started_at,
                  a.expires_at,
                  (a.user_id = ${params.userId}::uuid) AS is_owner
                FROM locked_attempt a
              ),
              validation AS (
                SELECT
                  CASE
                    WHEN count(*) = 0 THEN 'ATTEMPT_NOT_FOUND'
                    WHEN bool_and(NOT is_owner) THEN 'FORBIDDEN'
                    WHEN bool_and(status != 'in_progress') THEN 'ATTEMPT_ALREADY_COMPLETED'
                    WHEN bool_and(${params.serverReceivedAt}::timestamptz > expires_at) THEN 'ATTEMPT_DEADLINE_EXCEEDED'
                    WHEN bool_and(${params.serverReceivedAt}::timestamptz < started_at) THEN 'ATTEMPT_NOT_STARTED'
                    ELSE 'OK'
                  END AS attempt_status
                FROM ownership_check
              ),
              question_check AS (
                SELECT
                  aq.question_id,
                  bool_or(o.id = ${params.selectedOptionId}) AS option_valid
                FROM ${tx(params.benchmarkSchema!)}.${tx('attempt_questions')} aq
                JOIN ${tx(params.benchmarkSchema!)}.${tx('questions')} q ON q.id = aq.question_id
                LEFT JOIN ${tx(params.benchmarkSchema!)}.${tx('question_options')} o ON o.question_id = q.id AND o.id = ${params.selectedOptionId}
                WHERE aq.attempt_id = ${params.attemptId}::uuid AND aq.question_id = ${params.questionId}
                GROUP BY aq.question_id
              ),
              existing_ans AS (
                SELECT revision
                FROM ${tx(params.benchmarkSchema!)}.${tx('attempt_answers')}
                WHERE attempt_id = ${params.attemptId}::uuid AND question_id = ${params.questionId}
                FOR UPDATE
              ),
              write_decision AS (
                SELECT
                  v.attempt_status,
                  CASE
                    WHEN v.attempt_status = 'ATTEMPT_NOT_FOUND' OR v.attempt_status = 'FORBIDDEN' THEN 'ATTEMPT_NOT_FOUND_OR_FORBIDDEN'
                    WHEN v.attempt_status != 'OK' THEN v.attempt_status
                    WHEN qc.question_id IS NULL THEN 'QUESTION_NOT_IN_ATTEMPT'
                    WHEN NOT COALESCE(qc.option_valid, false) THEN 'OPTION_NOT_IN_QUESTION'
                    WHEN ea.revision IS NOT NULL AND ${rev} <= ea.revision THEN 'STALE_REVISION_REJECTED'
                    ELSE 'PROCEED'
                  END AS decision_code
                FROM validation v
                LEFT JOIN question_check qc ON true
                LEFT JOIN existing_ans ea ON true
              ),
              upsert AS (
                INSERT INTO ${tx(params.benchmarkSchema!)}.${tx('attempt_answers')} (
                  attempt_id, question_id, selected_option_id, revision, server_received_at
                )
                SELECT
                  ${params.attemptId}::uuid,
                  ${params.questionId},
                  ${params.selectedOptionId},
                  ${rev},
                  ${params.serverReceivedAt}::timestamptz
                FROM write_decision
                WHERE decision_code = 'PROCEED'
                ON CONFLICT (attempt_id, question_id)
                DO UPDATE SET
                  selected_option_id = EXCLUDED.selected_option_id,
                  revision = EXCLUDED.revision,
                  server_received_at = EXCLUDED.server_received_at
                WHERE EXCLUDED.revision > attempt_answers.revision
                RETURNING revision, true AS written
              )
              SELECT
                wd.decision_code,
                COALESCE(u.written, false) AS written,
                u.revision AS ack_revision
              FROM write_decision wd
              LEFT JOIN upsert u ON true;
            `;

            const res = rows?.[0];
            if (!res) {
              throw new Error('WRITE_VALIDATION_FAILED');
            }

            if (res.decision_code !== 'PROCEED') {
              throw new Error(res.decision_code);
            }

            if (!res.written || res.ack_revision !== rev) {
              throw new Error('STALE_REVISION_REJECTED');
            }

            writeResult = { success: true, rolledBack: true, ackRevision: res.ack_revision };
            throw new Error('INTENTIONAL_SPIKE_ROLLBACK');
          });
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          if (msg === 'INTENTIONAL_SPIKE_ROLLBACK' && writeResult) {
            return writeResult;
          }
          throw err;
        }
        throw new Error('WRITE_ROLLBACK_MISSING');
      }

      const res = await runInRollbackFixtureTx(sql, { testSubjectId, nowMs, scenario: 'write' }, async (tx) => {
        // 1. Verify attempt ownership & active status with row lock (R2)
        const attempts = await tx`
          SELECT id, user_id, status, started_at, expires_at
          FROM pg_temp.spike_attempts
          WHERE id = ${params.attemptId}::uuid AND user_id = ${params.userId}::uuid
          FOR UPDATE
        `;

        if (attempts.length === 0) {
          throw new Error('ATTEMPT_NOT_FOUND_OR_FORBIDDEN');
        }

        const attempt = attempts[0];
        if (attempt.status !== 'in_progress') {
          throw new Error('ATTEMPT_ALREADY_COMPLETED');
        }

        // 2. Server deadline check using server-received time (C1)
        const receivedTime = new Date(params.serverReceivedAt).getTime();
        const deadlineTime = new Date(attempt.expires_at).getTime();
        if (receivedTime > deadlineTime) {
          throw new Error('ATTEMPT_DEADLINE_EXCEEDED');
        }

        // 3. Question and option membership check on tx via attempt_questions (C1)
        const membership = await tx`
          SELECT aq.question_id as q_id, o.id as o_id
          FROM pg_temp.spike_attempt_questions aq
          JOIN pg_temp.spike_questions q ON q.id = aq.question_id
          LEFT JOIN pg_temp.spike_question_options o ON o.question_id = q.id AND o.id = ${params.selectedOptionId}
          WHERE aq.attempt_id = ${params.attemptId}::uuid AND aq.question_id = ${params.questionId}
        `;

        if (membership.length === 0) {
          throw new Error('QUESTION_NOT_IN_ATTEMPT');
        }
        if (!membership[0].o_id) {
          throw new Error('OPTION_NOT_IN_QUESTION');
        }

        // 4. Monotonic revision check with row lock on tx
        const rev = params.revision !== undefined ? params.revision : 1;
        if (!Number.isSafeInteger(rev) || rev <= 0) {
          throw new Error('INVALID_REVISION_NUMBER');
        }

        const existingAnswers = await tx`
          SELECT revision FROM pg_temp.spike_attempt_answers
          WHERE attempt_id = ${params.attemptId}::uuid AND question_id = ${params.questionId}
          FOR UPDATE
        `;

        if (existingAnswers.length > 0 && rev <= existingAnswers[0].revision) {
          throw new Error('STALE_REVISION_REJECTED');
        }

        // 5. Conditional monotonic upsert
        await tx`
          INSERT INTO pg_temp.spike_attempt_answers (attempt_id, question_id, selected_option_id, revision, server_received_at)
          VALUES (${params.attemptId}::uuid, ${params.questionId}, ${params.selectedOptionId}, ${rev}, ${params.serverReceivedAt}::timestamptz)
          ON CONFLICT (attempt_id, question_id)
          DO UPDATE SET
            selected_option_id = EXCLUDED.selected_option_id,
            revision = EXCLUDED.revision,
            server_received_at = EXCLUDED.server_received_at
          WHERE EXCLUDED.revision > pg_temp.spike_attempt_answers.revision;
        `;

        return { success: true, rolledBack: true, ackRevision: rev };
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((res as any).timings) lastClientTimings = (res as any).timings;
      return res;
    },

    async scoreAttemptInRollback(params) {
      if (params.benchmarkSchema) {
        assertValidBenchmarkSchema(params.benchmarkSchema);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let scoreResult: any;
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await runSerializableSpikeTransaction(sql, async (tx: any) => {
            const rows = await tx`
              WITH locked_attempt AS (
                SELECT id, user_id, status, started_at, expires_at
                FROM ${tx(params.benchmarkSchema!)}.${tx('attempts')}
                WHERE id = ${params.attemptId}::uuid
                FOR UPDATE
              ),
              ownership_check AS (
                SELECT id, status, (user_id = ${params.userId}::uuid) AS is_owner
                FROM locked_attempt
              ),
              validation AS (
                SELECT
                  (array_agg(id))[1] AS id,
                  CASE
                    WHEN count(*) = 0 THEN 'ATTEMPT_NOT_FOUND'
                    WHEN bool_and(NOT is_owner) THEN 'FORBIDDEN'
                    WHEN bool_and(status != 'in_progress') THEN 'ATTEMPT_ALREADY_COMPLETED'
                    ELSE 'OK'
                  END AS decision_code
                FROM ownership_check
              ),
              timely AS (
                SELECT
                  q.subject,
                  (a.selected_option_id = q.correct_option_id) AS is_correct
                FROM locked_attempt att
                JOIN ${tx(params.benchmarkSchema!)}.${tx('attempt_answers')} a ON a.attempt_id = att.id
                JOIN ${tx(params.benchmarkSchema!)}.${tx('attempt_questions')} aq ON aq.attempt_id = a.attempt_id AND aq.question_id = a.question_id
                JOIN ${tx(params.benchmarkSchema!)}.${tx('questions')} q ON q.id = aq.question_id
                WHERE att.status = 'in_progress'
                  AND att.user_id = ${params.userId}::uuid
                  AND date_trunc('milliseconds', a.server_received_at) >= att.started_at
                  AND date_trunc('milliseconds', a.server_received_at) <= LEAST(att.expires_at, ${params.serverSubmittedAt}::timestamptz)
              ),
              scoring AS (
                SELECT
                  COALESCE(count(*) FILTER (WHERE is_correct AND subject = 'ENG'), 0)::int AS eng_correct,
                  COALESCE(count(*) FILTER (WHERE is_correct AND subject = 'MTH'), 0)::int AS mth_correct,
                  COALESCE(count(*) FILTER (WHERE is_correct AND subject = 'PHY'), 0)::int AS phy_correct,
                  COALESCE(count(*) FILTER (WHERE is_correct AND subject = 'CHM'), 0)::int AS chm_correct,
                  COALESCE(count(*) FILTER (WHERE is_correct), 0)::int AS total_correct,
                  COALESCE(count(*), 0)::int AS total_timely,
                  ROUND((COALESCE(count(*) FILTER (WHERE is_correct AND subject = 'ENG'), 0)::numeric / 60.0) * 100)::int AS eng_scaled,
                  ROUND((COALESCE(count(*) FILTER (WHERE is_correct AND subject = 'MTH'), 0)::numeric / 40.0) * 100)::int AS mth_scaled,
                  ROUND((COALESCE(count(*) FILTER (WHERE is_correct AND subject = 'PHY'), 0)::numeric / 40.0) * 100)::int AS phy_scaled,
                  ROUND((COALESCE(count(*) FILTER (WHERE is_correct AND subject = 'CHM'), 0)::numeric / 40.0) * 100)::int AS chm_scaled
                FROM timely
              ),
              computed_totals AS (
                SELECT
                  s.*,
                  (s.eng_scaled + s.mth_scaled + s.phy_scaled + s.chm_scaled)::int AS total_score
                FROM scoring s
              ),
              ins_results AS (
                INSERT INTO ${tx(params.benchmarkSchema!)}.${tx('attempt_results')} (
                  attempt_id, eng_score, mth_score, phy_score, chm_score, total_score, created_at
                )
                SELECT
                  v.id,
                  c.eng_scaled,
                  c.mth_scaled,
                  c.phy_scaled,
                  c.chm_scaled,
                  c.total_score,
                  NOW()
                FROM validation v
                CROSS JOIN computed_totals c
                WHERE v.decision_code = 'OK'
                ON CONFLICT (attempt_id) DO NOTHING
                RETURNING attempt_id
              ),
              upd_attempt AS (
                UPDATE ${tx(params.benchmarkSchema!)}.${tx('attempts')} a
                SET
                  status = 'completed',
                  is_completed = true,
                  total_score = c.total_score,
                  total_correct = c.total_correct
                FROM validation v
                CROSS JOIN computed_totals c
                WHERE a.id = v.id AND v.decision_code = 'OK'
                RETURNING a.id
              )
              SELECT
                COALESCE(v.decision_code, 'ATTEMPT_NOT_FOUND') AS decision_code,
                c.total_score,
                c.eng_scaled, c.eng_correct,
                c.mth_scaled, c.mth_correct,
                c.phy_scaled, c.phy_correct,
                c.chm_scaled, c.chm_correct,
                c.total_correct,
                c.total_timely,
                (ua.id IS NOT NULL) AS updated,
                EXISTS (SELECT 1 FROM ins_results) AS result_inserted
              FROM validation v
              LEFT JOIN computed_totals c ON true
              LEFT JOIN upd_attempt ua ON true;
            `;

            const res = rows?.[0];
            if (!res) {
              throw new Error('SCORE_VALIDATION_FAILED');
            }

            if (res.decision_code === 'ATTEMPT_NOT_FOUND' || res.decision_code === 'FORBIDDEN') {
              throw new Error('ATTEMPT_NOT_FOUND_OR_FORBIDDEN');
            }

            if (res.decision_code !== 'OK') {
              throw new Error(res.decision_code);
            }

            if (res.updated !== true || res.result_inserted !== true) {
              throw new Error('SCORE_FINALIZATION_FAILED');
            }

            scoreResult = {
              totalScore: res.total_score,
              subjectScores: {
                ENG: { rawCorrect: res.eng_correct, totalQuestions: 60, scaledScore: res.eng_scaled },
                MTH: { rawCorrect: res.mth_correct, totalQuestions: 40, scaledScore: res.mth_scaled },
                PHY: { rawCorrect: res.phy_correct, totalQuestions: 40, scaledScore: res.phy_scaled },
                CHM: { rawCorrect: res.chm_correct, totalQuestions: 40, scaledScore: res.chm_scaled },
              },
              totalCorrect: res.total_correct,
              totalAnsweredTimely: res.total_timely,
              rolledBack: true,
            };
            throw new Error('INTENTIONAL_SPIKE_ROLLBACK');
          });
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          if (msg === 'INTENTIONAL_SPIKE_ROLLBACK' && scoreResult) {
            return scoreResult;
          }
          throw err;
        }
        throw new Error('SCORE_ROLLBACK_MISSING');
      }

      const res = await runInRollbackFixtureTx(sql, { testSubjectId, nowMs, scenario: 'score' }, async (tx) => {
        // 1+2. T02 aggregation comparison: one parameterized statement locks the owned attempt and
        // aggregates server-stored timely answers (attempt-question membership enforced by join)
        // into four subject counts. No per-answer rows are decoded in the Worker. The timeliness
        // window startedAt..min(expiresAt, serverSubmittedAt) matches the previous millisecond
        // comparison via date_trunc('milliseconds').
        const aggregateRows = await tx`
          WITH att AS (
            SELECT id, started_at, expires_at
            FROM pg_temp.spike_attempts
            WHERE id = ${params.attemptId}::uuid AND user_id = ${params.userId}::uuid
            FOR UPDATE
          ),
          timely AS (
            SELECT q.subject, (a.selected_option_id = q.correct_option_id) AS is_correct
            FROM att
            JOIN pg_temp.spike_attempt_answers a ON a.attempt_id = att.id
            JOIN pg_temp.spike_attempt_questions aq ON aq.attempt_id = a.attempt_id AND aq.question_id = a.question_id
            JOIN pg_temp.spike_questions q ON q.id = aq.question_id
            WHERE date_trunc('milliseconds', a.server_received_at) >= att.started_at
              AND date_trunc('milliseconds', a.server_received_at) <= LEAST(att.expires_at, ${params.serverSubmittedAt}::timestamptz)
          )
          SELECT
            (SELECT count(*) FROM att)::int AS owned_count,
            count(*) FILTER (WHERE is_correct AND subject = 'ENG')::int AS eng_correct,
            count(*) FILTER (WHERE is_correct AND subject = 'MTH')::int AS mth_correct,
            count(*) FILTER (WHERE is_correct AND subject = 'PHY')::int AS phy_correct,
            count(*) FILTER (WHERE is_correct AND subject = 'CHM')::int AS chm_correct,
            count(*) FILTER (WHERE is_correct)::int AS total_correct,
            count(*)::int AS total_timely
          FROM timely
        `;

        const agg = aggregateRows?.[0];
        if (!agg || agg.owned_count !== 1) {
          throw new Error('ATTEMPT_NOT_FOUND_OR_FORBIDDEN');
        }

        const subjectStats: Record<string, { rawCorrect: number; totalQuestions: number }> = {
          ENG: { rawCorrect: agg.eng_correct, totalQuestions: 60 },
          MTH: { rawCorrect: agg.mth_correct, totalQuestions: 40 },
          PHY: { rawCorrect: agg.phy_correct, totalQuestions: 40 },
          CHM: { rawCorrect: agg.chm_correct, totalQuestions: 40 },
        };
        const totalCorrect: number = agg.total_correct;
        const totalAnsweredTimely: number = agg.total_timely;

        const subjectScores: Record<string, { rawCorrect: number; totalQuestions: number; scaledScore: number }> = {};
        let totalScore = 0;

        for (const [code, stats] of Object.entries(subjectStats)) {
          const scaled = Math.round((stats.rawCorrect / stats.totalQuestions) * 100);
          subjectScores[code] = {
            rawCorrect: stats.rawCorrect,
            totalQuestions: stats.totalQuestions,
            scaledScore: scaled,
          };
          totalScore += scaled;
        }

        // 3. Write fixture result / finalization on tx (R1)
        await tx`
          INSERT INTO pg_temp.spike_attempt_results (attempt_id, user_id, total_score, total_correct, total_answered, completed_at)
          VALUES (
            ${params.attemptId}::uuid,
            ${params.userId}::uuid,
            ${totalScore},
            ${totalCorrect},
            ${totalAnsweredTimely},
            ${params.serverSubmittedAt}::timestamptz
          )
          ON CONFLICT (attempt_id) DO UPDATE SET
            total_score = EXCLUDED.total_score,
            total_correct = EXCLUDED.total_correct,
            total_answered = EXCLUDED.total_answered,
            completed_at = EXCLUDED.completed_at;
        `;

        await tx`
          UPDATE pg_temp.spike_attempts
          SET status = 'completed'
          WHERE id = ${params.attemptId}::uuid;
        `;

        return {
          totalScore,
          subjectScores,
          totalCorrect,
          totalAnsweredTimely,
          rolledBack: true,
        };
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((res as any).timings) lastClientTimings = (res as any).timings;
      return res;
    },

    async cleanup() {
      try {
        if (typeof sql.end === 'function') {
          await sql.end({ timeout: 1 });
        }
      } catch {
        // Ignore cleanup errors
      }
    },
  };
}

/**
 * In-memory Mock Database Client for Unit Tests and Offline Scenarios (R1, R2, C1)
 * Mirrors the exact same contracts, state validation, and dynamic timestamps.
 */
export function createMockSpikeDbClient(
  testSubjectId: string = SPIKE_TEST_SUBJECT_ID,
  nowMs: number = Date.now()
): SpikeDatabaseClient {
  const fixtures = deriveAttemptFixtures(testSubjectId, nowMs);

  // Stored answers: attemptId:questionId -> { selectedOptionId, revision, serverReceivedAt }
  const storedAnswers = new Map<
    string,
    { selectedOptionId: string; revision: number; serverReceivedAt: string }
  >();

  // Pre-seed stored answers for deterministic score tests:
  // 1. SPIKE_TEST_ATTEMPT_ID -> 75% accuracy (300 points)
  const activeAtt = fixtures.attempts.get(SPIKE_TEST_ATTEMPT_ID)!;
  for (const a of generateCandidateAnswersWithAccuracy(SYNTHETIC_180_QUESTIONS, activeAtt.startedAt, activeAtt.expiresAt, 0.75, nowMs)) {
    storedAnswers.set(`${SPIKE_TEST_ATTEMPT_ID}:${a.questionId}`, {
      selectedOptionId: a.selectedOptionId,
      revision: 1,
      serverReceivedAt: a.answeredAt,
    });
  }

  // 2. SPIKE_PERFECT_ATTEMPT_ID -> 100% accuracy (400 points)
  const perfectAtt = fixtures.attempts.get(SPIKE_PERFECT_ATTEMPT_ID)!;
  for (const a of generateCandidateAnswersWithAccuracy(SYNTHETIC_180_QUESTIONS, perfectAtt.startedAt, perfectAtt.expiresAt, 1.0, nowMs)) {
    storedAnswers.set(`${SPIKE_PERFECT_ATTEMPT_ID}:${a.questionId}`, {
      selectedOptionId: a.selectedOptionId,
      revision: 1,
      serverReceivedAt: a.answeredAt,
    });
  }

  // 3. SPIKE_ZERO_ATTEMPT_ID -> 0% accuracy (0 points)
  const zeroAtt = fixtures.attempts.get(SPIKE_ZERO_ATTEMPT_ID)!;
  for (const a of generateCandidateAnswersWithAccuracy(SYNTHETIC_180_QUESTIONS, zeroAtt.startedAt, zeroAtt.expiresAt, 0.0, nowMs)) {
    storedAnswers.set(`${SPIKE_ZERO_ATTEMPT_ID}:${a.questionId}`, {
      selectedOptionId: a.selectedOptionId,
      revision: 1,
      serverReceivedAt: a.answeredAt,
    });
  }

  return {
    isMock: true,

    async getProfileAndEntitlement(userId: string, _benchmarkSchema?: string) {
      if (userId === testSubjectId) {
        return {
          profile: fixtures.profile,
          entitlement: fixtures.entitlement,
        };
      }
      return { profile: null, entitlement: null };
    },

    async getAttempt(attemptId: string) {
      return fixtures.attempts.get(attemptId) || null;
    },

    async getAttemptPayload(attemptId: string, userId: string) {
      const attempt = fixtures.attempts.get(attemptId);
      if (!attempt || attempt.userId !== userId) {
        throw new Error('ATTEMPT_NOT_FOUND_OR_FORBIDDEN');
      }

      return {
        attemptId,
        totalQuestions: SYNTHETIC_180_QUESTIONS.length,
        questions: sanitizeExamPayload(SYNTHETIC_180_QUESTIONS),
      };
    },

    async getAttemptPayloadJson(attemptId: string, userId: string, _benchmarkSchema?: string) {
      const attempt = fixtures.attempts.get(attemptId);
      if (!attempt || attempt.userId !== userId) {
        throw new Error('ATTEMPT_NOT_FOUND_OR_FORBIDDEN');
      }
      const questions = sanitizeExamPayload(SYNTHETIC_180_QUESTIONS);
      return assertSafePayloadJson(attemptId, questions.length, JSON.stringify(questions));
    },

    async upsertAnswerInRollback(params) {
      const attempt = fixtures.attempts.get(params.attemptId);
      if (!attempt || attempt.userId !== params.userId) {
        throw new Error('ATTEMPT_NOT_FOUND_OR_FORBIDDEN');
      }

      if (attempt.status !== 'in_progress') {
        throw new Error('ATTEMPT_ALREADY_COMPLETED');
      }

      const receivedTime = new Date(params.serverReceivedAt).getTime();
      const deadlineTime = new Date(attempt.expiresAt).getTime();
      if (receivedTime > deadlineTime) {
        throw new Error('ATTEMPT_DEADLINE_EXCEEDED');
      }

      const question = SYNTHETIC_180_QUESTIONS.find((q) => q.id === params.questionId);
      if (!question) {
        throw new Error('QUESTION_NOT_IN_ATTEMPT');
      }

      const optionValid = question.options.some((o) => o.id === params.selectedOptionId);
      if (!optionValid) {
        throw new Error('OPTION_NOT_IN_QUESTION');
      }

      const rev = params.revision !== undefined ? params.revision : 1;
      if (!Number.isSafeInteger(rev) || rev <= 0) {
        throw new Error('INVALID_REVISION_NUMBER');
      }

      const key = `${params.attemptId}:${params.questionId}`;
      const existing = storedAnswers.get(key);
      if (existing && rev <= existing.revision) {
        throw new Error('STALE_REVISION_REJECTED');
      }

      // Validated; state rolled back (not persisted to mock store)
      return { success: true, rolledBack: true, ackRevision: rev };
    },

    async scoreAttemptInRollback(params) {
      const attempt = fixtures.attempts.get(params.attemptId);
      if (!attempt || attempt.userId !== params.userId) {
        throw new Error('ATTEMPT_NOT_FOUND_OR_FORBIDDEN');
      }

      // Gather server-stored answers for this attempt
      const candidateAnswers: Array<{ questionId: string; selectedOptionId: string; answeredAt: string }> = [];
      for (const [key, val] of storedAnswers.entries()) {
        if (key.startsWith(`${params.attemptId}:`)) {
          const qId = key.split(':')[1];
          candidateAnswers.push({
            questionId: qId,
            selectedOptionId: val.selectedOptionId,
            answeredAt: val.serverReceivedAt,
          });
        }
      }

      const score = scoreMockAttempt(SYNTHETIC_180_QUESTIONS, candidateAnswers, attempt.expiresAt, attempt.startedAt, params.serverSubmittedAt);
      return { ...score, rolledBack: true };
    },

    async cleanup() {
      // No-op for mock client
    },
  };
}
