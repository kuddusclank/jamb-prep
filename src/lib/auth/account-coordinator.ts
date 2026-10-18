import { createNativeApiClient, NativeApiClient, SessionIdentityResponse } from '../api/native-client';
import { BrowserSessionManager, getDefaultBrowserSessionManager } from './session-manager';
import { registerPrivateCacheClearer } from './storage-cleanup';
import { sanitizeInternalRedirect } from './redirect';

export interface OnboardingData {
  availableSubjects: { id: string; code: string; name: string; is_compulsory: boolean }[];
  preferences: { target_score: number; target_institution: string | null; target_course: string | null } | null;
  enrolledSubjects: { subject_id: string; code: string; name: string }[];
}

export function accountDestination(identity: SessionIdentityResponse, pathname: string, returnPath = '/dashboard', editOnboarding = false): string | null {
  if (!identity.provisioned) return pathname === '/register' ? null : '/register?resume=1';
  if (!identity.onboardingCompleted) return pathname === '/onboarding' ? null : '/onboarding';
  if (pathname === '/onboarding' && editOnboarding) return null;
  if (['/', '/login', '/register', '/forgot-password', '/onboarding'].includes(pathname)) {
    const target = sanitizeInternalRedirect(returnPath);
    const targetUrl = new URL(target, 'https://jambprep.internal');
    const isOnboarding = targetUrl.pathname.replace(/\/$/, '') === '/onboarding';
    return isOnboarding && targetUrl.searchParams.get('edit') !== '1' ? '/dashboard' : target;
  }
  return null;
}

/** Per-actor/coalesced cache. Purge generations prevent late results from repopulating private state. */
export function createAccountCoordinator(manager: BrowserSessionManager, api: NativeApiClient, now = Date.now) {
  const cache = new Map<string, { value: unknown; until: number }>();
  const pending = new Map<string, Promise<unknown>>();
  const mutationKeys = new Map<string, string>();
  let saving = false;
  let generation = 0;
  let actorGeneration = 0;
  let actor = manager.getState().user?.id ?? null;
  const invalidate = () => { generation++; cache.clear(); pending.clear(); };
  const clear = () => { actorGeneration++; invalidate(); mutationKeys.clear(); };
  const unregister = registerPrivateCacheClearer(clear);
  const unsubscribe = manager.subscribe((state) => { const next = state.user?.id ?? null; if (next !== actor) { actor = next; clear(); } });
  async function load<T>(key: string, read: (userId: string) => Promise<T>): Promise<T> {
    if (manager.getState().status === 'loading') await manager.initialize();
    const userId = manager.getState().user?.id;
    if (!userId) throw new Error('Sign in to continue.');
    const scopedKey = `${userId}:${key}`;
    const cached = cache.get(scopedKey);
    if (cached && cached.until > now()) return cached.value as T;
    const existing = pending.get(scopedKey);
    if (existing) return existing as Promise<T>;
    const started = generation;
    const promise = read(userId).then((value) => {
      if (generation !== started || manager.getState().user?.id !== userId) throw new Error('Account changed. Please retry.');
      cache.set(scopedKey, { value, until: now() + 30000 });
      return value;
    }).finally(() => { if (pending.get(scopedKey) === promise) pending.delete(scopedKey); });
    pending.set(scopedKey, promise);
    return promise;
  }
  const loadIdentity = () => load('identity', async (userId) => {
    const identity = await api.getSessionIdentity({ expectedUserId: userId });
    if (manager.getState().user?.id !== userId) throw new Error('Account changed. Please retry.');
    // Older accounts may have completed onboarding before native bootstrap existed.
    if (identity.provisioned && !identity.referralCode) {
      await api.bootstrapAccount({
        displayName: identity.user.displayName?.trim() || 'Student',
        referralCode: null,
        idempotencyKey: `referral-recovery-${crypto.randomUUID()}`,
      });
      return api.getSessionIdentity({ expectedUserId: userId });
    }
    return identity;
  });
  return {
    manager, api,
    loadResource: async <T>(path: string) => {
      if (path === '/api/v1/referrals') await loadIdentity();
      return load<T>(path, async () => (await api.request<T>(path)).data);
    },
    async mutate<T>(path: string, body: unknown, method: "POST" | "PUT" | "PATCH" = "POST", headers?: Record<string,string>) {
      const userId = manager.getState().user?.id;
      if (!userId) throw new Error("Sign in to continue.");
      const started = actorGeneration;
      const intent = JSON.stringify({ userId, path, method, body, headers });
      const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(intent)));
      const hash = Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
      if (started !== actorGeneration) throw new Error("Account changed. Please retry.");
      const key = mutationKeys.get(hash) ?? `write-${crypto.randomUUID()}`;
      mutationKeys.set(hash, key);
      let result;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          result = await api.request<T>(path, { method, body, idempotencyKey: key, headers });
          break;
        } catch (error) {
          if (error && typeof error === "object" && "code" in error && error.code === "PAYMENT_FAILED") {
            mutationKeys.delete(hash);
            throw error;
          }
          const isNetworkError = error instanceof TypeError && started === actorGeneration;
          if (isNetworkError && attempt < 3) {
            await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
            continue;
          }
          throw error;
        }
      }
      if (!result || started !== actorGeneration || manager.getState().user?.id !== userId) throw new Error("Account changed. Please retry.");
      mutationKeys.delete(hash);
      invalidate();
      return result.data;
    },
    loadIdentity,
    loadOnboarding: () => load('onboarding', async () => {
      const data = (await api.request<OnboardingData>('/api/v1/onboarding')).data;
      const subjects = data?.availableSubjects;
      const english = Array.isArray(subjects) && subjects.some(subject => subject.code === 'ENG' && subject.is_compulsory);
      const electives = Array.isArray(subjects) ? new Set(subjects.filter(subject => subject.code !== 'ENG' && !subject.is_compulsory).map(subject => subject.id)) : new Set();
      if (!english || electives.size < 3) throw new Error('Subject choices are temporarily unavailable. Please retry. Your saved combination has not been changed.');
      return data;
    }),
    async saveOnboarding(body: { electives: string[]; targetScore: number; targetInstitution?: string | null; targetCourse?: string | null }) {
      if (saving) throw new Error('Please wait for your current save to finish.');
      saving = true;
      try {
      const userId = manager.getState().user?.id;
      if (!userId) throw new Error('Sign in to continue.');
      const started = actorGeneration;
      const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify({ userId, body }))));
      const payloadHash = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
      const idempotencyKey = mutationKeys.get(payloadHash) ?? `onboard-${crypto.randomUUID()}`;
      mutationKeys.set(payloadHash, idempotencyKey);
      if (actorGeneration !== started) throw new Error('Account changed. Please retry.');
      const result = await api.request<{ saved: boolean }>('/api/v1/onboarding', { method: 'PUT', body, idempotencyKey });
      if (actorGeneration !== started || manager.getState().user?.id !== userId) throw new Error('Account changed. Please retry.');
      if (!result.data.saved) throw new Error('Your setup was not saved. Please retry.');
      mutationKeys.delete(payloadHash);
      invalidate();
      return result.data;
      } finally { saving = false; }
    },
    clear: invalidate,
    destroy() { clear(); unregister(); unsubscribe(); },
  };
}
let shared: ReturnType<typeof createAccountCoordinator> | null = null;
export function getAccountCoordinator() {
  if (!shared) shared = createAccountCoordinator(getDefaultBrowserSessionManager(), createNativeApiClient());
  return shared;
}
