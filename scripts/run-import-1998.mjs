import { questions1998 } from './dataset-commerce-1998.mjs';
import { importQuestions } from './import-commerce.mjs';

const isDryRun = process.argv.includes('--dry-run');

async function main() {
  try {
    await importQuestions(questions1998, { isDryRun });
    console.log('1998 import operation finished cleanly.');
    process.exit(0);
  } catch (err) {
    if (isDryRun && err.message === 'ROLLBACK_DRY_RUN') {
      console.log('Dry run verification succeeded cleanly.');
      process.exit(0);
    }
    console.error('Import failed:', err);
    process.exit(1);
  }
}

main();
