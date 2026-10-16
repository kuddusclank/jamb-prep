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

const sql = postgres(env.DATABASE_URL, { max: 1, idle_timeout: 20, connect_timeout: 10 });

async function check() {
  const codes = ['ART', 'AGR', 'PHE', 'HIS', 'MUS'];
  for (const c of codes) {
    const [sub] = await sql`SELECT id, code, name FROM subjects WHERE code = ${c}`;
    if (!sub) {
      console.log(`Subject ${c}: NOT FOUND`);
      continue;
    }
    const topics = await sql`SELECT count(*)::int as count FROM topics WHERE subject_id = ${sub.id}`;
    const qCount = await sql`SELECT count(*)::int as count FROM questions WHERE subject_id = ${sub.id}`;
    console.log(`Subject: ${sub.name} (${sub.code}) -> ID: ${sub.id} | Topics: ${topics[0].count} | Questions: ${qCount[0].count}`);
  }
  await sql.end();
}

check().catch(console.error);
