import postgres from 'postgres';
import { readFileSync } from 'fs';

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter(l => l.includes('='))
    .map(l => {
      const idx = l.indexOf('=');
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim().replace(/^['\"]|['\"]$/g, '')];
    })
);

const sql = postgres(env.DATABASE_URL, { max: 1 });
const [subject] = await sql`SELECT id, code, name FROM subjects WHERE code = 'MTH'`;
console.log('Connected to DB. Subject:', subject);
await sql.end();
