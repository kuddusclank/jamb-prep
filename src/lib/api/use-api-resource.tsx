"use client";
import { useEffect, useState } from 'react';
import { getAccountCoordinator } from '../auth/account-coordinator';
import { useBrowserAccount } from '../../components/browser-account-boundary';
export function useApiResource<T>(path: string) {
  const { session } = useBrowserAccount();
  const [value, setValue] = useState<{ userId: string; path: string; data: T } | null>(null);
  const [failure, setFailure] = useState<{ userId: string; path: string; message: string } | null>(null);
  const [revision, setRevision] = useState(0);
  const userId = session.user?.id ?? null;
  useEffect(() => {
    let active = true;
    setValue(null); setFailure(null);
    if (session.status === 'authenticated' && userId) {
      void getAccountCoordinator().loadResource<T>(path).then((data) => {
        if (active) setValue({ userId, path, data });
      }).catch((error: unknown) => {
        if (active) setFailure({ userId, path, message: error instanceof Error ? error.message : 'Unable to load. Please retry.' });
      });
    }
    return () => { active = false; };
  }, [path, userId, session.status, revision]);
  return { data: value?.userId === userId && value.path === path ? value.data : null,
    error: failure?.userId === userId && failure.path === path ? failure.message : null,
    retry: () => { getAccountCoordinator().clear(); setRevision((current) => current + 1); } };
}
export function ResourceStatus({ error, retry }: { error: string | null; retry: () => void }) {
  return <section role={error ? 'alert' : 'status'} className="shell section-space"><div className="rounded-2xl border border-slate-200 bg-white p-6"><p>{error ?? 'Loading your study data…'}</p>{error && <button type="button" onClick={retry} className="mt-4 rounded-full bg-[#116149] px-5 py-3 text-white">Retry</button>}</div></section>;
}
