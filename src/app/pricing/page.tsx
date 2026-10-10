import { createClient } from "@/lib/supabase/server";
import { getCheckoutPricingAction } from "@/app/actions/payment";
import { redirect } from "next/navigation";
import Link from "next/link";
import { BookOpen, ArrowLeft, ShieldCheck, HelpCircle } from "lucide-react";
import { CheckoutClient } from "./checkout-client";

export const metadata = {
  title: "Upgrade to Premium — JAMBPrep",
  description: "Unlock unlimited UTME practice, 180-question CBT simulations, and diagnostic study coach analysis.",
};

export default async function PricingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const pricing = await getCheckoutPricingAction();

  return (
    <div className="min-h-screen bg-[#F6F8F5] text-[#092E28] flex flex-col justify-between">
      {/* Navigation Header */}
      <header className="border-b border-emerald-950/10 bg-[#FAFBF7] sticky top-0 z-30">
        <div className="shell flex h-20 items-center justify-between">
          <div className="flex items-center gap-4">
            <Link 
              href="/dashboard"
              className="flex size-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-[#116149] hover:border-slate-300 transition-colors"
              title="Return to Dashboard"
            >
              <ArrowLeft size={18} />
            </Link>
            <Link href="/dashboard" className="flex items-center gap-2 text-xl font-bold tracking-tight">
              <span className="flex size-8 items-center justify-center rounded-xl bg-[#116149] text-white">
                <BookOpen size={18} />
              </span>
              <span>jambprep<span className="text-[#116149]">.</span></span>
            </Link>
          </div>

          <nav className="flex items-center gap-4 text-xs font-semibold text-slate-600">
            <Link href="/dashboard" className="hover:text-[#116149]">
              Dashboard
            </Link>
            <Link href="/referrals" className="text-amber-800 hover:text-amber-900">
              Refer & Earn 50%
            </Link>
          </nav>
        </div>
      </header>

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
      <footer className="shell py-8 border-t border-emerald-950/10 text-xs text-slate-500 text-center">
        © 2026 JAMBPrep. Know what to study next.
      </footer>
    </div>
  );
}
