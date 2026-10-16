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

const sql = postgres(env.DATABASE_URL, { max: 1, idle_timeout: 20, connect_timeout: 10 });

async function addHecTopics() {
  const [sub] = await sql`SELECT id FROM subjects WHERE code = 'HEC'`;
  if (!sub) throw new Error('Subject HEC not found in database.');
  const hecSubjectId = sub.id;

  const existing = await sql`SELECT slug FROM topics WHERE subject_id = ${hecSubjectId}`;
  const existingSlugs = new Set(existing.map(t => t.slug));

  const topics = [
    { title: 'Introduction to Home Economics and Careers', slug: 'introduction-to-home-economics-and-careers' },
    { title: 'Family Living and Relationships', slug: 'family-living-and-relationships' },
    { title: 'Family Crises and Conflict Resolution', slug: 'family-crises-and-conflict-resolution' },
    { title: 'Family Resource Management and Budgeting', slug: 'family-resource-management-and-budgeting' },
    { title: 'Consumer Education and Rights', slug: 'consumer-education-and-rights' },
    { title: 'Child Development and Care', slug: 'child-development-and-care' },
    { title: 'Housing and Home Organization', slug: 'housing-and-home-organization' },
    { title: 'Household Linen and Home Cleaning', slug: 'household-linen-and-home-cleaning' },
    { title: 'Nutrients and Nutritional Needs', slug: 'nutrients-and-nutritional-needs' },
    { title: 'Meal Planning and Table Service', slug: 'meal-planning-and-table-service' },
    { title: 'Food Preparation and Cooking Methods', slug: 'food-preparation-and-cooking-methods' },
    { title: 'Food Storage, Preservation and Safety', slug: 'food-storage-preservation-and-safety' },
    { title: 'Kitchen Equipment and Management', slug: 'kitchen-equipment-and-management' },
    { title: 'Textile Fibres and Fabrics', slug: 'textile-fibres-and-fabrics' },
    { title: 'Fabric Construction and Yarn Production', slug: 'fabric-construction-and-yarn-production' },
    { title: 'Sewing Equipment and Tools', slug: 'sewing-equipment-and-tools' },
    { title: 'Stitches and Seams', slug: 'stitches-and-seams' },
    { title: 'Garment Design and Construction', slug: 'garment-design-and-construction' },
    { title: 'Garment Care, Renovation and Fasteners', slug: 'garment-care-renovation-and-fasteners' },
    { title: 'Personal Grooming and Health', slug: 'personal-grooming-and-health' }
  ];

  let maxOrderRes = await sql`SELECT COALESCE(MAX(display_order), 0) as max_order FROM topics WHERE subject_id = ${hecSubjectId}`;
  let currentOrder = maxOrderRes[0].max_order;

  const toInsert = [];
  for (const t of topics) {
    if (!existingSlugs.has(t.slug)) {
      currentOrder++;
      toInsert.push({
        id: randomUUID(),
        subject_id: hecSubjectId,
        title: t.title,
        slug: t.slug,
        display_order: currentOrder
      });
    }
  }

  if (toInsert.length > 0) {
    await sql`
      INSERT INTO topics ${sql(toInsert, 'id', 'subject_id', 'title', 'slug', 'display_order')}
    `;
    console.log(`Inserted ${toInsert.length} new topics in a single query!`);
  } else {
    console.log('No new topics to insert.');
  }

  const all = await sql`SELECT slug, title, display_order FROM topics WHERE subject_id = ${hecSubjectId} ORDER BY display_order`;
  console.log(`\nTotal Home Economics topics in DB: ${all.length}`);
  console.table(all);
  await sql.end();
}

addHecTopics().catch(err => {
  console.error(err);
  process.exit(1);
});
