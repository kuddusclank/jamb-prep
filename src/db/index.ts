import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Use Transaction Pooler (port 6543) for ultra-fast serverless connection pooling
const connectionString = 
  process.env.TRANSACTION_DATABASE_URL || 
  process.env.DATABASE_URL || 
  'postgresql://postgres:postgres@localhost:54322/postgres';

// Maintain a global singleton client across Next.js requests to keep TLS sockets warm
const globalForDb = globalThis as unknown as {
  postgresClient?: postgres.Sql;
};

const client = globalForDb.postgresClient ?? postgres(connectionString, {
  prepare: false,
  max: 10,
  idle_timeout: 60,
  connect_timeout: 10,
});

if (process.env.NODE_ENV !== 'production') {
  globalForDb.postgresClient = client;
}

export const db = drizzle(client, { schema });

