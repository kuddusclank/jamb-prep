import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { cache } from 'react';

function getResolvedConnectionString(): string {
  // 1. Injected by Cloudflare Worker fetch event handler
  if ((globalThis as any).__HYPERDRIVE_CONN__) {
    return (globalThis as any).__HYPERDRIVE_CONN__;
  }
  if (process.env.HYPERDRIVE_CONNECTION_STRING) {
    return process.env.HYPERDRIVE_CONNECTION_STRING;
  }

  // 2. OpenNext Cloudflare AsyncLocalStorage context
  try {
    const ctx = getCloudflareContext();
    const hyperdrive = (ctx?.env as { HYPERDRIVE?: { connectionString?: string } })?.HYPERDRIVE;
    if (hyperdrive?.connectionString) {
      return hyperdrive.connectionString;
    }
  } catch {
    // Outside of Cloudflare request context or build time
  }

  // 3. Fallback for local scripts and development
  return (
    process.env.TRANSACTION_DATABASE_URL ||
    process.env.DATABASE_URL ||
    'postgresql://postgres:postgres@localhost:54322/postgres'
  );
}

// Scoped strictly to the active React request context:
// Prevents dead/closed worker TCP sockets from being reused across subsequent requests.
export const getDatabase = cache(() => {
  const connectionString = getResolvedConnectionString();

  const client = postgres(connectionString, {
    max: 1,
    idle_timeout: 4,
    connect_timeout: 4,
  });

  return drizzle(client, { schema });
});

export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop) {
    const instance = getDatabase();
    return (instance as any)[prop];
  },
});
