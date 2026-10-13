"use client";

import { useState, useActionState } from "react";
import { updateProfileAction, cancelSubscriptionAction } from "@/lib/client-actions";
import { 
  User, 
  Target, 
  CreditCard, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Loader2, 
  ArrowRight, 
  BookOpen, 
  Building, 
  GraduationCap,
  Sparkles,
  Lock
} from "lucide-react";
import Link from "@/components/pending-link";

interface SubjectSummary {
  name: string;
  code: string;
  isCompulsory: boolean;
}

interface ProfileClientProps {
  initialProfile: {
    displayName: string;
    email: string;
  };
  initialPreferences: {
    targetScore: number;
    targetInstitution?: string | null;
    targetCourse?: string | null;
  };
  subscription: {
    isPremium: boolean;
    expiresAt: string | null;
    daysRemaining: number;
    planCode: string | null;
    autoRenew?: boolean;
    cancelledAt?: string | null;
  };
  enrolledSubjects: SubjectSummary[];
}

export function ProfileClient({
  initialProfile,
  initialPreferences,
  subscription,
  enrolledSubjects,
}: ProfileClientProps) {
  // Profile update state
  const [profileState, formAction, isSaving] = useActionState(updateProfileAction, null);

  // Cancellation state
  const [isConfirmingCancel, setIsConfirmingCancel] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelFeedback, setCancelFeedback] = useState<{ error?: string; message?: string } | null>(null);
  const [isCancelledLocally, setIsCancelledLocally] = useState(
    subscription.autoRenew === false
  );

  const [displayName, setDisplayName] = useState(initialProfile.displayName);
  const [targetScore, setTargetScore] = useState(initialPreferences.targetScore);
  const [targetInstitution, setTargetInstitution] = useState(initialPreferences.targetInstitution || "");
  const [targetCourse, setTargetCourse] = useState(initialPreferences.targetCourse || "");

  const handleCancelSubscription = async () => {
    setIsCancelling(true);
    setCancelFeedback(null);
    try {
      const res = await cancelSubscriptionAction();
      if (res.error) {
        setCancelFeedback({ error: res.error });
      } else {
        setCancelFeedback({ message: res.message });
        setIsCancelledLocally(true);
        setIsConfirmingCancel(false);
      }
    } catch (err: unknown) {
      setCancelFeedback({ error: err instanceof Error ? err.message : "Failed to cancel subscription." });
    } finally {
      setIsCancelling(false);
    }
  };

  const isCurrentPremium = subscription.isPremium;
  const isAutoRenewing = isCurrentPremium && !isCancelledLocally && subscription.autoRenew !== false;

  const formattedExpiry = subscription.expiresAt
    ? new Date(subscription.expiresAt).toLocaleDateString("en-NG", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <div className="space-y-8 max-w-4xl mx-auto">

      {/* Page Header */}
      <div className="border-b border-slate-200 pb-6">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#092E28]">
          Candidate Profile & Settings
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Manage your academic goals, display identity, and subscription tier.
        </p>
      </div>

      {/* Section 1: Academic & Personal Preferences */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs">
        <div className="flex items-center gap-2.5 mb-6 pb-4 border-b border-slate-100">
          <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-100 text-[#116149]">
            <User size={18} />
          </span>
          <div>
            <h2 className="text-base font-bold text-[#092E28]">Personal Information</h2>
            <p className="text-xs text-slate-500">Your profile details visible in results and coach recommendations.</p>
          </div>
        </div>

        <form action={formAction} className="space-y-6">
          {profileState?.error && (
            <div className="p-4 rounded-2xl border border-red-200 bg-red-50 text-xs text-red-800 flex items-center gap-2">
              <AlertTriangle size={16} className="shrink-0 text-red-600" />
              <span>{profileState.error}</span>
            </div>
          )}

          {profileState?.success && (
            <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50 text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
              <span>{profileState.message || "Profile updated successfully!"}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Display Name */}
            <div>
              <label htmlFor="displayName" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Display Name
              </label>
              <input
                id="displayName"
                name="displayName"
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-[#092E28] focus:border-[#116149] focus:outline-hidden focus:ring-1 focus:ring-[#116149]"
                placeholder="e.g. Abdulquddus"
              />
            </div>

            {/* Email Address (Read-only) */}
            <div>
              <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Registered Email
              </label>
              <input
                id="email"
                type="email"
                disabled
                value={initialProfile.email}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-500 cursor-not-allowed"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">Managed by Supabase Auth</span>
            </div>

            {/* Target UTME Score */}
            <div>
              <label htmlFor="targetScore" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Target UTME Score (out of 400)
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  id="targetScore"
                  name="targetScore"
                  type="number"
                  min="100"
                  max="400"
                  required
                  value={targetScore}
                  onChange={(e) => setTargetScore(Number(e.target.value))}
                  className="w-32 rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-[#092E28] font-bold focus:border-[#116149] focus:outline-hidden focus:ring-1 focus:ring-[#116149]"
                />
                <div className="flex gap-1.5">
                  {[250, 280, 310].map((score) => (
                    <button
                      key={score}
                      type="button"
                      onClick={() => setTargetScore(score)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${
                        targetScore === score
                          ? "bg-[#116149] text-white border-[#116149]"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {score}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Target Institution */}
            <div>
              <label htmlFor="targetInstitution" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Target Institution
              </label>
              <input
                id="targetInstitution"
                name="targetInstitution"
                type="text"
                value={targetInstitution}
                onChange={(e) => setTargetInstitution(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-[#092E28] focus:border-[#116149] focus:outline-hidden focus:ring-1 focus:ring-[#116149]"
                placeholder="e.g. University of Lagos (UNILAG)"
              />
            </div>

            {/* Target Course */}
            <div className="sm:col-span-2">
              <label htmlFor="targetCourse" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Intended Course of Study
              </label>
              <input
                id="targetCourse"
                name="targetCourse"
                type="text"
                value={targetCourse}
                onChange={(e) => setTargetCourse(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-[#092E28] focus:border-[#116149] focus:outline-hidden focus:ring-1 focus:ring-[#116149]"
                placeholder="e.g. Computer Science / Medicine & Surgery"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#116149] px-6 text-xs font-semibold text-white hover:bg-[#0b4936] transition cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 size={15} className="animate-spin" /> Saving Changes...
                </>
              ) : (
                "Save Profile Changes"
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Section 2: Four Enrolled UTME Subjects */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs">
        <div className="flex flex-wrap gap-3 items-center justify-between mb-6 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-blue-100 text-blue-900">
              <BookOpen size={18} />
            </span>
            <div>
              <h2 className="text-base font-bold text-[#092E28]">Enrolled UTME Subjects</h2>
              <p className="text-xs text-slate-500">Your examination profile and CBT mock combination.</p>
            </div>
          </div>

          <Link
            href="/onboarding"
            className="text-xs font-semibold text-[#116149] hover:underline"
          >
            Change Combination
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
          {enrolledSubjects.map((sub) => (
            <div
              key={sub.code}
              className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs font-bold text-[#116149] bg-emerald-100/70 px-2 py-0.5 rounded">
                  {sub.code}
                </span>
                <span className="text-[10px] font-semibold text-slate-400">
                  {sub.isCompulsory ? "Compulsory" : "Elective"}
                </span>
              </div>
              <p className="text-sm font-bold text-[#092E28] line-clamp-1">{sub.name}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Section 3: Subscription & Billing Management */}
      <div id="subscription" className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs">
        <div className="flex items-center gap-2.5 mb-6 pb-4 border-b border-slate-100">
          <span className="flex size-9 items-center justify-center rounded-xl bg-amber-100 text-amber-900">
            <CreditCard size={18} />
          </span>
          <div>
            <h2 className="text-base font-bold text-[#092E28]">Subscription & Access Tier</h2>
            <p className="text-xs text-slate-500">Review your current plan entitlements or modify your subscription.</p>
          </div>
        </div>

        {cancelFeedback?.error && (
          <div className="mb-6 p-4 rounded-2xl border border-red-200 bg-red-50 text-xs text-red-800 flex items-center gap-2">
            <AlertTriangle size={16} className="shrink-0 text-red-600" />
            <span>{cancelFeedback.error}</span>
          </div>
        )}

        {cancelFeedback?.message && (
          <div className="mb-6 p-4 rounded-2xl border border-emerald-200 bg-emerald-50 text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
            <span>{cancelFeedback.message}</span>
          </div>
        )}

        {isCurrentPremium ? (
          /* Active Premium Plan Card */
          <div className={`rounded-2xl border-2 p-6 space-y-5 ${
            isAutoRenewing 
              ? "border-emerald-300 bg-emerald-50/50" 
              : "border-amber-300 bg-amber-50/40"
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200/60 pb-4">
              <div>
                {isAutoRenewing ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#116149] text-white text-[11px] font-bold uppercase tracking-wider">
                    <ShieldCheck size={12} /> ACTIVE (AUTO-RENEWING)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-700 text-white text-[11px] font-bold uppercase tracking-wider">
                    <AlertTriangle size={12} /> CANCELLATION SCHEDULED
                  </span>
                )}
                <h3 className="text-xl font-bold text-[#092E28] mt-2">
                  Premium Study Coach Access
                </h3>
                {formattedExpiry && (
                  <p className="text-xs text-slate-600 mt-1 max-w-xl">
                    {isAutoRenewing ? (
                      <>
                        Your unlimited access is valid through <strong>{formattedExpiry}</strong> ({subscription.daysRemaining} days remaining). Auto-renews on this date via Paystack.
                      </>
                    ) : (
                      <>
                        Auto-renewal is disabled for this plan. Your Pro benefits remain active until <strong>{formattedExpiry}</strong> ({subscription.daysRemaining} days remaining), when your account will automatically switch to the Free plan.
                      </>
                    )}
                  </p>
                )}
              </div>

              <div className="text-right">
                <span className="text-2xl font-black text-[#116149]">₦1,000</span>
                <span className="text-xs text-slate-500 block">/ 30 days</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-700">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-[#116149] shrink-0" />
                <span>Unlimited 180-question timed CBT mocks</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-[#116149] shrink-0" />
                <span>Unlimited topic practice & KaTeX solutions</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-[#116149] shrink-0" />
                <span>Full diagnostic study coach weak-topic insights</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-[#116149] shrink-0" />
                <span>Zero exam distractions and interruption alerts</span>
              </div>
            </div>

            {/* Cancel Subscription / Status Area */}
            <div className="pt-4 border-t border-slate-200/60">
              {isAutoRenewing ? (
                !isConfirmingCancel ? (
                  <button
                    type="button"
                    onClick={() => setIsConfirmingCancel(true)}
                    className="text-xs font-semibold text-red-600 hover:text-red-700 hover:underline cursor-pointer"
                  >
                    Cancel Subscription
                  </button>
                ) : (
                  <div className="p-4 rounded-xl border border-red-200 bg-white space-y-3">
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle size={18} className="text-red-600 shrink-0 mt-0.5" />
                      <div className="text-xs text-slate-700">
                        <strong className="block font-bold text-red-900 mb-0.5">
                          Cancel recurring subscription on Paystack?
                        </strong>
                        Cancelling will stop all future automatic charges on Paystack. You will continue to enjoy unlimited CBT simulations, solutions, and coach analytics until your renewal date on <strong>{formattedExpiry}</strong>, when your account will automatically switch to the Free plan.
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pt-1">
                      <button
                        type="button"
                        disabled={isCancelling}
                        onClick={handleCancelSubscription}
                        className="px-4 py-2 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-semibold cursor-pointer disabled:opacity-50 transition"
                      >
                        {isCancelling ? "Cancelling on Paystack..." : "Confirm Cancellation"}
                      </button>
                      <button
                        type="button"
                        disabled={isCancelling}
                        onClick={() => setIsConfirmingCancel(false)}
                        className="px-4 py-2 rounded-full border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold cursor-pointer transition"
                      >
                        Keep Subscription
                      </button>
                    </div>
                  </div>
                )
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-amber-900 font-semibold">
                    <CheckCircle2 size={16} className="text-amber-700 shrink-0" />
                    <span>Cancelled on Paystack · Automatically switches to Free on {formattedExpiry}</span>
                  </div>
                  <span className="text-slate-600">Your Pro access remains available until expiry.</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Free Tier Card */
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[11px] font-bold uppercase tracking-wider">
                FREE TIER
              </span>
              <h3 className="text-lg font-bold text-[#092E28] mt-2">
                Standard Diagnostic Allowance
              </h3>
              <p className="text-xs text-slate-600 mt-1 max-w-md leading-relaxed">
                You can start one practice session of 5, 10 or 15 questions per day. Upgrade to Premium for unlimited CBT simulations, tailored weak-topic revision, and study coach analytics.
              </p>
            </div>

            <Link
              href="/pricing"
              className="shrink-0 min-h-11 inline-flex items-center justify-center gap-2 rounded-full bg-[#116149] px-6 text-xs font-semibold text-white hover:bg-[#0b4936] transition shadow-md shadow-[#116149]/20"
            >
              <Sparkles size={14} className="text-amber-400" />
              Upgrade to Premium (₦1,000)
            </Link>
          </div>
        )}
      </div>

    </div>
  );
}
