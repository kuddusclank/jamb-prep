"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowRight, Check } from "lucide-react";

export function Reveal({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element || !('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        element.animate([{ opacity: 0.4, transform: 'translateY(16px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 450, easing: 'ease-out' });
        observer.disconnect();
      }
    }, { threshold: 0.12 });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return <div ref={ref} className={className}>{children}</div>;
}

const electives = ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'Economics', 'Government', 'Literature in English'];
export function SubjectPicker() {
  const [selected, setSelected] = useState<string[]>([]);
  return <div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><div className="flex min-h-20 items-center justify-between gap-3 rounded-xl bg-[#116149] p-5 text-white"><span className="font-medium">Use of English<small className="mt-1 block text-emerald-100">Always included</small></span><Check size={18}/></div>{electives.map(subject => { const active = selected.includes(subject); return <button type="button" key={subject} aria-pressed={active} disabled={!active && selected.length === 3} onClick={() => setSelected(current => active ? current.filter(s => s !== subject) : [...current, subject])} className={`flex min-h-20 items-center justify-between gap-3 rounded-xl border p-5 text-left text-sm font-medium transition-colors disabled:opacity-50 ${active ? 'border-emerald-700 bg-emerald-50' : 'border-slate-200 bg-white enabled:hover:border-emerald-700'}`}>{subject}<span className={`flex size-5 shrink-0 items-center justify-center rounded-full border ${active ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-slate-300'}`}>{active && <Check size={12}/>}</span></button>; })}</div><p role="status" className="mt-5 text-sm text-slate-600">{selected.length === 3 ? `Your preview combination: English, ${selected.join(', ')}.` : `${selected.length} of 3 electives selected. Choose three to preview your combination.`}</p><p className="mt-2 text-xs text-slate-500">Preview only. You’ll confirm your combination during onboarding when registration opens.</p></div>;
}

import Link from "@/components/pending-link";
import { useBrowserAccount } from "@/components/browser-account-boundary";

export function MobileMenu() {
  const account = useBrowserAccount();
  const user = account.identity?.user;
  const isPremium = false; // Entitlement-specific navigation is deferred to T08.
  const [open, setOpen] = useState(false);
  return (
    <div className="relative md:hidden">
      <button 
        type="button" 
        aria-expanded={open} 
        aria-controls="mobile-menu" 
        onClick={() => setOpen(!open)} 
        className="min-h-11 rounded-full border border-emerald-950/15 px-4 text-sm font-semibold"
      >
        {open ? 'Close' : 'Menu'}
      </button>
      {open && (
        <nav 
          id="mobile-menu" 
          aria-label="Mobile navigation" 
          className="absolute top-14 right-0 z-50 w-64 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl"
        >
          {user ? (
            <>
              <div className="border-b border-slate-100 pb-2 mb-2 px-3">
                <p className="text-xs text-slate-500">Signed in as</p>
                <div className="flex items-center justify-between gap-1 mt-0.5">
                  <p className="text-sm font-bold text-emerald-900 truncate">{user.displayName || user.email}</p>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                    isPremium ? "bg-[#116149] text-white" : "bg-slate-200 text-slate-700"
                  }`}>
                    {isPremium ? "PRO" : "FREE"}
                  </span>
                </div>
              </div>
              <Link 
                onClick={() => setOpen(false)} 
                href="/dashboard" 
                className="flex min-h-11 items-center justify-between rounded-lg px-3 text-sm font-semibold text-[#116149] hover:bg-emerald-50"
              >
                Dashboard <ArrowRight size={14}/>
              </Link>
              <Link 
                onClick={() => setOpen(false)} 
                href="/profile" 
                className="flex min-h-11 items-center justify-between rounded-lg px-3 text-sm hover:bg-emerald-50 font-medium"
              >
                Profile & Settings <ArrowRight size={14}/>
              </Link>
              <Link 
                onClick={() => setOpen(false)} 
                href="/practice" 
                className="flex min-h-11 items-center justify-between rounded-lg px-3 text-sm hover:bg-emerald-50"
              >
                Topic Practice <ArrowRight size={14}/>
              </Link>
              <Link 
                onClick={() => setOpen(false)} 
                href="/mock" 
                className="flex min-h-11 items-center justify-between rounded-lg px-3 text-sm hover:bg-emerald-50"
              >
                CBT Mock Exam <ArrowRight size={14}/>
              </Link>
              <Link 
                onClick={() => setOpen(false)} 
                href="/analytics" 
                className="flex min-h-11 items-center justify-between rounded-lg px-3 text-sm hover:bg-emerald-50"
              >
                Performance Coach <ArrowRight size={14}/>
              </Link>
              {!isPremium ? (
                <Link 
                  onClick={() => setOpen(false)} 
                  href="/pricing" 
                  className="flex min-h-11 items-center justify-between rounded-lg px-3 text-sm hover:bg-emerald-50 font-medium text-emerald-800"
                >
                  Plans <ArrowRight size={14}/>
                </Link>
              ) : (
                <Link 
                  onClick={() => setOpen(false)} 
                  href="/profile#subscription" 
                  className="flex min-h-11 items-center justify-between rounded-lg px-3 text-sm hover:bg-emerald-50 font-medium text-emerald-800"
                >
                  Manage Subscription <ArrowRight size={14}/>
                </Link>
              )}
              {!isPremium && (
                <Link 
                  onClick={() => setOpen(false)} 
                  href="/referrals" 
                  className="flex min-h-11 items-center justify-between rounded-lg px-3 text-sm text-amber-800 hover:bg-amber-50"
                >
                  Invite friends <ArrowRight size={14}/>
                </Link>
              )}
            </>
          ) : (
            <>
              {[
                ['How it works', '#how-it-works'],
                ['Subjects', '#subjects'],
                ['Pricing', '#pricing'],
                ['For Schools', '/schools'],
                ['Getting started', '#get-started'],
              ].map(([name, href]) => (
                <a 
                  key={href} 
                  onClick={() => setOpen(false)} 
                  href={href} 
                  className="flex min-h-11 items-center justify-between rounded-lg px-3 text-sm hover:bg-emerald-50"
                >
                  {name}<ArrowRight size={14}/>
                </a>
              ))}
              <div className="border-t border-slate-100 pt-2 mt-2">
                <Link 
                  onClick={() => setOpen(false)} 
                  href="/login" 
                  className="flex min-h-11 items-center justify-between rounded-lg px-3 text-sm font-semibold text-[#116149] hover:bg-emerald-50"
                >
                  Sign In <ArrowRight size={14}/>
                </Link>
                <Link 
                  onClick={() => setOpen(false)} 
                  href="/register" 
                  className="flex min-h-11 items-center justify-between rounded-lg px-3 text-sm font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 mt-1"
                >
                  Create Account <ArrowRight size={14}/>
                </Link>
              </div>
            </>
          )}
        </nav>
      )}
    </div>
  );
}

