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

const sql = postgres(env.DATABASE_URL, { max: 1, idle_timeout: 30, connect_timeout: 10 });

export async function importSubjectQuestions(subjectCode, questionsList, { isDryRun = false } = {}) {
  console.log(`Starting ${isDryRun ? 'DRY-RUN' : 'LIVE'} import of ${questionsList.length} questions for [${subjectCode}]...`);

  const [subject] = await sql`SELECT id, name FROM subjects WHERE code = ${subjectCode}`;
  if (!subject) throw new Error(`Subject ${subjectCode} not found in database.`);
  const subjectId = subject.id;

  const [adminUser] = await sql`SELECT id FROM profiles WHERE role = 'admin' LIMIT 1`;
  const adminId = adminUser?.id || null;

  const allTopics = await sql`SELECT id, slug, title FROM topics WHERE subject_id = ${subjectId}`;
  const topicBySlug = new Map(allTopics.map(t => [t.slug, t.id]));

  for (const q of questionsList) {
    if (!topicBySlug.has(q.topic_slug)) {
      throw new Error(`Topic slug '${q.topic_slug}' not found in DB for subject ${subjectCode} (${q.external_reference})`);
    }
  }

  await sql.begin(async tx => {
    const batchSize = 50;

    for (let i = 0; i < questionsList.length; i += batchSize) {
      const chunk = questionsList.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1} (${chunk.length} questions)...`);

      const questionsRows = [];
      const optionsRows = [];
      const explanationsRows = [];
      const metadataRows = [];
      const historyRows = [];
      const referencesRows = [];

      for (const q of chunk) {
        const topicId = topicBySlug.get(q.topic_slug);
        const questionId = randomUUID();
        const rowHash = createHash('sha256').update(JSON.stringify(q)).digest('hex');
        const examYear = q.exam_year;
        const difficulty = q.difficulty || 'medium';
        const tags = q.tags ? q.tags.split('|').map(t => t.trim()).filter(Boolean) : [];
        const sourceRef = `JAMB ${examYear} UTME ${subject.name} Paper`;
        const rightsNote = 'Standard JAMB UTME educational past question';

        questionsRows.push({
          id: questionId,
          subject_id: subjectId,
          topic_id: topicId,
          stem: q.stem,
          difficulty,
          exam_year: examYear,
          status: 'published',
          editorial_revision: 1,
          assessment_enabled: true
        });

        const options = [
          { id: randomUUID(), question_id: questionId, label: 'A', content: q.option_a, is_correct: q.correct_option === 'A' },
          { id: randomUUID(), question_id: questionId, label: 'B', content: q.option_b, is_correct: q.correct_option === 'B' },
          { id: randomUUID(), question_id: questionId, label: 'C', content: q.option_c, is_correct: q.correct_option === 'C' },
          { id: randomUUID(), question_id: questionId, label: 'D', content: q.option_d, is_correct: q.correct_option === 'D' }
        ];
        optionsRows.push(...options);

        explanationsRows.push({
          id: randomUUID(),
          question_id: questionId,
          explanation: q.explanation,
          verified_by: adminId
        });

        metadataRows.push({
          question_id: questionId,
          source_type: 'past_question',
          source_reference: sourceRef,
          rights_note: rightsNote,
          image_alt: '',
          tags: tx.json(tags)
        });

        const snapshot = {
          questionId,
          subjectCode,
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

        historyRows.push({
          id: randomUUID(),
          question_id: questionId,
          revision: 1,
          actor_id: adminId,
          action: 'question.imported',
          snapshot: tx.json(snapshot)
        });

        referencesRows.push({
          subject_id: subjectId,
          external_reference: q.external_reference,
          question_id: questionId,
          request_hash: rowHash
        });
      }

      await tx`
        INSERT INTO questions ${tx(questionsRows, 'id', 'subject_id', 'topic_id', 'stem', 'difficulty', 'exam_year', 'status', 'editorial_revision', 'assessment_enabled')}
      `;

      await tx`
        INSERT INTO question_options ${tx(optionsRows, 'id', 'question_id', 'label', 'content', 'is_correct')}
      `;

      await tx`
        INSERT INTO question_explanations ${tx(explanationsRows, 'id', 'question_id', 'explanation', 'verified_by')}
      `;

      await tx`
        INSERT INTO question_editorial_metadata ${tx(metadataRows, 'question_id', 'source_type', 'source_reference', 'rights_note', 'image_alt', 'tags')}
      `;

      await tx`
        INSERT INTO question_editorial_history ${tx(historyRows, 'id', 'question_id', 'revision', 'actor_id', 'action', 'snapshot')}
      `;

      await tx`
        INSERT INTO question_import_references ${tx(referencesRows, 'subject_id', 'external_reference', 'question_id', 'request_hash')}
      `;
    }

    console.log(`Successfully prepared all ${questionsList.length} questions for [${subjectCode}].`);

    if (isDryRun) {
      console.log(`[${subjectCode}] DRY-RUN completed. Rolling back transaction.`);
      throw new Error('ROLLBACK_DRY_RUN');
    }
  });

  console.log(`Successfully committed all ${questionsList.length} questions for [${subjectCode}] to database.`);
}
