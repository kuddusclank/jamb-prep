"use client";
import { signOutAction } from "@/lib/client-actions";

import { useEffect, useState, ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { accountDestination, getAccountCoordinator } from '../lib/auth/account-coordinator';
import { BrowserSessionSnapshot } from '../lib/auth/session-manager';
import { SessionIdentityResponse } from '../lib/api/native-client';
import { buildLoginRedirectUrl } from '../lib/auth/redirect';

const initial: BrowserSessionSnapshot = { status: 'loading', user: null, accessToken: null, expiresAt: null, provisioned: false, role: null, error: null };
export function useBrowserAccount() {
  const [session, setSession] = useState(initial);
  const [identity, setIdentity] = useState<SessionIdentityResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const manager = getAccountCoordinator().manager;
    const unsubscribe = manager.subscribe(setSession);
    setSession(manager.getState());
    if (manager.getState().status === 'loading') void manager.initialize();
    return unsubscribe;
  }, []);
  useEffect(() => {
    let active = true;
    setIdentity(null); setError(null);
    if (session.status === 'authenticated' && session.user) {
      void getAccountCoordinator().loadIdentity().then((value) => { if (active) setIdentity(value); }).catch((err: unknown) => { if (active) setError(err instanceof Error ? err.message : 'Unable to load your account.'); });
    }
    return () => { active = false; };
  }, [session.status, session.user?.id, retry]);
  return { session, identity: identity?.user.id === session.user?.id ? identity : null, error: error ?? session.error,
    retry: () => { getAccountCoordinator().clear(); void getAccountCoordinator().manager.initialize(); setRetry((value) => value + 1); } };
}

export function BrowserAccountBoundary({ children, mode = 'protected', returnPath }: { children: ReactNode; mode?: 'protected' | 'auth'; returnPath?: string }) {
  const account = useBrowserAccount();
  const rawPath = usePathname();
  const pathname = rawPath.replace(/\/$/, '') || '/';
  const router = useRouter();
  const identity = account.identity;
  const editingOnboarding = pathname === '/onboarding' && typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('edit') === '1';
  const destination = identity && !editingOnboarding ? accountDestination(identity, pathname, returnPath ?? (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('redirectTo') ?? '/dashboard' : '/dashboard')) : null;
  useEffect(() => {
    if (mode === 'protected' && account.session.status === 'unauthenticated') {
      router.replace(buildLoginRedirectUrl(`${window.location.pathname}${window.location.search}`));
    } else if (destination) router.replace(destination);
  }, [mode, account.session.status, destination, router]);
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
  if (!identity || destination) return <main className="min-h-screen flex items-center justify-center px-5"><p role="status" className="rounded-2xl border border-slate-200 bg-white px-8 py-6 text-sm text-[#116149] shadow-sm">Loading your account…</p></main>;
  return <>{children}</>;
}

export function BrowserAccountNavigation() {
  const account = useBrowserAccount();
  if (account.session.status === 'loading') return <span role="status">Checking session…</span>;
  if (account.session.status === 'authenticated') return <><Link href={account.identity && !account.identity.onboardingCompleted ? '/onboarding' : '/dashboard'}>My study space</Link><button type="button" onClick={() => { void signOutAction(); }}>Sign out</button></>;
  return <Link href="/login">Sign in</Link>;
}
