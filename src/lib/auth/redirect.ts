/**
 * Strict Internal Redirect Validator & Sanitizer (T04)
 *
 * Prevents open redirects, scheme injection (`javascript:`, `data:`), protocol-relative
 * redirects (`//evil.com`), backslash normalization attacks (`/\evil.com`), control-character
 * smuggling, and auth-page redirect loops (`/login`, `/register`).
 */

const INTERNAL_DUMMY_ORIGIN = 'https://jambprep.internal';
const MAX_REDIRECT_TARGET_LENGTH = 512;
const AUTH_LOOP_PATHNAMES = new Set(['/login', '/register', '/signup']);

/**
 * Validates and normalizes an untrusted redirect target string into a safe
 * internal path (`pathname + search + hash`), falling back to `defaultPath`
 * (`/dashboard` by default) whenever the input is missing or unsafe.
 */
export function sanitizeInternalRedirect(
  rawTarget: unknown,
  defaultPath: string = '/dashboard'
): string {
  const safeDefault =
    typeof defaultPath === 'string' &&
    defaultPath.startsWith('/') &&
    !defaultPath.startsWith('//') &&
    !defaultPath.includes('\\')
      ? defaultPath
      : '/dashboard';

  if (typeof rawTarget !== 'string') {
    return safeDefault;
  }

  const trimmed = rawTarget.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_REDIRECT_TARGET_LENGTH) {
    return safeDefault;
  }

  // Reject ASCII control characters, whitespace inside the URL, or backslashes
  if (/[\u0000-\u001F\u007F\s\\]/.test(trimmed)) {
    return safeDefault;
  }

  // Must start with a single forward slash, never '//'
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) {
    return safeDefault;
  }

  // Reject encoded leading slash or backslash tricks (e.g. /%2f, /%5c)
  if (/^\/%(?:2f|5c)/i.test(trimmed)) {
    return safeDefault;
  }

  // Reject colons in the path portion before '?' or '#' (prevents '/javascript:...' or '/http://...')
  const pathPart = trimmed.split(/[?#]/, 1)[0] || '';
  if (pathPart.includes(':')) {
    return safeDefault;
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed, INTERNAL_DUMMY_ORIGIN);
  } catch {
    return safeDefault;
  }

  if (parsed.origin !== INTERNAL_DUMMY_ORIGIN) {
    return safeDefault;
  }

  if (
    !parsed.pathname.startsWith('/') ||
    parsed.pathname.startsWith('//') ||
    parsed.pathname.includes('\\')
  ) {
    return safeDefault;
  }

  const normalizedPathname =
    parsed.pathname.length > 1 && parsed.pathname.endsWith('/')
      ? parsed.pathname.slice(0, -1).toLowerCase()
      : parsed.pathname.toLowerCase();

  if (AUTH_LOOP_PATHNAMES.has(normalizedPathname)) {
    return safeDefault;
  }

  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}

/**
 * Builds a `/login?redirectTo=...` URL with a strictly sanitized internal target.
 */
export function buildLoginRedirectUrl(
  rawReturnPath?: string | null,
  defaultPath: string = '/dashboard'
): string {
  const safeTarget = sanitizeInternalRedirect(rawReturnPath, defaultPath);
  if (safeTarget === '/dashboard') {
    return '/login';
  }
  return `/login?redirectTo=${encodeURIComponent(safeTarget)}`;
}
