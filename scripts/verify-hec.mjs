import postgres from 'postgres';
import { readFileSync, existsSync } from 'fs';

const envPath = existsSync('jambprep/.env.local') ? 'jambprep/.env.local' : '.env.local';
const env = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split('\n')
    .filter(l => l.includes('='))
    .map(l => {
      const idx = l.indexOf('=');
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim().replace(/^['\"]|['\"]$/g, '')];
    })
);

const sql = postgres(env.DATABASE_URL, { max: 1, idle_timeout: 20, connect_timeout: 10 });

async function verify() {
  const [sub] = await sql`SELECT id, code, name FROM subjects WHERE code = 'HEC'`;
  console.log('Subject:', sub);

  const byYear = await sql`
    SELECT exam_year, count(*)::int as count 
    FROM questions 
    WHERE subject_id = ${sub.id} 
    GROUP BY exam_year 
    ORDER BY exam_year
  `;
  console.log('Questions by Year:\n', byYear);

  const [total] = await sql`
    SELECT count(*)::int as total 
    FROM questions 
    WHERE subject_id = ${sub.id}
  `;
  console.log('Total Home Economics questions:', total.total);

  const [optCheck] = await sql`
    SELECT count(*)::int as bad_opts
    FROM (
      SELECT question_id, count(*) as opt_count
      FROM question_options
      WHERE question_id IN (SELECT id FROM questions WHERE subject_id = ${sub.id})
      GROUP BY question_id
      HAVING count(*) != 4
    ) t
  `;
  console.log('Questions with != 4 options:', optCheck.bad_opts);

  const [correctCheck] = await sql`
    SELECT count(*)::int as bad_correct
    FROM (
      SELECT question_id, count(*) as correct_count
      FROM question_options
      WHERE question_id IN (SELECT id FROM questions WHERE subject_id = ${sub.id}) AND is_correct = true
      GROUP BY question_id
      HAVING count(*) != 1
    ) t
  `;
  console.log('Questions with != 1 correct option:', correctCheck.bad_correct);

  const [expCheck] = await sql`
    SELECT count(*)::int as missing_exp
    FROM questions q
    LEFT JOIN question_explanations e ON q.id = e.question_id
    WHERE q.subject_id = ${sub.id} AND e.id IS NULL
  `;
  console.log('Questions missing explanation:', expCheck.missing_exp);

  await sql.end();
}

verify().catch(console.error);
