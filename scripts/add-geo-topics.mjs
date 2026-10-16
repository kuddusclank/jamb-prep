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

async function addGeoTopics() {
  const geoSubjectId = '4a1a81e3-2e99-4ccb-8037-2576f2f0fb4e';
  const existing = await sql`SELECT slug FROM topics WHERE subject_id = ${geoSubjectId}`;
  const existingSlugs = new Set(existing.map(t => t.slug));

  const newTopics = [
    { title: 'Rocks and Rock Types', slug: 'rocks-and-rock-types' },
    { title: 'Soils and Soil Properties', slug: 'soils-and-soil-properties' },
    { title: 'Coastal and Marine Processes', slug: 'coastal-and-marine-processes' },
    { title: 'Glacial and Arid Landforms', slug: 'glacial-and-arid-landforms' },
    { title: 'Ecosystems and Biomes', slug: 'ecosystems-and-biomes' },
    { title: 'Surveying and Map Techniques', slug: 'surveying-and-map-techniques' },
    { title: 'World Regional and Economic Geography', slug: 'world-regional-and-economic-geography' },
    { title: 'Agriculture and Pastoral Farming', slug: 'agriculture-and-pastoral-farming' },
    { title: 'Manufacturing and Industrial Location', slug: 'manufacturing-and-industrial-location' },
    { title: 'Environmental Resources and Conservation', slug: 'environmental-resources-and-conservation' }
  ];

  let maxOrderRes = await sql`SELECT COALESCE(MAX(display_order), 0) as max_order FROM topics WHERE subject_id = ${geoSubjectId}`;
  let currentOrder = maxOrderRes[0].max_order;

  for (const topic of newTopics) {
    if (!existingSlugs.has(topic.slug)) {
      currentOrder++;
      await sql`
        INSERT INTO topics (id, subject_id, title, slug, display_order)
        VALUES (${randomUUID()}, ${geoSubjectId}, ${topic.title}, ${topic.slug}, ${currentOrder})
      `;
      console.log(`Added topic: ${topic.title} (${topic.slug})`);
    } else {
      console.log(`Topic already exists: ${topic.slug}`);
    }
  }

  const all = await sql`SELECT slug, title FROM topics WHERE subject_id = ${geoSubjectId} ORDER BY display_order`;
  console.log(`Total Geography topics now: ${all.length}`);
  await sql.end();
}

addGeoTopics().catch(err => {
  console.error(err);
  process.exit(1);
});
