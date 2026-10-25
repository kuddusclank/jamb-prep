"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "@/components/pending-link";
import { getAccountCoordinator } from "@/lib/auth/account-coordinator";
import { useBrowserAccount } from "@/components/browser-account-boundary";
import {
  getCourseById,
} from "@/lib/curriculum/jamb-course-combinations";
import {
  buildLockedCombinationFromCourse,
  getLockedCombination,
  type LockedCourseCombination,
  saveLockedCombination,
} from "@/lib/curriculum/locked-combination-storage";
import {
  ArrowRight,
  Building2,
  Compass,
  Eye,
  EyeOff,
  Gift,
  GraduationCap,
  Loader2,
} from "lucide-react";

function RegisterFormContent() {
  const router = useRouter();
  const account = useBrowserAccount();
  const recovering = account.session.status === "authenticated";
  const searchParams = useSearchParams();
  const initialReferralCode = searchParams.get("ref") || "";
  const schoolCode = searchParams.get("school") || "";
  const courseParam = searchParams.get("course") || "";
  const queryError = searchParams.get("error");

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const referralCode = initialReferralCode || schoolCode || "";
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lockedCombo, setLockedCombo] = useState<LockedCourseCombination | null>(null);

  useEffect(() => {
    if (account.session.user?.email) setEmail(account.session.user.email);
    if (account.session.user?.displayName) setDisplayName(account.session.user.displayName);
  }, [account.session.user?.id, account.session.user?.email, account.session.user?.displayName]);

  useEffect(() => {
    const existing = getLockedCombination();
    if (existing) {
      setLockedCombo(existing);
      return;
    }
    if (courseParam) {
      const course = getCourseById(courseParam);
      if (course) {
        const built = buildLockedCombinationFromCourse(course, {
          source: "combinations-page",
        });
        saveLockedCombination(built);
        setLockedCombo(built);
      }
    }
  }, [courseParam]);

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
      {/* Locked Course Combination Banner or Finder Prompt */}
      {lockedCombo ? (
        <div className="rounded-2xl border border-[#116149]/35 bg-[#eef8f3] p-4 text-xs text-[#092E28]">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 font-bold text-[#0b4936] text-sm">
              <GraduationCap size={16} className="shrink-0 text-[#116149]" />
              <span>Course Locked In: {lockedCombo.courseTitle}</span>
            </div>
            <Link
              href="/combinations?from=register"
              className="shrink-0 font-semibold text-[#116149] underline hover:text-[#0b4936]"
            >
              Change course
            </Link>
          </div>
          <p className="mt-1.5 text-slate-700 leading-relaxed">
            <strong>4 Subjects:</strong> Use of English, {lockedCombo.electiveNames.join(", ")} ·{" "}
            <strong>Target:</strong> {lockedCombo.recommendedTargetScore}/400
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-emerald-950/15 bg-[#fafbf7] p-3.5 text-xs text-slate-700 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-xl bg-[#e6f4ee] text-[#116149]">
              <Compass size={15} />
            </span>
            <span className="leading-snug">
              Don&rsquo;t know your UTME subject combination?{" "}
              <Link
                href="/combinations?from=register"
                className="font-bold text-[#116149] underline underline-offset-2 hover:text-[#0b4936]"
              >
                Find &amp; lock in your course subjects first →
              </Link>
            </span>
          </div>
        </div>
      )}

      {schoolCode && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-3.5 text-xs text-[#092E28] flex items-center gap-3">
          <div className="size-8 rounded-xl bg-[#116149] text-white flex items-center justify-center shrink-0 shadow-xs">
            <Building2 size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <span className="font-semibold block text-slate-900">Institutional Cohort Enrolment</span>
            <span className="text-slate-600 truncate block text-[11px]">
              Registering candidate under School Code: <strong className="font-mono font-bold text-[#116149]">{schoolCode.toUpperCase()}</strong>
            </span>
          </div>
        </div>
      )}

      {initialReferralCode && !schoolCode && (
        <div className="mb-4 rounded-2xl bg-[#F8F2DF] border border-amber-300/40 p-3.5 flex items-start gap-3">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-800">
            <Gift size={14} />
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

      <input
        id="referralCode"
        name="referralCode"
        type="hidden"
        value={referralCode}
      />

      {!recovering && (
        <p className="text-xs leading-relaxed text-slate-500">
          By creating an account, you agree to our <a className="font-semibold text-[#116149] underline underline-offset-4" href="/terms/">Terms and Conditions</a> and acknowledge the <a className="font-semibold text-[#116149] underline underline-offset-4" href="/privacy/">Privacy Policy</a> and <a className="font-semibold text-[#116149] underline underline-offset-4" href="/refund-policy/">Refund Policy</a>.
        </p>
      )}

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
