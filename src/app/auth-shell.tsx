import { BrandMark } from "@/components/brand-mark";
import Link from "@/components/pending-link";
import { ArrowLeft, ArrowUpRight, Check, Target } from "lucide-react";
import { PolicyLinks } from "@/components/legal-page";
import type { ReactNode } from "react";

export function AuthShell({ mode, children }: { mode: "login" | "register"; children: ReactNode }) {
  const registering = mode === "register";
  return (
    <div className="min-h-screen bg-[#fafbf7] text-[#092E28] lg:h-screen lg:overflow-hidden lg:flex lg:flex-col">
      <header className="shell flex min-h-20 sm:min-h-24 items-center justify-between gap-4 py-4 shrink-0">
        <Link href="/" aria-label="JAMBPrep home" className="flex items-center gap-2 text-xl font-bold tracking-tight">
          <span className="flex size-9 items-center justify-center rounded-xl bg-[#116149] text-white">
            <BrandMark size={36} />
          </span>
          JAMBPrep
        </Link>
        <Link
          href={registering ? "/login" : "/register"}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-emerald-950/15 px-4 text-sm font-semibold hover:bg-white transition"
        >
          {registering ? "Sign in" : "Create account"}
          <ArrowUpRight size={15} />
        </Link>
      </header>

      <main className="shell grid items-start gap-10 pb-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16 xl:gap-20 lg:flex-1 lg:min-h-0 lg:pb-4">
        <aside className="relative hidden min-w-0 flex-col justify-between self-stretch rounded-[2rem] bg-[#102f29] p-8 text-white lg:flex xl:p-10 shadow-xl overflow-hidden shrink-0">
          <div className="entrance">
            <p className="text-[11px] font-semibold tracking-[.16em] text-[#e7b85a]">
              A LITTLE CLARITY GOES A LONG WAY
            </p>
            <h2 className="mt-6 text-4xl xl:text-5xl leading-[1.12] font-medium tracking-tight">
              Your next chapter.<br />
              <span className="serif-accent text-[#e7b85a]">One topic at a time.</span>
            </h2>
            <p className="mt-4 max-w-sm leading-relaxed text-sm text-emerald-50/75">
              Make room for focused practice, a better understanding of your strengths, and a plan for what comes next.
            </p>
          </div>

          <div className="entrance delay-2 rounded-2xl border border-white/15 bg-white/5 p-5 my-auto">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">A little structure for your study</p>
              <Target size={18} className="text-[#e7b85a]" />
            </div>
            <ol className="mt-4 space-y-4">
              {[
                "Choose your four subjects",
                "Set a target to work towards",
                "Find the topics that need attention",
              ].map((step, index) => (
                <li key={step} className="flex items-center gap-3 text-xs sm:text-sm text-emerald-50/90">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-white/20 text-xs text-[#e7b85a]">
                    0{index + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>

          <p className="flex items-center gap-2 text-xs text-emerald-50/70 pt-2">
            <Check size={15} />
            Your subjects. Your pace. Your next step.
          </p>
        </aside>

        <section className="entrance delay-1 flex min-w-0 flex-col self-stretch py-2 sm:py-4 lg:pr-6 lg:overflow-y-auto lg:max-h-full scrollbar-thin">
          <div className="mx-auto w-full max-w-md pb-6">
            <Link
              href="/"
              className="mb-8 inline-flex min-h-11 items-center gap-2 text-xs font-medium text-slate-500 hover:text-slate-800 transition"
            >
              <ArrowLeft size={14} />
              Back to JAMBPrep
            </Link>
            <p className="eyebrow">{registering ? "MAKE IT YOURS" : "WELCOME BACK"}</p>
            <h1 className="mt-4 text-4xl leading-tight font-semibold tracking-[-.045em] sm:text-5xl">
              {registering ? "A fresh start," : "Back to your"}<br />
              <span className="serif-accent text-[#116149]">
                {registering ? "a clearer plan." : "next chapter."}
              </span>
            </h1>
            <p className="mt-4 mb-8 text-sm leading-relaxed text-slate-600">
              {registering
                ? "Create your student account. Next, we’ll help you choose your subjects and set your study target."
                : "Sign in to your account and pick up your preparation."}
            </p>
            {children}
            <p className="mt-7 border-t border-emerald-950/10 pt-6 text-sm text-slate-600">
              {registering ? "Already have an account?" : "New to JAMBPrep?"}{" "}
              <Link
                href={registering ? "/login" : "/register"}
                className="font-semibold text-[#116149] underline decoration-emerald-800/30 underline-offset-4"
              >
                {registering ? "Sign in" : "Create your account"}
              </Link>
            </p>
            {registering && (
              <p className="mt-5 text-xs leading-relaxed text-slate-500">
                No NIN or JAMB registration number needed. An account is required for all practice and exams.
              </p>
            )}
          </div>
        </section>
      </main>

      <footer className="shell flex flex-col gap-4 py-3 text-xs leading-relaxed text-slate-500 sm:flex-row sm:items-center sm:justify-between shrink-0">
        <span>JAMBPrep · Independent UTME preparation.</span>
        <PolicyLinks />
      </footer>
    </div>
  );
}
