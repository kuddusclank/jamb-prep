import { db } from './index';
import { subjects } from './schema';

const initialSubjects = [
  { code: 'ENG', name: 'Use of English', isCompulsory: true, displayOrder: 1 },
  { code: 'MTH', name: 'Mathematics', isCompulsory: false, displayOrder: 2 },
  { code: 'PHY', name: 'Physics', isCompulsory: false, displayOrder: 3 },
  { code: 'CHM', name: 'Chemistry', isCompulsory: false, displayOrder: 4 },
  { code: 'BIO', name: 'Biology', isCompulsory: false, displayOrder: 5 },
  { code: 'ECN', name: 'Economics', isCompulsory: false, displayOrder: 6 },
  { code: 'GOV', name: 'Government', isCompulsory: false, displayOrder: 7 },
  { code: 'LIT', name: 'Literature in English', isCompulsory: false, displayOrder: 8 },
  { code: 'COM', name: 'Commerce', isCompulsory: false, displayOrder: 9 },
  { code: 'ACC', name: 'Principles of Accounting', isCompulsory: false, displayOrder: 10 },
  { code: 'CRK', name: 'Christian Religious Knowledge', isCompulsory: false, displayOrder: 11 },
  { code: 'IRS', name: 'Islamic Religious Studies', isCompulsory: false, displayOrder: 12 },
  { code: 'GEO', name: 'Geography', isCompulsory: false, displayOrder: 13 },
  { code: 'AGR', name: 'Agricultural Science', isCompulsory: false, displayOrder: 14 },
  { code: 'HIS', name: 'History', isCompulsory: false, displayOrder: 15 },
];

async function seed() {
  console.log('Seeding official JAMB subjects...');
  for (const sub of initialSubjects) {
    await db.insert(subjects).values(sub).onConflictDoNothing();
  }
  console.log('JAMB subjects successfully seeded!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Failed to seed database:', err);
  process.exit(1);
});
