import postgres from 'postgres';
import { readFileSync, existsSync } from 'fs';
import { randomUUID } from 'crypto';

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

async function addTopics() {
  const commSubjectId = 'f9fe31e3-1f44-4fab-9d6d-40d518c7418e';
  const existing = await sql`SELECT slug FROM topics WHERE subject_id = ${commSubjectId}`;
  const existingSlugs = new Set(existing.map(t => t.slug));

  const newTopics = [
    { title: 'Aids to Trade: Transportation', slug: 'aids-to-trade-transportation' },
    { title: 'Aids to Trade: Communication', slug: 'aids-to-trade-communication' },
    { title: 'Business Law: Contract and Agency', slug: 'business-law-contract-and-agency' },
    { title: 'Business Management and Organization', slug: 'business-management-and-organization' },
    { title: 'Business Capital and Financial Calculations', slug: 'business-capital-and-financial-calculations' },
    { title: 'Sole Proprietorship and Cooperatives', slug: 'sole-proprietorship-and-cooperatives' },
    { title: 'Public Enterprises and Privatization', slug: 'public-enterprises-and-privatization' },
    { title: 'Money, Banking and Financial Institutions', slug: 'money-banking-and-financial-institutions' },
    { title: 'Economic Groupings and International Organizations', slug: 'economic-groupings-and-international-organizations' },
    { title: 'Marketing and Sales Promotion', slug: 'marketing-and-sales-promotion' }
  ];

  let maxOrderRes = await sql`SELECT COALESCE(MAX(display_order), 0) as max_order FROM topics WHERE subject_id = ${commSubjectId}`;
  let currentOrder = maxOrderRes[0].max_order;

  for (const topic of newTopics) {
    if (!existingSlugs.has(topic.slug)) {
      currentOrder++;
      await sql`
        INSERT INTO topics (id, subject_id, title, slug, display_order)
        VALUES (${randomUUID()}, ${commSubjectId}, ${topic.title}, ${topic.slug}, ${currentOrder})
      `;
      console.log(`Added topic: ${topic.title} (${topic.slug})`);
    } else {
      console.log(`Topic already exists: ${topic.slug}`);
    }
  }

  const all = await sql`SELECT slug, title FROM topics WHERE subject_id = ${commSubjectId} ORDER BY display_order`;
  console.log(`Total commerce topics now: ${all.length}`);
  await sql.end();
}

addTopics().catch(err => {
  console.error(err);
  process.exit(1);
});
