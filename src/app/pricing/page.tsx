import { getCheckoutPricingAction } from "@/app/actions/payment";
import { StudyWorkspace } from "@/components/study-workspace";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { HelpCircle } from "lucide-react";
import { redirect } from "next/navigation";
import { CheckoutClient } from "./checkout-client";

export const metadata = {
  title: "Upgrade to Premium — JAMBPrep",
  description: "Unlock unlimited UTME practice, 180-question CBT simulations, and diagnostic study coach analysis.",
};

export default async function PricingPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const pricing = await getCheckoutPricingAction();
  if (pricing.isAlreadyPremium) redirect("/profile#subscription");

  return (
    <StudyWorkspace>
      {/* Navigation Header */}


      {/* Main Content */}
      <main className="shell section-space">
        <div className="max-w-4xl mx-auto space-y-10">

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
                  What payment methods are supported?
                </strong>
                All payments are processed securely through Paystack. You can pay via debit/credit cards (Mastercard, Visa, Verve), Bank Transfer, or USSD.
              </div>

              <div>
                <strong className="block font-semibold text-slate-800 mb-1">
                  Does access expire automatically?
                </strong>
                Your 30-day access begins immediately upon payment. There are no surprise auto-renewals; you choose when you want to extend.
              </div>

              <div>
                <strong className="block font-semibold text-slate-800 mb-1">
                  Can I practice on my phone?
                </strong>
                Yes! Both topic practice and full CBT mock exams are fully responsive for mobile phones, tablets, and desktop computers.
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}

    </StudyWorkspace>
  );
}
