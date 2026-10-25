"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getAccountCoordinator } from '../auth/account-coordinator';
import { useBrowserAccount } from '../../components/browser-account-boundary';
import { isSigningOut } from '../client-actions';
import StudySkeleton from '../../components/study-skeleton';
import { saveProfileSnapshot, getProfileSnapshot } from '../offline/idb-storage';
import { saveOfflineProfile, getOfflineProfile } from '../offline/offline-profile-cache';
import { getNetworkStateManager, isNetworkOrTimeoutError } from '../offline/network-state';
import type { ProfileData } from './app-dtos';

export function useApiResource<T>(path: string | null) {
  const { session } = useBrowserAccount();
  const userId = session.user?.id ?? null;
  const coordinator = getAccountCoordinator();

  const [value, setValue] = useState<{ userId: string; path: string; revision: number; data: T } | null>(() => {
    if (typeof window === 'undefined' || !path || !userId) return null;
    const cached = coordinator.getCachedResource<T>(path);
    if (cached !== null) return { userId, path, revision: 0, data: cached };
    return null;
  });
  const [failure, setFailure] = useState<{ userId: string; path: string; revision: number; message: string } | null>(null);
  const [revision, setRevision] = useState(0);

  // Automatically re-fetch when internet connectivity is restored
  useEffect(() => {
    const manager = getNetworkStateManager();
    return manager.subscribe((isOnline) => {
      if (isOnline) {
        setFailure((currentFailure) => {
          if (currentFailure && isNetworkOrTimeoutError(currentFailure.message)) {
            setRevision((rev) => rev + 1);
            return null;
          }
          return currentFailure;
        });
      }
    });
  }, []);
  useEffect(() => {
    if (isSigningOut()) return;
    let active = true;
    const cached = path && userId ? coordinator.getCachedResource<T>(path) : null;
    if (cached !== null && userId && path) {
      setValue({ userId, path, revision, data: cached });
    } else {
      setValue((prev) => (prev && prev.userId === userId && prev.path === path ? prev : null));
    }
    setFailure(null);
    if (path && session.status === 'authenticated' && userId) {
      void coordinator.loadResource<T>(path).then((data) => {
        if (active && !isSigningOut()) {
          setValue({ userId, path, revision, data });
          if (path === '/api/v1/profile' && data && typeof data === 'object') {
            const prof = data as unknown as ProfileData;
            saveOfflineProfile({ profile: prof, userId });
            void saveProfileSnapshot({
              userId,
              displayName: prof.profile?.display_name || null,
              email: prof.profile?.email || null,
              targetScore: prof.preferences?.target_score || 280,
              subjects: [],
              lastSyncedAt: new Date().toISOString(),
            }).catch(() => { /* non-blocking */ });
          } else if (path === '/api/v1/practice/subjects' && data && typeof data === 'object') {
            const subjectsData = data as unknown as { subjects?: Array<{ subject_id: string; subject_code: string; subject_name: string; is_compulsory: boolean }> };
            if (Array.isArray(subjectsData.subjects)) {
              saveOfflineProfile({
                userId,
                enrolledSubjects: subjectsData.subjects.map((s) => ({
                  id: s.subject_id,
                  code: s.subject_code,
                  name: s.subject_name,
                  isCompulsory: s.is_compulsory,
                })),
              });
            }
          }
        }
      }).catch(async (error: unknown) => {
        if (!active || isSigningOut()) return;
        // Auto-detect offline condition if network/DNS/timeout error occurs or navigator says offline
        const isOfflineOrNetworkFailure =
          (typeof navigator !== 'undefined' && !navigator.onLine) ||
          isNetworkOrTimeoutError(error);

        if (isOfflineOrNetworkFailure) {
          getNetworkStateManager().markOffline(error instanceof Error ? error.message : String(error));
        }

        // Check offline snapshot fallback
        if (isOfflineOrNetworkFailure && path === '/api/v1/profile') {
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

        if (isOfflineOrNetworkFailure && path === '/api/v1/practice/subjects') {
          try {
            const cachedOffline = getOfflineProfile(userId);
            if (cachedOffline && active) {
              const fallback = {
                subjects: (cachedOffline.enrolledSubjects || []).map((s) => ({
                  subject_id: s.id,
                  subject_code: s.code,
                  subject_name: s.name,
                  is_compulsory: s.isCompulsory,
                })),
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
  return { data: (session.status === 'authenticated' || isSigningOut()) && value?.userId === userId && value.path === path ? value.data : null,
    error: !isSigningOut() && failure?.userId === userId && failure.path === path && failure.revision === revision ? failure.message : null,
    retry: () => { getAccountCoordinator().clear(); setRevision((current) => current + 1); } };
}
export function ResourceStatus({ error, retry }: { error: string | null; retry: () => void }) {
  if (!error) return <StudySkeleton />;
  const isPremiumError = Boolean(
    error && (
      error.toLowerCase().includes('premium') ||
      error.toLowerCase().includes('upgrade') ||
      error.toLowerCase().includes('entitlement') ||
      error.toLowerCase().includes('school')
    )
  );
  const isSchoolMessage = Boolean(error && (error.toLowerCase().includes('school') || error.toLowerCase().includes('administrator')));

  return (
    <section role={error ? 'alert' : 'status'} className="shell section-space">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
        <p className="font-medium text-slate-800">{error ?? 'Loading data…'}</p>
        {isPremiumError ? (
          <div className="mt-4">
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center rounded-full bg-[#116149] px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#0e4e3a] transition-colors"
            >
              {isSchoolMessage ? "Contact School Admin" : "Upgrade to Pro"}
            </Link>
          </div>
        ) : (
          error && (
            <button
              type="button"
              onClick={retry}
              className="mt-4 rounded-full bg-[#116149] px-5 py-3 text-sm font-semibold text-white hover:bg-[#0e4e3a] transition-colors"
            >
              Retry
            </button>
          )
        )}
      </div>
    </section>
  );
}
