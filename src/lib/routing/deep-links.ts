/**
 * Canonical static-export routing, UUID validation, and legacy deep-link
 * compatibility helpers for Cloudflare Pages (`output: "export"`).
 */

export const ATTEMPT_UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidAttemptId(value: string | null | undefined): value is string {
  if (typeof value !== "string") {
    return false;
  }
  const trimmed = value.trim();
  return ATTEMPT_UUID_REGEX.test(trimmed);
}

export type ParsedAttemptIdResult =
  | { valid: true; attemptId: string }
  | { valid: false; reason: "missing" | "invalid_uuid"; raw: string | null };

export function parseAttemptIdFromSearch(
  search: string | URLSearchParams | null | undefined
): ParsedAttemptIdResult {
  const params =
    typeof search === "string"
      ? new URLSearchParams(search.startsWith("?") ? search.slice(1) : search)
      : search instanceof URLSearchParams
        ? search
        : new URLSearchParams();

  const raw = params.get("attemptId");
  if (!raw || raw.trim().length === 0) {
    return { valid: false, reason: "missing", raw: null };
  }
  const trimmed = raw.trim();
  if (!isValidAttemptId(trimmed)) {
    return { valid: false, reason: "invalid_uuid", raw: trimmed };
  }
  return { valid: true, attemptId: trimmed };
}

export function buildCanonicalExamUrl(attemptId: string): string {
  if (!isValidAttemptId(attemptId)) { throw new Error("INVALID_ATTEMPT_ID"); }
  return `/exam?attemptId=${encodeURIComponent(attemptId.trim())}`;
}

export function buildCanonicalResultUrl(attemptId: string): string {
  if (!isValidAttemptId(attemptId)) { throw new Error("INVALID_ATTEMPT_ID"); }
  return `/result?attemptId=${encodeURIComponent(attemptId.trim())}`;
}

export interface LegacyRedirectResolution {
  target: string;
  status: 301 | 302;
  reason: "legacy_checkout" | "legacy_mock_result_root" | "legacy_mock_result" | "legacy_mock_attempt" | "legacy_school_alias";
}

function decodePathSegment(value: string): string | null {
  try { return decodeURIComponent(value); } catch { return null; }
}

function appendExtraSearchParams(baseUrl: string, search?: string): string {
  if (!search) {
    return baseUrl;
  }
  const incoming = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  incoming.delete("attemptId");
  const extra = incoming.toString();
  if (!extra) {
    return baseUrl;
  }
  return baseUrl.includes("?") ? `${baseUrl}&${extra}` : `${baseUrl}?${extra}`;
}

/**
 * Resolves legacy dynamic paths (`/mock/<uuid>`, `/mock/result/<uuid>`, `/checkout`)
 * to canonical static-export routes without open redirects or infinite loops.
 *
 * Returns `null` when `pathname` is not a recognized legacy route or when a
 * multi-segment/malformed path under `/mock/...` should render 404.
 */
export function resolveLegacyDeepLinkRedirect(
  pathname: string,
  search?: string
): LegacyRedirectResolution | null {
  if (typeof pathname !== "string" || !pathname.startsWith("/")) {
    return null;
  }

  const normalized =
    pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;

  if (normalized === "/school" || normalized.startsWith("/school/")) {
    const targetPath = normalized.replace(/^\/school(\/|$)/, "/schools$1");
    const query = search ? (search.startsWith("?") ? search : `?${search}`) : "";
    return {
      target: `${targetPath}${query}`,
      status: 301,
      reason: "legacy_school_alias",
    };
  }

  if (normalized === "/checkout") {
    const query = search
      ? search.startsWith("?")
        ? search
        : `?${search}`
      : "";
    return {
      target: `/pricing${query}`,
      status: 301,
      reason: "legacy_checkout",
    };
  }

  if (normalized === "/mock/result") {
    return {
      target: "/mock",
      status: 302,
      reason: "legacy_mock_result_root",
    };
  }

  const resultMatch = /^\/mock\/result\/([^/]+)$/.exec(normalized);
  if (resultMatch) {
    const candidate = decodePathSegment(resultMatch[1]);
    if (!isValidAttemptId(candidate)) {
      return null;
    }
    return {
      target: appendExtraSearchParams(buildCanonicalResultUrl(candidate), search),
      status: 302,
      reason: "legacy_mock_result",
    };
  }

  const examMatch = /^\/mock\/([^/]+)$/.exec(normalized);
  if (examMatch) {
    const candidate = decodePathSegment(examMatch[1]);
    if (!isValidAttemptId(candidate)) {
      return null;
    }
    return {
      target: appendExtraSearchParams(buildCanonicalExamUrl(candidate), search),
      status: 302,
      reason: "legacy_mock_attempt",
    };
  }

  return null;
}

export interface CloudflareRedirectRule {
  source: string;
  destination: string;
  status: number;
}

/**
 * Parses a Cloudflare Pages `_redirects` file into ordered rules.
 */
export function parseCloudflareRedirectsFile(content: string): CloudflareRedirectRule[] {
  const rules: CloudflareRedirectRule[] = [];
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }
    const parts = line.split(/\s+/);
    if (parts.length < 2) {
      continue;
    }
    const [source, destination, rawStatus] = parts;
    const status = rawStatus ? Number(rawStatus) : 302;
    rules.push({
      source,
      destination,
      status: Number.isFinite(status) ? status : 302,
    });
  }
  return rules;
}

/**
 * Evaluates ordered Cloudflare Pages single-segment `:placeholder` and exact
 * redirect rules against a request pathname and optional query string.
 */
export function evaluateCloudflareRedirects(
  rules: CloudflareRedirectRule[],
  pathname: string,
  search = ""
): { location: string; status: number; matchedRule: CloudflareRedirectRule } | null {
  for (const rule of rules) {
    const sourceSegments = rule.source.split("/");
    const pathSegments = pathname.split("/");

    if (sourceSegments.length !== pathSegments.length) {
      continue;
    }

    const params: Record<string, string> = {};
    let matched = true;

    for (let i = 0; i < sourceSegments.length; i++) {
      const srcSeg = sourceSegments[i];
      const pathSeg = pathSegments[i];

      if (srcSeg.startsWith(":")) {
        if (!pathSeg || pathSeg.length === 0) {
          matched = false;
          break;
        }
        params[srcSeg.slice(1)] = pathSeg;
      } else if (srcSeg !== pathSeg) {
        matched = false;
        break;
      }
    }

    if (!matched) {
      continue;
    }

    let location = rule.destination;
    for (const [key, value] of Object.entries(params)) {
      const decoded = decodePathSegment(value);
      if (decoded === null) { return null; }
      location = location.replaceAll(`:${key}`, encodeURIComponent(decoded));
    }

    if (search) {
      const cleanSearch = search.startsWith("?") ? search.slice(1) : search;
      if (cleanSearch) {
        location = location.includes("?")
          ? `${location}&${cleanSearch}`
          : `${location}?${cleanSearch}`;
      }
    }

    return {
      location,
      status: rule.status,
      matchedRule: rule,
    };
  }

  return null;
}
