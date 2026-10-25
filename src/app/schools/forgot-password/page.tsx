"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { PolicyLinks } from "@/components/legal-page";
import { createClient } from "@/lib/supabase/client";
import { BrowserAccountBoundary } from "@/components/browser-account-boundary";
import { 
  ArrowLeft, 
  ArrowUpRight, 
  Check, 
  Target, 
  ArrowRight, 
  ShieldCheck, 
  AlertCircle, 
  Loader2, 
  MailCheck 
} from "lucide-react";

function SchoolForgotPasswordForm() {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then((res: any) => {
      const session = res?.data?.session;
      if (session?.user) {
        const role = session.user.user_metadata?.role;
        if (role === "school_admin") {
          window.location.replace("/schools/dashboard");
        } else {
          window.location.replace("/dashboard");
        }
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsPending(true);

    const formData = new FormData(e.currentTarget);
    const cleanEmail = (formData.get("email") as string)?.trim().toLowerCase() || "";

    if (!cleanEmail || !cleanEmail.includes("@")) {
      setError("Please enter a valid administrator email address.");
      setIsPending(false);
      return;
    }

    try {
      const supabase = createClient();
      const redirectUrl = typeof window !== "undefined"
        ? `${window.location.origin}/schools/reset-password`
        : "https://jambprep.pages.dev/schools/reset-password";

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: redirectUrl,
      });

      if (resetError) {
        setError(resetError.message || "Unable to send password reset email.");
        setIsPending(false);
        return;
      }

      // Best-effort call to API endpoint if running on SSR
      try {
        await fetch("/api/schools/auth/forgot-password/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: cleanEmail }),
        });
      } catch {
        // Silent on static hosts
      }

      setSuccessMessage("Password reset instructions have been dispatched to your email address.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "A network error occurred. Please try again.");
    } finally {
      setIsPending(false);
    }
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
          href="/schools/login" 
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-emerald-950/15 px-4 text-sm font-semibold hover:bg-white transition"
        >
          Back to sign in <ArrowUpRight size={15} />
        </Link>
      </header>

      {/* Main 2-column grid matching student auth-shell */}
      <main className="shell grid items-start gap-10 pb-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-20">
        {/* Left Editorial Card matching AuthShell */}
        <aside className="relative hidden min-w-0 flex-col gap-10 self-start rounded-[2rem] bg-[#102f29] p-10 text-white lg:flex xl:p-12 shadow-xl">
          <div className="entrance">
            <p className="text-[11px] font-semibold tracking-[.16em] text-[#e7b85a]">
              INSTITUTIONAL SECURITY
            </p>
            <h2 className="mt-8 text-5xl leading-[1.12] font-medium tracking-tight">
              Protected access.<br />
              <span className="serif-accent text-[#e7b85a]">Instant recovery.</span>
            </h2>
            <p className="mt-6 max-w-sm leading-relaxed text-emerald-50/75">
              School administrative accounts safeguard sensitive candidate exam records, bursary payments, and bulk student credentials.
            </p>
          </div>

          <div className="entrance delay-2 rounded-2xl border border-white/15 bg-white/5 p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Recovery protocol</p>
              <Target size={18} className="text-[#e7b85a]" />
            </div>
            <ol className="mt-6 space-y-5">
              {[
                "Submit your registered institutional email address",
                "Receive a one-time cryptographic reset link in your inbox",
                "Set a new strong administrative password and resume cohort management"
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
            Candidate mock testing continues uninterrupted during credential resets.
          </p>
        </aside>

        {/* Right Form Section matching AuthShell */}
        <section className="entrance delay-1 flex min-w-0 flex-col self-start py-5 sm:py-8 lg:pr-8">
          <div className="mx-auto w-full max-w-md">
            <Link 
              href="/schools/login" 
              className="mb-8 inline-flex min-h-11 items-center gap-2 text-xs font-medium text-slate-500 hover:text-slate-800 transition"
            >
              <ArrowLeft size={14} /> Back to school sign in
            </Link>

            <p className="eyebrow">ADMINISTRATIVE RECOVERY</p>
            <h1 className="mt-4 text-4xl leading-tight font-semibold tracking-[-.045em] sm:text-5xl">
              Reset your<br />
              <span className="serif-accent text-[#116149]">portal password.</span>
            </h1>
            <p className="mt-4 mb-8 text-sm leading-relaxed text-slate-600">
              Enter your official school administrator email address and we will dispatch a secure recovery link.
            </p>

            {successMessage ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-6 text-center space-y-4">
                <div className="size-12 rounded-full bg-[#116149] text-white flex items-center justify-center mx-auto shadow-md">
                  <MailCheck size={24} />
                </div>
                <h3 className="text-xl font-bold text-[#092E28]">Check Your Inbox</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {successMessage}
                </p>
                <div className="pt-2">
                  <Link
                    href="/schools/login"
                    className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-emerald-800/20 bg-white px-5 text-xs font-semibold text-[#116149] shadow-xs hover:bg-emerald-50 transition"
                  >
                    Return to School Sign In <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-800 flex items-start gap-2.5">
                    <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-600" />
                    <span>{error}</span>
                  </div>
                )}

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
                    Official Admin Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    placeholder="admin@school.edu.ng"
                    className="w-full min-h-12 rounded-xl border border-slate-300 bg-white px-4 text-sm text-[#092E28] placeholder:text-slate-400 focus:border-[#116149] focus:ring-2 focus:ring-emerald-700/15 transition-colors"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isPending}
                    className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#116149] px-6 text-sm font-semibold text-white shadow-md hover:bg-[#0c4a37] disabled:opacity-50 transition cursor-pointer"
                  >
                    {isPending ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Dispatching Reset Link...
                      </>
                    ) : (
                      <>
                        Send Recovery Link <ArrowRight size={15} />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            <p className="mt-7 border-t border-emerald-950/10 pt-6 text-sm text-slate-600">
              Remembered your credentials?{" "}
              <Link 
                href="/schools/login" 
                className="font-semibold text-[#116149] underline decoration-emerald-800/30 underline-offset-4"
              >
                Sign in to school portal
              </Link>
            </p>
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

export default function SchoolForgotPasswordPage() {
  return (
    <BrowserAccountBoundary mode="auth">
      <SchoolForgotPasswordForm />
    </BrowserAccountBoundary>
  );
}
