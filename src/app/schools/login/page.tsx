"use client";

import { useState } from "react";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { PolicyLinks } from "@/components/legal-page";
import { 
  ArrowLeft, 
  ArrowUpRight, 
  Check, 
  Target, 
  ArrowRight,
  Eye, 
  EyeOff 
} from "lucide-react";

export default function SchoolLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Prepared for stage 3 portal connection
    setTimeout(() => {
      setLoading(false);
      window.location.href = "/schools/dashboard";
    }, 600);
  };

  return (
    <div className="min-h-screen bg-[#fafbf7] text-[#092E28]">
      {/* Header matching student auth-shell */}
      <header className="shell flex min-h-24 items-center justify-between gap-4 py-4">
        <Link 
          href="/schools" 
          aria-label="JAMBPrep schools home" 
          className="flex items-center gap-2 text-xl font-bold tracking-tight"
        >
          <span className="flex size-9 items-center justify-center rounded-xl bg-[#116149] text-white">
            <BrandMark size={36} />
          </span>
          <span>JAMBPrep</span>
          <span className="ml-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-[#116149]">
            For Schools
          </span>
        </Link>
        <Link 
          href="/schools/register" 
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-emerald-950/15 px-4 text-sm font-semibold hover:bg-white transition"
        >
          Register new school <ArrowUpRight size={15} />
        </Link>
      </header>

      {/* Main 2-column grid matching student auth-shell */}
      <main className="shell grid items-start gap-10 pb-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-20">
        {/* Left Editorial Card matching AuthShell */}
        <aside className="relative hidden min-w-0 flex-col gap-10 self-start rounded-[2rem] bg-[#102f29] p-10 text-white lg:flex xl:p-12 shadow-xl">
          <div className="entrance">
            <p className="text-[11px] font-semibold tracking-[.16em] text-[#e7b85a]">
              SCHOOL ADMINISTRATIVE PORTAL
            </p>
            <h2 className="mt-8 text-5xl leading-[1.12] font-medium tracking-tight">
              Real-time insight.<br />
              <span className="serif-accent text-[#e7b85a]">Measurable pass rates.</span>
            </h2>
            <p className="mt-6 max-w-sm leading-relaxed text-emerald-50/75">
              Access your school dashboard, inspect student study streaks, schedule batch lab mocks, and analyze topic accuracy heatmaps.
            </p>
          </div>

          <div className="entrance delay-2 rounded-2xl border border-white/15 bg-white/5 p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Administrator privileges</p>
              <Target size={18} className="text-[#e7b85a]" />
            </div>
            <ol className="mt-6 space-y-5">
              {[
                "Bulk student CSV import and instant credentials",
                "Synchronized 120-minute computer lab simulation controls",
                "Teacher syllabus diagnostic heatmaps and remedial flags"
              ].map((step, index) => (
                <li key={step} className="flex items-center gap-3 text-sm text-emerald-50/90">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-white/20 text-xs text-[#e7b85a]">
                    0{index + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>

          <p className="flex items-center gap-2 text-xs text-emerald-50/70">
            <Check size={15} />
            Secure institutional encryption with role-based access.
          </p>
        </aside>

        {/* Right Form Section matching AuthShell */}
        <section className="entrance delay-1 flex min-w-0 flex-col self-start py-5 sm:py-8 lg:pr-8">
          <div className="mx-auto w-full max-w-md">
            <Link 
              href="/schools" 
              className="mb-8 inline-flex min-h-11 items-center gap-2 text-xs font-medium text-slate-500 hover:text-slate-800 transition"
            >
              <ArrowLeft size={14} /> Back to schools overview
            </Link>

            <p className="eyebrow">INSTITUTIONAL ACCESS</p>
            <h1 className="mt-4 text-4xl leading-tight font-semibold tracking-[-.045em] sm:text-5xl">
              Welcome back,<br />
              <span className="serif-accent text-[#116149]">School Portal.</span>
            </h1>
            <p className="mt-4 mb-8 text-sm leading-relaxed text-slate-600">
              Sign in with your administrator or exam officer email and password to manage your cohort.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Official Admin Email
                </label>
                <input
                  type="email"
                  required
                  placeholder="admin@school.edu.ng"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full min-h-12 rounded-xl border border-slate-300 bg-white px-4 text-sm text-[#092E28] placeholder:text-slate-400 focus:border-[#116149] focus:ring-2 focus:ring-emerald-700/15 transition-colors"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-slate-700">
                    Administrative Password
                  </label>
                  <a
                    href="#forgot"
                    onClick={(e) => {
                      e.preventDefault();
                      alert("Password reset instructions have been forwarded to your institutional domain administrator.");
                    }}
                    className="text-xs font-medium text-[#116149] hover:underline"
                  >
                    Forgot password?
                  </a>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="Enter administrative password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full min-h-12 rounded-xl border border-slate-300 bg-white pl-4 pr-11 text-sm text-[#092E28] placeholder:text-slate-400 focus:border-[#116149] focus:ring-2 focus:ring-emerald-700/15 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 flex size-9 items-center justify-center text-slate-400 hover:text-slate-700 transition"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#116149] px-6 text-sm font-semibold text-white shadow-md hover:bg-[#0c4a37] disabled:opacity-50 transition cursor-pointer"
                >
                  {loading ? "Signing in..." : "Sign In to School Portal"}
                  {!loading && <ArrowRight size={15} />}
                </button>
              </div>
            </form>

            <p className="mt-7 border-t border-emerald-950/10 pt-6 text-sm text-slate-600">
              New to JAMBPrep for Schools?{" "}
              <Link 
                href="/schools/register" 
                className="font-semibold text-[#116149] underline decoration-emerald-800/30 underline-offset-4"
              >
                Register your institution
              </Link>
            </p>

            <PolicyLinks className="mt-6 text-xs text-slate-500" />
          </div>
        </section>
      </main>

      {/* Footer matching student auth-shell */}
      <footer className="shell flex flex-col gap-4 pb-6 text-xs leading-relaxed text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <span>JAMBPrep for Schools · Institutional UTME examination & diagnostics platform.</span>
        <PolicyLinks />
      </footer>
    </div>
  );
}
