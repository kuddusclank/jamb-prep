import { readBoundedStream } from '../auth';
/**
 * Bearer Authentication, Live Session Validation, and Ownership/Admin Authorization (T03)
 *
 * Enforces:
 * - Bearer JWT verification via reviewed worker/auth.ts (<= 4 KB, <= 5 min JWKS TTL, ES256/RS256, sub UUID, exp, nbf, iss, aud).
 * - Fail-closed when SUPABASE_URL is missing (503 SERVICE_CONFIG_UNAVAILABLE).
 * - Explicit actor ownership checks (actor.userId === resource.userId) for BYPASSRLS safety.
 * - Admin authority strictly from server database (profiles.role === 'admin') + live session check;
 *   NEVER trusts JWT user_metadata.role or app_metadata.role alone.
 * - Live session check executes outside database transactions.
 */

import { JwksResponse, JwtClaims, verifySupabaseJwt } from '../auth';
import { assertValidUuid } from './contracts';
import { RequestDbContext } from './db-context';
import { ApiError, sanitizeDiagnosticMessage } from './errors';

export interface AuthEnvConfig {
  SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
}

export interface AuthenticatedActor {
  readonly userId: string;
  readonly email: string | null;
  readonly token: string;
  readonly claims: JwtClaims;
}

export interface AdminActor extends AuthenticatedActor {
  readonly role: 'admin';
}

export type LiveSessionVerifier = (actor: AuthenticatedActor, env: AuthEnvConfig) => Promise<boolean>;

export interface AuthVerificationHooks {
  nowSec?: number;
  customJwks?: JwksResponse;
  customFetch?: typeof fetch;
  liveSessionVerifier?: LiveSessionVerifier;
}

/**
 * Extracts the Bearer token from the Authorization header.
 * Throws 401 MISSING_BEARER_TOKEN if missing or malformed.
 */
export function extractBearerToken(request: Request): string {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    throw new ApiError({
      status: 401,
      code: 'MISSING_BEARER_TOKEN',
      message: 'Authentication required. Provide an Authorization: Bearer token.',
    });
  }

  const trimmed = authHeader.trim();
  if (!trimmed.toLowerCase().startsWith('bearer ')) {
    throw new ApiError({
      status: 401,
      code: 'MISSING_BEARER_TOKEN',
      message: 'Authorization header must use the Bearer scheme.',
    });
  }

  const token = trimmed.slice(7).trim();
  if (!token) {
    throw new ApiError({
      status: 401,
      code: 'MISSING_BEARER_TOKEN',
      message: 'Bearer token cannot be empty.',
    });
  }

  return token;
}

/**
 * Resolves the configured Supabase URL or fails closed with 503.
 */
export function resolveSupabaseUrl(env: AuthEnvConfig): string {
  const url = (env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
  if (!url) {
    throw new ApiError({
      status: 503,
      code: 'SERVICE_CONFIG_UNAVAILABLE',
      message: 'Authentication service configuration is unavailable.',
    });
  }
  return url.replace(/\/$/, '');
}

/**
 * Verifies the Bearer JWT and returns the authenticated actor context.
 * Does NOT allocate a database connection.
 */
export async function authenticateBearerActor(
  request: Request,
  env: AuthEnvConfig,
  hooks?: AuthVerificationHooks
): Promise<AuthenticatedActor> {
  const supabaseUrl = resolveSupabaseUrl(env);
  const token = extractBearerToken(request);

  const result = await verifySupabaseJwt(token, {
    supabaseUrl,
    nowSec: hooks?.nowSec,
    customJwks: hooks?.customJwks,
    customFetch: hooks?.customFetch,
  });

  if (!result.valid || !result.claims) {
    throw new ApiError({
      status: 401,
      code: 'INVALID_OR_EXPIRED_TOKEN',
      message: 'Invalid or expired authentication token.',
    });
  }

  const userId = assertValidUuid(result.claims.sub, 'sub');
  const email =
    typeof result.claims.email === 'string' && result.claims.email.trim().length > 0
      ? result.claims.email.trim().toLowerCase()
      : null;

  return {
    userId,
    email,
    token,
    claims: result.claims,
  };
}

/**
 * Verifies with Supabase Auth (/auth/v1/user) that the bearer session has not been revoked.
 * Must be called BEFORE opening any database transaction.
 */
export async function verifyLiveSupabaseSession(
  actor: AuthenticatedActor,
  env: AuthEnvConfig,
  hooks?: AuthVerificationHooks
): Promise<void> {
  if (hooks?.liveSessionVerifier) {
    const isLive = await hooks.liveSessionVerifier(actor, env);
    if (!isLive) {
      throw new ApiError({
        status: 401,
        code: 'SESSION_REVOKED',
        message: 'Session is no longer active. Please sign in again.',
      });
    }
    return;
  }

  const supabaseUrl = resolveSupabaseUrl(env);
  const anonKey = (env.SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();
  if (!anonKey) {
    throw new ApiError({
      status: 503,
      code: 'SERVICE_CONFIG_UNAVAILABLE',
      message: 'Authentication service key is unavailable for live session verification.',
    });
  }

  const fetcher = hooks?.customFetch || fetch;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetcher(`${supabaseUrl}/auth/v1/user`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${actor.token}`,
        apikey: anonKey,
        Accept: 'application/json',
      },
      signal: controller.signal,
      redirect: 'manual',
    });

    if (!response.ok) {
      if (response.status !== 401 && response.status !== 403) {
        throw new ApiError({ status: 503, code: 'AUTH_SERVICE_UNAVAILABLE', message: 'Authentication service is temporarily unavailable.' });
      }
      throw new ApiError({
        status: 401,
        code: 'SESSION_REVOKED',
        message: 'Session is no longer active. Please sign in again.',
      });
    }

    const bytes = await readBoundedStream(response.body, 16 * 1024, controller.signal);
    const data = JSON.parse(new TextDecoder().decode(bytes)) as { id?: unknown };
    if (typeof data?.id !== 'string' || data.id.toLowerCase() !== actor.userId) {
      throw new ApiError({
        status: 401,
        code: 'SESSION_REVOKED',
        message: 'Session identity mismatch.',
      });
    }
  } catch (err) {
    if (err instanceof ApiError) {
      throw err;
    }
    console.warn('Live session verification failed', sanitizeDiagnosticMessage(err instanceof Error ? err.message : 'Unknown provider error'));
    throw new ApiError({
      status: 503,
      code: 'SERVICE_UNAVAILABLE',
      message: 'Unable to verify live session with authentication provider.',
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Enforces explicit ownership for BYPASSRLS queries.
 * Throws 403 FORBIDDEN_NOT_OWNER if the resource does not belong to actor.userId.
 */
export function assertActorOwnership(
  actor: Pick<AuthenticatedActor, 'userId'>,
  resourceUserId: string | null | undefined
): void {
  if (!resourceUserId || resourceUserId.toLowerCase() !== actor.userId.toLowerCase()) {
    throw new ApiError({
      status: 403,
      code: 'FORBIDDEN_NOT_OWNER',
      message: 'You do not have permission to access or modify this resource.',
    });
  }
}

/**
 * Verifies that the authenticated actor has an active session AND holds role === 'admin'
 * in the authoritative server database `profiles` table.
 * Explicitly ignores any `role` or `user_metadata.role` claims in the JWT payload.
 */
export async function requireAdminActor(
  request: Request,
  env: AuthEnvConfig,
  getDb: () => RequestDbContext,
  hooks?: AuthVerificationHooks
): Promise<AdminActor> {
  const actor = await authenticateBearerActor(request, env, hooks);

  // Verify live session BEFORE touching the database
  await verifyLiveSupabaseSession(actor, env, hooks);

  const dbCtx = getDb();
  const rows = await dbCtx.sql<Array<{ id: string; role: string }>>`
    SELECT id, role
    FROM profiles
    WHERE id = ${actor.userId}::uuid
    LIMIT 1
  `;

  const profile = rows[0];
  if (!profile || profile.role !== 'admin') {
    throw new ApiError({
      status: 403,
      code: 'FORBIDDEN_ADMIN_REQUIRED',
      message: 'Administrator access is required for this endpoint.',
    });
  }

  return {
    ...actor,
    role: 'admin',
  };
}
