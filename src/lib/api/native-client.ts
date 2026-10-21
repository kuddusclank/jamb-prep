/**
 * Typed Native Worker API Bearer Transport Client (T04)
 *
 * Enforces:
 * - Strict `Authorization: Bearer <access_token>` header transport.
 * - Mandatory `Idempotency-Key` header on mutating requests, preserved across 401 token refresh retries.
 * - Bounded 401 recovery: coalesces token refresh via `BrowserSessionManager.refreshAccessToken()`
 *   and retries the request at most once.
 * - Immediate private state/cache/outbox teardown and safe `/login?redirectTo=...` redirect
 *   when a session is revoked (`SESSION_REVOKED`) or refresh fails.
 * - Zero privileged server secrets in client code.
 */

import { buildLoginRedirectUrl } from '../auth/redirect';
import { getNetworkStateManager, isNetworkOrTimeoutError } from '../offline/network-state';
import {
  BrowserSessionManager,
  computeBootstrapIdempotencyKey,
  getDefaultBrowserSessionManager,
  ProvisioningApiResponse,
} from '../auth/session-manager';

export interface NativeApiErrorDetail {
  field?: string;
  issue: string;
}

export class NativeApiClientError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly requestId: string | null;
  public readonly details?: ReadonlyArray<NativeApiErrorDetail>;

  constructor(params: {
    status: number;
    code: string;
    message: string;
    requestId?: string | null;
    details?: ReadonlyArray<NativeApiErrorDetail>;
  }) {
    super(params.message);
    this.name = 'NativeApiClientError';
    this.status = params.status;
    this.code = params.code;
    this.requestId = params.requestId ?? null;
    this.details = params.details;
  }
}

export interface SessionIdentityResponse {
  authenticated: true;
  provisioned: boolean;
  onboardingCompleted: boolean;
  user: {
    id: string;
    email: string | null;
    displayName: string | null;
    role: 'student' | 'admin';
  };
  referralCode: string | null;
}

export interface AdminSessionIdentityResponse {
  authenticated: true;
  authorized: true;
  user: {
    id: string;
    email: string | null;
    role: 'admin';
  };
}

export interface NativeApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  idempotencyKey?: string;
  auth?: boolean;
  accessTokenOverride?: string;
}

export interface NativeApiClientOptions {
  baseUrl?: string;
  requestTimeoutMs?: number;
  sessionManager?: BrowserSessionManager;
  fetchImpl?: typeof fetch;
  getCurrentPath?: () => string;
  onUnauthorizedRedirect?: (safeLoginUrl: string) => void;
}

const IDEMPOTENCY_KEY_FORMAT = /^[A-Za-z0-9_.:-]{8,128}$/;

function generateClientIdempotencyKey(prefix = 'mut'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 12)}`;
}

export interface NativeApiClient {
  request<T = unknown>(
    path: string,
    options?: NativeApiRequestOptions
  ): Promise<{ status: number; data: T; replayed: boolean; requestId: string | null }>;
  checkHealth(): Promise<{ status: string; service: string; timestamp: string }>;
  bootstrapAccount(params: {
    displayName: string;
    referralCode?: string | null;
    idempotencyKey?: string;
    accessToken?: string;
  }): Promise<ProvisioningApiResponse>;
  getSessionIdentity(options?: { expectedUserId?: string }): Promise<SessionIdentityResponse>;
  getAdminSessionIdentity(): Promise<AdminSessionIdentityResponse>;
}

export function createNativeApiClient(options?: NativeApiClientOptions): NativeApiClient {
  const sessionManager = options?.sessionManager ?? getDefaultBrowserSessionManager();
  const fetchFn: typeof fetch = options?.fetchImpl ?? ((...args) => fetch(...args));

  function resolveUrl(path: string): string {
    const rawBase =
      options?.baseUrl !== undefined
        ? options.baseUrl
        : typeof process !== 'undefined'
          ? process.env.NEXT_PUBLIC_API_BASE_URL || ''
          : '';
    if (options?.baseUrl === undefined && !rawBase.trim()) {
      throw new NativeApiClientError({ status: 503, code: 'API_NOT_CONFIGURED', message: 'Account services are temporarily unavailable. Please try again later.' });
    }
    const trimmedBase = rawBase.trim().replace(/\/+$/, '');
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    if (!normalizedPath.startsWith('/api/') || /[\\\u0000-\u001f\u007f]/.test(normalizedPath)) {
      throw new NativeApiClientError({ status: 400, code: 'INVALID_API_PATH', message: 'An internal API path is required.' });
    }
    if (!trimmedBase) {
      return normalizedPath;
    }
    let base: URL;
    try { base = new URL(trimmedBase); } catch { throw new NativeApiClientError({ status: 503, code: 'API_NOT_CONFIGURED', message: 'Account services are temporarily unavailable. Please try again later.' }); }
    const localHttp = base.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(base.hostname);
    if ((!localHttp && base.protocol !== 'https:') || base.username || base.password || base.search || base.hash || base.pathname !== '/') {
      throw new NativeApiClientError({ status: 503, code: 'API_NOT_CONFIGURED', message: 'Account services are temporarily unavailable. Please try again later.' });
    }
    if (
      options?.baseUrl === undefined &&
      localHttp &&
      typeof window !== 'undefined' &&
      window.location?.protocol === 'https:' &&
      window.location?.origin
    ) {
      return `${window.location.origin}${normalizedPath}`;
    }
    return `${base.origin}${normalizedPath}`;
  }

  function triggerUnauthorizedRedirect(): void {
    if (!options?.onUnauthorizedRedirect) {
      return;
    }
    let currentPath = '/dashboard';
    if (options.getCurrentPath) {
      currentPath = options.getCurrentPath();
    } else if (typeof window !== 'undefined' && window.location) {
      currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    }
    const loginUrl = buildLoginRedirectUrl(currentPath, '/dashboard');
    options.onUnauthorizedRedirect(loginUrl);
  }

  async function readJsonResponse(response: Response, signal?: AbortSignal): Promise<unknown> {
    if (!response.body) { return null; }
    const reader = response.body.getReader();
    const cancel = () => { void reader.cancel().catch(() => {}); };
    signal?.addEventListener('abort', cancel, { once: true });
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      if (signal?.aborted) { cancel(); throw new Error('REQUEST_ABORTED'); }
      while (true) {
        const { value, done } = await reader.read();
        if (signal?.aborted) { throw new Error('REQUEST_ABORTED'); }
        if (done) { break; }
        size += value.byteLength;
        if (size > 2 * 1024 * 1024) { cancel(); throw new NativeApiClientError({ status: 503, code: 'RESPONSE_TOO_LARGE', message: 'API response exceeded its size limit.' }); }
        chunks.push(value);
      }
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
      return size ? JSON.parse(new TextDecoder().decode(bytes)) : null;
    } finally {
      signal?.removeEventListener('abort', cancel);
      reader.releaseLock();
    }
  }

  async function parseErrorResponse(res: Response, signal?: AbortSignal): Promise<NativeApiClientError> {
    const headerReqId = res.headers.get('x-request-id');
    try {
      const json = (await readJsonResponse(res, signal)) as {
        error?: {
          code?: string;
          message?: string;
          requestId?: string;
          details?: ReadonlyArray<NativeApiErrorDetail>;
        };
      };
      if (json && typeof json === 'object' && json.error) {
        return new NativeApiClientError({
          status: res.status,
          code: json.error.code || 'API_ERROR',
          message: json.error.message || `Request failed with status ${res.status}.`,
          requestId: json.error.requestId || headerReqId,
          details: json.error.details,
        });
      }
    } catch {
      // Ignore JSON parse error on non-JSON error responses
    }
    return new NativeApiClientError({
      status: res.status,
      code: res.status === 401 ? 'UNAUTHORIZED' : 'HTTP_ERROR',
      message: `Request failed with HTTP status ${res.status}.`,
      requestId: headerReqId,
    });
  }

  async function performRequest<T = unknown>(
    path: string,
    reqOptions?: NativeApiRequestOptions,
    controller?: AbortController,
    cleanups: Array<() => void> = []
  ): Promise<{ status: number; data: T; replayed: boolean; requestId: string | null }> {
    const signal = controller?.signal;
    const url = resolveUrl(path);
    const method = (reqOptions?.method ?? 'GET').toUpperCase() as NonNullable<
      NativeApiRequestOptions['method']
    >;
    const requiresAuth = reqOptions?.auth ?? true;
    const isMutation = method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE';

    let idempotencyKey = reqOptions?.idempotencyKey?.trim();
    if (isMutation) {
      if (!idempotencyKey) {
        idempotencyKey = generateClientIdempotencyKey(method.toLowerCase());
      }
      if (!IDEMPOTENCY_KEY_FORMAT.test(idempotencyKey)) {
        throw new NativeApiClientError({
          status: 400,
          code: 'INVALID_IDEMPOTENCY_KEY',
          message: 'Idempotency-Key must be 8 to 128 characters (A-Za-z0-9_.:-).',
        });
      }
    }

    if (requiresAuth && reqOptions?.accessTokenOverride && sessionManager.getState().status === 'loading') {
      await sessionManager.initialize();
    }
    const tokenStartState = sessionManager.getState();
    let token: string | null = null;
    if (requiresAuth) {
      token =
        reqOptions?.accessTokenOverride?.trim() ||
        (await sessionManager.getValidAccessToken());
      if (tokenStartState.status !== 'loading' && (tokenStartState.user?.id ?? null) !== (sessionManager.getState().user?.id ?? null)) {
        throw new NativeApiClientError({ status: 409, code: 'SESSION_CHANGED', message: 'Account changed during authentication. Please retry.' });
      }
      if (!token) {
        await sessionManager.handleUnauthorizedSession('session_expired');
        triggerUnauthorizedRedirect();
        throw new NativeApiClientError({
          status: 401,
          code: 'MISSING_BEARER_TOKEN',
          message: 'No active authenticated session is available.',
        });
      }
    }

    let handlingUnauthorized = false;
    const requestUserId = sessionManager.getState().user?.id ?? null;
    if (requiresAuth && controller) {
      cleanups.push(sessionManager.subscribe((next) => {
        if (!handlingUnauthorized && requestUserId !== (next.user?.id ?? null)) controller.abort(new NativeApiClientError({ status: 409, code: 'SESSION_CHANGED', message: 'Account changed during the request. Please retry.' }));
      }));
    }
    const assertSameActor = () => {
      if (signal?.aborted && signal.reason instanceof NativeApiClientError) { throw signal.reason; }
      if (signal?.aborted) { throw new NativeApiClientError({ status: 503, code: 'REQUEST_TIMEOUT', message: 'Request timed out. Please retry.' }); }
      if (requiresAuth && requestUserId !== (sessionManager.getState().user?.id ?? null)) {
        throw new NativeApiClientError({ status: 409, code: 'SESSION_CHANGED', message: 'Account changed during the request. Please retry.' });
      }
    };

    const serializedBody =
      reqOptions?.body !== undefined ? JSON.stringify(reqOptions.body) : undefined;

    const executeFetch = async (bearerToken: string | null): Promise<Response> => {
      const headers: Record<string, string> = {
        Accept: 'application/json',
        ...(reqOptions?.headers || {}),
      };

      if (bearerToken) {
        headers.Authorization = `Bearer ${bearerToken}`;
      }
      if (idempotencyKey) {
        headers['Idempotency-Key'] = idempotencyKey;
      }
      if (serializedBody !== undefined) {
        headers['Content-Type'] = 'application/json';
      }

      return await fetchFn(url, {
        method,
        headers,
        body: serializedBody,
        cache: 'no-store',
        signal,
        redirect: 'error',
        credentials: 'omit',
      });
    };

    let response = await executeFetch(token);
    assertSameActor();

    if (response.status === 401 && requiresAuth) {
      const firstErr = await parseErrorResponse(response, signal);
      assertSameActor();

      if (firstErr.code === 'SESSION_REVOKED') {
        handlingUnauthorized = true;
        await sessionManager.handleUnauthorizedSession('session_revoked');
        triggerUnauthorizedRedirect();
        throw firstErr;
      }

      // Bounded recovery: attempt exactly ONE coalesced session refresh and retry once
      const refreshedToken = await sessionManager.refreshAccessToken();
      assertSameActor();
      if (!refreshedToken) {
        handlingUnauthorized = true;
        await sessionManager.handleUnauthorizedSession('session_expired');
        triggerUnauthorizedRedirect();
        throw firstErr;
      }

      response = await executeFetch(refreshedToken);
      assertSameActor();
      if (response.status === 401) {
        const retryErr = await parseErrorResponse(response, signal);
        assertSameActor();
        handlingUnauthorized = true;
        await sessionManager.handleUnauthorizedSession('session_expired');
        triggerUnauthorizedRedirect();
        throw retryErr;
      }
    }

    if (!response.ok) {
      throw await parseErrorResponse(response, signal);
    }

    const data = (await readJsonResponse(response, signal)) as T;
    assertSameActor();
    const replayed = response.headers.get('idempotent-replayed') === 'true';
    const requestId = response.headers.get('x-request-id');

    return {
      status: response.status,
      data,
      replayed,
      requestId,
    };
  }

  async function request<T = unknown>(path: string, reqOptions?: NativeApiRequestOptions): Promise<{ status: number; data: T; replayed: boolean; requestId: string | null }> {
    const controller = new AbortController();
    const cleanups: Array<() => void> = [];
    const timeoutMs = options?.requestTimeoutMs ?? 30000;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const deadline = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        reject(new NativeApiClientError({ status: 503, code: 'REQUEST_TIMEOUT', message: 'Request timed out. Please retry.' }));
        controller.abort();
      }, timeoutMs);
    });
    try {
      const res = await Promise.race([performRequest<T>(path, reqOptions, controller, cleanups), deadline]);
      getNetworkStateManager().markOnline();
      return res;
    } catch (error) {
      if (isNetworkOrTimeoutError(error)) {
        getNetworkStateManager().markOffline(error instanceof Error ? error.message : String(error));
      }
      if (controller.signal.reason instanceof NativeApiClientError) throw controller.signal.reason;
      throw error;
    } finally {
      clearTimeout(timer);
      for (const cleanup of cleanups) cleanup();
    }
  }

  return {
    request,

    async checkHealth() {
      const res = await request<{ status: string; service: string; timestamp: string }>(
        '/api/v1/health',
        { method: 'GET', auth: false }
      );
      return res.data;
    },

    async bootstrapAccount(params) {
      const stateUser = sessionManager.getState().user;
      const key =
        params.idempotencyKey ??
        (stateUser?.id
          ? await computeBootstrapIdempotencyKey(
              stateUser.id,
              params.displayName,
              params.referralCode
            )
          : generateClientIdempotencyKey('bootstrap'));

      const res = await request<ProvisioningApiResponse>('/api/v1/auth/bootstrap', {
        method: 'POST',
        idempotencyKey: key,
        accessTokenOverride: params.accessToken,
        body: {
          displayName: params.displayName,
          referralCode: params.referralCode ?? null,
        },
      });

      if (res.data.provisioned && res.data.userId) {
        sessionManager.applyServerIdentity({
          userId: res.data.userId,
          email: res.data.email ?? null,
          displayName: res.data.displayName ?? params.displayName,
          role: res.data.role === 'admin' ? 'admin' : 'student',
          provisioned: true,
        });
      }

      return res.data;
    },

    async getSessionIdentity(opts) {
      const query =
        opts?.expectedUserId && opts.expectedUserId.trim().length > 0
          ? `?userId=${encodeURIComponent(opts.expectedUserId.trim())}`
          : '';
      const res = await request<SessionIdentityResponse>(`/api/v1/auth/session${query}`, {
        method: 'GET',
      });

      sessionManager.applyServerIdentity({
        userId: res.data.user.id,
        email: res.data.user.email,
        displayName: res.data.user.displayName,
        role: res.data.user.role,
        provisioned: res.data.provisioned,
      });

      return res.data;
    },

    async getAdminSessionIdentity() {
      const res = await request<AdminSessionIdentityResponse>('/api/v1/auth/admin-session', {
        method: 'GET',
      });

      sessionManager.applyServerIdentity({
        userId: res.data.user.id,
        email: res.data.user.email,
        role: 'admin',
        provisioned: true,
      });

      return res.data;
    },
  };
}
