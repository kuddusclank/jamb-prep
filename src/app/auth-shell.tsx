import { BrandMark } from "@/components/brand-mark";
import Link from "@/components/pending-link";
import { ArrowLeft, ArrowUpRight, Check, Target } from "lucide-react";
import { PolicyLinks } from "@/components/legal-page";
import type { ReactNode } from "react";

export function AuthShell({ mode, children }: { mode: "login" | "register"; children: ReactNode }) {
  const registering = mode === "register";
  return <div className="min-h-screen bg-[#fafbf7]">
    <header className="shell flex min-h-24 items-center justify-between gap-4 py-4">
      <Link href="/" aria-label="JAMBPrep home" className="flex items-center gap-2 text-xl font-bold tracking-tight"><span className="flex size-9 items-center justify-center rounded-xl bg-[#116149] text-white"><BrandMark size={36}/></span>jambprep.</Link>
      <Link href={registering ? '/login' : '/register'} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-emerald-950/15 px-4 text-sm font-semibold">{registering ? 'Sign in' : 'Create account'}<ArrowUpRight size={15}/></Link>
    </header>
    <main className="shell grid items-start gap-10 pb-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-20">
      <aside className="relative hidden min-w-0 flex-col gap-10 self-start rounded-[2rem] bg-[#102f29] p-10 text-white lg:flex xl:p-12">
        <div className="entrance"><p className="text-[11px] font-semibold tracking-[.16em] text-[#e7b85a]">A LITTLE CLARITY GOES A LONG WAY</p><h2 className="mt-8 text-5xl leading-[1.12] font-medium tracking-tight">Your next chapter.<br/><span className="serif-accent text-[#e7b85a]">One topic at a time.</span></h2><p className="mt-6 max-w-sm leading-relaxed text-emerald-50/75">Make room for focused practice, a better understanding of your strengths, and a plan for what comes next.</p></div>
        <div className="entrance delay-2 rounded-2xl border border-white/15 bg-white/5 p-6"><div className="flex items-center justify-between"><p className="text-sm font-medium">A little structure for your study</p><Target size={18} className="text-[#e7b85a]"/></div><ol className="mt-6 space-y-5">{['Choose your four subjects','Set a target to work towards','Find the topics that need attention'].map((step,index) => <li key={step} className="flex items-center gap-3 text-sm text-emerald-50/90"><span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-white/20 text-xs text-[#e7b85a]">0{index+1}</span>{step}</li>)}</ol></div>
        <p className="flex items-center gap-2 text-xs text-emerald-50/70"><Check size={15}/>Your subjects. Your pace. Your next step.</p>
      </aside>
      <section className="entrance delay-1 flex min-w-0 flex-col self-start py-5 sm:py-10 lg:pr-8">
        <div className="mx-auto w-full max-w-md"><Link href="/" className="mb-8 inline-flex min-h-11 items-center gap-2 text-xs font-medium text-slate-500"><ArrowLeft size={14}/>Back to JAMBPrep</Link><p className="eyebrow">{registering ? 'MAKE IT YOURS' : 'WELCOME BACK'}</p><h1 className="mt-4 text-4xl leading-tight font-semibold tracking-[-.045em] sm:text-5xl">{registering ? 'A fresh start,' : 'Back to your'}<br/><span className="serif-accent text-[#116149]">{registering ? 'a clearer plan.' : 'next chapter.'}</span></h1><p className="mt-4 mb-8 text-sm leading-relaxed text-slate-600">{registering ? 'Create your student account. Next, we’ll help you choose your subjects and set your study target.' : 'Sign in to your account and pick up your preparation.'}</p>{children}<p className="mt-7 border-t border-emerald-950/10 pt-6 text-sm text-slate-600">{registering ? 'Already have an account?' : 'New to JAMBPrep?'}{' '}<Link href={registering ? '/login' : '/register'} className="font-semibold text-[#116149] underline decoration-emerald-800/30 underline-offset-4">{registering ? 'Sign in' : 'Create your account'}</Link></p>{registering && <p className="mt-5 text-xs leading-relaxed text-slate-500">No NIN or JAMB registration number needed. An account is required for all practice and exams.</p>}<PolicyLinks className="mt-6 text-xs text-slate-500"/></div>
      </section>
    </main><footer className="shell flex flex-col gap-4 pb-6 text-xs leading-relaxed text-slate-500 sm:flex-row sm:items-center sm:justify-between"><span>JAMBPrep · Independent UTME preparation. Not affiliated with JAMB.</span><PolicyLinks/></footer>
  </div>;
}
