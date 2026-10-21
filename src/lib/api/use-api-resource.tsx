"use client";
import { useEffect, useState } from 'react';
import { getAccountCoordinator } from '../auth/account-coordinator';
import { useBrowserAccount } from '../../components/browser-account-boundary';
import StudySkeleton from '../../components/study-skeleton';
import { saveProfileSnapshot, getProfileSnapshot } from '../offline/idb-storage';
import { saveOfflineProfile, getOfflineProfile } from '../offline/offline-profile-cache';
import type { ProfileData } from './app-dtos';

export function useApiResource<T>(path: string | null) {
  const { session } = useBrowserAccount();
  const [value, setValue] = useState<{ userId: string; path: string; revision: number; data: T } | null>(null);
  const [failure, setFailure] = useState<{ userId: string; path: string; revision: number; message: string } | null>(null);
  const [revision, setRevision] = useState(0);
  const userId = session.user?.id ?? null;
  useEffect(() => {
    let active = true;
    setValue(null); setFailure(null);
    if (path && session.status === 'authenticated' && userId) {
      void getAccountCoordinator().loadResource<T>(path).then((data) => {
        if (active) {
          setValue({ userId, path, revision, data });
          if (path === '/api/v1/profile' && data && typeof data === 'object') {
            const prof = data as unknown as ProfileData;
            saveOfflineProfile({ profile: prof });
            void saveProfileSnapshot({
              userId,
              displayName: prof.profile?.display_name || null,
              email: prof.profile?.email || null,
              targetScore: prof.preferences?.target_score || 280,
              subjects: [],
              lastSyncedAt: new Date().toISOString(),
            }).catch(() => { /* non-blocking */ });
          }
        }
      }).catch(async (error: unknown) => {
        if (!active) return;
        // Check offline snapshot fallback
        if (typeof navigator !== 'undefined' && !navigator.onLine && path === '/api/v1/profile') {
          try {
            const cachedOffline = getOfflineProfile(userId);
            if (cachedOffline && active) {
              const fallback = {
                profile: {
                  id: cachedOffline.userId,
                  display_name: cachedOffline.displayName || 'Student',
                  email: cachedOffline.email || '',
                  role: cachedOffline.role,
                },
                preferences: {
                  target_score: cachedOffline.targetScore,
                  target_institution: null,
                  target_course: null,
                },
                subscription: {
                  isPremium: cachedOffline.subscription.isPremium,
                  expiresAt: cachedOffline.subscription.expiresAt ? new Date(cachedOffline.subscription.expiresAt) : null,
                  daysRemaining: cachedOffline.subscription.expiresAt
                    ? Math.max(0, Math.ceil((new Date(cachedOffline.subscription.expiresAt).getTime() - Date.now()) / 86400000))
                    : 0,
                  planCode: cachedOffline.subscription.planCode,
                  autoRenew: cachedOffline.subscription.autoRenew,
                  cancelledAt: null,
                },
                studyStreak: {
                  currentStreak: cachedOffline.streak.currentStreak,
                  longestStreak: cachedOffline.streak.longestStreak,
                  lastStudiedDate: cachedOffline.streak.lastActiveDate,
                },
              } as unknown as T;
              setValue({ userId, path, revision, data: fallback });
              return;
            }

            const cached = await getProfileSnapshot(userId);
            if (cached && active) {
              const fallback = {
                profile: { id: cached.userId, display_name: cached.displayName || 'Student', email: cached.email || '', role: 'student' },
                preferences: { target_score: cached.targetScore, target_institution: null, target_course: null },
                subscription: { isPremium: true },
                studyStreak: null,
              } as unknown as T;
              setValue({ userId, path, revision, data: fallback });
              return;
            }
          } catch {
            // Proceed to failure message
          }
        }
        setFailure({ userId, path, revision, message: error instanceof Error ? error.message : 'Unable to load. Please retry.' });
      });
    }
    return () => { active = false; };
  }, [path, userId, session.status, revision]);
  return { data: session.status === 'authenticated' && value?.userId === userId && value.path === path && value.revision === revision ? value.data : null,
    error: failure?.userId === userId && failure.path === path && failure.revision === revision ? failure.message : null,
    retry: () => { getAccountCoordinator().clear(); setRevision((current) => current + 1); } };
}
export function ResourceStatus({ error, retry }: { error: string | null; retry: () => void }) {
  if (!error) return <StudySkeleton />;
  return <section role={error ? 'alert' : 'status'} className="shell section-space"><div className="rounded-2xl border border-slate-200 bg-white p-6"><p>{error ?? 'Loading data…'}</p>{error && <button type="button" onClick={retry} className="mt-4 rounded-full bg-[#116149] px-5 py-3 text-white">Retry</button>}</div></section>;
}
