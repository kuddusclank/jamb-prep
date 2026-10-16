import postgres from 'postgres';
import { readFileSync, existsSync } from 'fs';

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

async function inspect() {
  const topicCols = await sql`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'topics'
  `;
  console.log('Topic columns:', topicCols);

  const existingCommTopics = await sql`
    SELECT id, slug, title FROM topics WHERE subject_id = 'f9fe31e3-1f44-4fab-9d6d-40d518c7418e' ORDER BY title
  `;
  console.log('Existing Commerce topics:', existingCommTopics);

  const commQuestions = await sql`
    SELECT q.id, q.stem, q.exam_year, t.slug as topic_slug
    FROM questions q
    JOIN topics t ON t.id = q.topic_id
    WHERE q.subject_id = 'f9fe31e3-1f44-4fab-9d6d-40d518c7418e'
  `;
  console.log('Existing commerce questions count:', commQuestions.length);
  console.log('Existing commerce questions:', commQuestions);

  await sql.end();
}

inspect().catch(err => {
  console.error(err);
  process.exit(1);
});
