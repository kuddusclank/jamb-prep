import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { randomBytes, randomUUID } from 'node:crypto';
import postgres from 'postgres';
import { recordRequestInLedger } from './ledger.mjs';

export const BENCHMARK_SCHEMA_PATTERN = /^jambprep_benchmark_[0-9a-f]{8,16}$/;
export const DEFAULT_MANIFEST_PATH = '/tmp/benchmark-fixture-manifest.json';
export const DEFAULT_RECEIPT_PATH = '/tmp/benchmark-cleanup-receipt.json';

const EXPECTED_TABLES = [
  'profiles',
  'entitlements',
  'questions',
  'question_options',
  'attempts',
  'attempt_questions',
  'attempt_answers',
  'attempt_results',
];

export function generateBenchmarkSchemaName() {
  const hex = randomBytes(6).toString('hex');
  const name = `jambprep_benchmark_${hex}`;
  if (!BENCHMARK_SCHEMA_PATTERN.test(name)) {
    throw new Error(`Generated invalid benchmark schema name: ${name}`);
  }
  return name;
}

export function createBenchmarkManifest(schemaName, testSubjectId, foreignSubjectId) {
  if (!BENCHMARK_SCHEMA_PATTERN.test(schemaName)) {
    throw new Error(`Invalid benchmark schema name: ${schemaName}`);
  }
  const testAttemptId = randomUUID();
  const perfectAttemptId = randomUUID();
  const zeroAttemptId = randomUUID();
  const foreignAttemptId = randomUUID();
  const expiredAttemptId = randomUUID();
  const writeAttemptId = randomUUID();
  const completedAttemptId = randomUUID();

  return {
    version: '1.0.0',
    schemaName,
    createdAt: new Date().toISOString(),
    expectedTables: EXPECTED_TABLES,
    deterministicIds: {
      testSubjectId,
      foreignSubjectId,
      testAttemptId,
      perfectAttemptId,
      zeroAttemptId,
      foreignAttemptId,
      expiredAttemptId,
      writeAttemptId,
      completedAttemptId,
    },
    cleanupSql: `DROP SCHEMA IF EXISTS "${schemaName}" CASCADE;`,
  };
}

export function assertBenchmarkInventory(manifest, tableNames) {
  if (!BENCHMARK_SCHEMA_PATTERN.test(manifest?.schemaName)
      || !Array.isArray(manifest.expectedTables)
      || manifest.expectedTables.length !== EXPECTED_TABLES.length
      || EXPECTED_TABLES.some(name => !manifest.expectedTables.includes(name))
      || tableNames.some(name => !EXPECTED_TABLES.includes(name))
      || new Set(tableNames).size !== tableNames.length) {
    throw new Error('Unexpected benchmark inventory; refusing destructive cleanup');
  }
}

export async function setupBenchmarkFixture(options = {}) {
  const directDatabaseUrl = options.directDatabaseUrl || process.env.BENCHMARK_DATABASE_URL || process.env.DATABASE_URL || process.env.DIRECT_DATABASE_URL;
  if (!directDatabaseUrl) {
    throw new Error('DATABASE_URL or DIRECT_DATABASE_URL is required for benchmark fixture setup');
  }

  const manifestPath = options.manifestPath || process.env.SPIKE_FIXTURE_MANIFEST_FILE || DEFAULT_MANIFEST_PATH;
  if (existsSync(manifestPath)) {
    throw new Error(`Manifest already exists at ${manifestPath}; cleanup first or choose a new path`);
  }

  const testSubjectId = options.testSubjectId || '547fee7d-27cc-403f-8097-b2afb7cbc438';
  const foreignSubjectId = options.foreignSubjectId || 'c9b5d2f3-1111-4444-8888-999999999999';

  const schemaName = generateBenchmarkSchemaName();
  const manifest = createBenchmarkManifest(schemaName, testSubjectId, foreignSubjectId);

  // Persist private 0600 manifest BEFORE any DDL is issued
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', { mode: 0o600, flag: 'wx' });

  // Reserve 64 database operations in cumulative ledger BEFORE any network call
  recordRequestInLedger(
    `setup-${randomUUID()}`,
    `Pre-seeded benchmark fixture DDL and deterministic seeding for schema ${schemaName}`,
    64
  );

  const sql = postgres(directDatabaseUrl, {
    max: 1,
    connect_timeout: 10,
    idle_timeout: 10,
    prepare: true,
  });

  try {
    // 1. Collision Check
    const collisions = await sql`
      SELECT 1 FROM information_schema.schemata WHERE schema_name = ${schemaName};
    `;
    if (collisions.length > 0) {
      throw new Error(`Schema collision detected: ${schemaName} already exists!`);
    }

    // 2. Inspect PostgREST exposed schemas to confirm schema is outside
    let pgrstSchemas = '';
    try {
      const pgrstSetting = await sql`
        SELECT current_setting('pgrst.db_schemas', true) AS pgrst_schemas;
      `;
      pgrstSchemas = pgrstSetting[0]?.pgrst_schemas || '';
    } catch {
      // If setting is not set, defaults to 'public'
      pgrstSchemas = 'public';
    }
    const exposedList = pgrstSchemas.split(',').map((s) => s.trim());
    if (exposedList.includes(schemaName)) {
      throw new Error(`Schema ${schemaName} is inside exposed PostgREST schemas (${pgrstSchemas})! Refusing setup.`);
    }

    // 3. Create schema and lock down privileges
    await sql.unsafe(`CREATE SCHEMA "${schemaName}";`);
    await sql.unsafe(`REVOKE ALL ON SCHEMA "${schemaName}" FROM PUBLIC, anon, authenticated;`);

    // 4. Create Tables with RLS and revoked privileges
    await sql.begin(async (tx) => {
      await tx.unsafe(`
        CREATE TABLE "${schemaName}".profiles (
          id UUID PRIMARY KEY,
          display_name TEXT NOT NULL,
          email TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'student'
        );
        CREATE TABLE "${schemaName}".entitlements (
          id UUID PRIMARY KEY,
          user_id UUID NOT NULL REFERENCES "${schemaName}".profiles(id) ON DELETE CASCADE,
          is_premium BOOLEAN NOT NULL DEFAULT false,
          status TEXT NOT NULL DEFAULT 'active',
          expires_at TIMESTAMPTZ NOT NULL
        );
        CREATE TABLE "${schemaName}".questions (
          id TEXT PRIMARY KEY,
          subject TEXT NOT NULL,
          topic TEXT NOT NULL,
          text TEXT NOT NULL,
          passage TEXT,
          correct_option_id TEXT NOT NULL
        );
        CREATE TABLE "${schemaName}".question_options (
          id TEXT PRIMARY KEY,
          question_id TEXT NOT NULL REFERENCES "${schemaName}".questions(id) ON DELETE CASCADE,
          option_letter TEXT NOT NULL,
          option_order INTEGER NOT NULL,
          text TEXT NOT NULL
        );
        CREATE TABLE "${schemaName}".attempts (
          id UUID PRIMARY KEY,
          user_id UUID NOT NULL,
          status TEXT NOT NULL DEFAULT 'in_progress',
          started_at TIMESTAMPTZ NOT NULL,
          expires_at TIMESTAMPTZ NOT NULL,
          is_completed BOOLEAN NOT NULL DEFAULT false,
          total_score INTEGER,
          total_correct INTEGER
        );
        CREATE TABLE "${schemaName}".attempt_questions (
          attempt_id UUID NOT NULL REFERENCES "${schemaName}".attempts(id) ON DELETE CASCADE,
          question_id TEXT NOT NULL REFERENCES "${schemaName}".questions(id) ON DELETE CASCADE,
          question_order INTEGER NOT NULL,
          PRIMARY KEY (attempt_id, question_id)
        );
        CREATE TABLE "${schemaName}".attempt_answers (
          attempt_id UUID NOT NULL REFERENCES "${schemaName}".attempts(id) ON DELETE CASCADE,
          question_id TEXT NOT NULL REFERENCES "${schemaName}".questions(id) ON DELETE CASCADE,
          selected_option_id TEXT NOT NULL,
          revision INTEGER NOT NULL DEFAULT 1,
          server_received_at TIMESTAMPTZ NOT NULL,
          PRIMARY KEY (attempt_id, question_id)
        );
        CREATE TABLE "${schemaName}".attempt_results (
          attempt_id UUID PRIMARY KEY REFERENCES "${schemaName}".attempts(id) ON DELETE CASCADE,
          eng_score INTEGER NOT NULL,
          mth_score INTEGER NOT NULL,
          phy_score INTEGER NOT NULL,
          chm_score INTEGER NOT NULL,
          total_score INTEGER NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);

      for (const tbl of EXPECTED_TABLES) {
        await tx.unsafe(`ALTER TABLE "${schemaName}"."${tbl}" ENABLE ROW LEVEL SECURITY;`);
        await tx.unsafe(`REVOKE ALL ON "${schemaName}"."${tbl}" FROM PUBLIC, anon, authenticated;`);
      }
    });

    // 5. Verify no browser read/write privileges
    const privChecks = await sql`
      SELECT table_name,
             has_table_privilege('anon', format('%I.%I', ${schemaName}::text, table_name), 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') as anon_select,
             has_table_privilege('authenticated', format('%I.%I', ${schemaName}::text, table_name), 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') as auth_select
      FROM information_schema.tables
      WHERE table_schema = ${schemaName}::text;
    `;
    for (const row of privChecks) {
      if (row.anon_select || row.auth_select) {
        throw new Error(`Security isolation failure: Table ${row.table_name} has public/anon/auth access!`);
      }
    }

    // 6. Deterministic Seeding
    await sql.begin(async (tx) => {
      // Seed profiles & entitlements
      await tx`
        INSERT INTO ${tx(schemaName)}.${tx('profiles')} (id, display_name, email, role)
        VALUES
          (${testSubjectId}::uuid, 'Test Candidate', 'test@example.com', 'student'),
          (${foreignSubjectId}::uuid, 'Foreign Candidate', 'foreign@example.com', 'student');
      `;

      await tx`
        INSERT INTO ${tx(schemaName)}.${tx('entitlements')} (id, user_id, is_premium, status, expires_at)
        VALUES
          (${randomUUID()}::uuid, ${testSubjectId}::uuid, true, 'active', NOW() + INTERVAL '30 days');
      `;

      // Seed 180 questions (60 ENG, 40 MTH, 40 PHY, 40 CHM)
      await tx`
        WITH subjects AS (
          SELECT 'ENG'::text AS code, 'English'::text AS name, 60 AS count, 'comprehension'::text AS topic UNION ALL
          SELECT 'MTH', 'Mathematics', 40, 'algebra' UNION ALL
          SELECT 'PHY', 'Physics', 40, 'mechanics' UNION ALL
          SELECT 'CHM', 'Chemistry', 40, 'organic'
        )
        INSERT INTO ${tx(schemaName)}.${tx('questions')} (id, subject, topic, text, passage, correct_option_id)
        SELECT
          lower(s.code) || '-q' || lpad(gs::text, 3, '0') AS id,
          s.code AS subject,
          s.topic AS topic,
          'Sample question ' || gs::text || ' for ' || s.name AS text,
          CASE WHEN s.code = 'ENG' AND gs <= 15 THEN 'Reading comprehension passage about science and literature.' ELSE NULL END AS passage,
          lower(s.code) || '-q' || lpad(gs::text, 3, '0') || '-opt-a' AS correct_option_id
        FROM subjects s
        CROSS JOIN generate_series(1, s.count) gs;
      `;

      // Seed 720 options (4 per question, option A is correct)
      await tx`
        WITH opt_defs AS (
          SELECT 'A'::text AS letter, 1 AS ord, '-opt-a'::text AS sfx, 'Option A description'::text AS descr UNION ALL
          SELECT 'B', 2, '-opt-b', 'Option B description' UNION ALL
          SELECT 'C', 3, '-opt-c', 'Option C description' UNION ALL
          SELECT 'D', 4, '-opt-d', 'Option D description'
        )
        INSERT INTO ${tx(schemaName)}.${tx('question_options')} (id, question_id, option_letter, option_order, text)
        SELECT
          q.id || o.sfx AS id,
          q.id AS question_id,
          o.letter AS option_letter,
          o.ord AS option_order,
          o.descr || ' for ' || q.id AS text
        FROM ${tx(schemaName)}.${tx('questions')} q
        CROSS JOIN opt_defs o;
      `;

      // Seed attempts
      const {
        testAttemptId,
        perfectAttemptId,
        zeroAttemptId,
        foreignAttemptId,
        expiredAttemptId,
        writeAttemptId,
        completedAttemptId,
      } = manifest.deterministicIds;

      await tx`
        INSERT INTO ${tx(schemaName)}.${tx('attempts')} (id, user_id, status, started_at, expires_at, is_completed)
        VALUES
          (${testAttemptId}::uuid, ${testSubjectId}::uuid, 'in_progress', NOW() - INTERVAL '30 minutes', NOW() + INTERVAL '24 hours', false),
          (${perfectAttemptId}::uuid, ${testSubjectId}::uuid, 'in_progress', NOW() - INTERVAL '30 minutes', NOW() + INTERVAL '24 hours', false),
          (${zeroAttemptId}::uuid, ${testSubjectId}::uuid, 'in_progress', NOW() - INTERVAL '30 minutes', NOW() + INTERVAL '24 hours', false),
          (${foreignAttemptId}::uuid, ${foreignSubjectId}::uuid, 'in_progress', NOW() - INTERVAL '30 minutes', NOW() + INTERVAL '24 hours', false),
          (${expiredAttemptId}::uuid, ${testSubjectId}::uuid, 'in_progress', NOW() - INTERVAL '120 minutes', NOW() - INTERVAL '10 minutes', false),
          (${writeAttemptId}::uuid, ${testSubjectId}::uuid, 'in_progress', NOW() - INTERVAL '30 minutes', NOW() + INTERVAL '24 hours', false),
          (${completedAttemptId}::uuid, ${testSubjectId}::uuid, 'completed', NOW() - INTERVAL '30 minutes', NOW() + INTERVAL '24 hours', true);
      `;

      // Link attempt_questions (all 180 questions for each attempt, ordered by subject then id)
      await tx`
        WITH q_ordered AS (
          SELECT id, row_number() OVER (
            ORDER BY
              CASE
                WHEN subject = 'ENG' THEN 1
                WHEN subject = 'MTH' THEN 2
                WHEN subject = 'PHY' THEN 3
                WHEN subject = 'CHM' THEN 4
                ELSE 5
              END,
              id
          ) AS ord
          FROM ${tx(schemaName)}.${tx('questions')}
        ),
        attempt_list AS (
          SELECT unnest(ARRAY[
            ${testAttemptId}::uuid,
            ${perfectAttemptId}::uuid,
            ${zeroAttemptId}::uuid,
            ${foreignAttemptId}::uuid,
            ${expiredAttemptId}::uuid,
            ${writeAttemptId}::uuid,
            ${completedAttemptId}::uuid
          ]) AS att_id
        )
        INSERT INTO ${tx(schemaName)}.${tx('attempt_questions')} (attempt_id, question_id, question_order)
        SELECT a.att_id, q.id, q.ord
        FROM attempt_list a
        CROSS JOIN q_ordered q;
      `;

      // Seed answers:
      // 1. testAttemptId: 75% accuracy (135 correct out of 180 = 300 points)
      await tx`
        WITH q_ordered AS (
          SELECT id, correct_option_id, row_number() OVER (
            ORDER BY
              CASE
                WHEN subject = 'ENG' THEN 1
                WHEN subject = 'MTH' THEN 2
                WHEN subject = 'PHY' THEN 3
                WHEN subject = 'CHM' THEN 4
                ELSE 5
              END,
              id
          ) AS ord
          FROM ${tx(schemaName)}.${tx('questions')}
        )
        INSERT INTO ${tx(schemaName)}.${tx('attempt_answers')} (attempt_id, question_id, selected_option_id, revision, server_received_at)
        SELECT
          ${testAttemptId}::uuid,
          q.id,
          CASE WHEN (q.ord % 4) != 0 THEN q.correct_option_id ELSE q.id || '-opt-b' END,
          1,
          NOW() - INTERVAL '15 minutes'
        FROM q_ordered q;
      `;

      // 2. perfectAttemptId: 100% accuracy (180 correct = 400 points)
      await tx`
        INSERT INTO ${tx(schemaName)}.${tx('attempt_answers')} (attempt_id, question_id, selected_option_id, revision, server_received_at)
        SELECT
          ${perfectAttemptId}::uuid,
          q.id,
          q.correct_option_id,
          1,
          NOW() - INTERVAL '15 minutes'
        FROM ${tx(schemaName)}.${tx('questions')} q;
      `;

      // 3. zeroAttemptId: 0% accuracy (0 correct = 0 points)
      await tx`
        INSERT INTO ${tx(schemaName)}.${tx('attempt_answers')} (attempt_id, question_id, selected_option_id, revision, server_received_at)
        SELECT
          ${zeroAttemptId}::uuid,
          q.id,
          q.id || '-opt-b',
          1,
          NOW() - INTERVAL '15 minutes'
        FROM ${tx(schemaName)}.${tx('questions')} q;
      `;

      // 4. writeAttemptId: 1 pre-seeded answer on Q1 with revision: 1
      await tx`
        INSERT INTO ${tx(schemaName)}.${tx('attempt_answers')} (attempt_id, question_id, selected_option_id, revision, server_received_at)
        SELECT
          ${writeAttemptId}::uuid,
          'eng-q001',
          'eng-q001-opt-a',
          1,
          NOW() - INTERVAL '15 minutes';
      `;
    });

    return manifest;
  } finally {
    await sql.end({ timeout: 5 });
  }
}

export async function cleanupBenchmarkFixture(options = {}) {
  const directDatabaseUrl = options.directDatabaseUrl || process.env.BENCHMARK_DATABASE_URL || process.env.DATABASE_URL || process.env.DIRECT_DATABASE_URL;
  if (!directDatabaseUrl) {
    throw new Error('DATABASE_URL or DIRECT_DATABASE_URL is required for benchmark fixture cleanup');
  }

  const manifestPath = options.manifestPath || process.env.SPIKE_FIXTURE_MANIFEST_FILE || DEFAULT_MANIFEST_PATH;
  const receiptPath = options.receiptPath || process.env.SPIKE_CLEANUP_RECEIPT_FILE || DEFAULT_RECEIPT_PATH;
  if (!existsSync(manifestPath) || existsSync(receiptPath)) {
    throw new Error(`Manifest missing at ${manifestPath} or receipt already exists at ${receiptPath}`);
  }

  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const schemaName = manifest.schemaName;
  if (!BENCHMARK_SCHEMA_PATTERN.test(schemaName)) {
    throw new Error(`Manifest contains invalid schema name: ${schemaName}`);
  }

  // Reserve 8 operations in cumulative ledger BEFORE any network call
  recordRequestInLedger(
    `cleanup-${randomUUID()}`,
    `Cleanup and removal verification for pre-seeded benchmark schema ${schemaName}`,
    8
  );

  const sql = postgres(directDatabaseUrl, {
    max: 1,
    connect_timeout: 10,
    idle_timeout: 10,
    prepare: true,
  });

  try {
    // 1. Verify schema identity and object inventory before drop
    const schemata = await sql`
      SELECT 1 FROM information_schema.schemata WHERE schema_name = ${schemaName};
    `;
    if (schemata.length === 0) {
      console.log(`Schema ${schemaName} already removed.`);
      return { success: true, schemaName, alreadyRemoved: true };
    }

    const ownership = await sql`
      SELECT pg_get_userbyid(nspowner) = current_user AS owned
      FROM pg_namespace WHERE nspname = ${schemaName}
    `;
    if (ownership[0]?.owned !== true) throw new Error('Benchmark schema ownership mismatch');
    const tables = await sql`
      SELECT table_name FROM information_schema.tables WHERE table_schema = ${schemaName};
    `;
    const tableNames = tables.map((t) => t.table_name);
    assertBenchmarkInventory(manifest, tableNames);
    const unexpectedObjects = await sql`
      SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = ${schemaName}
      UNION ALL
      SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = ${schemaName} AND c.relkind NOT IN ('r', 'i', 't')
      UNION ALL
      SELECT 1 FROM pg_constraint k
      JOIN pg_class target ON target.oid = k.confrelid
      JOIN pg_namespace target_ns ON target_ns.oid = target.relnamespace
      JOIN pg_class source ON source.oid = k.conrelid
      JOIN pg_namespace source_ns ON source_ns.oid = source.relnamespace
      WHERE target_ns.nspname = ${schemaName} AND source_ns.nspname <> ${schemaName}
      UNION ALL
      SELECT 1 FROM pg_depend d
      JOIN pg_rewrite rw ON rw.oid = d.objid AND d.classid = 'pg_rewrite'::regclass
      JOIN pg_class source ON source.oid = rw.ev_class
      JOIN pg_namespace source_ns ON source_ns.oid = source.relnamespace
      JOIN pg_class target ON target.oid = d.refobjid AND d.refclassid = 'pg_class'::regclass
      JOIN pg_namespace target_ns ON target_ns.oid = target.relnamespace
      WHERE target_ns.nspname = ${schemaName} AND source_ns.nspname <> ${schemaName}
    `;
    if (unexpectedObjects.length) throw new Error('Unexpected benchmark objects; refusing cleanup');

    // 2. Drop only the exact schema
    await sql.unsafe(`DROP SCHEMA "${schemaName}" CASCADE;`);

    // 3. Verify removal of target schema and zero residual benchmark schemas
    const postCheck = await sql`
      SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'jambprep_benchmark_%';
    `;
    if (postCheck.length > 0) {
      throw new Error(`Schema cleanup failed: residual benchmark schemas still exist in database!`);
    }

    const receipt = {
      version: '1.0.0',
      schemaName,
      cleanedAt: new Date().toISOString(),
      droppedTables: tableNames,
      residualBenchmarkSchemas: postCheck.length,
      success: true,
    };

    writeFileSync(receiptPath, JSON.stringify(receipt, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
    return receipt;
  } finally {
    await sql.end({ timeout: 5 });
  }
}

export async function main(args = process.argv.slice(2)) {
  if (args.length === 0 || (!args.includes('--setup') && !args.includes('--cleanup') && !args.includes('--verify'))) {
    console.log('Usage: node scripts/benchmark-fixture.mjs [--setup | --cleanup | --verify]');
    return;
  }

  if (args.includes('--setup')) {
    console.log('Setting up pre-seeded benchmark fixture...');
    const manifest = await setupBenchmarkFixture();
    console.log(`Successfully created and seeded benchmark schema: ${manifest.schemaName}`);
    console.log(`Manifest written to: ${process.env.SPIKE_FIXTURE_MANIFEST_FILE || DEFAULT_MANIFEST_PATH}`);
  }

  if (args.includes('--cleanup')) {
    console.log('Cleaning up benchmark fixture...');
    const receipt = await cleanupBenchmarkFixture();
    console.log(`Successfully dropped schema: ${receipt.schemaName}`);
    console.log(`Receipt written to: ${process.env.SPIKE_CLEANUP_RECEIPT_FILE || DEFAULT_RECEIPT_PATH}`);
  }
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error('Benchmark fixture command failed; inspect private manifest and cleanup status.');
    process.exitCode = 1;
  });
}
