import postgres from 'postgres';
import { readFileSync, existsSync } from 'fs';
import { createHash, randomUUID } from 'crypto';

import { questions2015 } from './dataset-2015.mjs';
import { questions2016 } from './dataset-2016.mjs';
import { questions2017 } from './dataset-2017.mjs';
import { questions2018 } from './dataset-2018.mjs';

const allNewQuestions = [
  ...questions2015,
  ...questions2016,
  ...questions2017,
  ...questions2018
];

const envPath = existsSync('jambprep/.env.local') ? 'jambprep/.env.local' : '.env.local';
const env = Object.fromEntries(
  readFileSync(envPath, 'utf8')
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

export async function runImport({ isDryRun = false } = {}) {
  console.log(`Starting ${isDryRun ? 'DRY-RUN' : 'LIVE'} import of ${allNewQuestions.length} Mathematics questions (years 2015-2018)...`);

  const [mthSubject] = await sql`SELECT id FROM subjects WHERE code = 'MTH'`;
  if (!mthSubject) throw new Error('Subject MTH not found in database.');
  const subjectId = mthSubject.id;

  const [adminUser] = await sql`SELECT id FROM profiles WHERE role = 'admin' LIMIT 1`;
  const adminId = adminUser?.id || null;
  console.log(`Using admin actor: ${adminId}`);

  // Fetch all topics for MTH
  const allTopics = await sql`SELECT id, slug, title FROM topics WHERE subject_id = ${subjectId}`;
  const topicBySlug = new Map(allTopics.map(t => [t.slug, t.id]));

  // Verify all slugs exist
  for (const q of allNewQuestions) {
    if (!topicBySlug.has(q.topic_slug)) {
      throw new Error(`Topic slug '${q.topic_slug}' not found in DB for question ${q.external_reference}`);
    }
  }

  await sql.begin(async tx => {
    let insertedCount = 0;
    const batchSize = 20;

    for (let i = 0; i < allNewQuestions.length; i += batchSize) {
      const chunk = allNewQuestions.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1} (${chunk.length} questions)...`);

      for (const q of chunk) {
        const topicId = topicBySlug.get(q.topic_slug);
        const questionId = randomUUID();
        const rowHash = createHash('sha256').update(JSON.stringify(q)).digest('hex');
        const examYear = q.exam_year;
        const difficulty = q.difficulty || 'medium';
        const tags = q.tags ? q.tags.split('|').map(t => t.trim()).filter(Boolean) : [];
        const sourceRef = `JAMB ${examYear} UTME Mathematics Paper`;
        const rightsNote = 'Standard JAMB UTME educational past question';

        // 1. Insert question
        await tx`
          INSERT INTO questions (
            id, subject_id, topic_id, stem, difficulty, exam_year, status, editorial_revision, assessment_enabled
          ) VALUES (
            ${questionId}, ${subjectId}, ${topicId}, ${q.stem}, ${difficulty}, ${examYear}, 'published', 1, true
          )
        `;

        // 2. Insert options
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

        // 3. Insert explanation
        await tx`
          INSERT INTO question_explanations (id, question_id, explanation, verified_by)
          VALUES (${randomUUID()}, ${questionId}, ${q.explanation}, ${adminId})
        `;

        // 4. Insert editorial metadata
        await tx`
          INSERT INTO question_editorial_metadata (
            question_id, source_type, source_reference, rights_note, image_alt, tags
          ) VALUES (
            ${questionId}, 'past_question', ${sourceRef}, ${rightsNote}, '', ${tx.json(tags)}
          )
        `;

        // 5. Insert editorial history
        const snapshot = {
          questionId,
          subjectCode: 'MTH',
          topicSlug: q.topic_slug,
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

        // 6. Insert import reference
        await tx`
          INSERT INTO question_import_references (
            subject_id, external_reference, question_id, request_hash
          ) VALUES (
            ${subjectId}, ${q.external_reference}, ${questionId}, ${rowHash}
          )
          ON CONFLICT (subject_id, external_reference) DO NOTHING
        `;

        insertedCount++;
      }
    }

    console.log(`Successfully prepared all ${insertedCount} questions.`);

    if (isDryRun) {
      console.log('DRY-RUN completed. Rolling back transaction.');
      throw new Error('ROLLBACK_DRY_RUN');
    }
  });

  console.log(`Successfully committed all ${allNewQuestions.length} questions to database.`);
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
