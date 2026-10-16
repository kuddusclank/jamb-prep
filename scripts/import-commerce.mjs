import postgres from 'postgres';
import { readFileSync, existsSync } from 'fs';
import { createHash, randomUUID } from 'crypto';

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

export async function importQuestions(questionsList, { isDryRun = false } = {}) {
  console.log(`Starting ${isDryRun ? 'DRY-RUN' : 'LIVE'} import of ${questionsList.length} Commerce questions...`);

  const [comSubject] = await sql`SELECT id FROM subjects WHERE code = 'COM'`;
  if (!comSubject) throw new Error('Subject COM not found in database.');
  const subjectId = comSubject.id;

  const [adminUser] = await sql`SELECT id FROM profiles WHERE role = 'admin' LIMIT 1`;
  const adminId = adminUser?.id || null;
  console.log(`Using admin actor: ${adminId}`);

  const allTopics = await sql`SELECT id, slug, title FROM topics WHERE subject_id = ${subjectId}`;
  const topicBySlug = new Map(allTopics.map(t => [t.slug, t.id]));

  for (const q of questionsList) {
    if (!topicBySlug.has(q.topic_slug)) {
      throw new Error(`Topic slug '${q.topic_slug}' not found in DB for question ${q.external_reference}`);
    }
  }

  await sql.begin(async tx => {
    const batchSize = 25;

    for (let i = 0; i < questionsList.length; i += batchSize) {
      const chunk = questionsList.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1} (${chunk.length} questions)...`);

      for (const q of chunk) {
        const topicId = topicBySlug.get(q.topic_slug);
        const questionId = randomUUID();
        const rowHash = createHash('sha256').update(JSON.stringify(q)).digest('hex');
        const examYear = q.exam_year;
        const difficulty = q.difficulty || 'medium';
        const tags = q.tags ? q.tags.split('|').map(t => t.trim()).filter(Boolean) : [];
        const sourceRef = `JAMB ${examYear} UTME Commerce Paper`;
        const rightsNote = 'Standard JAMB UTME educational past question';

        await tx`
          INSERT INTO questions (
            id, subject_id, topic_id, stem, difficulty, exam_year, status, editorial_revision, assessment_enabled
          ) VALUES (
            ${questionId}, ${subjectId}, ${topicId}, ${q.stem}, ${difficulty}, ${examYear}, 'published', 1, true
          )
        `;

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

        await tx`
          INSERT INTO question_explanations (id, question_id, explanation, verified_by)
          VALUES (${randomUUID()}, ${questionId}, ${q.explanation}, ${adminId})
        `;

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
          subjectCode: 'COM',
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
        `;
      }
    }

    console.log(`Successfully prepared all ${questionsList.length} questions.`);

    if (isDryRun) {
      console.log('DRY-RUN completed. Rolling back transaction.');
      throw new Error('ROLLBACK_DRY_RUN');
    }
  });

  console.log(`Successfully committed all ${questionsList.length} questions to database.`);
}
