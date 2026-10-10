import { StudyWorkspace } from "@/components/study-workspace";
import { db } from "@/db";
import {
referralCodes,
referralRewards,
referrals
} from "@/db/schema";
import { getUserSubscriptionStatus } from "@/lib/subscription";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { count,eq } from "drizzle-orm";
import { ShieldCheck,Sparkles } from "lucide-react";
import { redirect } from "next/navigation";
import { ReferralCard } from "./referral-card";

export const metadata = {
  title: "Refer & Earn 50% Off — JAMBPrep",
  description: "Invite 2 friends to JAMBPrep and unlock 50% off your first monthly subscription.",
};

export default async function ReferralsPage() {
  const user = await getCurrentUser();

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
      const [codeRecord, refCount, reward] = await Promise.race([
        Promise.all([
          db.query.referralCodes.findFirst({
            where: eq(referralCodes.userId, user.id),
          }),
          db
            .select({ value: count() })
            .from(referrals)
            .where(eq(referrals.referrerId, user.id)),
          db.query.referralRewards.findFirst({
            where: eq(referralRewards.userId, user.id),
          }),
        ]),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Referral data timeout")), 3500)
        ),
      ]);

      if (codeRecord) code = codeRecord.code;
      if (refCount?.[0]) qualifiedCount = refCount[0].value;
      if (reward && reward.status === "available") hasReward = true;
    } catch (err) {
      console.warn("Notice loading referral records:", err);
    }
  }

  return (
    <StudyWorkspace>
      {/* Header */}


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

    </StudyWorkspace>
  );
}
