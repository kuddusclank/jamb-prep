import { importQuestions } from './import-commerce.mjs';
import { existsSync } from 'fs';

const isDryRun = process.argv.includes('--dry-run');
const yearsToRun = process.argv.slice(2).filter(arg => !arg.startsWith('--')).map(Number);

async function run() {
  const years = yearsToRun.length > 0 ? yearsToRun : [1999, 2000, 2001, 2002, 2003, 2004];

  for (const yr of years) {
    const file = `./dataset-commerce-${yr}.mjs`;
    if (!existsSync(`jambprep/scripts/dataset-commerce-${yr}.mjs`)) {
      console.log(`Dataset for ${yr} not found yet at ${file}. Skipping.`);
      continue;
    }
    console.log(`\n=================== IMPORTING YEAR ${yr} ===================`);
    const mod = await import(file);
    const questions = mod[`questions${yr}`];
    if (!questions || !Array.isArray(questions)) {
      console.error(`Invalid export in ${file}`);
      continue;
    }
    try {
      await importQuestions(questions, { isDryRun });
      console.log(`Year ${yr} finished successfully.`);
    } catch (err) {
      if (isDryRun && err.message === 'ROLLBACK_DRY_RUN') {
        console.log(`Year ${yr} dry run verified cleanly.`);
      } else {
        console.error(`Year ${yr} import failed:`, err);
        process.exit(1);
      }
    }
  }
}

run();
