"use client";

import { useState } from "react";
import { initializePaystackCheckoutAction, CheckoutPricing } from "@/lib/client-actions";
import { 
  Sparkles, 
  Check, 
  ArrowRight, 
  Loader2, 
  ShieldCheck, 
  Users,
  CreditCard
} from "lucide-react";
import Link from "@/components/pending-link";

interface CheckoutClientProps {
  pricing: CheckoutPricing;
}

export function CheckoutClient({ pricing }: CheckoutClientProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const pendingReference = errorMessage?.match(/JAMB-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)?.[0];

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

  return (
    <div className="space-y-8">
      {/* Referral Discount Notice if available */}
      {pricing.hasDiscount ? (
        <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4 sm:p-5 flex items-start gap-3.5 text-[#092E28]">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#116149] text-white">
            <Sparkles size={18} />
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
                <span><strong>One daily practice session</strong> of 5, 10 or 15 questions</span>
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
                <span><strong>Unlimited daily practice</strong> across your enrolled subjects</span>
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
