"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getAccountCoordinator } from "@/lib/auth/account-coordinator";
import { useBrowserAccount } from "@/components/browser-account-boundary";
import { ArrowRight, Eye, EyeOff, Loader2, Sparkles } from "lucide-react";

function RegisterFormContent() {
  const router = useRouter();
  const account = useBrowserAccount();
  const recovering = account.session.status === "authenticated";
  const searchParams = useSearchParams();
  const initialReferralCode = searchParams.get("ref") || "";
  const queryError = searchParams.get("error");

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [referralCode, setReferralCode] = useState(initialReferralCode);
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (account.session.user?.email) setEmail(account.session.user.email);
    if (account.session.user?.displayName) setDisplayName(account.session.user.displayName);
  }, [account.session.user?.id, account.session.user?.email, account.session.user?.displayName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = displayName.trim();
    const cleanEmail = email.trim();
    const cleanReferral = referralCode.trim().toUpperCase();

    if (!cleanName || cleanName.length < 2 || !cleanEmail || (!recovering && !password)) {
      setError("Please provide your full name, email address, and a password.");
      return;
    }

    if (!recovering && password.length < 6) {
      setError("Your password must be at least 6 characters long.");
      return;
    }

    setError(null);
    setIsPending(true);

    try {
      const coordinator = getAccountCoordinator();
      const result = await coordinator.manager.signUpAndProvision({
        displayName: cleanName, email: cleanEmail, password, referralCode: cleanReferral,
        provisioningExecutor: (input) => coordinator.api.bootstrapAccount({ ...input, accessToken: input.accessToken }),
      });
      if (result.error || !result.provisioned) { setError(result.error || 'Account setup is temporarily unavailable. Please retry.'); return; }
      coordinator.clear();
      router.replace('/onboarding');
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message :
          "Your account was created, but profile setup encountered a network error. Please submit again to complete setup."
      );
      setIsPending(false);
    } finally { setIsPending(false); }
  };

  const displayError = error || queryError;

  return (
    <form onSubmit={handleSubmit} className="space-y-5" aria-busy={isPending}>
      {initialReferralCode && (
        <div className="mb-4 rounded-2xl bg-[#F8F2DF] border border-amber-300/40 p-3.5 flex items-start gap-3">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-800">
            <Sparkles size={14} />
          </span>
          <div className="text-xs">
            <p className="font-semibold text-amber-950">Referral code supplied</p>
            <p className="mt-0.5 text-amber-900/80">
              Code <strong>{initialReferralCode.toUpperCase()}</strong> will be applied upon account creation.
            </p>
          </div>
        </div>
      )}

      {displayError && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
          {displayError}
        </div>
      )}

      <div>
        <label htmlFor="displayName" className="block text-sm font-medium text-slate-700 mb-1.5">
          Full Name
        </label>
        <input
          id="displayName"
          name="displayName"
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          autoComplete="name"
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
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          readOnly={recovering}
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
            autoComplete="new-password"
            required={!recovering}
            minLength={recovering ? undefined : 6}
            placeholder="At least 6 characters"
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
          value={referralCode}
          onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
          placeholder="e.g. TOBI99"
          className="w-full min-h-13 rounded-xl border border-slate-300 bg-white px-4 text-base text-[#092E28] uppercase font-mono placeholder:font-sans placeholder:normal-case placeholder:text-slate-400 focus:border-[#116149] focus:ring-2 focus:ring-emerald-700/15 transition-colors"
        />
      </div>

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
    <Suspense fallback={null}>
      <RegisterFormContent />
    </Suspense>
  );
}
