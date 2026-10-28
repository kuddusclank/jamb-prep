"use client";

import { useApiResource } from "@/lib/api/use-api-resource";
import type { ProfileData } from "@/lib/api/app-dtos";
import { useBrowserAccount } from "@/components/browser-account-boundary";
import { BrandMark } from "@/components/brand-mark";
import { SyncStatusIndicator } from "./sync-status-indicator";
import { useEffect, useState, useRef, useCallback, type ReactNode } from "react";
import Link from "@/components/pending-link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Layers, Clock, ChartNoAxesCombined, Users, UserRound, CreditCard, LogOut, Flame, BookA, WifiOff, CheckCircle2, Sparkles } from "lucide-react";
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
  const account = useBrowserAccount();
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

  const currentUserId =
    profile.data?.profile?.id ||
    account.identity?.user?.id ||
    account.session.user?.id ||
    (typeof window !== "undefined" ? getOfflineProfile()?.userId : undefined);
  const offlineSnapshot = getOfflineProfile(currentUserId);
  const sessionFallbackUser = account.identity?.user || account.session.user;
  const effectiveProfile: ProfileData | null =
    profile.data ||
    (offlineSnapshot
      ? {
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
            isSchoolAttached: Boolean(offlineSnapshot.subscription.isSchoolAttached),
            school: offlineSnapshot.subscription.school ?? null,
          },
          studyStreak: null,
        }
      : sessionFallbackUser
      ? {
          profile: {
            id: sessionFallbackUser.id,
            display_name: sessionFallbackUser.displayName || "Student",
            email: sessionFallbackUser.email || "",
            role: account.identity?.user?.role || account.session.role || "student",
          },
          preferences: {
            target_score: 280,
            target_institution: null,
            target_course: null,
          },
          subscription: {
            isPremium: true,
            expiresAt: null,
            daysRemaining: 0,
            planCode: null,
            autoRenew: false,
            cancelledAt: null,
            isSchoolAttached: false,
            school: null,
          },
          studyStreak: null,
        }
      : null);

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

  const isOverviewActive = pathname === "/dashboard" || pathname === "/";
  const isPracticeActive = pathname === "/practice" || pathname.startsWith("/practice/");
  const isMockActive = pathname === "/mock" || pathname.startsWith("/mock/") || pathname.startsWith("/exam");
  const isDictionaryActive = pathname === "/dictionary" || pathname.startsWith("/dictionary/");
  const isAnalyticsActive = pathname === "/analytics" || pathname.startsWith("/analytics/");
  const isPremium = Boolean(effectiveProfile.subscription.isPremium);

  return <div className={styles.workspace}>
    <a href="#study-content" className="skip-link">Skip to study content</a>
    <header className={styles.header}>
      <Link href="/dashboard" className={styles.brand}><BrandMark size={32}/> JAMBPrep</Link>
      <span className={styles.context}>{current?.label || 'Your study space'}</span>

      <div className="ml-auto flex items-center gap-2">
        <SyncStatusIndicator />
        {!isPremium ? (
          <Link
            href="/pricing"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-[#116149] to-[#092E28] text-white border border-emerald-800 shadow-xs hover:brightness-110 transition active:scale-95"
            title="Upgrade to JAMBPrep Pro for unlimited practice and exams"
          >
            <Sparkles size={13} className="text-[#E7B85A]" />
            <span>Upgrade</span>
          </Link>
        ) : streak ? (
          <Link
            href="/profile#schedule"
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition hover:scale-105"
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
        ) : null}
      </div>
      <Link
        href="/profile"
        aria-label="Candidate profile"
        title="Candidate profile & preferences"
        className="inline-flex items-center justify-center gap-2 min-h-10 min-w-10 px-2.5 sm:px-3 border border-slate-200 rounded-xl text-sm text-slate-700 hover:bg-slate-50 transition"
      >
        <UserRound size={18} aria-hidden="true" className="text-slate-700" />
        <span className="hidden sm:inline font-medium">Account</span>
      </Link>
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
          const isLocked = isPro && effectiveProfile?.subscription?.isPremium === false;
          const isOfflineDisabled = !isOnline && requiresOnline;
          const targetHref = isLocked ? '/pricing' : (isOfflineDisabled ? '#' : href);
          const isSchoolAttached = Boolean(effectiveProfile?.subscription?.isSchoolAttached);
          const displayLabel = href === '/pricing' && isSchoolAttached ? 'School License' : label;
          const lockTitle = isSchoolAttached
            ? `${label} requires an active license from ${effectiveProfile?.subscription?.school?.schoolName || 'your school'} — click to view`
            : `${label} is a Pro feature — click to upgrade`;
          return (
            <Link
              key={href}
              href={targetHref}
              aria-current={current?.href === href ? 'page' : undefined}
              className={`${styles.navLink} ${isOfflineDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={isLocked ? lockTitle : (isOfflineDisabled ? `${label} requires an internet connection` : label)}
            >
              <Icon size={19} aria-hidden="true" />
              <span>{displayLabel}</span>
              {isLocked && (
                <span className="ml-auto text-[10px] font-extrabold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.5 rounded-sm">
                  {isSchoolAttached ? 'SCHOOL' : 'PRO'}
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

    {/* Mobile Edge-to-Edge Bottom Navigation Bar */}
    <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-0 bottom-0 z-40 lg:hidden bg-white border-t border-slate-200 pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_10px_rgba(0,0,0,0.03)]"
    >
      <div className="relative mx-auto flex h-16 max-w-lg items-center justify-between px-3">
        {/* 1. Overview */}
        <Link
          href="/dashboard"
          aria-current={isOverviewActive ? "page" : undefined}
          className={`flex flex-1 flex-col items-center justify-center py-1 transition-colors active:opacity-70 ${
            isOverviewActive ? "text-[#116149] font-semibold" : "text-slate-500 hover:text-slate-700 font-medium"
          }`}
        >
          <LayoutDashboard size={20} className={isOverviewActive ? "stroke-[2.2]" : "stroke-[1.75]"} />
          <span className="text-[10.5px] mt-1 tracking-tight">Overview</span>
        </Link>

        {/* 2. Practice */}
        <Link
          href="/practice"
          aria-current={isPracticeActive ? "page" : undefined}
          className={`flex flex-1 flex-col items-center justify-center py-1 transition-colors active:opacity-70 ${
            isPracticeActive ? "text-[#116149] font-semibold" : "text-slate-500 hover:text-slate-700 font-medium"
          }`}
        >
          <Layers size={20} className={isPracticeActive ? "stroke-[2.2]" : "stroke-[1.75]"} />
          <span className="text-[10.5px] mt-1 tracking-tight">Practice</span>
        </Link>

        {/* 3. Center Elevated Mock Button (In the circle, a bit bigger) */}
        <div className="flex flex-1 justify-center -my-3">
          <Link
            href={!isOnline ? "#" : "/mock"}
            aria-label="Mock CBT Exam"
            title={!isOnline ? "Mock exams require an active internet connection" : "Mock CBT Exam"}
            aria-current={isMockActive ? "page" : undefined}
            className={`flex size-14 -mt-6 items-center justify-center rounded-full bg-[#116149] text-white shadow-lg border-[3.5px] border-white transition active:scale-95 ${
              isMockActive ? "ring-2 ring-[#116149]/20" : ""
            } ${!isOnline ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <Clock size={25} className={isMockActive ? "text-[#E7B85A] stroke-[2.4]" : "text-white stroke-[2.2]"} />
          </Link>
        </div>

        {/* 4. Dictionary */}
        <Link
          href={!isPremium ? "/pricing" : "/dictionary"}
          aria-current={isDictionaryActive ? "page" : undefined}
          className={`flex flex-1 flex-col items-center justify-center py-1 transition-colors active:opacity-70 ${
            isDictionaryActive ? "text-[#116149] font-semibold" : "text-slate-500 hover:text-slate-700 font-medium"
          }`}
          title={!isPremium ? "Dictionary requires Pro — click to view plans" : "UTME Dictionary"}
        >
          <BookA size={20} className={isDictionaryActive ? "stroke-[2.2]" : "stroke-[1.75]"} />
          <span className="text-[10.5px] mt-1 tracking-tight">Dictionary</span>
        </Link>

        {/* 5. Performance */}
        <Link
          href={!isOnline ? "#" : "/analytics"}
          aria-current={isAnalyticsActive ? "page" : undefined}
          className={`flex flex-1 flex-col items-center justify-center py-1 transition-colors active:opacity-70 ${
            isAnalyticsActive ? "text-[#116149] font-semibold" : "text-slate-500 hover:text-slate-700 font-medium"
          } ${!isOnline ? "opacity-50 cursor-not-allowed" : ""}`}
          title={!isOnline ? "Performance analytics requires an internet connection" : "Performance"}
        >
          <ChartNoAxesCombined size={20} className={isAnalyticsActive ? "stroke-[2.2]" : "stroke-[1.75]"} />
          <span className="text-[10.5px] mt-1 tracking-tight">Performance</span>
        </Link>
      </div>
    </nav>

    <NetworkStatusToast />
    <footer className={styles.footer}><p>JAMBPrep · Your subjects. Your pace. Your next step.</p><PolicyLinks className="mt-3 justify-center"/></footer>
  </div>;
}
