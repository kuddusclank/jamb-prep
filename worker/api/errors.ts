/**
 * Typed Native API Error Hierarchy & Safe Response Envelopes (T03)
 *
 * Enforces:
 * - Structured safe status codes: 400, 401, 403, 404, 405, 409, 413, 422, 429, 500, 503
 * - Strict error redaction: never exposes driver messages, SQL text, connection strings, or secrets
 * - Explicit Cache-Control: no-store on all private and error responses
 */

export type ApiHttpStatus =
  | 200
  | 201
  | 204
  | 400
  | 401
  | 403
  | 404
  | 405
  | 409
  | 413
  | 422
  | 429
  | 500
  | 503;

export type ApiErrorCode =
  | 'BAD_REQUEST'
  | 'MALFORMED_JSON'
  | 'UNSUPPORTED_MEDIA_TYPE'
  | 'INVALID_UUID'
  | 'MISSING_IDEMPOTENCY_KEY'
  | 'INVALID_IDEMPOTENCY_KEY'
  | 'UNAUTHORIZED'
  | 'MISSING_BEARER_TOKEN'
  | 'INVALID_OR_EXPIRED_TOKEN'
  | 'SESSION_REVOKED'
  | 'INVALID_WEBHOOK_SIGNATURE'
  | 'FORBIDDEN'
  | 'FORBIDDEN_ORIGIN'
  | 'FORBIDDEN_NOT_OWNER'
  | 'FORBIDDEN_ADMIN_REQUIRED'
  | 'FORBIDDEN_ENTITLEMENT_REQUIRED'
  | 'NOT_FOUND'
  | 'METHOD_NOT_ALLOWED'
  | 'PAYMENT_FAILED'
  | 'CONFLICT'
  | 'IDEMPOTENCY_CONFLICT_IN_PROGRESS'
  | 'ATTEMPT_NOT_ACTIVE'
  | 'ATTEMPT_EXPIRED'
  | 'STALE_ANSWER_REVISION'
  | 'SERIALIZATION_CONFLICT'
  | 'PAYLOAD_TOO_LARGE'
  | 'VALIDATION_FAILED'
  | 'IDEMPOTENCY_KEY_PAYLOAD_MISMATCH'
  | 'INVALID_QUESTION_MEMBERSHIP'
  | 'RATE_LIMITED'
  | 'INTERNAL_SERVER_ERROR'
  | 'TRANSACTION_COMMIT_FAILED'
  | 'ENDPOINT_NOT_READY'
  | 'AUTH_SERVICE_UNAVAILABLE'
  | 'SERVICE_UNAVAILABLE'
  | 'SERVICE_CONFIG_UNAVAILABLE'
  | 'DATABASE_UNAVAILABLE';

export interface SafeErrorBody {
  error: {
    code: ApiErrorCode;
    message: string;
    requestId: string;
    details?: ReadonlyArray<{ field?: string; issue: string }>;
  };
}

export class ApiError extends Error {
  public readonly status: ApiHttpStatus;
  public readonly code: ApiErrorCode;
  public readonly details?: ReadonlyArray<{ field?: string; issue: string }>;
  public readonly headers?: Record<string, string>;

  constructor(params: {
    status: ApiHttpStatus;
    code: ApiErrorCode;
    message: string;
    details?: ReadonlyArray<{ field?: string; issue: string }>;
    headers?: Record<string, string>;
    cause?: unknown;
  }) {
    super(params.message, params.cause !== undefined ? { cause: params.cause } : undefined);
    this.name = 'ApiError';
    this.status = params.status;
    this.code = params.code;
    this.details = params.details;
    this.headers = params.headers;
  }
}

const SENSITIVE_PATTERNS = [
  /postgres(?:ql)?:\/\/[^\s"']+/gi,
  /sk_(?:live|test)_[a-zA-Z0-9]+/g,
  /sb_(?:secret|publishable)_[a-zA-Z0-9_-]+/g,
  /Bearer\s+[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+/gi,
  /\b(?:SELECT|INSERT|UPDATE|DELETE|WITH|FROM|WHERE|JOIN)\b[\s\S]+/i,
];

/**
 * Redacts any sensitive substring (connection strings, keys, tokens, or SQL fragments)
 * before internal diagnostic logging. Client responses never use raw error strings.
 */
export function sanitizeDiagnosticMessage(raw: unknown): string {
  const text = raw instanceof Error ? raw.message : typeof raw === 'string' ? raw : 'UNKNOWN_ERROR';
  let sanitized = text;
  for (const pattern of SENSITIVE_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  }
  return sanitized.slice(0, 240);
}

/** Database failures are classified by code, never by potentially sensitive message text. */
export function databaseErrorToApiError(err: unknown): ApiError | null {
  if (err instanceof ApiError) return err;
  const code = err && typeof err === 'object' && 'code' in err ? String(err.code) : '';
  if (code === '40001' || code === '40P01') return new ApiError({ status: 409, code: 'SERIALIZATION_CONFLICT', message: 'Your account was updated at the same time. Please try saving again.' });
  if (code === '23505' || code === '23503') return new ApiError({ status: 409, code: 'CONFLICT', message: 'This change conflicts with existing or updated data. Reload and try again.' });
  if (code === '42P01' || code === '42703' || code === '42P10') return new ApiError({ status: 503, code: 'SERVICE_CONFIG_UNAVAILABLE', message: 'This feature is temporarily unavailable. Please try again later.' });
  if (code === '57014' || code === '55P03' || code === '53300' || code === '57P03' || code === '57P01' || code.startsWith('08') || ['CONNECT_TIMEOUT', 'CONNECTION_CLOSED', 'CONNECTION_ENDED', 'ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT'].includes(code)) return new ApiError({ status: 503, code: 'DATABASE_UNAVAILABLE', message: 'We couldn’t confirm this request. Please retry the same request.', headers: { 'Retry-After': '1' } });
  return null;
}

/**
 * Maps an unknown thrown value into a safe ApiError without leaking driver, SQL, or secret details.
 */
export function toSafeApiError(err: unknown): ApiError {
  if (err instanceof ApiError) {
    return err;
  }

  const databaseFailure = databaseErrorToApiError(err);
  if (databaseFailure) return databaseFailure;

  if (err instanceof Error) {
    if (err.message === 'PAYLOAD_TOO_LARGE') {
      return new ApiError({
        status: 413,
        code: 'PAYLOAD_TOO_LARGE',
        message: 'Request body exceeds the maximum allowed byte size for this endpoint.',
      });
    }
    if (err.message === 'DATABASE_CONNECTION_UNAVAILABLE') {
      return new ApiError({
        status: 503,
        code: 'DATABASE_UNAVAILABLE',
        message: 'Database connection binding is unavailable.',
      });
    }
  }

  return new ApiError({
    status: 500,
    code: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected server error occurred.',
  });
}

/**
 * Builds a JSON response with mandatory Cache-Control: no-store and security headers.
 */
export function apiJsonResponse<T>(
  body: T,
  status: ApiHttpStatus = 200,
  requestId: string,
  extraHeaders?: Record<string, string>
): Response {
  const headers = new Headers({
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'X-Request-Id': requestId,
    ...(extraHeaders || {}),
  });

  return new Response(JSON.stringify(body), {
    status,
    headers,
  });
}

/**
 * Builds a pre-serialized raw JSON response (e.g. for database-aggregated JSON payloads)
 * without parsing and re-serializing in JS, while preserving safe headers.
 */
export function apiRawJsonResponse(
  rawJson: string,
  status: ApiHttpStatus = 200,
  requestId: string,
  extraHeaders?: Record<string, string>
): Response {
  const headers = new Headers({
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'X-Request-Id': requestId,
    ...(extraHeaders || {}),
  });

  return new Response(rawJson, {
    status,
    headers,
  });
}

/**
 * Builds a structured safe error JSON response.
 */
export function apiErrorResponse(
  err: unknown,
  requestId: string,
  corsHeaders?: Record<string, string>
): Response {
  const apiErr = toSafeApiError(err);
  const payload: SafeErrorBody = {
    error: {
      code: apiErr.code,
      message: apiErr.message,
      requestId,
      ...(apiErr.details && apiErr.details.length > 0 ? { details: apiErr.details } : {}),
    },
  };

  return apiJsonResponse(payload, apiErr.status, requestId, {
    ...(corsHeaders || {}),
    ...(apiErr.headers || {}),
  });
}
