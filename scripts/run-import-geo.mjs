import { importQuestions } from './import-geography.mjs';
import { existsSync } from 'fs';

const isDryRun = process.argv.includes('--dry-run');
const yearsToRun = process.argv.slice(2).filter(arg => !arg.startsWith('--')).map(Number);

async function run() {
  const allYears = [2001, 2002, 2004, 2005, 2007, 2011, 2012, 2013];
  const years = yearsToRun.length > 0 ? yearsToRun : allYears;

  for (const yr of years) {
    const file = `./dataset-geography-${yr}.mjs`;
    if (!existsSync(`jambprep/scripts/dataset-geography-${yr}.mjs`)) {
      console.log(`Dataset for ${yr} not found yet at ${file}. Skipping.`);
      continue;
    }
    console.log(`\n=================== IMPORTING GEOGRAPHY YEAR ${yr} ===================`);
    const mod = await import(file);
    const questions = mod[`questions${yr}`];
    if (!questions || !Array.isArray(questions)) {
      console.error(`Invalid export in ${file}`);
      continue;
    }
    try {
      await importQuestions(questions, { isDryRun });
      console.log(`Geography Year ${yr} finished successfully.`);
    } catch (err) {
      if (isDryRun && err.message === 'ROLLBACK_DRY_RUN') {
        console.log(`Geography Year ${yr} dry run verified cleanly.`);
      } else {
        console.error(`Geography Year ${yr} import failed:`, err);
        process.exit(1);
      }
    }
  }
}

run();
