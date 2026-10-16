import { importQuestions } from './import-home-economics.mjs';
import { existsSync } from 'fs';

const isDryRun = process.argv.includes('--dry-run');
const yearsToRun = process.argv.slice(2).filter(arg => !arg.startsWith('--')).map(Number);

async function run() {
  const allYears = [2021, 2022, 2023, 2024, 2025];
  const years = yearsToRun.length > 0 ? yearsToRun : allYears;

  for (const yr of years) {
    const file = `./dataset-home-economics-${yr}.mjs`;
    if (!existsSync(`jambprep/scripts/dataset-home-economics-${yr}.mjs`)) {
      console.log(`Dataset for ${yr} not found yet at ${file}. Skipping.`);
      continue;
    }
    console.log(`\n=================== IMPORTING HOME ECONOMICS YEAR ${yr} ===================`);
    const mod = await import(file);
    const questions = mod[`questions${yr}`];
    if (!questions || !Array.isArray(questions)) {
      console.error(`Invalid export in ${file}`);
      continue;
    }
    try {
      await importQuestions(questions, { isDryRun });
      console.log(`Home Economics Year ${yr} finished successfully.`);
    } catch (err) {
      if (isDryRun && err.message === 'ROLLBACK_DRY_RUN') {
        console.log(`Home Economics Year ${yr} dry run verified cleanly.`);
      } else {
        console.error(`Home Economics Year ${yr} import failed:`, err);
        process.exit(1);
      }
    }
  }
}

run();
