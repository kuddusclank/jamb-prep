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
  const [geoSubject] = await sql`SELECT id, name, code FROM subjects WHERE code = 'GEO' OR name ILIKE '%geograph%'`;
  console.log('Geography Subject:', geoSubject);
  const geoTopics = await sql`SELECT id, title, slug FROM topics WHERE subject_id = ${geoSubject.id} ORDER BY display_order`;
  console.log('Geography Topics count:', geoTopics.length);
  console.log('Geography Topics:', geoTopics);
  const [geoCount] = await sql`SELECT count(*) FROM questions WHERE subject_id = ${geoSubject.id}`;
  console.log('Existing Geography questions count in DB:', geoCount.count);
  await sql.end();
}

check().catch(err => {
  console.error(err);
  process.exit(1);
});
