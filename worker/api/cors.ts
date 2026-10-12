/**
 * Strict Origin & CORS Policy for Native Cloudflare Worker API (T03)
 *
 * Requirements (Plan Section 5.6):
 * - Explicit reviewed origin allowlist: https://jambprep.lecterniq.com + reviewed dev/preview origins.
 * - Never reflect arbitrary origins or return Access-Control-Allow-Origin: *.
 * - Omit Access-Control-Allow-Credentials on bearer-authenticated API responses.
 * - Always set Vary: Origin.
 * - Reject disallowed browser Origin headers with 403 FORBIDDEN_ORIGIN before DB allocation.
 */

import { ApiError } from './errors';

export const DEFAULT_ALLOWED_ORIGINS: ReadonlyArray<string> = [
  'https://jambprep.lecterniq.com',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://jambprep.pages.dev',
];

export interface CorsEnvConfig {
  ALLOWED_ORIGINS?: string;
}

/**
 * Resolves the exact set of allowed origins from defaults plus any explicit comma-separated
 * env.ALLOWED_ORIGINS entries (ignoring wildcards).
 */
export function resolveAllowedOrigins(env?: CorsEnvConfig): Set<string> {
  const allowed = new Set<string>(DEFAULT_ALLOWED_ORIGINS);
  if (env?.ALLOWED_ORIGINS) {
    for (const raw of env.ALLOWED_ORIGINS.split(',')) {
      const trimmed = raw.trim();
      if (trimmed && trimmed !== '*' && (trimmed.startsWith('https://') || trimmed.startsWith('http://localhost:') || trimmed.startsWith('http://127.0.0.1:'))) {
        allowed.add(trimmed);
      }
    }
  }
  return allowed;
}

/**
 * Validates the request Origin header against the allowlist and returns response CORS headers.
 * Throws 403 FORBIDDEN_ORIGIN if an Origin header is present and not in the allowlist.
 */
export function validateOriginAndGetCorsHeaders(
  request: Request,
  env?: CorsEnvConfig
): Record<string, string> {
  const origin = request.headers.get('origin');
  if (!origin) {
    return {
      Vary: 'Origin',
    };
  }

  const allowedOrigins = resolveAllowedOrigins(env);
  if (!allowedOrigins.has(origin)) {
    throw new ApiError({
      status: 403,
      code: 'FORBIDDEN_ORIGIN',
      message: 'Origin is not permitted to access this API.',
      headers: { Vary: 'Origin' },
    });
  }

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Expose-Headers': 'X-Request-Id, Idempotent-Replayed',
    Vary: 'Origin',
  };
}

/**
 * Handles CORS preflight OPTIONS requests with strict origin validation.
 */
export function handleCorsPreflight(
  request: Request,
  requestId: string,
  allowedMethods: ReadonlyArray<string>,
  env?: CorsEnvConfig
): Response {
  const origin = request.headers.get('origin');
  const allowedOrigins = resolveAllowedOrigins(env);

  if (!origin || !allowedOrigins.has(origin)) {
    throw new ApiError({
      status: 403,
      code: 'FORBIDDEN_ORIGIN',
      message: 'CORS preflight rejected for disallowed origin.',
      headers: { Vary: 'Origin' },
    });
  }

  const methods = Array.from(new Set([...allowedMethods, 'OPTIONS'])).join(', ');

  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': methods,
      'Access-Control-Allow-Headers': 'Authorization, Content-Type, Idempotency-Key, X-Import-Job, X-Import-Batch',
      'Access-Control-Max-Age': '86400',
      'Cache-Control': 'no-store',
      'X-Request-Id': requestId,
      Vary: 'Origin',
    },
  });
}
