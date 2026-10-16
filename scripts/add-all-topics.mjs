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
  ACC: [
    { title: 'Departmental and Branch Accounts', slug: 'departmental-and-branch-accounts' },
    { title: 'Public Sector and Government Accounting', slug: 'public-sector-and-government-accounting' },
    { title: 'Incomplete Records and Single Entry', slug: 'incomplete-records-and-single-entry' },
    { title: 'Stock Valuation Methods', slug: 'stock-valuation-methods' },
    { title: 'Non-Profit and Club Accounts', slug: 'non-profit-and-club-accounts' }
  ],
  CMP: [
    { title: 'Evolution of Computing and Computer Generations', slug: 'evolution-of-computing-and-generations' },
    { title: 'Classification and Types of Computers', slug: 'classification-of-computers' },
    { title: 'Computer Hardware and Peripherals', slug: 'computer-hardware-components-and-peripherals' },
    { title: 'Memory and Storage Devices', slug: 'memory-and-storage-devices' },
    { title: 'Computer Software: System and Application', slug: 'computer-software-system-and-application' },
    { title: 'Operating Systems and Booting Operations', slug: 'operating-systems-and-booting' },
    { title: 'Data Representation and Logic Gates', slug: 'data-representation-and-logic-gates' },
    { title: 'Computer Networks, Telecommunications and Internet', slug: 'computer-networks-and-internet' },
    { title: 'Computer Security, Ethics and Malware Protection', slug: 'computer-security-ethics-and-malware' },
    { title: 'Database Management Systems and SQL', slug: 'database-management-systems-and-sql' },
    { title: 'Word Processing and Document Design', slug: 'word-processing-and-desktop-publishing' },
    { title: 'Spreadsheet Packages and Numerical Modeling', slug: 'spreadsheets-and-data-analysis' },
    { title: 'Presentation Graphics and Multimedia Applications', slug: 'presentation-packages-and-graphics' },
    { title: 'Programming Languages, Algorithms and Flowcharts', slug: 'programming-languages-and-algorithms' },
    { title: 'Systems Development Life Cycle (SDLC)', slug: 'systems-development-life-cycle-sdlc' }
  ],
  FRN: [
    { title: 'Reading Comprehension and Textual Analysis', slug: 'reading-comprehension-and-passages' },
    { title: 'French Grammar and Parts of Speech', slug: 'french-grammar-parts-of-speech' },
    { title: 'Verb Tenses and Conjugation', slug: 'verb-tenses-and-conjugation' },
    { title: 'Prepositions, Conjunctions and Clauses', slug: 'prepositions-and-conjunctions' },
    { title: 'Vocabulary, Everyday Communication and Idioms', slug: 'vocabulary-and-everyday-expressions' },
    { title: 'Pronunciation, Phonetics and Syllabification', slug: 'pronunciation-and-phonetics' },
    { title: 'Francophone Civilization, Culture and Literature', slug: 'french-and-francophone-culture-literature' }
  ],
  IGB: [
    { title: 'Nghọta Edemede na Mkparịtaụka (Reading Comprehension)', slug: 'igbo-reading-comprehension' },
    { title: 'Ụtọasụsụ na Nkeji Okwu (Grammar & Parts of Speech)', slug: 'igbo-grammar-and-parts-of-speech' },
    { title: 'Ụdaasụsụ, Mkpụrụedemede na Nsupe (Phonology & Orthography)', slug: 'igbo-phonology-and-orthography' },
    { title: 'Ọnụọgụgụ na Mkpụrụọgụgụ (Numeration & Counting)', slug: 'igbo-numeration-and-counting' },
    { title: 'Ilu, Agwụgwa na Akpaalaokwu (Idioms & Proverbs)', slug: 'igbo-idioms-proverbs-and-figures-of-speech' },
    { title: 'Omenala, Emume na Nkwenye (Culture & Customs)', slug: 'igbo-culture-customs-and-institutions' },
    { title: 'Agụmagụ Igbo na Ederede (Literature & Authors)', slug: 'igbo-literature-and-prescribed-texts' },
    { title: 'Ntụgharị Asụsụ na Okwu Ọhụrụ (Translation & Vocabulary)', slug: 'translation-and-vocabulary' }
  ],
  HAU: [
    { title: 'Fahimtar Labari (Reading Comprehension)', slug: 'hausa-reading-comprehension' },
    { title: 'Nahawun Hausa da Kalmomi (Grammar & Parts of Speech)', slug: 'hausa-grammar-and-parts-of-speech' },
    { title: 'Fasahar Sauti da Furunci (Phonology & Sound Systems)', slug: 'hausa-phonology-and-sound-systems' },
    { title: 'Tsarin Jimla da Rukunanta (Sentence Structure & Syntax)', slug: 'sentence-structure-and-syntax' },
    { title: 'Karin Magana da Salon Magana (Proverbs & Idioms)', slug: 'hausa-proverbs-and-idiomatic-expressions' },
    { title: 'Al\'adu, Gargajiya da Sunaye (Culture, Traditions & Names)', slug: 'hausa-culture-traditions-and-customs' },
    { title: 'Adabin Hausa: Zube, Waka da Wasan Kwaikwayo (Literature)', slug: 'hausa-literature-prose-poetry-and-drama' },
    { title: 'Fassara da Ma\'anar Kalmomi (Translation & Vocabulary)', slug: 'translation-and-vocabulary' }
  ],
  ARB: [
    { title: 'فهم المقروء والنصوص (Reading Comprehension)', slug: 'arabic-reading-comprehension' },
    { title: 'النحو العربي وقواعد الإعراب (Arabic Grammar / Nahw)', slug: 'arabic-grammar-nahw' },
    { title: 'علم الصرف والمشتقات (Morphology / Sarf)', slug: 'arabic-morphology-sarf' },
    { title: 'الأمثال والحكم والبلاغة (Proverbs, Idioms & Rhetoric)', slug: 'arabic-proverbs-and-idioms' },
    { title: 'تاريخ الأدب العربي والنصوص (Literature & History)', slug: 'arabic-literature-and-history' },
    { title: 'الترجمة والمفردات اللغوية (Translation & Vocabulary)', slug: 'translation-and-vocabulary' },
    { title: 'الثقافة الإسلامية والمعارف الدينية (Islamic & Cultural Studies)', slug: 'islamic-and-cultural-studies' }
  ],
  YOR: [
    { title: 'Àyọkà àti Òye Kíkà (Reading Comprehension)', slug: 'yoruba-reading-comprehension' },
    { title: 'Gírámà, Ìhun Gbólóhùn àti Ìsọ̀rí Ọ̀rọ̀ (Grammar & Sentence Structure)', slug: 'yoruba-grammar-and-sentence-structure' },
    { title: 'Fọnọ́lọ́jì, Àmì Ohùn àti Akọtọ́ (Phonology & Orthography)', slug: 'yoruba-phonology-and-orthography' },
    { title: 'Ìtumọ̀ Ọ̀rọ̀, Àyálò Ọ̀rọ̀ àti Ògbufọ̀ (Vocabulary & Translation)', slug: 'yoruba-vocabulary-and-translation' },
    { title: 'Òwe, Àkànlò Èdè àti Ọnà Èdè (Proverbs, Idioms & Figures of Speech)', slug: 'yoruba-proverbs-and-idioms' },
    { title: 'Lítíréṣọ̀ Alohùn: Oríkì, Ìjálá, Ewì àti Alárìnjó (Oral Literature & Poetry)', slug: 'yoruba-oral-literature-and-poetry' },
    { title: 'Lítíréṣọ̀ Àpilẹ̀kọ àti Àwọn Onkọ̀wé (Written Literature & Authors)', slug: 'yoruba-written-literature-and-authors' },
    { title: 'Àṣà, Ìṣe, Ẹ̀sìn Ìbílẹ̀ àti Ìgbéyàwó Yorùbá (Culture, Customs & Institutions)', slug: 'yoruba-culture-customs-and-institutions' }
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
