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

async function check() {
  const [total] = await sql`SELECT count(*) FROM questions WHERE subject_id = 'c7cd45ac-de76-47fc-90bd-788171c5595f'`;
  console.log('Total Math questions in questions table:', total.count);
  const byYear = await sql`SELECT exam_year, count(*) FROM questions WHERE subject_id = 'c7cd45ac-de76-47fc-90bd-788171c5595f' GROUP BY exam_year ORDER BY exam_year`;
  console.log('Math by year:', byYear);
  const subjects = await sql`SELECT id, name, code FROM subjects ORDER BY name`;
  console.log('All subjects:', subjects);
  const commSubject = subjects.find(s => s.name.toLowerCase().includes('commerc') || s.code.toLowerCase().includes('com'));
  console.log('Commerce subject:', commSubject);
  if (commSubject) {
    const commTopics = await sql`SELECT id, title, slug FROM topics WHERE subject_id = ${commSubject.id} ORDER BY title`;
    console.log('Commerce topics count:', commTopics.length);
    console.log('Commerce topics:', commTopics);
    const [commQTotal] = await sql`SELECT count(*) FROM questions WHERE subject_id = ${commSubject.id}`;
    console.log('Total Commerce questions in DB:', commQTotal.count);
    const commByYear = await sql`SELECT exam_year, count(*) FROM questions WHERE subject_id = ${commSubject.id} GROUP BY exam_year ORDER BY exam_year`;
    console.log('Commerce questions by year in DB:', commByYear);
  }
  await sql.end();
}

check().catch(err => {
  console.error(err);
  process.exit(1);
});
