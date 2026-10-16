import { importSubjectQuestions } from './import-generic.mjs';
import { existsSync } from 'fs';

const isDryRun = process.argv.includes('--dry-run');

const jobs = [
  {
    subjectCode: 'ART',
    prefix: 'art',
    years: [2018, 2025]
  },
  {
    subjectCode: 'MUS',
    prefix: 'music',
    years: [2015, 2018, 2025]
  },
  {
    subjectCode: 'PHE',
    prefix: 'physical-health',
    years: [2022, 2023, 2024, 2025]
  },
  {
    subjectCode: 'AGR',
    prefix: 'agriculture',
    years: [2013, 2015, 2019, 2020, 2021, 2022, 2023, 2024, 2025]
  },
  {
    subjectCode: 'HIS',
    prefix: 'history',
    years: [2002, 2008, 2010, 2012, 2019, 2020, 2021, 2022, 2023, 2024, 2025]
  }
];

async function runAll() {
  for (const job of jobs) {
    console.log(`\n###############################################################`);
    console.log(`### STARTING [${job.subjectCode}] IMPORT (${job.years.length} YEARS)`);
    console.log(`###############################################################`);

    for (const yr of job.years) {
      const file = `./dataset-${job.prefix}-${yr}.mjs`;
      if (!existsSync(`jambprep/scripts/dataset-${job.prefix}-${yr}.mjs`)) {
        console.log(`File not found: ${file}. Skipping.`);
        continue;
      }
      console.log(`\n--- Importing [${job.subjectCode}] Year ${yr} ---`);
      const mod = await import(file);
      const questions = mod[`questions${yr}`] || mod.questions;
      if (!questions || !Array.isArray(questions)) {
        console.error(`Invalid export in ${file}`);
        continue;
      }

      try {
        await importSubjectQuestions(job.subjectCode, questions, { isDryRun });
        console.log(`[${job.subjectCode}] Year ${yr} successfully imported.`);
      } catch (err) {
        if (isDryRun && err.message === 'ROLLBACK_DRY_RUN') {
          console.log(`[${job.subjectCode}] Year ${yr} dry run verified cleanly.`);
        } else {
          console.error(`[${job.subjectCode}] Year ${yr} FAILED:`, err);
          process.exit(1);
        }
      }
    }
  }
  console.log(`\nALL JOBS COMPLETED SUCCESSFULLY!`);
}

runAll().catch(console.error);
