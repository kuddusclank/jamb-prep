import Link from "next/link";
import type { ReactNode } from "react";

const policyLinks = [
  { href: "/privacy/", label: "Privacy Policy" },
  { href: "/terms/", label: "Terms and Conditions" },
  { href: "/refund-policy/", label: "Refund Policy" },
];

export function PolicyLinks({ className = "" }: { className?: string }) {
  return (
    <nav aria-label="Legal policies" className={`flex flex-wrap items-center gap-x-5 gap-y-2 ${className}`}>
      {policyLinks.map(({ href, label }) => (
        <Link key={href} href={href} className="underline decoration-current/30 underline-offset-4 hover:text-[#116149]">
          {label}
        </Link>
      ))}
    </nav>
  );
}

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F6F8F5] text-[#092E28]">
      <header className="border-b border-emerald-950/10 bg-white">
        <div className="shell flex min-h-16 items-center justify-between gap-4">
          <Link href="/" className="font-bold tracking-tight text-[#116149]">JAMBPrep</Link>
          <Link href="/" className="text-sm font-semibold text-slate-600 hover:text-[#116149]">Back to JAMBPrep</Link>
        </div>
      </header>
      <main className="shell max-w-4xl py-10 sm:py-16">
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10 lg:p-14">
          <p className="eyebrow">CLANK DYNAMICS SOLUTIONS · VABYTES SOLUTIONS</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
          <p className="mt-3 text-sm text-slate-500">Effective 16 October 2026</p>
          <div className="legal-copy mt-9 space-y-8 text-sm leading-7 text-slate-700 sm:text-base">
            {children}
          </div>
          <div className="mt-12 border-t border-slate-200 pt-6 text-sm text-slate-600">
            <PolicyLinks />
            <p className="mt-5">Questions? Email <a className="font-semibold text-[#116149] underline underline-offset-4" href="mailto:contact@clankdynamics.com">contact@clankdynamics.com</a>.</p>
          </div>
        </article>
      </main>
    </div>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold tracking-tight text-[#092E28]">{title}</h2>
      {children}
    </section>
  );
}
