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

async function check() {
  const topics = await sql`
    SELECT slug, title 
    FROM topics 
    WHERE subject_id = '7d5104d3-374e-4d0c-a2e8-c4705de88eac' 
    ORDER BY display_order
  `;
  console.table(topics);
  await sql.end();
}

check().catch(console.error);
