import { importSubjectQuestions } from './import-generic.mjs';
import { existsSync } from 'fs';

const isDryRun = process.argv.includes('--dry-run');
const subjectCode = process.argv[2]?.toUpperCase();
const yearsToRun = process.argv.slice(3).filter(arg => !arg.startsWith('--')).map(Number);

if (!subjectCode) {
  console.error('Please specify a subject code, e.g. node jambprep/scripts/run-subject-import.mjs ART 2018 2025');
  process.exit(1);
}

const subjectFilePrefixes = {
  ACC: 'accounting',
  CMP: 'computer-studies',
  FRN: 'french',
  IGB: 'igbo',
  HAU: 'hausa',
  ARB: 'arabic',
  ART: 'art',
  AGR: 'agriculture',
  PHE: 'physical-health',
  HIS: 'history',
  MUS: 'music',
  HEC: 'home-economics',
  YOR: 'yoruba'
};

const prefix = subjectFilePrefixes[subjectCode];
if (!prefix) {
  console.error(`Unknown subject code: ${subjectCode}`);
  process.exit(1);
}

async function run() {
  const years = yearsToRun;
  if (years.length === 0) {
    console.error('Please specify at least one year to run.');
    process.exit(1);
  }

  for (const yr of years) {
    const file = `./dataset-${prefix}-${yr}.mjs`;
    if (!existsSync(`jambprep/scripts/dataset-${prefix}-${yr}.mjs`)) {
      console.log(`Dataset for ${prefix} ${yr} not found at ${file}. Skipping.`);
      continue;
    }
    console.log(`\n=================== IMPORTING [${subjectCode}] YEAR ${yr} ===================`);
    const mod = await import(file);
    const questions = mod[`questions${yr}`] || mod.questions;
    if (!questions || !Array.isArray(questions)) {
      console.error(`Invalid export in ${file}`);
      continue;
    }
    try {
      await importSubjectQuestions(subjectCode, questions, { isDryRun });
      console.log(`[${subjectCode}] Year ${yr} finished successfully.`);
    } catch (err) {
      if (isDryRun && err.message === 'ROLLBACK_DRY_RUN') {
        console.log(`[${subjectCode}] Year ${yr} dry run verified cleanly.`);
      } else {
        console.error(`[${subjectCode}] Year ${yr} import failed:`, err);
        process.exit(1);
      }
    }
  }
}

run();
