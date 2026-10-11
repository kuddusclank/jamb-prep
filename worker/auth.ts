/**
 * Web Crypto Supabase JWT Validator for Native Cloudflare Worker (T01)
 *
 * Requirements:
 * - Native Web Crypto (crypto.subtle) without heavy node / runtime packages.
 * - Max token size bound: 4,096 bytes (4 KB).
 * - JWKS in-isolate cache TTL: <= 5 minutes (300,000 ms).
 * - Coalesced in-flight JWKS fetches for unknown kid.
 * - Unknown-kid throttling / backoff: max 1 fetch every 30 seconds.
 * - Fail-closed: rejection on fetch error; zero fallback to expired keys.
 * - Pinned algorithms: ES256, RS256. Rejects none and HS256 unconditionally.
 * - Claims validation: sub (UUID string), exp (numeric future), nbf (optional, <= now),
 *   iss (pinned to Supabase auth issuer), aud ("authenticated").
 * - Dependency injection for tests (custom JWKS, custom fetcher, custom clock).
 */

export interface JwtHeader {
  alg: string;
  kid?: string;
  typ?: string;
}

export interface JwtClaims {
  sub: string;
  exp: number;
  nbf?: number;
  iss: string;
  aud: string;
  email?: string;
  role?: string;
  [key: string]: unknown;
}

export interface JwkKey {
  kty: string;
  kid?: string;
  alg?: string;
  use?: string;
  crv?: string;
  x?: string;
  y?: string;
  n?: string;
  e?: string;
}

export interface JwksResponse {
  keys: JwkKey[];
}

export interface VerifyJwtOptions {
  supabaseUrl: string;
  expectedAudience?: string;
  nowSec?: number;
  customJwks?: JwksResponse;
  customFetch?: typeof fetch;
}

export interface AuthResult {
  valid: boolean;
  claims?: JwtClaims;
  error?: string;
}

// In-isolate cache entry
interface CachedKey {
  key: CryptoKey;
  algorithm: string;
  fetchedAtMs: number;
}

const MAX_TOKEN_BYTES = 4096;
const MAX_JWKS_BYTES = 64 * 1024; // 64 KB
const JWKS_FETCH_TIMEOUT_MS = 5000; // 5 seconds
const JWKS_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const UNKNOWN_KID_THROTTLE_MS = 30 * 1000; // 30 seconds backoff between fetches
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// In-isolate memory state keyed by issuer (C4)
const jwksCache = new Map<string, CachedKey>();
const inFlightJwksPromises = new Map<string, Promise<JwksResponse | null>>();
const lastJwksFetchAttemptByIssuer = new Map<string, number>();

/**
 * Reset isolate cache (used in tests)
 */
export function resetJwksCache(): void {
  jwksCache.clear();
  inFlightJwksPromises.clear();
  lastJwksFetchAttemptByIssuer.clear();
}

/**
 * Streamed reader enforcing exact max-bytes ceiling and abort signal cancellation (C4)
 */
export async function readBoundedStream(
  body: ReadableStream<Uint8Array> | null,
  maxBytes: number,
  signal?: AbortSignal
): Promise<Uint8Array> {
  if (!body) return new Uint8Array(0);
  if (signal?.aborted) {
    throw new Error('STREAM_ABORTED');
  }
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      if (signal?.aborted) {
        await reader.cancel().catch(() => {});
        throw new Error('STREAM_ABORTED');
      }

      const readPromise = reader.read();
      let racePromise: Promise<{ done: boolean; value?: Uint8Array }>;

      if (signal) {
        let removeListener: () => void = () => {};
        const abortPromise = new Promise<never>((_, reject) => {
          const onAbort = () => {
            reader.cancel().catch(() => {});
            reject(new Error('STREAM_ABORTED'));
          };
          signal.addEventListener('abort', onAbort, { once: true });
          removeListener = () => signal.removeEventListener('abort', onAbort);
        });
        racePromise = Promise.race([readPromise, abortPromise]).finally(removeListener);
      } else {
        racePromise = readPromise;
      }

      const { done, value } = await racePromise;
      if (signal?.aborted) {
        await reader.cancel().catch(() => {});
        throw new Error('STREAM_ABORTED');
      }
      if (done) break;
      if (value) {
        totalBytes += value.length;
        if (totalBytes > maxBytes) {
          await reader.cancel();
          throw new Error('PAYLOAD_TOO_LARGE');
        }
        chunks.push(value);
      }
    }
  } catch (err) {
    await reader.cancel().catch(() => {});
    throw err;
  }
  const result = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

/**
 * Base64URL decoders using Web standard atob / TextDecoder
 */
export function base64UrlToBytes(str: string): Uint8Array {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = base64.length % 4;
  const padded = pad ? base64 + '='.repeat(4 - pad) : base64;
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function base64UrlDecodeText(str: string): string {
  return new TextDecoder().decode(base64UrlToBytes(str));
}

/**
 * Import a JWK into a CryptoKey for signature verification
 */
export async function importJwkForVerification(jwk: JwkKey): Promise<CryptoKey> {
  if (jwk.kty === 'EC' && jwk.crv === 'P-256') {
    return await crypto.subtle.importKey(
      'jwk',
      jwk,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['verify']
    );
  }

  if (jwk.kty === 'RSA') {
    return await crypto.subtle.importKey(
      'jwk',
      jwk,
      { name: 'RSASSA-PKCS1-v1_5', hash: { name: 'SHA-256' } },
      false,
      ['verify']
    );
  }

  throw new Error(`Unsupported JWK key type: ${jwk.kty}`);
}

/**
 * Fetch JWKS with issuer-scoped coalescing, bounded size, full-body timeout, and fail-closed behavior (R4, C4)
 */
async function getJwksKeys(
  supabaseUrl: string,
  customJwks?: JwksResponse,
  customFetch: typeof fetch = fetch,
  nowMs: number = Date.now()
): Promise<JwksResponse | null> {
  if (customJwks) {
    return customJwks;
  }

  const normalizedIssuer = `${supabaseUrl.replace(/\/$/, '')}/auth/v1`;
  const lastAttempt = lastJwksFetchAttemptByIssuer.get(normalizedIssuer) || 0;

  if (nowMs - lastAttempt < UNKNOWN_KID_THROTTLE_MS && !inFlightJwksPromises.has(normalizedIssuer)) {
    // Throttled: do not spam auth server for this specific issuer (C4)
    return null;
  }

  const existingPromise = inFlightJwksPromises.get(normalizedIssuer);
  if (existingPromise) {
    return await existingPromise;
  }

  lastJwksFetchAttemptByIssuer.set(normalizedIssuer, nowMs);
  const jwksUrl = `${normalizedIssuer}/.well-known/jwks.json`;

  const fetchPromise = (async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), JWKS_FETCH_TIMEOUT_MS);
    try {
      const resp = await customFetch(jwksUrl, {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      if (!resp.ok) {
        return null;
      }
      const contentLength = resp.headers.get('content-length');
      if (contentLength && parseInt(contentLength, 10) > MAX_JWKS_BYTES) {
        return null;
      }
      // Retain abort signal through body reading and JSON parsing (R4, C4)
      const bytes = await readBoundedStream(resp.body, MAX_JWKS_BYTES, controller.signal);
      const text = new TextDecoder().decode(bytes);
      const data = JSON.parse(text) as JwksResponse;
      if (!data || typeof data !== 'object' || !Array.isArray(data.keys) || data.keys.length > 10) {
        return null;
      }
      return data;
    } catch {
      return null;
    } finally {
      clearTimeout(timeoutId);
      inFlightJwksPromises.delete(normalizedIssuer);
    }
  })();

  inFlightJwksPromises.set(normalizedIssuer, fetchPromise);
  return await fetchPromise;
}

/**
 * Retrieve or fetch verification key by kid, algorithm, and issuer (R4)
 * Atomically replaces the issuer's cached keyset so that invalid, changed,
 * or removed same-kid keys are never served from stale cache.
 */
async function getVerificationKey(
  kid: string,
  alg: string,
  supabaseUrl: string,
  customJwks?: JwksResponse,
  customFetch?: typeof fetch,
  nowMs: number = Date.now()
): Promise<CachedKey | null> {
  const normalizedIssuer = `${supabaseUrl.replace(/\/$/, '')}/auth/v1`;
  const cacheKey = `${normalizedIssuer}:${alg}:${kid}`;
  const cached = jwksCache.get(cacheKey);

  if (cached && nowMs - cached.fetchedAtMs < JWKS_CACHE_TTL_MS) {
    return cached;
  }

  // Key missing or expired: fetch fresh JWKS
  const jwks = await getJwksKeys(supabaseUrl, customJwks, customFetch, nowMs);
  if (!jwks) {
    return null; // Fail-closed: no indefinite stale fallback
  }

  // R4: Build fresh validated key map for this issuer
  const freshIssuerKeys = new Map<string, CachedKey>();

  for (const jwk of jwks.keys) {
    // Guard against null, non-object, or array entries
    if (!jwk || typeof jwk !== 'object' || Array.isArray(jwk)) continue;
    if (!jwk.kid || typeof jwk.kid !== 'string') continue;
    // If standard 'use' metadata is present, it must be 'sig'
    if (jwk.use && jwk.use !== 'sig') continue;

    let keyAlg = '';
    if (jwk.kty === 'EC' && jwk.crv === 'P-256') {
      if (jwk.alg && jwk.alg !== 'ES256') continue;
      keyAlg = 'ES256';
    } else if (jwk.kty === 'RSA') {
      if (jwk.alg && jwk.alg !== 'RS256') continue;
      keyAlg = 'RS256';
    } else {
      continue;
    }

    try {
      const cryptoKey = await importJwkForVerification(jwk);
      const entryKey = `${normalizedIssuer}:${keyAlg}:${jwk.kid}`;
      freshIssuerKeys.set(entryKey, {
        key: cryptoKey,
        algorithm: keyAlg,
        fetchedAtMs: nowMs,
      });
    } catch {
      // Incompatible, malformed, or failed import: omitted from fresh map
    }
  }

  // R4: Atomically replace the issuer's key map
  // 1. Evict ALL existing keys for this issuer (including expired, revoked, or changed same-kid keys)
  for (const key of Array.from(jwksCache.keys())) {
    if (key.startsWith(`${normalizedIssuer}:`)) {
      jwksCache.delete(key);
    }
  }

  // 2. Insert all newly imported and validated keys
  for (const [key, val] of freshIssuerKeys.entries()) {
    jwksCache.set(key, val);
  }

  // 3. Return only the current unexpired matching key
  const match = jwksCache.get(cacheKey);
  if (match && nowMs - match.fetchedAtMs < JWKS_CACHE_TTL_MS) {
    return match;
  }

  return null;
}

/**
 * Verify a Supabase JWT token using Web Crypto
 */
export async function verifySupabaseJwt(
  token: string,
  options: VerifyJwtOptions
): Promise<AuthResult> {
  // 1. Token Input Bound: max 4 KB
  if (!token || typeof token !== 'string') {
    return { valid: false, error: 'MISSING_TOKEN' };
  }
  if (token.length > MAX_TOKEN_BYTES) {
    return { valid: false, error: 'TOKEN_TOO_LARGE' };
  }

  // 2. Structural Parsing
  const parts = token.split('.');
  if (parts.length !== 3) {
    return { valid: false, error: 'MALFORMED_JWT_STRUCTURE' };
  }

  const [headerB64, payloadB64, signatureB64] = parts;

  let header: JwtHeader;
  let claims: JwtClaims;

  try {
    header = JSON.parse(base64UrlDecodeText(headerB64));
    claims = JSON.parse(base64UrlDecodeText(payloadB64));
    if (
      typeof header !== 'object' ||
      header === null ||
      Array.isArray(header) ||
      typeof claims !== 'object' ||
      claims === null ||
      Array.isArray(claims)
    ) {
      return { valid: false, error: 'MALFORMED_JWT_ENCODING' };
    }
  } catch {
    return { valid: false, error: 'MALFORMED_JWT_ENCODING' };
  }

  // 3. Algorithm and Key Matching
  if (!header.alg || (header.alg !== 'ES256' && header.alg !== 'RS256')) {
    return { valid: false, error: 'UNSUPPORTED_OR_FORBIDDEN_ALGORITHM' };
  }
  if (!header.kid || typeof header.kid !== 'string') {
    return { valid: false, error: 'MISSING_KEY_IDENTIFIER' };
  }

  // 4. Retrieve Verification Key
  const now = options.nowSec !== undefined ? options.nowSec : Math.floor(Date.now() / 1000);
  const nowMs = now * 1000;

  const cachedKey = await getVerificationKey(
    header.kid,
    header.alg,
    options.supabaseUrl,
    options.customJwks,
    options.customFetch,
    nowMs
  );

  if (!cachedKey) {
    return { valid: false, error: 'KEY_NOT_FOUND_OR_REVOKED' };
  }

  if (cachedKey.algorithm !== header.alg) {
    return { valid: false, error: 'ALGORITHM_KEY_MISMATCH' };
  }

  // 5. Cryptographic Signature Verification
  const dataBytes = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
  let signatureBytes: Uint8Array;

  try {
    signatureBytes = base64UrlToBytes(signatureB64);
  } catch {
    return { valid: false, error: 'INVALID_SIGNATURE_ENCODING' };
  }

  const subtleAlg =
    header.alg === 'ES256'
      ? { name: 'ECDSA', hash: { name: 'SHA-256' } }
      : { name: 'RSASSA-PKCS1-v1_5' };

  let isSignatureValid = false;
  try {
    isSignatureValid = await crypto.subtle.verify(
      subtleAlg,
      cachedKey.key,
      signatureBytes as unknown as BufferSource,
      dataBytes as unknown as BufferSource
    );
  } catch {
    return { valid: false, error: 'SIGNATURE_VERIFICATION_FAILED' };
  }

  if (!isSignatureValid) {
    return { valid: false, error: 'INVALID_SIGNATURE' };
  }

  // 6. Authoritative Claims Validation (only verified tokens reach here)

  // sub must be a valid UUID
  if (!claims.sub || typeof claims.sub !== 'string' || !UUID_REGEX.test(claims.sub)) {
    return { valid: false, error: 'INVALID_CLAIM_SUB' };
  }

  // exp must be present, numeric finite, and in the future
  if (typeof claims.exp !== 'number' || !Number.isFinite(claims.exp)) {
    return { valid: false, error: 'INVALID_EXPIRATION_TIMESTAMP' };
  }
  if (claims.exp <= now) {
    return { valid: false, error: 'TOKEN_EXPIRED' };
  }

  // nbf is optional: if present, must be numeric finite and <= now
  if (claims.nbf !== undefined) {
    if (typeof claims.nbf !== 'number' || !Number.isFinite(claims.nbf)) {
      return { valid: false, error: 'INVALID_NBF_TIMESTAMP' };
    }
    if (claims.nbf > now) {
      return { valid: false, error: 'TOKEN_NOT_YET_VALID' };
    }
  }

  // iss must match the Supabase Auth issuer
  const expectedIssuer = `${options.supabaseUrl.replace(/\/$/, '')}/auth/v1`;
  if (claims.iss !== expectedIssuer) {
    return { valid: false, error: 'INVALID_CLAIM_ISSUER' };
  }

  // aud must match "authenticated" (or configured expected audience)
  const expectedAud = options.expectedAudience || 'authenticated';
  if (claims.aud !== expectedAud) {
    return { valid: false, error: 'INVALID_CLAIM_AUDIENCE' };
  }

  return {
    valid: true,
    claims,
  };
}
