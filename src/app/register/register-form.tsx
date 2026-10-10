"use client";

import { useActionState, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { signUpAction } from "@/app/actions/auth";
import { ArrowRight, Loader2, Sparkles } from "lucide-react";

function RegisterFormContent() {
  const [showPassword, setShowPassword] = useState(false);
  const searchParams = useSearchParams();
  const initialReferralCode = searchParams.get("ref") || "";
  const [state, formAction, isPending] = useActionState(signUpAction, null);

  return (
    <form action={formAction} className="space-y-5" aria-busy={isPending}>
      {initialReferralCode && (
        <div className="mb-4 rounded-2xl bg-[#F8F2DF] border border-amber-300/40 p-3.5 flex items-start gap-3">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-800">
            <Sparkles size={14} />
          </span>
          <div className="text-xs">
            <p className="font-semibold text-amber-950">Referral code supplied</p>
            <p className="mt-0.5 text-amber-900/80">
              Code <strong>{initialReferralCode.toUpperCase()}</strong> will be checked when you register.
            </p>
          </div>
        </div>
      )}

      {state?.error && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
          {state.error}
        </div>
      )}

      <div>
        <label htmlFor="displayName" className="block text-sm font-medium text-slate-700 mb-1.5">
          Full Name
        </label>
        <input
          id="displayName"
          name="displayName"
          autoComplete="name"
          type="text"
          required
          placeholder="e.g. Amina Bello"
          className="w-full min-h-13 rounded-xl border border-slate-300 bg-white px-4 text-base text-[#092E28] placeholder:text-slate-400 focus:border-[#116149] focus:ring-2 focus:ring-emerald-700/15 transition-colors"
        />
      </div>

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
          autoComplete="new-password"
          required
          minLength={6}
          placeholder="At least 6 characters"
          className="w-full min-h-13 rounded-xl border border-slate-300 bg-white px-4 text-base text-[#092E28] placeholder:text-slate-400 focus:border-[#116149] focus:ring-2 focus:ring-emerald-700/15 transition-colors"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label htmlFor="referralCode" className="block text-sm font-medium text-slate-700">
            Referral Code <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <span className="text-[10px] text-emerald-800 font-medium">Have an invitation?</span>
        </div>
        <input
          id="referralCode"
          name="referralCode"
          type="text"
          defaultValue={initialReferralCode}
          placeholder="e.g. TOBI99"
          className="w-full min-h-13 rounded-xl border border-slate-300 bg-white px-4 text-base text-[#092E28] uppercase font-mono placeholder:font-sans placeholder:normal-case placeholder:text-slate-400 focus:border-[#116149] focus:ring-2 focus:ring-emerald-700/15 transition-colors"
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
            <Loader2 className="animate-spin" size={16} /> Creating account...
          </>
        ) : (
          <>
            Create account <ArrowRight size={16} />
          </>
        )}
      </button>
    </form>
  );
}

export function RegisterForm() {
  return (
    <Suspense fallback={<div className="py-8 text-center text-xs text-slate-400">Loading form...</div>}>
      <RegisterFormContent />
    </Suspense>
  );
}
