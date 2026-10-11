import { readFileSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { recordRequestInLedger } from './ledger.mjs';

const envContent = readFileSync('.env.local', 'utf8');
const env = Object.fromEntries(
  envContent
    .split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => {
      const idx = l.indexOf('=');
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim().replace(/^["']|["']$/g, '')];
    })
);

async function main() {
  recordRequestInLedger(`supabase-auth-login-${randomUUID()}`, 'Supabase Auth password login for test subject 547fee7d-27cc-403f-8097-b2afb7cbc438', 1);

  const t0 = Date.now();
  const authRes = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: env.SMOKE_TEST_EMAIL,
      password: env.SMOKE_TEST_PASSWORD,
    }),
  });
  const elapsed = Date.now() - t0;
  const authData = await authRes.json();
  if (!authData.access_token) {
    console.error('Auth login failed:', authData);
    process.exit(1);
  }

  writeFileSync('/tmp/spike-test-token.txt', authData.access_token, { mode: 0o600 });
  console.log(`[Auth] Token acquired successfully in ${elapsed} ms. Subject: ${authData.user?.id}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
