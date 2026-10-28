"use client";

import { useApiResource } from "@/lib/api/use-api-resource";
import type { ProfileData } from "@/lib/api/app-dtos";
import { useBrowserAccount } from "@/components/browser-account-boundary";
import { BrandMark } from "@/components/brand-mark";
import { SyncStatusIndicator } from "./sync-status-indicator";
import { useEffect, useState, useRef, useCallback, type ReactNode } from "react";
import Link from "@/components/pending-link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Layers, Clock, ChartNoAxesCombined, Users, UserRound, CreditCard, LogOut, Flame, BookA, WifiOff, CheckCircle2, Sparkles, X } from "lucide-react";
import { signOutAction } from "@/lib/client-actions";
import { purgeAllActorOfflineData } from "@/lib/offline/idb-storage";
import { flushPendingSync, ensureWeeklyPackDownloaded } from "@/lib/offline/weekly-pack-client";
import styles from "./study-workspace.module.css";
import { PolicyLinks } from "@/components/legal-page";
import { ResourceStatus } from "@/lib/api/use-api-resource";
import { useNetworkStatus, isNetworkOrTimeoutError } from "@/lib/offline/network-state";
import { getOfflineProfile } from "@/lib/offline/offline-profile-cache";
import { NetworkStatusToast } from "@/components/network-status-toast";
import { useWorkspaceFocus } from "./study-workspace-context";

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
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    setPendingHref(null);
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

  const normalizedPath = pathname ? pathname.replace(/\/+$/, "") || "/" : "/";
  const normalizedPendingHref = pendingHref ? pendingHref.replace(/\/+$/, "") || "/" : null;

  const showFreeLinks = effectiveProfile?.subscription.isPremium === false;
  const visibleDestinations = destinations.filter(item => showFreeLinks || !["/referrals", "/pricing"].includes(item.href));
  const current = visibleDestinations.find(item => normalizedPath === item.href || normalizedPath.startsWith(`${item.href}/`));

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

  const isOverviewActive = normalizedPath === "/dashboard" || normalizedPath === "/";
  const isPracticeActive = normalizedPath === "/practice" || normalizedPath.startsWith("/practice/");
  const isMockActive = normalizedPath === "/mock" || normalizedPath.startsWith("/mock/") || normalizedPath.startsWith("/exam");
  const isDictionaryActive = normalizedPath === "/dictionary" || normalizedPath.startsWith("/dictionary/");
  const isAnalyticsActive = normalizedPath === "/analytics" || normalizedPath.startsWith("/analytics/");
  const isProfileActive = normalizedPath === "/profile" || normalizedPath.startsWith("/profile/");
  const isPremium = Boolean(effectiveProfile.subscription.isPremium);
  const { isFocusMode, onQuit } = useWorkspaceFocus();

  const isOverviewSelected = isOverviewActive || normalizedPendingHref === "/dashboard";
  const isPracticeSelected = isPracticeActive || normalizedPendingHref === "/practice";
  const isMockSelected = isMockActive || normalizedPendingHref === "/mock";
  const isDictionarySelected = isDictionaryActive || normalizedPendingHref === "/dictionary";
  const isAnalyticsSelected = isAnalyticsActive || normalizedPendingHref === "/analytics";

  return <div className={`${styles.workspace} ${isFocusMode ? styles.workspaceFocused : ''}`}>
    <a href="#study-content" className="skip-link">Skip to study content</a>
    <header className={styles.header}>
      <Link href="/dashboard" className={styles.brand}><BrandMark size={32}/> JAMBPrep</Link>
      <span className={styles.context}>{isFocusMode ? 'Practice Session' : (current?.label || 'Your study space')}</span>

      <div className="ml-auto flex items-center gap-2">
        <SyncStatusIndicator />
        {isFocusMode ? (
          <>
            {/* When in practice focus mode on mobile: replace streak and profile with Quit */}
            {onQuit && (
              <button
                type="button"
                onClick={onQuit}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition active:scale-95 cursor-pointer shrink-0"
                title="Quit practice session"
                aria-label="Quit practice session"
              >
                <X size={14} className="stroke-[2.5]" />
                <span>Quit</span>
              </button>
            )}
            <div className="hidden sm:flex items-center gap-2">
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
              <Link
                href="/profile"
                aria-label="Candidate profile"
                title="Candidate profile & preferences"
                className={`inline-flex items-center justify-center gap-2 min-h-10 min-w-10 px-2.5 sm:px-3 border rounded-xl text-sm transition ${
                  isProfileActive
                    ? "border-[#116149] bg-emerald-50 text-[#116149] ring-2 ring-[#116149]/20 font-bold"
                    : "border-slate-200 text-slate-700 hover:bg-slate-50 font-medium"
                }`}
              >
                <UserRound size={18} aria-hidden="true" className={isProfileActive ? "text-[#116149]" : "text-slate-700"} />
                <span>Account</span>
              </Link>
            </div>
          </>
        ) : (
          <>
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
            <Link
              href="/profile"
              aria-label="Candidate profile"
              title="Candidate profile & preferences"
              className={`inline-flex items-center justify-center gap-2 min-h-10 min-w-10 px-2.5 sm:px-3 border rounded-xl text-sm transition ${
                isProfileActive
                  ? "border-[#116149] bg-emerald-50 text-[#116149] ring-2 ring-[#116149]/20 font-bold"
                  : "border-slate-200 text-slate-700 hover:bg-slate-50 font-medium"
              }`}
            >
              <UserRound size={18} aria-hidden="true" className={isProfileActive ? "text-[#116149]" : "text-slate-700"} />
              <span className="hidden sm:inline">Account</span>
            </Link>
          </>
        )}
      </div>
    </header>
    {!isFocusMode && (
      <aside className={styles.sidebar}>
        <p className={styles.caption}>YOUR STUDY SPACE</p>
        <nav
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
            const isSelected = (current?.href === href) || (pendingHref === targetHref) || (normalizedPendingHref === href);
            return (
              <Link
                key={href}
                href={targetHref}
                prefetch={true}
                aria-current={isSelected ? 'page' : undefined}
                onClick={() => {
                  if (!isOfflineDisabled && targetHref !== '#') {
                    setPendingHref(targetHref);
                  }
                }}
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
    )}
    <div id="study-content" tabIndex={-1} className={styles.content}>{children}</div>

    {/* Mobile Edge-to-Edge Bottom Navigation Bar */}
    {!isFocusMode && (
      <nav
        aria-label="Mobile navigation"
        className="fixed inset-x-0 bottom-0 z-40 lg:hidden bg-white/95 backdrop-blur-md border-t border-slate-200/90 pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_12px_rgba(0,0,0,0.04)]"
      >
        <div className="mx-auto flex h-16 max-w-lg items-center justify-around px-2">
          {/* 1. Overview */}
          <Link
            href="/dashboard"
            prefetch={true}
            onClick={() => setPendingHref("/dashboard")}
            aria-current={isOverviewSelected ? "page" : undefined}
            className="flex flex-1 flex-col items-center justify-center py-1 transition active:scale-95 cursor-pointer"
          >
            <span
              className={`flex items-center justify-center px-3.5 py-1 rounded-full transition-colors ${
                isOverviewSelected
                  ? "bg-emerald-100 text-[#116149] ring-1 ring-[#116149]/20"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <LayoutDashboard size={20} className={isOverviewSelected ? "stroke-[2.3]" : "stroke-[1.8]"} />
            </span>
            <span
              className={`text-[10.5px] mt-0.5 tracking-tight transition-colors ${
                isOverviewSelected ? "font-bold text-[#116149]" : "font-medium text-slate-500"
              }`}
            >
              Overview
            </span>
          </Link>

          {/* 2. Practice */}
          <Link
            href="/practice"
            prefetch={true}
            onClick={() => setPendingHref("/practice")}
            aria-current={isPracticeSelected ? "page" : undefined}
            className="flex flex-1 flex-col items-center justify-center py-1 transition active:scale-95 cursor-pointer"
          >
            <span
              className={`flex items-center justify-center px-3.5 py-1 rounded-full transition-colors ${
                isPracticeSelected
                  ? "bg-emerald-100 text-[#116149] ring-1 ring-[#116149]/20"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Layers size={20} className={isPracticeSelected ? "stroke-[2.3]" : "stroke-[1.8]"} />
            </span>
            <span
              className={`text-[10.5px] mt-0.5 tracking-tight transition-colors ${
                isPracticeSelected ? "font-bold text-[#116149]" : "font-medium text-slate-500"
              }`}
            >
              Practice
            </span>
          </Link>

          {/* 3. Mock CBT Exam */}
          <Link
            href={!isOnline ? "#" : "/mock"}
            prefetch={true}
            onClick={() => { if (isOnline) setPendingHref("/mock"); }}
            aria-label="Mock CBT Exam"
            title={!isOnline ? "Mock exams require an active internet connection" : "Mock CBT Exam"}
            aria-current={isMockSelected ? "page" : undefined}
            className={`flex flex-1 flex-col items-center justify-center py-1 transition active:scale-95 ${
              !isOnline ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
            }`}
          >
            <span
              className={`flex items-center justify-center px-3.5 py-1 rounded-full transition-colors ${
                isMockSelected
                  ? "bg-emerald-100 text-[#116149] ring-1 ring-[#116149]/20"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Clock size={20} className={isMockSelected ? "stroke-[2.3]" : "stroke-[1.8]"} />
            </span>
            <span
              className={`text-[10.5px] mt-0.5 tracking-tight transition-colors ${
                isMockSelected ? "font-bold text-[#116149]" : "font-medium text-slate-500"
              }`}
            >
              Mock
            </span>
          </Link>

          {/* 4. Dictionary */}
          <Link
            href={!isPremium ? "/pricing" : "/dictionary"}
            prefetch={true}
            onClick={() => setPendingHref(!isPremium ? "/pricing" : "/dictionary")}
            aria-current={isDictionarySelected ? "page" : undefined}
            className="flex flex-1 flex-col items-center justify-center py-1 transition active:scale-95 cursor-pointer"
            title={!isPremium ? "Dictionary requires Pro — click to view plans" : "UTME Dictionary"}
          >
            <span
              className={`flex items-center justify-center px-3.5 py-1 rounded-full transition-colors ${
                isDictionarySelected
                  ? "bg-emerald-100 text-[#116149] ring-1 ring-[#116149]/20"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <BookA size={20} className={isDictionarySelected ? "stroke-[2.3]" : "stroke-[1.8]"} />
            </span>
            <span
              className={`text-[10.5px] mt-0.5 tracking-tight transition-colors ${
                isDictionarySelected ? "font-bold text-[#116149]" : "font-medium text-slate-500"
              }`}
            >
              Dictionary
            </span>
          </Link>

          {/* 5. Performance */}
          <Link
            href={!isOnline ? "#" : "/analytics"}
            prefetch={true}
            onClick={() => { if (isOnline) setPendingHref("/analytics"); }}
            aria-current={isAnalyticsSelected ? "page" : undefined}
            className={`flex flex-1 flex-col items-center justify-center py-1 transition active:scale-95 ${
              !isOnline ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
            }`}
            title={!isOnline ? "Performance analytics requires an internet connection" : "Performance"}
          >
            <span
              className={`flex items-center justify-center px-3.5 py-1 rounded-full transition-colors ${
                isAnalyticsSelected
                  ? "bg-emerald-100 text-[#116149] ring-1 ring-[#116149]/20"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <ChartNoAxesCombined size={20} className={isAnalyticsSelected ? "stroke-[2.3]" : "stroke-[1.8]"} />
            </span>
            <span
              className={`text-[10.5px] mt-0.5 tracking-tight transition-colors ${
                isAnalyticsSelected ? "font-bold text-[#116149]" : "font-medium text-slate-500"
              }`}
            >
              Performance
            </span>
          </Link>
        </div>
      </nav>
    )}

    <NetworkStatusToast />
    {!isPracticeActive && (
      <footer className={styles.footer}><p>JAMBPrep · Your subjects. Your pace. Your next step.</p><PolicyLinks className="mt-3 justify-center"/></footer>
    )}
  </div>;
}
