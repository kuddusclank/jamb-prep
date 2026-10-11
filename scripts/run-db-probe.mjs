import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { recordRequestInLedger } from './ledger.mjs';
import { readBoundedResponse } from './run-cpu-spike.mjs';

const PROBE_URL = 'https://jambprep-spike.abdulquddus-akanbi.workers.dev/api/spike/db-probe';

export async function runProbe({ spikeSecret, token, fetchImpl = fetch, timeoutMs = 25000, ledgerPath }) {
  if (!spikeSecret || !token || !Number.isSafeInteger(timeoutMs) || timeoutMs <= 0 || timeoutMs > 25000) {
    throw new Error('Invalid private probe inputs');
  }
  const requestId = `probe-${randomUUID()}`;
  recordRequestInLedger(requestId, 'Authenticated SELECT1 probe; reserved before network', 1, ledgerPath);
  const started = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(PROBE_URL, { redirect: 'error', headers: {
      'x-spike-secret': spikeSecret, Authorization: `Bearer ${token}`, 'x-spike-request-id': requestId,
    }, signal: controller.signal });
    const bytes = await readBoundedResponse(response, 4096, controller.signal);
    const body = JSON.parse(new TextDecoder().decode(bytes));
    const result = { requestId, status: response.status, clientElapsedMs: Date.now() - started };
    for (const key of ['firstQueryMs', 'secondQueryMs']) {
      if (Number.isFinite(body?.[key]) && body[key] >= 0) result[key] = body[key];
    }
    return result;
  } catch {
    return { requestId, clientElapsedMs: Date.now() - started,
      failure: controller.signal.aborted ? 'CLIENT_TIMEOUT' : 'PROBE_FAILED' };
  } finally { clearTimeout(timeout); }
}

export async function main(args = process.argv.slice(2)) {
  if (args.length !== 1 || args[0] !== '--run') {
    console.log('No requests sent. Use --run with SPIKE_SECRET and SPIKE_TOKEN_FILE.');
    return;
  }
  if (!process.env.SPIKE_SECRET || !process.env.SPIKE_TOKEN_FILE) throw new Error('Missing private probe inputs');
  const token = readFileSync(process.env.SPIKE_TOKEN_FILE, 'utf8').trim();
  console.log(JSON.stringify(await runProbe({ spikeSecret: process.env.SPIKE_SECRET, token })));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(() => { console.error('Probe failed; inspect private inputs and reserved ledger.'); process.exitCode = 1; });
}
