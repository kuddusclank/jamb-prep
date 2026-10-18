"use client";

import { useApiResource } from "@/lib/api/use-api-resource";
import type { ProfileData } from "@/lib/api/app-dtos";
import { BrandMark } from "@/components/brand-mark";
import type { ReactNode } from "react";
import Link from "@/components/pending-link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Layers, Clock, ChartNoAxesCombined, Users, UserRound, CreditCard, LogOut, Flame } from "lucide-react";
import { signOutAction } from "@/lib/client-actions";
import styles from "./study-workspace.module.css";
import { PolicyLinks } from "@/components/legal-page";
import { ResourceStatus } from "@/lib/api/use-api-resource";

const destinations = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/practice', label: 'Practice', icon: Layers },
  { href: '/mock', label: 'Mock exams', icon: Clock },
  { href: '/analytics', label: 'Performance', icon: ChartNoAxesCombined },
  { href: '/referrals', label: 'Invite friends', icon: Users },
  { href: '/profile', label: 'My profile', icon: UserRound },
  { href: '/pricing', label: 'Plans', icon: CreditCard },
];

export function StudyWorkspaceClient({ children }: { children: ReactNode }) {
  const profile = useApiResource<ProfileData>("/api/v1/profile");
  const showFreeLinks = profile.data?.subscription.isPremium === false;
  const pathname = usePathname();
  const visibleDestinations = destinations.filter(item => showFreeLinks || !["/referrals", "/pricing"].includes(item.href));
  const current = visibleDestinations.find(item => pathname === item.href || pathname.startsWith(`${item.href}/`));
  if (!profile.data) return <ResourceStatus error={profile.error} retry={profile.retry} />;
  const streak = profile.data.studyStreak?.streak;
  return <div className={styles.workspace}>
    <a href="#study-content" className="skip-link">Skip to study content</a>
    <header className={styles.header}>
      <Link href="/dashboard" className={styles.brand}><BrandMark size={32}/> jambprep.</Link>
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
      <form action={signOutAction} className={styles.mobileSignout}><button type="submit" aria-label="Sign out" title="Sign out"><LogOut size={18} aria-hidden="true" /></button></form>
    </header>
    <aside className={styles.sidebar}>
      <p className={styles.caption}>YOUR STUDY SPACE</p>
      <nav aria-label="Study navigation" className={styles.navigation}>
        {visibleDestinations.map(({ href, label, icon: Icon }) => <Link key={href} href={href} aria-current={current?.href === href ? 'page' : undefined} className={styles.navLink}><Icon size={19} aria-hidden="true" /><span>{label}</span></Link>)}
      </nav>
      <div className={styles.sidebarFooter}>
        <p>A little progress, every day.</p>
        <form action={signOutAction}><button type="submit" className={styles.signout}><LogOut size={17} aria-hidden="true" />Sign out</button></form>
      </div>
    </aside>
    <div id="study-content" tabIndex={-1} className={styles.content}>{children}</div>
    <footer className={styles.footer}><p>JAMBPrep · Your subjects. Your pace. Your next step.</p><PolicyLinks className="mt-3 justify-center"/></footer>
  </div>;
}
