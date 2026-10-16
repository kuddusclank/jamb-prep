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
  const agrTopics = await sql`SELECT slug, title FROM topics WHERE subject_id = 'b52c00c1-c40d-4528-baa7-1c7429395983' ORDER BY display_order`;
  console.log('--- AGR TOPICS ---');
  console.table(agrTopics);

  const hisTopics = await sql`SELECT slug, title FROM topics WHERE subject_id = 'f7c2bcb1-0f89-491a-9c68-964cf3769a5e' ORDER BY display_order`;
  console.log('--- HIS TOPICS ---');
  console.table(hisTopics);

  await sql.end();
}

check().catch(console.error);
