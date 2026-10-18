"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { getAccountCoordinator } from "@/lib/auth/account-coordinator";
import { presentSignInError } from "@/lib/auth/sign-in-error";
import { ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react";

function LoginFormContent() {
  const searchParams = useSearchParams();
  const queryError = searchParams.get("error");
  const queryMessage = searchParams.get("message");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setError("Please enter both your email address and password.");
      return;
    }

    setError(null);
    setIsPending(true);

    try {
      const coordinator = getAccountCoordinator();
      coordinator.clear();
      const result = await coordinator.manager.signInWithPassword({ email: cleanEmail, password });
      if (result.error || result.state.status !== 'authenticated') {
        setError(presentSignInError(result.error));
        return;
      }
      // The account boundary verifies identity and owns the post-login redirect.
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected network error occurred. Please try again.");
      setIsPending(false);
    } finally { setIsPending(false); }
  };

  const displayError = error || queryError;

  return (
    <form onSubmit={handleSubmit} className="space-y-5" aria-busy={isPending}>
      {queryMessage && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
          {queryMessage}
        </div>
      )}

      {displayError && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
          {displayError}
        </div>
      )}

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
          Email Address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          autoCapitalize="none"
          required
          placeholder="you@example.com"
          className="w-full min-h-13 rounded-xl border border-slate-300 bg-white px-4 text-base text-[#092E28] placeholder:text-slate-400 focus:border-[#116149] focus:ring-2 focus:ring-emerald-700/15 transition-colors"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            placeholder="Enter your password"
            className="w-full min-h-13 rounded-xl border border-slate-300 bg-white pl-4 pr-11 text-base text-[#092E28] placeholder:text-slate-400 focus:border-[#116149] focus:ring-2 focus:ring-emerald-700/15 transition-colors"
          />
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              setShowPassword((prev) => !prev);
            }}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 z-10 flex size-10 items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 focus:outline-none cursor-pointer transition-colors"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      <a href="/forgot-password/" className="inline-flex min-h-11 items-center text-sm font-semibold text-emerald-800 underline underline-offset-4">Forgot password?</a>
      <button
        type="submit"
        disabled={isPending}
        className="w-full mt-2 min-h-12 inline-flex items-center justify-center gap-2 rounded-full bg-[#116149] px-6 text-sm font-semibold text-white transition hover:bg-[#0b4936] hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0 cursor-pointer"
      >
        {isPending ? (
          <>
            <Loader2 className="animate-spin" size={16} /> Signing in...
          </>
        ) : (
          <>
            Sign in <ArrowRight size={16} />
          </>
        )}
      </button>
    </form>
  );
}

export function LoginForm() {
  return (
    <Suspense fallback={null}>
      <LoginFormContent />
    </Suspense>
  );
}
