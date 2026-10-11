import { readFileSync, writeFileSync, openSync, closeSync, unlinkSync, renameSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

const LEDGER_PATH = new URL('../bmad/t02-cumulative-ledger.json', import.meta.url);

function validateLedger(ledger) {
  if (ledger.hardBudgetCap !== 900 || ledger.maxConcurrencyCap !== 5 || !Array.isArray(ledger.requests)) {
    throw new Error('Invalid ledger limits or requests');
  }
  const ids = new Set();
  let total = 0;
  for (const request of ledger.requests) {
    if (!request.id || ids.has(request.id) || !Number.isSafeInteger(request.count) || request.count <= 0) {
      throw new Error('Invalid or duplicate ledger reservation');
    }
    ids.add(request.id);
    total += request.count;
  }
  if (total > 900 || total !== ledger.totalCumulativeCount || 900 - total !== ledger.remainingBudget) {
    throw new Error('Inconsistent ledger accounting');
  }
  return ledger;
}

export function getLedgerStatus(path = LEDGER_PATH) {
  return validateLedger(JSON.parse(readFileSync(path, 'utf8')));
}

export function recordRequestInLedger(id, description, count = 1, path = LEDGER_PATH) {
  if (typeof id !== 'string' || !id.trim() || typeof description !== 'string' || !description.trim()
      || !Number.isSafeInteger(count) || count <= 0) {
    throw new Error('Reservation requires an ID, description and positive integer count');
  }
  const file = path instanceof URL ? path.pathname : path;
  const lock = `${file}.lock`;
  const temporary = `${file}.${randomUUID()}.tmp`;
  const descriptor = openSync(lock, 'wx', 0o600);
  try {
    const ledger = getLedgerStatus(path);
    if (ledger.requests.some(request => request.id === id)) throw new Error('Duplicate reservation ID');
    if (ledger.totalCumulativeCount + count > ledger.hardBudgetCap) throw new Error('Request budget exceeded');
    ledger.requests.push({ id, timestamp: new Date().toISOString(), count, description });
    ledger.totalCumulativeCount += count;
    ledger.remainingBudget = ledger.hardBudgetCap - ledger.totalCumulativeCount;
    ledger.updatedAt = new Date().toISOString();
    writeFileSync(temporary, JSON.stringify(validateLedger(ledger), null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    renameSync(temporary, file);
    return ledger;
  } finally {
    closeSync(descriptor);
    unlinkSync(lock);
    try { unlinkSync(temporary); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
}
