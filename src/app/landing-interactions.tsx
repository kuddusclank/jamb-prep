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

export function MobileMenu() {
 const [open, setOpen] = useState(false);
 return <div className="relative md:hidden"><button type="button" aria-expanded={open} aria-controls="mobile-menu" onClick={() => setOpen(!open)} className="min-h-11 rounded-full border border-emerald-950/15 px-4 text-sm">{open ? 'Close' : 'Menu'}</button>{open && <nav id="mobile-menu" aria-label="Mobile navigation" className="absolute top-14 right-0 z-50 w-56 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">{[['How it works','how-it-works'],['Subjects','subjects'],['Pricing','pricing'],['Getting started','get-started']].map(([name,id]) => <a key={id} onClick={() => setOpen(false)} href={`#${id}`} className="flex min-h-12 items-center justify-between rounded-lg px-3 text-sm hover:bg-emerald-50">{name}<ArrowRight size={14}/></a>)}</nav>}</div>;
}
