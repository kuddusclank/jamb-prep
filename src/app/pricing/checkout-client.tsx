"use client";

import { useState } from "react";
import { initializePaystackCheckoutAction, CheckoutPricing } from "@/lib/client-actions";
import { 
  Check, 
  ArrowRight, 
  Loader2, 
  ShieldCheck, 
  Users,
  CreditCard,
  Building2,
  Copy,
  CheckCircle2,
  HelpCircle,
  GraduationCap
} from "lucide-react";
import Link from "@/components/pending-link";

interface CheckoutClientProps {
  pricing: CheckoutPricing;
}

export function CheckoutClient({ pricing }: CheckoutClientProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedDetails, setCopiedDetails] = useState(false);
  const pendingReference = errorMessage?.match(/JAMB-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)?.[0];

  const handleCopyDetails = () => {
    const text = `Candidate Account: ${pricing.userEmail}\nSchool: ${pricing.school?.schoolName || "My School"}\nSchool Code: ${pricing.school?.schoolCode || "N/A"}\nPlease activate my JAMBPrep institutional CBT mock & practice license.`;
    navigator.clipboard.writeText(text);
    setCopiedDetails(true);
    setTimeout(() => setCopiedDetails(false), 2500);
  };

  const handleCheckout = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const result = await initializePaystackCheckoutAction();
      if (result.confirmationUrl) {
        window.location.href = result.confirmationUrl;
      } else if (result.authorizationUrl) {
        window.location.href = result.authorizationUrl;
      } else {
        setErrorMessage("Unable to initiate payment session. Please try again.");
        setIsLoading(false);
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to start checkout.");
      setIsLoading(false);
    }
  };

  const formattedExpiry = pricing.currentExpiresAt 
    ? new Date(pricing.currentExpiresAt).toLocaleDateString("en-NG", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  // 1. School-Attached Student View: Replace self-checkout with School Management Card
  if (pricing.isSchoolAttached) {
    const schoolName = pricing.school?.schoolName || "Institutional Partner School";
    const schoolCode = pricing.school?.schoolCode || "SCH-ENROLLED";
    const isActive = pricing.isAlreadyPremium;

    return (
      <div className="space-y-8">
        <div className="rounded-3xl border-2 border-emerald-900/15 bg-white p-6 sm:p-10 shadow-lg space-y-8">
          {/* Header Badge */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-[#116149] border border-emerald-100">
                <Building2 size={24} />
              </span>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100/70 px-2.5 py-0.5 rounded-full inline-block">
                  Institutional Candidate Account
                </span>
                <h2 className="text-xl sm:text-2xl font-bold text-[#092E28] mt-1">
                  {schoolName}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">School Code:</span>
              <span className="font-mono text-xs font-bold bg-slate-100 text-slate-800 px-3 py-1.5 rounded-xl border border-slate-200">
                {schoolCode}
              </span>
            </div>
          </div>

          {/* Status Details */}
          {isActive ? (
            <div className="rounded-2xl border border-emerald-300 bg-emerald-50/70 p-5 space-y-2 text-[#092E28]">
              <div className="flex items-center gap-2 font-bold text-emerald-900">
                <CheckCircle2 size={18} className="text-[#116149]" />
                <span>Your School CBT License is Active</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                Your computer lab CBT simulations, unlimited practice, and diagnostic reviews are fully funded and active through{" "}
                <strong>{formattedExpiry || "your school's active term"}</strong>.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-amber-300 bg-[#FDFBF4] p-5 sm:p-6 space-y-3 text-[#092E28]">
              <div className="flex items-center gap-2 font-bold text-amber-950 text-base">
                <GraduationCap size={20} className="text-amber-700" />
                <span>Candidate License Inactive or Awaiting Renewal</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                Your account is enrolled under <strong>{schoolName}</strong>. Individual payments are disabled for institutional candidates because license quotas and cohort mock exams are administered directly by your school.
              </p>
            </div>
          )}

          {/* Action Guide for Upgrades */}
          <div className="rounded-2xl border border-slate-200 bg-[#F8FAF7] p-6 space-y-4">
            <h3 className="text-sm font-bold text-[#092E28] flex items-center gap-2">
              <HelpCircle size={16} className="text-[#116149]" />
              How to Upgrade or Extend Your Candidate Access
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-600">
              <div className="bg-white p-4 rounded-xl border border-slate-200/80 space-y-1">
                <strong className="text-slate-900 block font-semibold">1. Contact Your School</strong>
                <span>Notify your ICT coordinator, principal, or class teacher that your license needs activation.</span>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200/80 space-y-1">
                <strong className="text-slate-900 block font-semibold">2. Provide Your Details</strong>
                <span>Give them your registered email (<span className="font-mono text-slate-800">{pricing.userEmail}</span>) and school code.</span>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200/80 space-y-1">
                <strong className="text-slate-900 block font-semibold">3. Automatic Activation</strong>
                <span>As soon as your school completes their cohort checkout, your full CBT access unlocks automatically.</span>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
              <button
                type="button"
                onClick={handleCopyDetails}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-[#116149] px-6 py-3 text-xs font-semibold text-white hover:bg-[#0c4a37] transition cursor-pointer shadow-xs"
              >
                {copiedDetails ? (
                  <>
                    <CheckCircle2 size={15} /> Details Copied to Clipboard!
                  </>
                ) : (
                  <>
                    <Copy size={15} /> Copy My Details for School Admin
                  </>
                )}
              </button>

              <Link
                href="/dashboard"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Go to Study Dashboard <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. Independent Student View: Standard Individual Paystack Checkout
  return (
    <div className="space-y-8">
      {/* Referral Discount Notice if available */}
      {pricing.hasDiscount ? (
        <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4 sm:p-5 flex items-start gap-3.5 text-[#092E28]">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#116149] text-white">
            <CheckCircle2 size={18} />
          </span>
          <div className="text-sm">
            <strong className="font-semibold block text-[#116149]">
              50% Referral Discount Voucher Applied!
            </strong>
            <p className="text-slate-600 mt-0.5">
              Because 2 classmates completed account onboarding through your link, your first month is halved from ₦1,000 to <strong>₦500</strong>.
            </p>
          </div>
        </div>
      ) : !pricing.isAlreadyPremium ? (
        <div className="rounded-2xl border border-amber-200 bg-[#F8F2DF] p-4 sm:p-5 flex items-center justify-between gap-4 text-[#092E28]">
          <div className="text-xs sm:text-sm">
            <span className="font-bold text-amber-900 block flex items-center gap-1.5">
              <Users size={14} /> Want 50% off your first month?
            </span>
            <p className="text-slate-600 mt-0.5">
              Invite 2 friends who complete account onboarding to pay <strong>₦500</strong> instead of ₦1,000.
            </p>
          </div>
          <Link
            href="/referrals"
            className="shrink-0 px-3.5 py-1.5 rounded-full bg-[#116149] text-white text-xs font-semibold hover:bg-[#0b4936] transition-colors"
          >
            Get Referral Link
          </Link>
        </div>
      ) : null}

      {/* Pricing Cards Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">

        {/* Plan 1: Free Tier */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 flex flex-col justify-between shadow-sm">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Starter Practice
            </div>
            <h3 className="text-2xl font-bold text-[#092E28] mt-1">Free Tier</h3>
            <p className="text-xs text-slate-500 mt-1">
              Essential diagnostic practice to uncover your baseline.
            </p>

            <div className="mt-5 pb-5 border-b border-slate-100 flex items-baseline gap-1">
              <span className="text-4xl font-extrabold text-[#092E28]">₦0</span>
              <span className="text-xs text-slate-400">/ forever</span>
            </div>

            <ul className="mt-6 space-y-3 text-xs text-slate-600">
              <li className="flex items-center gap-2.5">
                <Check size={15} className="text-[#116149] shrink-0" />
                <span><strong>1 free practice session</strong> (5, 10, or 15 questions)</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check size={15} className="text-[#116149] shrink-0" />
                <span><strong>1 full diagnostic mock</strong> simulation</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check size={15} className="text-[#116149] shrink-0" />
                <span>Instant solution answers</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check size={15} className="text-[#116149] shrink-0" />
                <span>Basic topic accuracy tracking</span>
              </li>
            </ul>
          </div>

          <div className="mt-8 pt-4 border-t border-slate-100">
            <Link
              href="/practice"
              className="w-full min-h-11 inline-flex items-center justify-center rounded-full border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Continue Free Practice
            </Link>
          </div>
        </div>

        {/* Plan 2: Premium Coach Tier */}
        <div className="relative flex flex-col justify-between rounded-3xl border-2 border-[#116149] bg-white p-6 shadow-lg shadow-[#116149]/10 sm:p-8">
          <div className="absolute -top-3.5 right-6 rounded-full bg-[#116149] px-3.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white">
            50% off through December 31
          </div>

          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-[#116149]">
              Full Preparation Access
            </div>
            <h3 className="text-2xl font-bold text-[#092E28] mt-1">Premium Study Coach</h3>
            <p className="text-xs text-slate-500 mt-1">
              Unlimited practice, authentic CBT hall simulations, and personalized revision.
            </p>

            <div className="mt-5 border-b border-slate-100 pb-5">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-4xl font-extrabold text-[#116149]">₦{pricing.finalAmountNaira.toLocaleString()}</span>
                <span className="text-sm font-semibold text-slate-400 line-through">₦{pricing.hasDiscount ? pricing.originalAmountNaira.toLocaleString() : "1,000"}</span>
                <span className="text-sm font-semibold text-slate-400 line-through">₦2,000</span>
                <span className="text-xs text-slate-500">/ 30 days</span>
              </div>
              <p className="mt-2 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">Launch price · ends December 31, 2026</p>
              {pricing.hasDiscount && <p className="mt-2 text-xs text-slate-600">Your referral reward lowers the launch price by another 50% for this first month.</p>}
            </div>

            {pricing.isAlreadyPremium && formattedExpiry && (
              <div className="mt-3 text-xs bg-emerald-50 text-[#116149] p-2.5 rounded-xl font-medium">
                ✓ Currently Active (Renews / Expires on {formattedExpiry})
              </div>
            )}

            <ul className="mt-6 space-y-3 text-xs text-slate-600">
              <li className="flex items-center gap-2.5">
                <Check size={15} className="text-[#116149] shrink-0" />
                <span><strong>Unlimited practice sessions</strong> across your enrolled subjects</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check size={15} className="text-[#116149] shrink-0" />
                <span><strong>Unlimited 180-question mock exams</strong> with 8-key desktop hotkeys</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check size={15} className="text-[#116149] shrink-0" />
                <span><strong>Detailed KaTeX step-by-step solutions</strong> & formulas</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check size={15} className="text-[#116149] shrink-0" />
                <span><strong>Diagnostic Study Coach</strong> with weak-topic revision roadmap</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check size={15} className="text-[#116149] shrink-0" />
                <span><strong>UTME Dictionary & Oral English Games</strong> (680+ curated words, Free Dictionary lookup, stress drills, sound match)</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check size={15} className="text-[#116149] shrink-0" />
                <span>Offline exam outbox resilience & instant scorecards</span>
              </li>
            </ul>
          </div>

          <div className="mt-8 pt-4 border-t border-slate-100">
            {errorMessage && (
              <div className="mb-3 text-xs text-red-600 bg-red-50 p-2.5 rounded-xl">
                {errorMessage}
                {pendingReference && <Link href={`/checkout/verify/?reference=${encodeURIComponent(pendingReference)}`} className="block mt-2 underline font-semibold">Check the existing payment</Link>}
              </div>
            )}

            <button
              onClick={handleCheckout}
              disabled={isLoading}
              className="w-full min-h-12 inline-flex items-center justify-center gap-2 rounded-full bg-[#116149] px-6 text-sm font-semibold text-white hover:bg-[#0b4936] transition-all hover:-translate-y-0.5 shadow-md shadow-[#116149]/20 disabled:opacity-60 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Initiating Paystack Checkout...
                </>
              ) : pricing.isAlreadyPremium ? (
                <>
                  Extend 30 Days (₦{pricing.finalAmountNaira.toLocaleString()}) <ArrowRight size={15} />
                </>
              ) : (
                <>
                  <CreditCard size={15} />
                  Upgrade to Premium (₦{pricing.finalAmountNaira.toLocaleString()})
                </>
              )}
            </button>

            <div className="mt-3 flex items-center justify-center gap-2 text-[11px] text-slate-400">
              <ShieldCheck size={13} className="text-emerald-700" />
              <span>Secured by Paystack • Card, Bank Transfer, USSD</span>
            </div>
            <p className="mt-3 text-center text-[11px] leading-relaxed text-slate-500">
              By continuing, you agree to our <Link href="/terms/" className="underline underline-offset-2">Terms</Link> and acknowledge the <Link href="/privacy/" className="underline underline-offset-2">Privacy</Link> and <Link href="/refund-policy/" className="underline underline-offset-2">Refund Policies</Link>.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
