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

const sql = postgres(env.DATABASE_URL, { max: 1, idle_timeout: 30, connect_timeout: 10 });

const subjectsTopics = {
  ART: [
    { title: 'Classification and Branches of Art', slug: 'classification-and-branches-of-art' },
    { title: 'Elements and Principles of Design', slug: 'elements-and-principles-of-design' },
    { title: 'Drawing, Painting and Colour Theory', slug: 'drawing-painting-and-colour-theory' },
    { title: 'Sculpture, Ceramics and Pottery', slug: 'sculpture-ceramics-and-pottery' },
    { title: 'Textile Design, Crafts and Applied Arts', slug: 'textile-design-and-crafts' },
    { title: 'Traditional Nigerian Art and Culture', slug: 'traditional-nigerian-art-and-culture' },
    { title: 'African and World Art History', slug: 'african-and-world-art-history' },
    { title: 'Graphic Design, Lettering and Computer Graphics', slug: 'graphic-design-and-computer-graphics' }
  ],
  PHE: [
    { title: 'Foundations and History of Physical Education', slug: 'foundations-and-history-of-physical-education' },
    { title: 'Athletics: Track and Field Events', slug: 'athletics-track-and-field-events' },
    { title: 'Ball Games and Racket Games', slug: 'ball-and-racket-games' },
    { title: 'Gymnastics, Martial Arts and Traditional Sports', slug: 'gymnastics-and-traditional-sports' },
    { title: 'Physical Fitness, Conditioning and Body Types', slug: 'physical-fitness-and-conditioning' },
    { title: 'Human Anatomy and Physiology in Sports', slug: 'human-anatomy-and-physiology-in-sports' },
    { title: 'Health Education, Personal Hygiene and Nutrition', slug: 'health-education-and-personal-hygiene' },
    { title: 'First Aid, Safety and Sports Injuries', slug: 'first-aid-safety-and-sports-injuries' }
  ],
  MUS: [
    { title: 'Rudiments and Theory of Music', slug: 'rudiments-and-theory-of-music' },
    { title: 'Sol-fa Notation and Sight Singing', slug: 'music-reading-and-sight-singing' },
    { title: 'Musical Forms, Terms and Analysis', slug: 'musical-forms-and-analysis' },
    { title: 'African Traditional Music and Instruments', slug: 'african-traditional-music-and-instruments' },
    { title: 'Western Art Music Periods and Composers', slug: 'western-art-music-and-history' },
    { title: 'Popular Music, Highlife and Modern African Art Music', slug: 'contemporary-african-and-popular-music' }
  ],
  AGR: [
    { title: 'Crop Propagation and Nursery Management', slug: 'crop-propagation-and-nursery-management' },
    { title: 'Pasture, Forage Crops and Range Management', slug: 'pasture-and-forage-crops' },
    { title: 'Animal Reproduction, Breeding and Genetics', slug: 'animal-reproduction-and-breeding' },
    { title: 'Farm Surveying and Farmstead Planning', slug: 'farm-surveying-and-farmstead-planning' },
    { title: 'Agricultural Biotechnology and Crop Improvement', slug: 'agricultural-biotechnology-and-crop-improvement' }
  ],
  HIS: [
    { title: 'African History, Pan-Africanism and Regional Bodies', slug: 'african-history-and-liberation-struggles' },
    { title: 'World History, Global Conflicts and International Organisations', slug: 'world-history-and-international-relations' },
    { title: 'Historiography, Methodology and Sources of History', slug: 'historiography-and-sources-of-history' },
    { title: 'Colonial Administration, Directives and Constitutional Development', slug: 'colonial-administration-and-constitutional-development' },
    { title: 'Post-Independence Politics, Republics and Military Regimes', slug: 'post-independence-nigeria-and-military-regimes' },
    { title: 'Pre-Colonial Kingdoms, Dynasties and Inter-Group Relations', slug: 'pre-colonial-systems-and-inter-group-relations' }
  ]
};

async function seedTopics() {
  for (const [code, topics] of Object.entries(subjectsTopics)) {
    const [sub] = await sql`SELECT id, name FROM subjects WHERE code = ${code}`;
    if (!sub) {
      console.error(`Subject code ${code} not found!`);
      continue;
    }

    const existing = await sql`SELECT slug FROM topics WHERE subject_id = ${sub.id}`;
    const existingSlugs = new Set(existing.map(t => t.slug));

    let maxOrderRes = await sql`SELECT COALESCE(MAX(display_order), 0) as max_order FROM topics WHERE subject_id = ${sub.id}`;
    let currentOrder = maxOrderRes[0].max_order;

    const toInsert = [];
    for (const t of topics) {
      if (!existingSlugs.has(t.slug)) {
        currentOrder++;
        toInsert.push({
          id: randomUUID(),
          subject_id: sub.id,
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
      console.log(`[${code}] Added ${toInsert.length} new topics.`);
    } else {
      console.log(`[${code}] All topics already present.`);
    }

    const total = await sql`SELECT count(*)::int as count FROM topics WHERE subject_id = ${sub.id}`;
    console.log(`[${code}] Total topics in DB: ${total[0].count}`);
  }
  await sql.end();
}

seedTopics().catch(err => {
  console.error(err);
  process.exit(1);
});
