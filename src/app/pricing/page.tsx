"use client";
import { BrandMark } from "@/components/brand-mark";
import type { CheckoutPricing } from "@/lib/client-actions";
import { StudyWorkspace } from "@/components/study-workspace";
import { HelpCircle } from "lucide-react";
import Link from "next/link";
import { CheckoutClient } from "./checkout-client";

import { useBrowserAccount } from "@/components/browser-account-boundary";
import { useApiResource, ResourceStatus } from "@/lib/api/use-api-resource";
import { PolicyLinks } from "@/components/legal-page";
export default function PricingPage() {
  const account = useBrowserAccount();
  const resource = useApiResource<CheckoutPricing>('/api/v1/pricing');
  const user = account.session.user;
  if (account.session.status === 'loading') return <ResourceStatus error={null} retry={account.retry} />;
  if (account.session.status === 'error') return <ResourceStatus error={account.error ?? 'Unable to check your account. Please retry.'} retry={account.retry} />;
  if (!user) return <main className="shell section-space"><section className="mx-auto max-w-3xl rounded-3xl border border-emerald-900/15 bg-white p-6 shadow-sm sm:p-10"><span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#116149]">Launch offer · 50% off through December 31, 2026</span><h1 className="mt-5 text-3xl font-bold text-[#092E28]">Premium study access</h1><div className="mt-4 flex flex-wrap items-baseline gap-3"><span className="text-5xl font-extrabold text-[#116149]">₦1,000</span><span className="text-xl font-semibold text-slate-400 line-through">₦2,000</span><span className="text-sm text-slate-500">/ 30 days</span></div><p className="mt-4 max-w-xl text-slate-600">Unlock unlimited practice, full mock exams and detailed coaching at half price during our launch offer.</p><Link href="/login?redirectTo=/pricing" className="mt-6 inline-flex min-h-12 items-center rounded-full bg-[#116149] px-6 font-semibold text-white">Sign in to get Premium</Link></section></main>;
  if (!resource.data) return <StudyWorkspace><ResourceStatus error={resource.error} retry={resource.retry} /></StudyWorkspace>;
  const pricing = resource.data;

  const content = (
    <div className="max-w-4xl mx-auto space-y-10 py-6">
      {/* Header Title */}
      <div className="text-center max-w-2xl mx-auto">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-[#116149] text-xs font-bold uppercase tracking-wider mb-3">
          PREMIUM ACCESS PLANS
        </span>
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[#092E28] leading-tight">
          Simple, transparent pricing to <span className="serif-accent text-[#116149]">reach your goal score.</span>
        </h1>
        <p className="mt-3 text-sm text-slate-600 leading-relaxed">
          Start with free daily questions, or upgrade to unlimited practice and authentic timed CBT hall simulations for less than ₦34 per day.
        </p>
      </div>

      {/* Checkout Client Component */}
      <CheckoutClient pricing={pricing} />

      {/* FAQs / Guarantees Strip */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 space-y-6">
        <h3 className="text-base font-semibold text-[#092E28] flex items-center gap-2">
          <HelpCircle size={18} className="text-[#116149]" />
          Frequently Asked Questions
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-600 leading-relaxed">
          <div>
            <strong className="block font-semibold text-slate-800 mb-1">
              How does the 50% referral discount work?
            </strong>
            Invite 2 classmates with your unique referral link. Once both complete account onboarding, your first month can be reduced from the ₦1,000 launch price to ₦500.
          </div>

          <div>
            <strong className="block font-semibold text-slate-800 mb-1">
              Can I cancel auto-renewal at any time?
            </strong>
            Yes. You can disable auto-renewal anytime in your Profile settings with a single click. Your access will remain active until the end of your billing cycle.
          </div>

          <div>
            <strong className="block font-semibold text-slate-800 mb-1">
              Are past questions authentically timed?
            </strong>
            Yes. The timed mock simulator mirrors the real JAMB hall experience with an exact 120-minute countdown and standard 8-key navigation.
          </div>

          <div>
            <strong className="block font-semibold text-slate-800 mb-1">
              What payment methods are supported?
            </strong>
            We accept all Nigerian bank debit cards (Mastercard, Visa, Verve), bank transfers, and USSD via our secure Paystack integration.
          </div>
        </div>
      </div>
    </div>
  );

  if (user) {
    return (
      <StudyWorkspace>
        <main className="shell section-space">{content}</main>
      </StudyWorkspace>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F8F5] text-[#092E28] flex flex-col justify-between">
      <header className="shell flex items-center justify-between py-6">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold tracking-tight">
          <span className="flex size-8 items-center justify-center rounded-xl bg-[#116149] text-white">
            <BrandMark size={32}/>
          </span>
          <span>jambprep<span className="text-[#116149]">.</span></span>
        </Link>
        <div className="flex items-center gap-4 text-xs font-semibold">
          <Link href="/login" className="text-slate-600 hover:text-slate-900">Sign in</Link>
          <Link href="/register" className="rounded-full bg-[#116149] text-white px-4 py-2 hover:bg-[#0c4a37]">Get started</Link>
        </div>
      </header>
      <main className="shell flex-1">{content}</main>
      <footer className="shell flex flex-col items-center gap-3 py-8 text-center text-xs text-slate-400">
        <span>JAMBPrep · Independent UTME preparation.</span>
        <PolicyLinks className="justify-center"/>
      </footer>
    </div>
  );
}
