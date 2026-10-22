/**
 * Browser Supabase Session Coordinator & Recoverable Account Provisioning (T04)
 *
 * Responsibilities:
 * - Safe initial loading/error states (`loading` -> `authenticated` | `unauthenticated` | `error`).
 * - Single shared `onAuthStateChange` subscription per manager instance (prevents duplicate listeners).
 * - Coalesced in-flight `initialize()` and `refreshAccessToken()` promises (prevents auth waterfalls).
 * - Automatic private browser state, cache, and exam outbox teardown on logout, session revocation,
 *   and account switch (`userA -> userB`).
 * - Zero trust on client/JWT `user_metadata` or `app_metadata` for `role`, paid entitlement,
 *   or referral qualification; `role` is populated strictly from authoritative server responses.
 * - Recoverable signup/profile provisioning with deterministic `Idempotency-Key` generation.
 */

import { createClient as createDefaultBrowserSupabaseClient } from '../supabase/client';
import {
  BrowserStorageEnvironment,
  clearPrivateBrowserState,
  ClearPrivateStateResult,
  PENDING_BOOTSTRAP_KEY_PREFIX,
  syncBrowserUserStorage,
} from './storage-cleanup';

export interface SupabaseBrowserUser {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
  app_metadata?: Record<string, unknown> | null;
}

export interface SupabaseBrowserSession {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  expires_in?: number;
  user: SupabaseBrowserUser;
}

export interface SupabaseBrowserAuthAdapter {
  getSession(): Promise<{
    data: { session: SupabaseBrowserSession | null };
    error: { message?: string; status?: number; name?: string } | null;
  }>;
  refreshSession(): Promise<{
    data: { session: SupabaseBrowserSession | null; user?: SupabaseBrowserUser | null };
    error: { message?: string; status?: number; name?: string } | null;
  }>;
  signInWithPassword(credentials: {
    email: string;
    password: string;
  }): Promise<{
    data: { session: SupabaseBrowserSession | null; user: SupabaseBrowserUser | null };
    error: { message?: string; status?: number; name?: string } | null;
  }>;
  signUp(credentials: {
    email: string;
    password: string;
    options?: { data?: Record<string, unknown> };
  }): Promise<{
    data: { session: SupabaseBrowserSession | null; user: SupabaseBrowserUser | null };
    error: { message?: string; status?: number; name?: string } | null;
  }>;
  signOut(): Promise<{ error: { message?: string } | null }>;
  onAuthStateChange?(
    callback: (event: string, session: SupabaseBrowserSession | null) => void
  ): {
    data: { subscription: { unsubscribe: () => void } };
  };
}

export type BrowserSessionStatus =
  | 'loading'
  | 'authenticated'
  | 'unauthenticated'
  | 'error';

export interface BrowserSessionSnapshot {
  status: BrowserSessionStatus;
  user: {
    id: string;
    email: string | null;
    displayName: string | null;
  } | null;
  accessToken: string | null;
  expiresAt: number | null;
  provisioned: boolean;
  role: 'student' | 'admin' | null;
  error: string | null;
}

export interface PendingBootstrapPayload {
  userId: string;
  displayName: string;
  referralCode: string | null;
  idempotencyKey: string;
}

export interface ProvisioningApiResponse {
  provisioned: boolean;
  userId: string;
  email?: string;
  displayName?: string;
  role?: 'student' | 'admin';
  referralCode: string;
  referralAttribution?: string;
}

export type ProvisioningExecutor = (params: {
  accessToken: string;
  displayName: string;
  referralCode: string | null;
  idempotencyKey: string;
}) => Promise<ProvisioningApiResponse>;

const TOKEN_EXPIRY_BUFFER_SECONDS = 30;

/**
 * Generates a deterministic idempotency key (matching `^[A-Za-z0-9_.:-]{8,128}$`)
 * for account bootstrap so retries after partial failure replay safely.
 */
export async function computeBootstrapIdempotencyKey(
  userId: string,
  displayName: string,
  referralCode?: string | null
): Promise<string> {
  const normalizedUser = userId.trim().toLowerCase();
  const normalizedName = displayName.trim();
  const normalizedRef = (referralCode ?? '').trim().toUpperCase();
  const raw = `auth.bootstrap:${normalizedUser}:${normalizedName}:${normalizedRef}`;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
  const bytes = new Uint8Array(digest);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  const userPrefix = normalizedUser.replace(/[^a-f0-9]/g, '').slice(0, 8) || 'student0';
  return `bootstrap-${userPrefix}-${hex.slice(0, 32)}`;
}

function extractSafeDisplayNameFromAuthUser(user: SupabaseBrowserUser): string | null {
  const meta = user.user_metadata;
  if (meta && typeof meta === 'object' && typeof meta.display_name === 'string') {
    const trimmed = meta.display_name.trim();
    if (trimmed.length > 0 && trimmed.length <= 120) {
      return trimmed;
    }
  }
  return null;
}

export interface BrowserSessionManagerOptions {
  authAdapter?: SupabaseBrowserAuthAdapter;
  authTimeoutMs?: number;
  storageEnv?: BrowserStorageEnvironment;
  nowSec?: () => number;
  provisioningExecutor?: ProvisioningExecutor;
  onPrivateStateCleared?: (result: ClearPrivateStateResult) => void;
}

export interface BrowserSessionManager {
  getState(): BrowserSessionSnapshot;
  subscribe(listener: (state: BrowserSessionSnapshot) => void): () => void;
  initialize(): Promise<BrowserSessionSnapshot>;
  getValidAccessToken(options?: { forceRefresh?: boolean }): Promise<string | null>;
  refreshAccessToken(): Promise<string | null>;
  applyServerIdentity(identity: {
    userId: string;
    email?: string | null;
    displayName?: string | null;
    role: 'student' | 'admin';
    provisioned: boolean;
  }): void;
  signInWithPassword(params: {
    email: string;
    password: string;
  }): Promise<{
    state: BrowserSessionSnapshot;
    error: string | null;
    recoveredProvisioning?: ProvisioningApiResponse | null;
  }>;
  signUpAndProvision(params: {
    displayName: string;
    email: string;
    password: string;
    referralCode?: string | null;
    provisioningExecutor?: ProvisioningExecutor;
  }): Promise<{
    state: BrowserSessionSnapshot;
    authCreated: boolean;
    provisioned: boolean;
    provisioningResult: ProvisioningApiResponse | null;
    error: string | null;
  }>;
  recoverPendingBootstrap(
    provisioningExecutor?: ProvisioningExecutor
  ): Promise<ProvisioningApiResponse | null>;
  handleUnauthorizedSession(reason?: 'session_expired' | 'session_revoked'): Promise<void>;
  signOut(): Promise<void>;
  destroy(): void;
}

export function createBrowserSessionManager(
  options?: BrowserSessionManagerOptions
): BrowserSessionManager {
  const getAuth = (): SupabaseBrowserAuthAdapter => {
    if (options?.authAdapter) {
      return options.authAdapter;
    }
    return createDefaultBrowserSupabaseClient().auth as SupabaseBrowserAuthAdapter;
  };

  async function boundAuth<T>(promise: Promise<T>): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([promise, new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('AUTH_REQUEST_TIMEOUT')), options?.authTimeoutMs ?? 10000);
      })]);
    } finally { clearTimeout(timer); }
  }

  const getNowSec = (): number => {
    if (options?.nowSec) {
      return options.nowSec();
    }
    return Math.floor(Date.now() / 1000);
  };

  let state: BrowserSessionSnapshot = {
    status: 'loading',
    user: null,
    accessToken: null,
    expiresAt: null,
    provisioned: false,
    // Security invariant: role is NEVER populated from JWT/client metadata.
    role: null,
    error: null,
  };

  let activeUserId: string | null = null;
  let identityGeneration = 0;
  let authSubscriptionUnsubscribe: (() => void) | null = null;
  let inflightInitPromise: Promise<BrowserSessionSnapshot> | null = null;
  let inflightRefreshPromise: Promise<string | null> | null = null;
  const listeners = new Set<(snapshot: BrowserSessionSnapshot) => void>();

  function emitState(next: BrowserSessionSnapshot): void {
    state = next;
    for (const listener of listeners) {
      try {
        listener(state);
      } catch {
        // Isolate subscriber errors
      }
    }
  }

  function getSessionStorage(): Storage | { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void } | null {
    if (options?.storageEnv?.sessionStorage !== undefined) {
      return options.storageEnv.sessionStorage ?? null;
    }
    if (typeof window !== 'undefined') {
      try {
        return window.sessionStorage;
      } catch {
        return null;
      }
    }
    return null;
  }

  function savePendingBootstrap(payload: PendingBootstrapPayload): void {
    const store = getSessionStorage();
    if (!store) return;
    try {
      store.setItem(
        `${PENDING_BOOTSTRAP_KEY_PREFIX}${payload.userId.toLowerCase()}`,
        JSON.stringify(payload)
      );
    } catch {
      // Ignore storage quota failures
    }
  }

  function loadPendingBootstrap(userId: string): PendingBootstrapPayload | null {
    const store = getSessionStorage();
    if (!store) return null;
    try {
      const raw = store.getItem(`${PENDING_BOOTSTRAP_KEY_PREFIX}${userId.toLowerCase()}`);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as PendingBootstrapPayload;
      if (
        parsed &&
        typeof parsed.userId === 'string' &&
        typeof parsed.displayName === 'string' &&
        typeof parsed.idempotencyKey === 'string'
      ) {
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  }

  function clearPendingBootstrap(userId: string): void {
    const store = getSessionStorage();
    if (!store) return;
    try {
      store.removeItem(`${PENDING_BOOTSTRAP_KEY_PREFIX}${userId.toLowerCase()}`);
    } catch {
      // Ignore storage errors
    }
  }

  function applySessionTransition(
    session: SupabaseBrowserSession | null,
    clearReasonIfNull: 'logout' | 'session_expired' | 'session_revoked' = 'logout'
  ): BrowserSessionSnapshot {
    const incomingUserId = session?.user?.id ?? null;
    if (incomingUserId !== activeUserId || !incomingUserId) { identityGeneration += 1; }
    if (!session || !session.user?.id || !session.access_token) {
      {
        const cleared = clearPrivateBrowserState({
          reason: clearReasonIfNull,
          previousUserId: activeUserId,
          nextUserId: null,
          storageEnv: options?.storageEnv,
        });
        options?.onPrivateStateCleared?.(cleared);
      }
      activeUserId = null;
      const unauthState: BrowserSessionSnapshot = {
        status: 'unauthenticated',
        user: null,
        accessToken: null,
        expiresAt: null,
        provisioned: false,
        role: null,
        error: null,
      };
      emitState(unauthState);
      return unauthState;
    }

    const nextUserId = session.user.id;
    const isAccountSwitch =
      activeUserId !== null && activeUserId.toLowerCase() !== nextUserId.toLowerCase();

    if (isAccountSwitch) {
      const cleared = clearPrivateBrowserState({
        reason: 'account_switch',
        previousUserId: activeUserId,
        nextUserId,
        storageEnv: options?.storageEnv,
      });
      options?.onPrivateStateCleared?.(cleared);
    } else {
      const synced = syncBrowserUserStorage(nextUserId, options?.storageEnv);
      if (synced.switched && synced.cleared) {
        options?.onPrivateStateCleared?.(synced.cleared);
      }
    }

    const preserveServerFields =
      !isAccountSwitch &&
      state.user?.id.toLowerCase() === nextUserId.toLowerCase();

    activeUserId = nextUserId;
    const resolvedExpiresAt =
      typeof session.expires_at === 'number'
        ? session.expires_at
        : typeof session.expires_in === 'number'
          ? getNowSec() + session.expires_in
          : null;

    const nextState: BrowserSessionSnapshot = {
      status: 'authenticated',
      user: {
        id: nextUserId,
        email: session.user.email ?? (preserveServerFields ? state.user?.email ?? null : null),
        displayName:
          (preserveServerFields ? state.user?.displayName : null) ??
          extractSafeDisplayNameFromAuthUser(session.user),
      },
      accessToken: session.access_token,
      expiresAt: resolvedExpiresAt,
      provisioned: preserveServerFields ? state.provisioned : false,
      // Never populate role from session.user.user_metadata or app_metadata
      role: preserveServerFields ? state.role : null,
      error: null,
    };

    emitState(nextState);
    return nextState;
  }

  function ensureSingleAuthStateListener(): void {
    if (authSubscriptionUnsubscribe) {
      return;
    }
    const auth = getAuth();
    if (typeof auth.onAuthStateChange !== 'function') {
      return;
    }

    const { data } = auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        applySessionTransition(null, 'logout');
        return;
      }
      if (session) {
        applySessionTransition(session);
      }
    });

    authSubscriptionUnsubscribe = () => {
      try {
        data?.subscription?.unsubscribe();
      } catch {
        // Ignore unsubscribe errors
      }
    };
  }

  function isTransientAuthError(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false;
    const value = error as { status?: number; name?: string; message?: string };
    return (value.status !== undefined && (value.status >= 500 || value.status === 429)) || value.name === 'AuthRetryableFetchError' || /network|fetch|timeout|temporarily|unavailable/i.test(value.message ?? '');
  }

  async function refreshAccessToken(): Promise<string | null> {
    if (inflightRefreshPromise) {
      return inflightRefreshPromise;
    }

    const refreshGeneration = identityGeneration;
    inflightRefreshPromise = (async () => {
      try {
        const auth = getAuth();
        const { data, error } = await boundAuth(auth.refreshSession());
        if (identityGeneration !== refreshGeneration) { return null; }
        if (isTransientAuthError(error)) throw error;
        if (error || !data?.session?.access_token || !data.session.user?.id) {
          applySessionTransition(null, 'session_expired');
          return null;
        }
        const updated = applySessionTransition(data.session);
        return updated.accessToken;
      } catch (error) {
        if (isTransientAuthError(error)) throw new Error('Authentication service is temporarily unavailable. Please retry.');
        if (identityGeneration !== refreshGeneration) { return null; }
        applySessionTransition(null, 'session_expired');
        return null;
      } finally {
        inflightRefreshPromise = null;
      }
    })();

    return inflightRefreshPromise;
  }

  async function initialize(): Promise<BrowserSessionSnapshot> {
    ensureSingleAuthStateListener();

    if (inflightInitPromise) {
      return inflightInitPromise;
    }

    const initGeneration = identityGeneration;
    inflightInitPromise = (async () => {
      try {
        const auth = getAuth();
        const { data, error } = await boundAuth(auth.getSession());
        if (identityGeneration !== initGeneration) { return state; }
        if (error) {
          const errState: BrowserSessionSnapshot = {
            status: 'error',
            user: null,
            accessToken: null,
            expiresAt: null,
            provisioned: false,
            role: null,
            error: error.message || 'Unable to verify browser session.',
          };
          emitState(errState);
          return errState;
        }

        const session = data?.session ?? null;
        if (!session) {
          return applySessionTransition(null, 'logout');
        }

        const nowSec = getNowSec();
        if (
          typeof session.expires_at === 'number' &&
          session.expires_at <= nowSec + TOKEN_EXPIRY_BUFFER_SECONDS
        ) {
          const refreshedToken = await refreshAccessToken();
          if (!refreshedToken) {
            return state;
          }
          return state;
        }

        return applySessionTransition(session);
      } catch (err) {
        if (identityGeneration !== initGeneration) { return state; }
        const errState: BrowserSessionSnapshot = {
          status: 'error',
          user: null,
          accessToken: null,
          expiresAt: null,
          provisioned: false,
          role: null,
          error: err instanceof Error ? err.message : 'Unexpected session initialization error.',
        };
        emitState(errState);
        return errState;
      } finally {
        inflightInitPromise = null;
      }
    })();

    return inflightInitPromise;
  }

  async function getValidAccessToken(opts?: { forceRefresh?: boolean }): Promise<string | null> {
    ensureSingleAuthStateListener();

    if (opts?.forceRefresh) {
      return await refreshAccessToken();
    }

    if (state.status === 'loading') {
      await initialize();
    }

    if (state.status !== 'authenticated' || !state.accessToken) {
      return null;
    }

    const nowSec = getNowSec();
    if (
      typeof state.expiresAt === 'number' &&
      state.expiresAt <= nowSec + TOKEN_EXPIRY_BUFFER_SECONDS
    ) {
      return await refreshAccessToken();
    }

    return state.accessToken;
  }

  function applyServerIdentity(identity: {
    userId: string;
    email?: string | null;
    displayName?: string | null;
    role: 'student' | 'admin';
    provisioned: boolean;
  }): void {
    if (!state.user || state.user.id.toLowerCase() !== identity.userId.toLowerCase()) {
      return;
    }
    const authoritativeRole: 'student' | 'admin' =
      identity.role === 'admin' ? 'admin' : 'student';

    emitState({
      ...state,
      provisioned: identity.provisioned,
      role: authoritativeRole,
      user: {
        id: state.user.id,
        email: identity.email ?? state.user.email,
        displayName: identity.displayName ?? state.user.displayName,
      },
    });
  }

  async function executeBootstrapWithRecovery(params: {
    userId: string;
    accessToken: string;
    displayName: string;
    referralCode: string | null;
    idempotencyKey?: string;
    executor?: ProvisioningExecutor;
  }): Promise<ProvisioningApiResponse> {
    const executor = params.executor ?? options?.provisioningExecutor;
    if (!executor) {
      throw new Error('PROVISIONING_EXECUTOR_UNAVAILABLE');
    }

    const idempotencyKey =
      params.idempotencyKey ??
      (await computeBootstrapIdempotencyKey(
        params.userId,
        params.displayName,
        params.referralCode
      ));

    savePendingBootstrap({
      userId: params.userId,
      displayName: params.displayName,
      referralCode: params.referralCode,
      idempotencyKey,
    });

    const response = await executor({
      accessToken: params.accessToken,
      displayName: params.displayName,
      referralCode: params.referralCode,
      idempotencyKey,
    });

    if (state.user?.id.toLowerCase() !== params.userId.toLowerCase()) { throw new Error('SESSION_CHANGED'); }
    if (!response.provisioned || response.userId.toLowerCase() !== params.userId.toLowerCase()) {
      throw new Error('PROVISIONING_IDENTITY_MISMATCH');
    }
    if (response.provisioned) {
      clearPendingBootstrap(params.userId);
      applyServerIdentity({
        userId: params.userId,
        email: response.email ?? state.user?.email ?? null,
        displayName: response.displayName ?? params.displayName,
        role: response.role === 'admin' ? 'admin' : 'student',
        provisioned: true,
      });
    }

    return response;
  }

  async function recoverPendingBootstrap(
    customExecutor?: ProvisioningExecutor
  ): Promise<ProvisioningApiResponse | null> {
    const token = await getValidAccessToken();
    const userId = state.user?.id;
    if (!token || !userId) {
      return null;
    }

    const pending = loadPendingBootstrap(userId);
    if (!pending) {
      return null;
    }

    return await executeBootstrapWithRecovery({
      userId,
      accessToken: token,
      displayName: pending.displayName,
      referralCode: pending.referralCode,
      idempotencyKey: pending.idempotencyKey,
      executor: customExecutor,
    });
  }

  async function signInWithPassword(params: {
    email: string;
    password: string;
  }): Promise<{
    state: BrowserSessionSnapshot;
    error: string | null;
    recoveredProvisioning?: ProvisioningApiResponse | null;
  }> {
    ensureSingleAuthStateListener();
    const cleanEmail = params.email.trim();
    if (!cleanEmail || !params.password) {
      return {
        state,
        error: 'Please enter both your email address and password.',
      };
    }

    const auth = getAuth();
    const startedIdentity = identityGeneration;
    const { data, error } = await boundAuth(auth.signInWithPassword({
      email: cleanEmail,
      password: params.password,
    }));

    if (error || !data?.session) {
      const msg = error?.message || 'Invalid email or password.';
      return { state, error: msg };
    }

    if (identityGeneration !== startedIdentity && activeUserId !== data.session.user.id) return { state, error: 'Account changed. Please retry.' };
    const nextSnapshot = applySessionTransition(data.session);
    let recoveredProvisioning: ProvisioningApiResponse | null = null;

    if (options?.provisioningExecutor && nextSnapshot.user?.id) {
      const pending = loadPendingBootstrap(nextSnapshot.user.id);
      if (pending) {
        try {
          recoveredProvisioning = await recoverPendingBootstrap(options.provisioningExecutor);
        } catch {
          // Do not block sign-in if background recovery needs a subsequent retry
        }
      }
    }

    return {
      state: state,
      error: null,
      recoveredProvisioning,
    };
  }

  async function signUpAndProvision(params: {
    displayName: string;
    email: string;
    password: string;
    referralCode?: string | null;
    provisioningExecutor?: ProvisioningExecutor;
  }): Promise<{
    state: BrowserSessionSnapshot;
    authCreated: boolean;
    provisioned: boolean;
    provisioningResult: ProvisioningApiResponse | null;
    error: string | null;
  }> {
    ensureSingleAuthStateListener();
    const cleanName = params.displayName.trim();
    const cleanEmail = params.email.trim();
    const cleanReferral = params.referralCode?.trim().toUpperCase() || null;

    const reusingSession = state.status === 'authenticated' && Boolean(state.accessToken) && state.user?.email?.toLowerCase() === cleanEmail.toLowerCase();
    if (cleanName.length < 2 || !cleanEmail || (!reusingSession && params.password.length < 6)) {
      return {
        state,
        authCreated: false,
        provisioned: false,
        provisioningResult: null,
        error: 'Please provide a valid full name, email address, and password (at least 6 characters).',
      };
    }

    const auth = getAuth();
    const startedIdentity = identityGeneration;
    let activeSession: SupabaseBrowserSession | null = null;

    // Recovery check: if the user already has an active session for this exact email
    // from an interrupted signup attempt, reuse that session to finish provisioning!
    if (
      state.status === 'authenticated' &&
      state.accessToken &&
      state.user?.email?.toLowerCase() === cleanEmail.toLowerCase()
    ) {
      activeSession = {
        access_token: state.accessToken,
        expires_at: state.expiresAt ?? undefined,
        user: {
          id: state.user.id,
          email: state.user.email,
          user_metadata: { display_name: cleanName },
        },
      };
    } else {
      // Security invariant: only pass safe metadata; never pass role or entitlement.
      const { data, error: signUpError } = await boundAuth(auth.signUp({
        email: cleanEmail,
        password: params.password,
        options: {
          data: {
            display_name: cleanName,
            ...(cleanReferral?.startsWith('SCH-') ? { school_code: cleanReferral } : {}),
          },
        },
      }));

      if (signUpError) {
        const lowerMsg = (signUpError.message || '').toLowerCase();
        if (lowerMsg.includes('already registered') || lowerMsg.includes('already exists')) {
          // Attempt sign-in with the provided password in case this is a retry after partial signup failure
          const signInAttempt = await boundAuth(auth.signInWithPassword({
            email: cleanEmail,
            password: params.password,
          }));
          if (signInAttempt.data?.session) {
            activeSession = signInAttempt.data.session;
          } else {
            return {
              state,
              authCreated: false,
              provisioned: false,
              provisioningResult: null,
              error: 'An account with this email already exists. Please sign in instead.',
            };
          }
        } else {
          return {
            state,
            authCreated: false,
            provisioned: false,
            provisioningResult: null,
            error: signUpError.message || 'Failed to create account. Please try again.',
          };
        }
      } else {
        activeSession = data?.session ?? null;
        if (!activeSession && data?.user) {
          const signInRes = await boundAuth(auth.signInWithPassword({
            email: cleanEmail,
            password: params.password,
          }));
          activeSession = signInRes.data?.session ?? null;
        }
      }
    }

    if (!activeSession || !activeSession.user?.id || !activeSession.access_token) {
      return {
        state,
        authCreated: false,
        provisioned: false,
        provisioningResult: null,
        error: 'Account created, but no active session could be established. Please sign in.',
      };
    }

    if (identityGeneration !== startedIdentity && activeUserId !== activeSession.user.id) return { state, authCreated: false, provisioned: false, provisioningResult: null, error: 'Account changed. Please retry.' };
    applySessionTransition(activeSession);

    const executor = params.provisioningExecutor ?? options?.provisioningExecutor;
    if (!executor) {
      return {
        state,
        authCreated: true,
        provisioned: false,
        provisioningResult: null,
        error: null,
      };
    }

    try {
      const pending = loadPendingBootstrap(activeSession.user.id);
      const provisioningResult = await executeBootstrapWithRecovery({
        userId: activeSession.user.id,
        accessToken: activeSession.access_token,
        displayName: pending?.displayName ?? cleanName,
        referralCode: pending ? pending.referralCode : cleanReferral,
        idempotencyKey: pending?.idempotencyKey,
        executor,
      });

      return {
        state,
        authCreated: true,
        provisioned: true,
        provisioningResult,
        error: null,
      };
    } catch (err) {
      return {
        state,
        authCreated: true,
        provisioned: false,
        provisioningResult: null,
        error:
          err instanceof Error
            ? err.message
            : 'Account created, but profile provisioning encountered a temporary error. Please retry.',
      };
    }
  }

  async function handleUnauthorizedSession(
    reason: 'session_expired' | 'session_revoked' = 'session_expired'
  ): Promise<void> {
    applySessionTransition(null, reason);
    try {
      await boundAuth(getAuth().signOut());
    } catch {
      // Ignore signOut transport errors during forced local session teardown
    }
  }

  async function signOut(): Promise<void> {
    applySessionTransition(null, 'logout');
    try {
      await boundAuth(getAuth().signOut());
    } catch {
      // Ignore signOut network errors after local state has been purged
    }
  }

  function destroy(): void {
    if (authSubscriptionUnsubscribe) {
      authSubscriptionUnsubscribe();
      authSubscriptionUnsubscribe = null;
    }
    listeners.clear();
  }

  return {
    getState: () => state,
    subscribe(listener) {
      ensureSingleAuthStateListener();
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    initialize,
    getValidAccessToken,
    refreshAccessToken,
    applyServerIdentity,
    signInWithPassword,
    signUpAndProvision,
    recoverPendingBootstrap,
    handleUnauthorizedSession,
    signOut,
    destroy,
  };
}

let defaultBrowserSessionManager: BrowserSessionManager | null = null;

export function getDefaultBrowserSessionManager(): BrowserSessionManager {
  if (!defaultBrowserSessionManager) {
    defaultBrowserSessionManager = createBrowserSessionManager();
  }
  return defaultBrowserSessionManager;
}
