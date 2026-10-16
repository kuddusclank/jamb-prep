import postgres from 'postgres';
import { readFileSync } from 'fs';

const env = Object.fromEntries(
  readFileSync('jambprep/.env.local', 'utf8')
    .split('\n')
    .filter(l => l.includes('='))
    .map(l => {
      const idx = l.indexOf('=');
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim().replace(/^['\"]|['\"]$/g, '')];
    })
);

const sql = postgres(env.DATABASE_URL, { max: 1 });

async function check() {
  const topics = await sql`
    SELECT s.code, t.slug, t.title 
    FROM topics t 
    JOIN subjects s ON t.subject_id = s.id 
    WHERE s.code IN ('AGR', 'BIO', 'GEO') 
    LIMIT 15
  `;
  console.log(topics);
  await sql.end();
}

check().catch(console.error);
