"use client";
import StudyLoading from "./study-loading";
import { signOutAction, isSigningOut } from "@/lib/client-actions";

import { useEffect, useState, ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { accountDestination, getAccountCoordinator } from '../lib/auth/account-coordinator';
import { BrowserSessionSnapshot } from '../lib/auth/session-manager';
import { SessionIdentityResponse } from '../lib/api/native-client';
import { buildLoginRedirectUrl } from '../lib/auth/redirect';
import { saveOfflineProfile, getOfflineProfile } from '@/lib/offline/offline-profile-cache';
import { getNetworkStateManager, isNetworkOrTimeoutError } from '@/lib/offline/network-state';

const initial: BrowserSessionSnapshot = { status: 'loading', user: null, accessToken: null, expiresAt: null, provisioned: false, role: null, error: null };

function getInitialAccountIdentity(userId: string | undefined): SessionIdentityResponse | null {
  if (typeof window === 'undefined') return null;
  const coordinator = getAccountCoordinator();
  const cached = coordinator.getCachedIdentity();
  if (userId && cached && cached.user.id === userId) return cached;
  const offline = getOfflineProfile(userId);
  if (offline) {
    return {
      authenticated: true,
      user: {
        id: offline.userId,
        email: offline.email,
        displayName: offline.displayName,
        role: offline.role,
      },
      provisioned: true,
      onboardingCompleted: true,
      referralCode: null,
    };
  }
  return cached ?? null;
}

export function useBrowserAccount() {
  const coordinator = getAccountCoordinator();
  const manager = coordinator.manager;
  const [session, setSession] = useState<BrowserSessionSnapshot>(() => {
    return typeof window !== 'undefined' ? manager.getState() : initial;
  });
  const [identity, setIdentity] = useState<SessionIdentityResponse | null>(() => {
    const currentUserId = typeof window !== 'undefined' ? manager.getState().user?.id : undefined;
    return getInitialAccountIdentity(currentUserId);
  });
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const unsubscribe = manager.subscribe((next) => {
      if (isSigningOut()) return;
      setSession(next);
    });
    if (!isSigningOut()) {
      setSession(manager.getState());
    }
    if (manager.getState().status === 'loading') void manager.initialize();
    return unsubscribe;
  }, [manager]);
  useEffect(() => {
    if (isSigningOut()) return;
    let active = true;
    const currentUserId = session.user?.id;
    const cached = coordinator.getCachedIdentity();
    if (cached && cached.user.id === currentUserId) {
      setIdentity(cached);
    } else if (session.status !== 'authenticated' || !currentUserId) {
      setIdentity(null);
    }
    setError(null);
    if (session.status === 'authenticated' && session.user) {
      void coordinator.loadIdentity().then((value) => {
        if (active && !isSigningOut()) {
          setIdentity(value);
          saveOfflineProfile({ identity: value });
        }
      }).catch((err: unknown) => {
        if (!active || isSigningOut()) return;
        const isOfflineOrNetworkFailure =
          (typeof navigator !== 'undefined' && !navigator.onLine) ||
          isNetworkOrTimeoutError(err);
        if (isOfflineOrNetworkFailure) {
          getNetworkStateManager().markOffline(err instanceof Error ? err.message : String(err));
        }
        if (isOfflineOrNetworkFailure && (session.user || getOfflineProfile())) {
          const cachedProfile = getOfflineProfile(session.user?.id) || getOfflineProfile();
          if (cachedProfile) {
            const offlineIdentity: SessionIdentityResponse = {
              authenticated: true,
              user: {
                id: cachedProfile.userId,
                email: cachedProfile.email,
                displayName: cachedProfile.displayName,
                role: cachedProfile.role,
              },
              provisioned: true,
              onboardingCompleted: true,
              referralCode: null,
            };
            setIdentity(offlineIdentity);
            return;
          }
        }
        setError(err instanceof Error ? err.message : 'Unable to load your account.');
      });
    }
    return () => { active = false; };
  }, [coordinator, session.status, session.user?.id, retry]);
  const effectiveIdentity = identity && (!session.user || identity.user.id === session.user.id) ? identity : null;
  return { session, identity: effectiveIdentity, error: error ?? session.error,
    retry: () => { coordinator.clear(); void manager.initialize(); setRetry((value) => value + 1); } };
}

type BoundaryProps = { children: ReactNode; mode?: 'protected' | 'auth' | 'public'; returnPath?: string };
export function BrowserAccountBoundary({ children, mode = 'protected', returnPath }: BoundaryProps) {
  const account = useBrowserAccount();
  const rawPath = usePathname();
  const pathname = rawPath.replace(/\/$/, '') || '/';
  const router = useRouter();
  const identity = account.identity;
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const effectiveRole = identity?.user?.role || account.session.role;
  const isAuthPage = [
    '/login',
    '/register',
    '/forgot-password',
    '/schools/login',
    '/schools/register',
    '/schools/forgot-password',
  ].includes(pathname);

  const fallbackDestination = effectiveRole === 'school_admin'
    ? '/schools/dashboard'
    : effectiveRole === 'admin'
    ? '/admin'
    : '/dashboard';

  const destination = identity
    ? accountDestination(identity, pathname, returnPath ?? searchParams?.get('redirectTo') ?? fallbackDestination, searchParams?.get('edit') === '1')
    : account.session.status === 'authenticated' && (isAuthPage || (effectiveRole === 'school_admin' && !pathname.startsWith('/schools')))
    ? fallbackDestination
    : null;
  useEffect(() => {
    if (isSigningOut()) return;
    if (mode === 'protected' && account.session.status === 'unauthenticated') {
      if (getAccountCoordinator().manager.getState().status !== 'unauthenticated') return;
      router.replace(buildLoginRedirectUrl(`${window.location.pathname}${window.location.search}`));
    } else if (destination) router.replace(destination);
  }, [mode, account.session.status, destination, router]);
  if (isSigningOut()) return <>{children}</>;
  if (mode === 'public' && account.session.status !== 'authenticated') return <>{children}</>;
  if (mode === 'auth' && (account.session.status === 'unauthenticated' || (pathname === '/register' && identity && !identity.provisioned))) return <>{children}</>;
  if (account.error) return <main className="min-h-screen flex items-center justify-center px-5 py-12">
    <section role="alert" className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-semibold text-[#092E28]">We couldn’t load your study space</h1>
      <p className="mt-3 text-sm leading-6 text-slate-600">{account.error}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <button type="button" onClick={account.retry} className="min-h-12 rounded-full bg-[#116149] px-6 text-sm font-semibold text-white hover:bg-[#0b4936]">Try again</button>
        <button type="button" onClick={() => { void signOutAction(); }} className="min-h-12 rounded-full border border-slate-200 px-6 text-sm font-semibold text-slate-700 hover:bg-slate-50">Sign out</button>
      </div>
    </section>
  </main>;
  if (destination || (!identity && mode !== 'auth')) return <StudyLoading />;
  return <>{children}</>;
}

export function BrowserAccountNavigation() {
  const account = useBrowserAccount();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted || account.session.status === 'loading') return <span role="status">Checking session…</span>;
  if (account.session.status === 'authenticated') {
    const isSchoolAdmin = account.session.role === 'school_admin' || account.identity?.user?.role === 'school_admin';
    const destination = isSchoolAdmin ? '/schools/dashboard' : (account.identity && !account.identity.onboardingCompleted ? '/onboarding' : '/dashboard');
    const label = isSchoolAdmin ? 'School portal' : 'My study space';
    return <><Link href={destination}>{label}</Link><button type="button" onClick={() => { void signOutAction(); }}>Sign out</button></>;
  }
  return <Link href="/login">Sign in</Link>;
}
