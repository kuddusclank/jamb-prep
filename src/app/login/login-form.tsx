"use client";

import { useActionState, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { signInAction } from "@/app/actions/auth";
import { ArrowRight, Loader2 } from "lucide-react";

function LoginFormContent() {
  const [showPassword, setShowPassword] = useState(false);
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/dashboard";
  const [state, formAction, isPending] = useActionState(signInAction, null);

  return (
    <form action={formAction} className="space-y-5" aria-busy={isPending}>
      {state?.error && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
          {state.error}
        </div>
      )}

      <input type="hidden" name="redirectTo" value={redirectTo} />

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
          Email Address
        </label>
        <input
          id="email"
          name="email"
          type="email"
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
        <input
          id="password"
          name="password"
          type={showPassword ? "text" : "password"}
          autoComplete="current-password"
          required
          placeholder="Enter your password"
          className="w-full min-h-13 rounded-xl border border-slate-300 bg-white px-4 text-base text-[#092E28] placeholder:text-slate-400 focus:border-[#116149] focus:ring-2 focus:ring-emerald-700/15 transition-colors"
        />
      </div>

      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-slate-600">
        <input type="checkbox" checked={showPassword} onChange={(event) => setShowPassword(event.target.checked)} className="size-4 accent-[#116149]" />
        Show password
      </label>

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
    <Suspense fallback={<div className="py-8 text-center text-xs text-slate-400">Loading form...</div>}>
      <LoginFormContent />
    </Suspense>
  );
}
