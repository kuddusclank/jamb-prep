"use client";

import type { ReactNode } from "react";
import Link from "@/components/pending-link";
import { usePathname } from "next/navigation";
import { BookOpen, LayoutDashboard, Layers, Clock, ChartNoAxesCombined, Users, UserRound, CreditCard, LogOut } from "lucide-react";
import { signOutAction } from "@/lib/client-actions";
import styles from "./study-workspace.module.css";

const destinations = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/practice', label: 'Practice', icon: Layers },
  { href: '/mock', label: 'Mock exams', icon: Clock },
  { href: '/analytics', label: 'Performance', icon: ChartNoAxesCombined },
  { href: '/referrals', label: 'Invite friends', icon: Users },
  { href: '/profile', label: 'My profile', icon: UserRound },
  { href: '/pricing', label: 'Plans', icon: CreditCard },
];

export function StudyWorkspaceClient({ children, isPremium }: { children: ReactNode; isPremium: boolean }) {
  const pathname = usePathname();
  const visibleDestinations = destinations.filter(item => !isPremium || !["/referrals", "/pricing"].includes(item.href));
  const current = visibleDestinations.find(item => pathname === item.href || pathname.startsWith(`${item.href}/`));
  return <div className={styles.workspace}>
    <a href="#study-content" className="skip-link">Skip to study content</a>
    <header className={styles.header}>
      <Link href="/dashboard" className={styles.brand}><BookOpen size={24} aria-hidden="true" /> jambprep.</Link>
      <span className={styles.context}>{current?.label || 'Your study space'}</span>
      <Link href="/profile" className={styles.account}><UserRound size={18} aria-hidden="true" /><span>Account</span></Link>
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
    <footer className={styles.footer}>JAMBPrep · Your subjects. Your pace. Your next step.</footer>
  </div>;
}
