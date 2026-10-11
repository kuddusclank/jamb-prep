import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { after } from 'next/server';

type Database = ReturnType<typeof drizzle<typeof schema>>;
type Connection = { sql: ReturnType<typeof postgres>; database: Database; stats: () => { queryCount: number; lifetimeMs: number } };

// React.cache does not memoize outside a component render (actions/route handlers).
// Key by the Worker request context so those paths also share one pool per request.
const workerConnections = new WeakMap<object, Connection>();
let localConnection: Connection | undefined;

function createConnection(connectionString: string, hyperdrive: boolean): Connection {
  const startedAt = performance.now();
  let queryCount = 0;
  const sql = postgres(connectionString, {
    debug: () => { queryCount += 1; },
    max: 5,
    idle_timeout: 10,
    connect_timeout: 5,
    fetch_types: false,
    // Supabase transaction pooler does not support prepared statements;
    // Hyperdrive does and requires them for reliable Postgres.js operation.
    prepare: hyperdrive || new URL(connectionString).port !== '6543',
  });
  return { sql, database: drizzle(sql, { schema }), stats: () => ({ queryCount, lifetimeMs: Math.round(performance.now() - startedAt) }) };
}

function getConnection(): Connection {
  let context: { env: { HYPERDRIVE?: { connectionString: string } }; ctx: object } | undefined;
  try {
    context = getCloudflareContext() as typeof context;
  } catch {
    // Node development and database scripts do not have a Worker request context.
  }

  if (context && process.env.NODE_ENV !== "development") {
    const existing = workerConnections.get(context.ctx);
    if (existing) return existing;
    const hyperdrive = (context.env as { HYPERDRIVE?: { connectionString: string } }).HYPERDRIVE;
    if (!hyperdrive?.connectionString) {
      throw new Error('The HYPERDRIVE binding is required in the Worker runtime.');
    }
    const connection = createConnection(hyperdrive.connectionString, true);
    workerConnections.set(context.ctx, connection);
    after(async () => {
      workerConnections.delete(context.ctx);
      await connection.sql.end({ timeout: 1 });
      if (process.env.PERFORMANCE_LOGGING === "true") {
        console.info(JSON.stringify({ event: "database_request", ...connection.stats() }));
      }
    });
    return connection;
  }

  if (!localConnection) {
    const url = process.env.TRANSACTION_DATABASE_URL || process.env.DATABASE_URL;
    if (!url) throw new Error('A database connection URL is required for local development.');
    localConnection = createConnection(url, false);
  }
  return localConnection;
}

export const getSqlClient = () => getConnection().sql;
export const getDatabase = () => getConnection().database;

export const db = new Proxy({} as Database, {
  get(_target, prop) {
    return Reflect.get(getDatabase(), prop);
  },
});
