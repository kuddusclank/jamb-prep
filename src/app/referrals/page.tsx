import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { 
  referralCodes, 
  referrals, 
  referralRewards 
} from "@/db/schema";
import { eq, count } from "drizzle-orm";
import { redirect } from "next/navigation";
import Link from "next/link";
import { BookOpen, Users, Sparkles, ArrowRight, ShieldCheck, CheckCircle2 } from "lucide-react";
import { ReferralCard } from "./referral-card";
import { getUserSubscriptionStatus } from "@/lib/subscription";

export const metadata = {
  title: "Refer & Earn 50% Off — JAMBPrep",
  description: "Invite 2 friends to JAMBPrep and unlock 50% off your first monthly subscription.",
};

export default async function ReferralsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const subStatus = await getUserSubscriptionStatus(user.id);
    if (subStatus.isPremium) {
      redirect("/dashboard");
    }
  }

  let code = "JAMBPREP";
  let qualifiedCount = 0;
  let hasReward = false;

  if (user) {
    try {
      const codeRecord = await db.query.referralCodes.findFirst({
        where: eq(referralCodes.userId, user.id),
      });
      if (codeRecord) code = codeRecord.code;

      const [refCount] = await db
        .select({ value: count() })
        .from(referrals)
        .where(eq(referrals.referrerId, user.id));
      if (refCount) qualifiedCount = refCount.value;

      const reward = await db.query.referralRewards.findFirst({
        where: eq(referralRewards.userId, user.id),
      });
      if (reward && reward.status === "available") hasReward = true;
    } catch (err) {
      console.warn("Notice loading referral records:", err);
    }
  }

  return (
    <div className="min-h-screen bg-[#F6F8F5] text-[#092E28] flex flex-col justify-between">
      {/* Header */}
      <header className="border-b border-emerald-950/10 bg-[#FAFBF7]">
        <div className="shell flex h-20 items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 text-xl font-bold tracking-tight">
            <span className="flex size-9 items-center justify-center rounded-xl bg-[#116149] text-white">
              <BookOpen size={20} />
            </span>
            <span>jambprep<span className="text-[#116149]">.</span></span>
          </Link>
          <div className="flex items-center gap-4 text-sm font-medium">
            <Link href="/dashboard" className="text-slate-600 hover:text-[#116149] transition-colors">
              Dashboard
            </Link>
            <Link href="/pricing" className="text-slate-600 hover:text-[#116149] transition-colors">
              Pricing
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="shell section-space">
        <div className="max-w-3xl mx-auto">
          {/* Hero Banner */}
          <div className="rounded-3xl bg-gradient-to-br from-[#116149] to-[#092E28] text-white p-6 sm:p-10 shadow-2xl relative overflow-hidden">
            <div className="relative z-10 max-w-xl">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 text-[#E7B85A] text-xs font-bold uppercase tracking-wider mb-4">
                <Sparkles size={14} /> REFER-AND-EARN
              </span>
              <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight leading-tight">
                Invite 2 classmates. <br />
                <span className="serif-accent text-[#E7B85A]">Get 50% off your first month.</span>
              </h1>
              <p className="mt-4 text-sm sm:text-base text-emerald-100/90 leading-relaxed">
                UTME prep is better together. Share your personal invite code. Once 2 friends create their verified accounts, you unlock your first month of unlimited practice for just <strong>₦500</strong> instead of ₦1,000.
              </p>
            </div>
          </div>

          {/* Interactive Share & Tracker Card */}
          <div className="mt-8 rounded-3xl border border-emerald-950/10 bg-white p-6 sm:p-8 shadow-sm">
            <ReferralCard
              code={code}
              qualifiedCount={qualifiedCount}
              hasReward={hasReward}
            />
          </div>

          {/* Business Rules & Guidance */}
          <div className="mt-8 rounded-2xl bg-[#EDF2E9] border border-emerald-950/10 p-6 text-sm">
            <h3 className="font-semibold text-[#092E28] flex items-center gap-2">
              <ShieldCheck size={18} className="text-[#116149]" /> How referral rewards work
            </h3>
            <ul className="mt-3 space-y-2 text-xs sm:text-sm text-slate-600">
              <li className="flex items-start gap-2">
                <span className="text-[#116149] font-bold">•</span>
                <span><strong>Applies to your first subscription only:</strong> Discounted to ₦500 for month one; subsequent months renew at standard ₦1,000.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#116149] font-bold">•</span>
                <span><strong>Verified registrations:</strong> Each friend must register their own verified student account using your link.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#116149] font-bold">•</span>
                <span><strong>Fair usage:</strong> Self-referrals and duplicate accounts are automatically filtered by fraud detection.</span>
              </li>
            </ul>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="shell py-8 border-t border-emerald-950/10 text-xs text-slate-500 text-center">
        © 2026 JAMBPrep. Study together. Succeed together.
      </footer>
    </div>
  );
}
