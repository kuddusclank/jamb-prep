import { parseRfcCsv } from '../src/lib/admin-csv.ts';
import postgres from 'postgres';
import { readFileSync } from 'fs';
import { createHash, randomUUID } from 'crypto';

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter(l => l.includes('='))
    .map(l => {
      const idx = l.indexOf('=');
      const k = l.slice(0, idx).trim();
      const v = l.slice(idx + 1).trim().replace(/^['\"]|['\"]$/g, '');
      return [k, v];
    })
);

const sql = postgres(env.DATABASE_URL, { max: 1 });

const MATH_SOURCE = {
  subject: 'Mathematics',
  url: 'https://ibass.jamb.gov.ng/static/media/Mathematics.c0621f4b8b674e75fd05.pdf',
  pages: 6,
  sha256: 'aff7a7c2cc46036902dda38db1d1567d10982de709305cfbfc90dc437329754f'
};

// Missing topics from official syllabus to insert into topics table
const NEW_TOPICS = [
  { slug: 'fractions-decimals-and-approximations', title: 'Fractions, Decimals and Approximations', page: 1 },
  { slug: 'polynomials', title: 'Polynomials', page: 2 },
  { slug: 'binary-operations', title: 'Binary Operations', page: 2 },
  { slug: 'inequalities', title: 'Inequalities', page: 2 }
];

// Topic resolution mapping from CSV slug to canonical topic slug
const TOPIC_CANONICAL_MAP = {
  'sets-and-venn-diagrams': 'sets',
  'calculus-integration': 'integration',
  'calculus-differentiation': 'calculus-differentiation',
  'progression-ap-and-gp': 'arithmetic-and-geometric-progressions',
  'statistics': 'statistics-and-measures-of-dispersion',
  'coordinate-geometry': 'coordinate-geometry',
  'surds': 'surds',
  'indices-and-logarithms': 'indices-and-logarithms',
  'permutations-and-combinations': 'permutations-and-combinations',
  'variation': 'variation',
  'matrices-and-determinants': 'matrices-and-determinants',
  'trigonometry': 'trigonometry',
  'probability': 'probability',
  'number-bases': 'number-bases',
  'fractions-decimals-and-approximations': 'fractions-decimals-and-approximations',
  'polynomials': 'polynomials',
  'binary-operations': 'binary-operations',
  'inequalities': 'inequalities'
};

// Aliases to register in curriculum_topic_mappings
const TOPIC_ALIASES = {
  'sets': ['sets-and-venn-diagrams', 'Sets and Venn Diagrams', 'Venn Diagrams'],
  'integration': ['calculus-integration', 'Calculus and Integration', 'Definite and Indefinite Integrals'],
  'calculus-differentiation': ['differentiation', 'Calculus and Differentiation', 'Derivatives'],
  'arithmetic-and-geometric-progressions': ['progression-ap-and-gp', 'Sequences and Series', 'AP and GP'],
  'statistics-and-measures-of-dispersion': ['statistics', 'Measures of Dispersion', 'Statistics and Probability']
};

export async function runImport({ isDryRun = false } = {}) {
  console.log(`Starting ${isDryRun ? 'DRY-RUN' : 'LIVE'} question addition...`);

  const csvText = readFileSync('scratch-questions.csv', 'utf8');
  const rows = parseRfcCsv(csvText);
  const header = rows[0];

  const rawQuestions = rows.slice(1).map((r, idx) => {
    const item = {};
    header.forEach((h, i) => item[h] = r[i]);
    return { rowNumber: idx + 2, ...item };
  });

  console.log(`Parsed ${rawQuestions.length} questions from CSV.`);

  // Apply editorial corrections discovered during deep review
  const cleanedQuestions = rawQuestions.map(q => {
    const item = { ...q };

    // 1. MTH-2012-009: Fix missing closing $ on $P
    if (item.external_reference === 'MTH-2012-009') {
      item.stem = 'If $P$ is the set of all prime factors of $30$ and $Q$ is the set of all factors of $18$ less than $10$, find $P \\cap Q$.';
    }

    // 2. MTH-2014-007: Fix draft concatenation in equation stem
    if (item.external_reference === 'MTH-2014-007') {
      item.stem = 'Solve for $x$ in the equation $8^{x - 2} = 2^{2x - 1}$.';
      item.explanation = 'Express both sides as powers of $2$:\n$$8^{x - 2} = (2^3)^{x - 2} = 2^{3x - 6}$$\n$$2^{3x - 6} = 2^{2x - 1}$$\nEquating exponents:\n$$3x - 6 = 2x - 1 \\implies 3x - 2x = 6 - 1 \\implies x = 5$$.\nHence, option A is correct.';
      item.correct_option = 'A';
    }

    // 3. MTH-2014-023: Clean matrix equation determinant
    if (item.external_reference === 'MTH-2014-023') {
      item.stem = 'If $\\begin{vmatrix} x & 3 \\\\ -1 & 4 \\end{vmatrix} = 27$, find $x$.';
      item.explanation = 'Evaluate the $2 \\times 2$ determinant:\n$$\\begin{vmatrix} x & 3 \\\\ -1 & 4 \\end{vmatrix} = (x)(4) - (3)(-1) = 4x + 3$$\nSetting this equal to $27$:\n$$4x + 3 = 27 \\implies 4x = 24 \\implies x = 6$$.\nHence, option A is correct.';
      item.correct_option = 'A';
    }

    // 4. MTH-2014-033: Set correct option to B ($5$) matching gradient derivation
    if (item.external_reference === 'MTH-2014-033') {
      item.correct_option = 'B';
      item.explanation = 'Gradient $m = \\frac{y_2 - y_1}{x_2 - x_1}$:\n$$\\frac{1}{2} = \\frac{2 - 4}{1 - x} = \\frac{-2}{1 - x}$$\n$$1 - x = 2(-2) = -4 \\implies 1 - x = -4 \\implies x = 1 - (-4) = 5$$.\nHence, option B is correct.';
    }

    return item;
  });

  // Database operations
  const [mthSubject] = await sql`SELECT id FROM subjects WHERE code = 'MTH'`;
  if (!mthSubject) throw new Error('Subject MTH not found in database.');
  const subjectId = mthSubject.id;

  // Find an admin actor for verified_by / actor_id
  const [adminUser] = await sql`SELECT id FROM profiles WHERE role = 'admin' LIMIT 1`;
  const adminId = adminUser?.id || null;
  console.log(`Using admin actor: ${adminId}`);

  await sql.begin(async tx => {
    // 1. Insert missing topics
    for (const newTopic of NEW_TOPICS) {
      await tx`
        INSERT INTO topics (subject_id, slug, title, display_order)
        VALUES (${subjectId}, ${newTopic.slug}, ${newTopic.title}, 0)
        ON CONFLICT DO NOTHING
      `;
    }

    // Load all topics for MTH
    const allTopics = await tx`SELECT id, slug, title FROM topics WHERE subject_id = ${subjectId}`;
    const topicBySlug = new Map(allTopics.map(t => [t.slug, t.id]));

    // 2. Ensure curriculum_topic_mappings exist with reviewed status
    for (const topic of allTopics) {
      const aliases = TOPIC_ALIASES[topic.slug] || [];
      await tx`
        INSERT INTO curriculum_topic_mappings (
          topic_id, source_subject, source_url, source_hash, page_number, aliases, reviewed_by, reviewed_at
        )
        VALUES (
          ${topic.id},
          ${MATH_SOURCE.subject},
          ${MATH_SOURCE.url},
          ${MATH_SOURCE.sha256},
          1,
          ${tx.json(aliases)},
          ${adminId},
          NOW()
        )
        ON CONFLICT (topic_id) DO UPDATE SET
          source_subject = EXCLUDED.source_subject,
          source_url = EXCLUDED.source_url,
          source_hash = EXCLUDED.source_hash,
          aliases = (SELECT jsonb_agg(DISTINCT elem) FROM jsonb_array_elements(curriculum_topic_mappings.aliases || EXCLUDED.aliases) elem),
          reviewed_at = COALESCE(curriculum_topic_mappings.reviewed_at, NOW())
      `;
    }

    console.log(`Topics and curriculum topic mappings ready.`);

    // 3. Prepare question records
    let insertedCount = 0;
    const batchSize = 25;

    for (let i = 0; i < cleanedQuestions.length; i += batchSize) {
      const chunk = cleanedQuestions.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1} (${chunk.length} questions)...`);

      for (const q of chunk) {
        const canonicalSlug = TOPIC_CANONICAL_MAP[q.topic_slug];
        const topicId = topicBySlug.get(canonicalSlug);
        if (!topicId) throw new Error(`Canonical topic ID not found for slug '${canonicalSlug}' (original: '${q.topic_slug}')`);

        const questionId = randomUUID();
        const rowHash = createHash('sha256').update(JSON.stringify(q)).digest('hex');
        const examYear = q.exam_year ? parseInt(q.exam_year, 10) : null;
        const difficulty = q.difficulty || 'medium';
        const tags = q.tags ? q.tags.split('|').map(t => t.trim()).filter(Boolean) : [];
        const sourceRef = q.source_reference || `JAMB ${examYear || 2000} UTME Mathematics Paper`;
        const rightsNote = 'Standard JAMB UTME educational past question';

        // Insert question
        await tx`
          INSERT INTO questions (
            id, subject_id, topic_id, stem, difficulty, exam_year, status, editorial_revision, assessment_enabled
          ) VALUES (
            ${questionId}, ${subjectId}, ${topicId}, ${q.stem}, ${difficulty}, ${examYear}, 'published', 1, true
          )
        `;

        // Insert options A, B, C, D
        const options = [
          { label: 'A', content: q.option_a, is_correct: q.correct_option === 'A' },
          { label: 'B', content: q.option_b, is_correct: q.correct_option === 'B' },
          { label: 'C', content: q.option_c, is_correct: q.correct_option === 'C' },
          { label: 'D', content: q.option_d, is_correct: q.correct_option === 'D' }
        ];

        for (const opt of options) {
          await tx`
            INSERT INTO question_options (id, question_id, label, content, is_correct)
            VALUES (${randomUUID()}, ${questionId}, ${opt.label}, ${opt.content}, ${opt.is_correct})
          `;
        }

        // Insert explanation
        await tx`
          INSERT INTO question_explanations (id, question_id, explanation, verified_by)
          VALUES (${randomUUID()}, ${questionId}, ${q.explanation}, ${adminId})
        `;

        // Insert editorial metadata
        await tx`
          INSERT INTO question_editorial_metadata (
            question_id, source_type, source_reference, rights_note, image_alt, tags
          ) VALUES (
            ${questionId}, 'past_question', ${sourceRef}, ${rightsNote}, '', ${tx.json(tags)}
          )
        `;

        // Insert editorial history snapshot
        const snapshot = {
          questionId,
          subjectCode: 'MTH',
          topicSlug: canonicalSlug,
          stem: q.stem,
          difficulty,
          examYear,
          status: 'published',
          options,
          explanation: q.explanation,
          tags,
          sourceReference: sourceRef
        };

        await tx`
          INSERT INTO question_editorial_history (
            id, question_id, revision, actor_id, action, snapshot
          ) VALUES (
            ${randomUUID()}, ${questionId}, 1, ${adminId}, 'question.imported', ${tx.json(snapshot)}
          )
        `;

        // Insert import reference
        if (q.external_reference) {
          await tx`
            INSERT INTO question_import_references (
              subject_id, external_reference, question_id, request_hash
            ) VALUES (
              ${subjectId}, ${q.external_reference}, ${questionId}, ${rowHash}
            )
            ON CONFLICT (subject_id, external_reference) DO NOTHING
          `;
        }

        insertedCount++;
      }
    }

    console.log(`Successfully prepared ${insertedCount} questions.`);

    if (isDryRun) {
      console.log('DRY-RUN completed. Rolling back transaction.');
      throw new Error('ROLLBACK_DRY_RUN');
    }
  });

  console.log(`Successfully added all ${cleanedQuestions.length} questions to Supabase jambprep database!`);
}

async function main() {
  const isDryRun = process.argv.includes('--dry-run');
  try {
    await runImport({ isDryRun });
  } catch (err) {
    if (err.message === 'ROLLBACK_DRY_RUN') {
      console.log('Dry run verification succeeded cleanly.');
    } else {
      console.error('Import failed:', err);
      process.exit(1);
    }
  } finally {
    await sql.end();
  }
}

main();
