"use client";

import { useApiResource } from "@/lib/api/use-api-resource";
import type { ProfileData } from "@/lib/api/app-dtos";
import { BrandMark } from "@/components/brand-mark";
import { useEffect, useState, useRef, useCallback, type ReactNode } from "react";
import Link from "@/components/pending-link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Layers, Clock, ChartNoAxesCombined, Users, UserRound, CreditCard, LogOut, Flame, BookA, WifiOff, CheckCircle2 } from "lucide-react";
import { signOutAction } from "@/lib/client-actions";
import { purgeAllActorOfflineData } from "@/lib/offline/idb-storage";
import { flushPendingSync, ensureWeeklyPackDownloaded } from "@/lib/offline/weekly-pack-client";
import styles from "./study-workspace.module.css";
import { PolicyLinks } from "@/components/legal-page";
import { ResourceStatus } from "@/lib/api/use-api-resource";
import { useNetworkStatus, isNetworkOrTimeoutError } from "@/lib/offline/network-state";
import { getOfflineProfile } from "@/lib/offline/offline-profile-cache";
import { NetworkStatusToast } from "@/components/network-status-toast";

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
  const { isOnline, isOffline } = useNetworkStatus();
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);

  const handleNavScroll = useCallback(() => {
    const nav = navRef.current;
    if (nav && nav.scrollWidth > nav.clientWidth) {
      try {
        sessionStorage.setItem("jambprep_study_nav_scroll", String(nav.scrollLeft));
      } catch {
        // Ignore storage errors
      }
    }
  }, []);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    const restoreAndCenter = () => {
      if (!nav || nav.scrollWidth <= nav.clientWidth) return;

      // 1. Restore exact scroll position if saved
      try {
        const saved = sessionStorage.getItem("jambprep_study_nav_scroll");
        if (saved !== null) {
          const val = Number(saved);
          if (!Number.isNaN(val) && val >= 0) {
            nav.scrollLeft = val;
          }
        }
      } catch {
        // Ignore
      }

      // 2. Ensure the active item is visible in view
      const activeLink = nav.querySelector<HTMLElement>('[aria-current="page"]');
      if (activeLink) {
        const navRect = nav.getBoundingClientRect();
        const linkRect = activeLink.getBoundingClientRect();

        const isClippedLeft = linkRect.left < navRect.left;
        const isClippedRight = linkRect.right > navRect.right;

        if (isClippedLeft || isClippedRight) {
          activeLink.scrollIntoView({
            behavior: "auto",
            block: "nearest",
            inline: "center",
          });
          try {
            sessionStorage.setItem("jambprep_study_nav_scroll", String(nav.scrollLeft));
          } catch {
            // Ignore
          }
        }
      }
    };

    restoreAndCenter();
    const t = requestAnimationFrame(restoreAndCenter);
    return () => cancelAnimationFrame(t);
  }, [pathname]);

  useEffect(() => {
    const studentId = profile.data?.profile?.id;
    if (studentId && isOnline) {
      void flushPendingSync(studentId);
    }
  }, [profile.data?.profile?.id, isOnline]);

  // Automatic silent background prefetch of this week's 250-pack for Pro students
  useEffect(() => {
    if (typeof window === "undefined" || isOffline) return;
    const studentId = profile.data?.profile?.id;
    const isPremium = profile.data?.subscription?.isPremium;
    if (!studentId || !isPremium) return;

    void ensureWeeklyPackDownloaded(studentId).catch(() => {});
  }, [profile.data?.profile?.id, profile.data?.subscription?.isPremium, isOffline]);

  const currentUserId = profile.data?.profile?.id || (typeof window !== "undefined" ? getOfflineProfile()?.userId : undefined);
  const offlineSnapshot = getOfflineProfile(currentUserId);
  const effectiveProfile: ProfileData | null = profile.data || (offlineSnapshot ? {
    profile: {
      id: offlineSnapshot.userId,
      display_name: offlineSnapshot.displayName,
      email: offlineSnapshot.email,
      role: offlineSnapshot.role,
    },
    preferences: {
      target_score: offlineSnapshot.targetScore,
      target_institution: null,
      target_course: null,
    },
    subscription: {
      isPremium: offlineSnapshot.subscription.isPremium,
      expiresAt: offlineSnapshot.subscription.expiresAt,
      daysRemaining: offlineSnapshot.subscription.expiresAt
        ? Math.max(0, Math.ceil((new Date(offlineSnapshot.subscription.expiresAt).getTime() - Date.now()) / 86400000))
        : 0,
      planCode: offlineSnapshot.subscription.planCode,
      autoRenew: offlineSnapshot.subscription.autoRenew,
      cancelledAt: null,
    },
    studyStreak: null,
  } : null);

  const showFreeLinks = effectiveProfile?.subscription.isPremium === false;
  const visibleDestinations = destinations.filter(item => showFreeLinks || !["/referrals", "/pricing"].includes(item.href));
  const current = visibleDestinations.find(item => pathname === item.href || pathname.startsWith(`${item.href}/`));

  if (!effectiveProfile) {
    if (isOffline) {
      return (
        <div className="shell section-space max-w-lg mx-auto text-center space-y-4">
          <h2 className="text-xl font-bold text-[#092E28]">Offline Study Space</h2>
          <p className="text-sm text-slate-600">
            Please connect to the internet once to set up your account and cache your study materials.
          </p>
        </div>
      );
    }
    return (
      <div className={styles.workspace}>
        <header className={styles.header}>
          <Link href="/dashboard" className={styles.brand}><BrandMark size={32}/> JAMBPrep</Link>
          <span className={styles.context}>Your study space</span>
        </header>
        <div id="study-content" tabIndex={-1} className={styles.content}>
          <ResourceStatus error={profile.error} retry={profile.retry} />
        </div>
      </div>
    );
  }

  const streak = effectiveProfile.studyStreak?.streak;

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
      <Link href="/dashboard" className={styles.brand}><BrandMark size={32}/> JAMBPrep</Link>
      <span className={styles.context}>{current?.label || 'Your study space'}</span>

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
      <nav
        ref={navRef}
        onScroll={handleNavScroll}
        aria-label="Study navigation"
        className={styles.navigation}
      >
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
    <NetworkStatusToast />
    <footer className={styles.footer}><p>JAMBPrep · Your subjects. Your pace. Your next step.</p><PolicyLinks className="mt-3 justify-center"/></footer>
  </div>;
}
