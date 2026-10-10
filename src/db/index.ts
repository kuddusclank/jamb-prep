import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { getCloudflareContext } from '@opennextjs/cloudflare';

// Maintain singleton instances on globalThis to survive warm worker requests
const globalForDb = globalThis as unknown as {
  currentConnStr?: string;
  postgresClient?: postgres.Sql;
  drizzleInstance?: ReturnType<typeof drizzle<typeof schema>>;
  __HYPERDRIVE_CONN__?: string;
};

function getResolvedConnectionString(): string {
  // 1. Check if set in globalThis (injected on Worker fetch entry)
  if (globalForDb.__HYPERDRIVE_CONN__) {
    return globalForDb.__HYPERDRIVE_CONN__;
  }

  // 2. Check process.env.HYPERDRIVE_CONNECTION_STRING
  if (process.env.HYPERDRIVE_CONNECTION_STRING) {
    return process.env.HYPERDRIVE_CONNECTION_STRING;
  }

  // 3. Try OpenNext Cloudflare request context
  try {
    const ctx = getCloudflareContext();
    const hyperdrive = (ctx?.env as { HYPERDRIVE?: { connectionString?: string } })?.HYPERDRIVE;
    if (hyperdrive?.connectionString) {
      globalForDb.__HYPERDRIVE_CONN__ = hyperdrive.connectionString;
      return hyperdrive.connectionString;
    }
  } catch {
    // Outside of Cloudflare request context or build time
  }

  // 4. Fallback for local scripts and development
  return (
    process.env.TRANSACTION_DATABASE_URL ||
    process.env.DATABASE_URL ||
    'postgresql://postgres:postgres@localhost:54322/postgres'
  );
}

function getDatabase() {
  const connectionString = getResolvedConnectionString();

  if (globalForDb.drizzleInstance && globalForDb.currentConnStr === connectionString) {
    return globalForDb.drizzleInstance;
  }

  // NOTE: Cloudflare Hyperdrive requires prepared statements (do NOT use prepare: false)
  const client = postgres(connectionString, {
    max: 5,
    idle_timeout: 10,
    connect_timeout: 10,
  });

  globalForDb.currentConnStr = connectionString;
  globalForDb.postgresClient = client;
  globalForDb.drizzleInstance = drizzle(client, { schema });

  return globalForDb.drizzleInstance;
}

export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop) {
    const instance = getDatabase();
    return (instance as any)[prop];
  },
});
