import { getCheckoutPricingAction } from "@/app/actions/payment";
import { StudyWorkspace } from "@/components/study-workspace";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { HelpCircle, BookOpen } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckoutClient } from "./checkout-client";

export const metadata = {
  title: "Upgrade to Premium — JAMBPrep",
  description: "Unlock unlimited UTME practice, 180-question CBT simulations, and diagnostic study coach analysis.",
};

export default async function PricingPage() {
  const user = await getCurrentUser();
  const pricing = await getCheckoutPricingAction();

  if (user && pricing.isAlreadyPremium) {
    redirect("/profile#subscription");
  }

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
            Invite 2 classmates with your unique referral link. Once both verify their accounts, your first month is automatically halved from ₦1,000 to ₦500.
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
            <BookOpen size={18} />
          </span>
          <span>jambprep<span className="text-[#116149]">.</span></span>
        </Link>
        <div className="flex items-center gap-4 text-xs font-semibold">
          <Link href="/login" className="text-slate-600 hover:text-slate-900">Sign in</Link>
          <Link href="/register" className="rounded-full bg-[#116149] text-white px-4 py-2 hover:bg-[#0c4a37]">Get started</Link>
        </div>
      </header>
      <main className="shell flex-1">{content}</main>
      <footer className="shell py-8 text-center text-xs text-slate-400">
        JAMBPrep · Independent UTME preparation.
      </footer>
    </div>
  );
}
