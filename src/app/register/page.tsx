import Link from "next/link";
import { BookOpen, CheckCircle2 } from "lucide-react";
import { RegisterForm } from "./register-form";

export const metadata = {
  title: "Create Your Free Account — JAMBPrep",
  description: "Join JAMBPrep to unlock your free diagnostic UTME mock, daily practice questions, and personalized study roadmap.",
};

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#F6F8F5] text-[#092E28]">
      {/* Simple Top Bar */}
      <header className="shell py-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-[#116149] text-white">
            <BookOpen size={18} />
          </span>
          <span className="text-lg font-bold tracking-tight">
            jamb<span className="text-[#116149]">prep</span>.
          </span>
        </Link>
        <Link
          href="/login"
          className="text-xs font-semibold text-[#116149] hover:underline"
        >
          Already registered? Sign in →
        </Link>
      </header>

      {/* Main Content */}
      <main className="shell flex-1 flex items-center justify-center py-8">
        <div className="w-full max-w-4xl grid lg:grid-cols-12 gap-8 items-center">
          {/* Left Benefits Column */}
          <div className="lg:col-span-5 space-y-5">
            <span className="inline-block rounded-full bg-emerald-100/80 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#116149]">
              Free Diagnostic Included
            </span>
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight leading-tight">
              Start your journey to <span className="serif-accent text-[#116149]">280+ in UTME.</span>
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              Set up your 4 JAMB subjects in 60 seconds and take a realistic 180-question diagnostic mock to uncover your exact weak topics.
            </p>

            <ul className="space-y-3 pt-2 text-xs sm:text-sm text-slate-700">
              <li className="flex items-center gap-2.5">
                <CheckCircle2 size={16} className="text-[#116149] shrink-0" />
                <span><strong>15 free practice questions</strong> every day</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 size={16} className="text-[#116149] shrink-0" />
                <span><strong>1 full 180-question</strong> diagnostic CBT simulation</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 size={16} className="text-[#116149] shrink-0" />
                <span><strong>8-key desktop CBT hotkeys</strong> (A, B, C, D, P, N, R, S)</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 size={16} className="text-[#116149] shrink-0" />
                <span><strong>Refer 2 friends</strong> for 50% off your first month (₦500)</span>
              </li>
            </ul>
          </div>

          {/* Right Form Card */}
          <div className="lg:col-span-7 rounded-3xl border border-emerald-950/10 bg-white p-6 sm:p-9 shadow-xl shadow-emerald-950/5">
            <div className="mb-6">
              <h2 className="text-xl font-semibold tracking-tight">
                Create your candidate profile
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Enter your details below to configure your subjects.
              </p>
            </div>

            <RegisterForm />

            <div className="mt-6 pt-5 border-t border-slate-100 text-center text-xs text-slate-600">
              Already have an account?{" "}
              <Link href="/login" className="font-semibold text-[#116149] hover:underline">
                Log in here
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Simple Footer */}
      <footer className="shell py-6 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} JAMBPrep Nigeria · Built for 250+ UTME Candidates
      </footer>
    </div>
  );
}
