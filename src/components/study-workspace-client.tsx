"use client";

import { useApiResource } from "@/lib/api/use-api-resource";
import type { ProfileData } from "@/lib/api/app-dtos";
import { BrandMark } from "@/components/brand-mark";
import { useEffect, useState, type ReactNode } from "react";
import Link from "@/components/pending-link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Layers, Clock, ChartNoAxesCombined, Users, UserRound, CreditCard, LogOut, Flame, BookA, WifiOff } from "lucide-react";
import { signOutAction } from "@/lib/client-actions";
import { purgeAllActorOfflineData } from "@/lib/offline/idb-storage";
import { flushPendingSync } from "@/lib/offline/weekly-pack-client";
import styles from "./study-workspace.module.css";
import { PolicyLinks } from "@/components/legal-page";
import { ResourceStatus } from "@/lib/api/use-api-resource";

const destinations = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard, requiresOnline: false },
  { href: '/practice', label: 'Practice', icon: Layers, requiresOnline: false },
  { href: '/mock', label: 'Mock exams', icon: Clock, requiresOnline: true },
  { href: '/dictionary', label: 'Dictionary', icon: BookA, isPro: true, requiresOnline: false },
  { href: '/analytics', label: 'Performance', icon: ChartNoAxesCombined, requiresOnline: true },
  { href: '/referrals', label: 'Invite friends', icon: Users, requiresOnline: true },
  { href: '/profile', label: 'My profile', icon: UserRound, requiresOnline: false },
  { href: '/pricing', label: 'Plans', icon: CreditCard, requiresOnline: true },
];

export function StudyWorkspaceClient({ children }: { children: ReactNode }) {
  const profile = useApiResource<ProfileData>("/api/v1/profile");
  const [isOnline, setIsOnline] = useState(true);
  const showFreeLinks = profile.data?.subscription.isPremium === false;
  const pathname = usePathname();

  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      setIsOnline(navigator.onLine);
    }
    const handleOnline = () => {
      setIsOnline(true);
      const studentId = profile.data?.profile?.id;
      if (studentId) {
        void flushPendingSync(studentId);
      }
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [profile.data?.profile?.id]);

  const visibleDestinations = destinations.filter(item => showFreeLinks || !["/referrals", "/pricing"].includes(item.href));
  const current = visibleDestinations.find(item => pathname === item.href || pathname.startsWith(`${item.href}/`));
  if (!profile.data) return <ResourceStatus error={profile.error} retry={profile.retry} />;
  const streak = profile.data.studyStreak?.streak;

  const handleSignOut = async () => {
    try {
      await purgeAllActorOfflineData();
    } catch {
      // non-blocking
    }
  };

  return <div className={styles.workspace}>
    <a href="#study-content" className="skip-link">Skip to study content</a>
    <header className={styles.header}>
      <Link href="/dashboard" className={styles.brand}><BrandMark size={32}/> jambprep.</Link>
      <span className={styles.context}>{current?.label || 'Your study space'}</span>

      {!isOnline && (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
          <WifiOff size={13} className="text-amber-600" />
          <span>Offline mode</span>
        </span>
      )}

      {streak && (
        <Link
          href="/profile#schedule"
          className="ml-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition hover:scale-105"
          style={{
            background: streak.qualifiedToday ? '#FEF3C7' : streak.currentStreak > 0 ? '#FFFBEB' : '#F1F5F9',
            borderColor: streak.qualifiedToday ? '#F59E0B' : streak.currentStreak > 0 ? '#FCD34D' : '#E2E8F0',
            color: streak.currentStreak > 0 ? '#B45309' : '#64748B',
          }}
          title={streak.qualifiedToday ? "Today's study streak is locked in!" : streak.currentStreak > 0 ? `${streak.currentStreak}-day streak! Practice or take a mock today to extend.` : "Start your daily streak"}
        >
          <Flame size={14} className={streak.currentStreak > 0 ? "fill-current text-amber-500 animate-pulse" : "text-slate-400"} />
          <span>{streak.currentStreak}d</span>
        </Link>
      )}
      <Link href="/profile" className={streak ? "inline-flex items-center justify-center gap-2 min-h-11 px-3 border border-slate-200 rounded-xl text-sm hover:bg-slate-50" : styles.account}>
        <UserRound size={18} aria-hidden="true" />
        <span className="hidden sm:inline">Account</span>
      </Link>
      <form action={signOutAction} onSubmit={handleSignOut} className={styles.mobileSignout}><button type="submit" aria-label="Sign out" title="Sign out"><LogOut size={18} aria-hidden="true" /></button></form>
    </header>
    <aside className={styles.sidebar}>
      <p className={styles.caption}>YOUR STUDY SPACE</p>
      <nav aria-label="Study navigation" className={styles.navigation}>
        {visibleDestinations.map(({ href, label, icon: Icon, isPro, requiresOnline }) => {
          const isLocked = isPro && profile.data?.subscription.isPremium === false;
          const isOfflineDisabled = !isOnline && requiresOnline;
          const targetHref = isLocked ? '/pricing' : (isOfflineDisabled ? '#' : href);
          return (
            <Link
              key={href}
              href={targetHref}
              aria-current={current?.href === href ? 'page' : undefined}
              className={`${styles.navLink} ${isOfflineDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={isLocked ? `${label} is a Pro feature — click to upgrade` : (isOfflineDisabled ? `${label} requires an internet connection` : label)}
            >
              <Icon size={19} aria-hidden="true" />
              <span>{label}</span>
              {isLocked && (
                <span className="ml-auto text-[10px] font-extrabold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.5 rounded-sm">
                  PRO
                </span>
              )}
              {isOfflineDisabled && (
                <span className="ml-auto text-[10px] font-medium text-slate-400">
                  Online
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className={styles.sidebarFooter}>
        <p>A little progress, every day.</p>
        <form action={signOutAction} onSubmit={handleSignOut}><button type="submit" className={styles.signout}><LogOut size={17} aria-hidden="true" />Sign out</button></form>
      </div>
    </aside>
    <div id="study-content" tabIndex={-1} className={styles.content}>{children}</div>
    <footer className={styles.footer}><p>JAMBPrep · Your subjects. Your pace. Your next step.</p><PolicyLinks className="mt-3 justify-center"/></footer>
  </div>;
}
