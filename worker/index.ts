/**
 * Native Cloudflare Worker Entry Point for Feasibility Spike (T01)
 *
 * Requirements (F1):
 * - Standalone fetch handler (zero Next.js, zero React, zero @opennextjs/cloudflare).
 * - Fail-closed preview access: SPIKE_SECRET must be configured and valid; missing configuration denies access.
 * - Authenticates request / verifies secret BEFORE creating database clients.
 * - Explicit reviewed CORS allowlist; zero reflected arbitrary origins.
 * - Request-scoped Hyperdrive database client with guaranteed cleanup.
 * - Routes strictly restricted to /api/spike/*.
 * - Generic safe error masking; zero leaking of tokens, secrets, or internal details.
 */

import { createSpikeDbClient, SpikeDatabaseClient, SpikeEnv } from './db';
import { handleSpikeRoutes, jsonResponse } from './spike-routes';

export interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

const REVIEWED_PREVIEW_ORIGINS = new Set([
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://jambprep.pages.dev',
]);

export default {
  async fetch(request: Request, env: SpikeEnv, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Handle CORS Preflight with strict reviewed allowlist (no reflected arbitrary origins)
    if (request.method.toUpperCase() === 'OPTIONS') {
      const origin = request.headers.get('origin');
      if (origin && REVIEWED_PREVIEW_ORIGINS.has(origin)) {
        return new Response(null, {
          status: 204,
          headers: {
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers':
              'Authorization, Content-Type, x-spike-secret, x-paystack-signature, x-spike-request-id',
            'Access-Control-Max-Age': '86400',
          },
        });
      }
      return new Response(null, { status: 204 });
    }

    // Only /api/spike/* routes are exposed on this feasibility worker
    if (!url.pathname.startsWith('/api/spike/')) {
      return jsonResponse({ error: 'NOT_FOUND' }, 404);
    }

    // F1: Fail-closed preview secret check BEFORE creating database client
    const headerSecret = request.headers.get('x-spike-secret');
    if (!env.SPIKE_SECRET || env.SPIKE_SECRET.trim().length === 0) {
      return jsonResponse({ error: 'SPIKE_CONFIG_UNAVAILABLE' }, 503);
    }
    if (!headerSecret || headerSecret !== env.SPIKE_SECRET) {
      return jsonResponse({ error: 'FORBIDDEN_INVALID_SPIKE_SECRET' }, 403);
    }

    // R3: Lazy database client getter; only invoked if an authorized DB scenario executes
    const dbHolder: { client: SpikeDatabaseClient | null } = { client: null };
    const getDb = () => {
      if (!dbHolder.client) {
        dbHolder.client = createSpikeDbClient(env);
      }
      return dbHolder.client;
    };

    try {
      const response = await handleSpikeRoutes(request, env, getDb);
      return response;
    } catch {
      console.error('Spike unhandled error');
      return jsonResponse({ error: 'INTERNAL_SERVER_ERROR' }, 500);
    } finally {
      // Ensure database connections are cleanly scheduled for closure if allocated
      if (dbHolder.client) {
        ctx.waitUntil(dbHolder.client.cleanup());
      }
    }
  },
};
