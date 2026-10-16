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

const sql = postgres(env.DATABASE_URL, { max: 1, idle_timeout: 30, connect_timeout: 10 });

async function verifyAll() {
  const subjectsToCheck = ['YOR', 'ART', 'MUS', 'PHE', 'AGR', 'HIS', 'HEC', 'CMP', 'FRN', 'IGB', 'HAU', 'ARB', 'ACC', 'GEO', 'COM', 'MTH'];

  console.log('\n=================== VERIFYING RECENTLY IMPORTED SUBJECTS ===================');

  for (const code of subjectsToCheck) {
    const [sub] = await sql`SELECT id, code, name FROM subjects WHERE code = ${code}`;
    if (!sub) continue;
    
    const byYear = await sql`
      SELECT exam_year, count(*)::int as count 
      FROM questions 
      WHERE subject_id = ${sub.id} 
      GROUP BY exam_year 
      ORDER BY exam_year
    `;

    const [total] = await sql`
      SELECT count(*)::int as total 
      FROM questions 
      WHERE subject_id = ${sub.id}
    `;

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

    const [expCheck] = await sql`
      SELECT count(*)::int as missing_exp
      FROM questions q
      LEFT JOIN question_explanations e ON q.id = e.question_id
      WHERE q.subject_id = ${sub.id} AND e.id IS NULL
    `;

    console.log(`\n[${sub.code}] ${sub.name}:`);
    console.log(`  Total Questions: ${total.total}`);
    console.log(`  Breakdown by Year:`, byYear.map(y => `${y.exam_year}: ${y.count}`).join(', '));
    console.log(`  Bad Options (≠4): ${optCheck.bad_opts}`);
    console.log(`  Bad Correct Keys (≠1): ${correctCheck.bad_correct}`);
    console.log(`  Missing Explanations: ${expCheck.missing_exp}`);
  }

  const allSubjects = await sql`
    SELECT s.code, s.name, count(q.id)::int as question_count
    FROM subjects s
    LEFT JOIN questions q ON s.id = q.subject_id
    GROUP BY s.id, s.code, s.name
    ORDER BY question_count DESC
  `;
  console.log('\n=================== GLOBAL SUPABASE SUBJECT COUNTS ===================');
  console.table(allSubjects);

  const [grandTotal] = await sql`SELECT count(*)::int as total FROM questions`;
  console.log(`\n>>> GRAND TOTAL PUBLISHED QUESTIONS ACROSS ALL SUBJECTS IN SUPABASE: ${grandTotal.total} <<<\n`);

  await sql.end();
}

verifyAll().catch(console.error);
