import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { 
  studentPreferences, 
  studentSubjects, 
  subjects, 
  referrals, 
  referralRewards 
} from "@/db/schema";
import { eq, count } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { 
  BookOpen, 
  Target, 
  Clock, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  Layers, 
  Award,
  Users,
  LogOut
} from "lucide-react";
import { signOutAction } from "@/app/actions/auth";

export const metadata = {
  title: "Dashboard — JAMBPrep",
  description: "Personalized UTME study coach dashboard, target scores, and weak-topic revision.",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Redirect to login if unauthenticated
  if (!user) {
    redirect("/login");
  }

  // Load student preferences and enrolled subjects
  let targetScore = 280;
  let enrolledSubjects: Array<{ name: string; code: string; isCompulsory: boolean }> = [
    { name: "Use of English", code: "ENG", isCompulsory: true },
    { name: "Mathematics", code: "MTH", isCompulsory: false },
    { name: "Physics", code: "PHY", isCompulsory: false },
    { name: "Chemistry", code: "CHM", isCompulsory: false },
  ];
  let qualifiedReferrals = 0;
  let has50PercentReward = false;

  try {
    const pref = await db.query.studentPreferences.findFirst({
      where: eq(studentPreferences.userId, user.id),
    });
    if (pref) targetScore = pref.targetScore;

    const enrolled = await db
      .select({
        name: subjects.name,
        code: subjects.code,
        isCompulsory: subjects.isCompulsory,
      })
      .from(studentSubjects)
      .innerJoin(subjects, eq(studentSubjects.subjectId, subjects.id))
      .where(eq(studentSubjects.userId, user.id));

    if (enrolled && enrolled.length > 0) {
      enrolledSubjects = enrolled;
    }

    const [refCount] = await db
      .select({ value: count() })
      .from(referrals)
      .where(eq(referrals.referrerId, user.id));
    if (refCount) qualifiedReferrals = refCount.value;

    const reward = await db.query.referralRewards.findFirst({
      where: eq(referralRewards.userId, user.id),
    });
    if (reward && reward.status === "available") has50PercentReward = true;
  } catch (err) {
    console.warn("Notice loading dashboard state:", err);
  }

  const studentName = user.user_metadata?.display_name || user.email?.split("@")[0] || "Student";

  return (
    <div className="min-h-screen bg-[#F6F8F5] text-[#092E28] flex flex-col justify-between">
      {/* Navigation Header */}
      <header className="border-b border-emerald-950/10 bg-[#FAFBF7]">
        <div className="shell flex h-20 items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 text-xl font-bold tracking-tight">
            <span className="flex size-9 items-center justify-center rounded-xl bg-[#116149] text-white">
              <BookOpen size={20} />
            </span>
            <span>jambprep<span className="text-[#116149]">.</span></span>
          </Link>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
            <Link href="/dashboard" className="text-[#116149] font-bold">
              Dashboard
            </Link>
            <Link href="/practice" className="hover:text-[#116149] transition-colors">
              Topic Practice
            </Link>
            <Link href="/mock" className="hover:text-[#116149] transition-colors">
              CBT Simulation
            </Link>
            <Link href="/referrals" className="text-amber-800 font-semibold hover:text-amber-900 flex items-center gap-1">
              <Sparkles size={14} /> Refer & Earn 50%
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <form action={signOutAction}>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-red-700 transition-colors rounded-full hover:bg-slate-100 cursor-pointer"
              >
                <LogOut size={14} /> Sign Out
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="shell section-space">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Welcome & Target Strip */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-6">
            <div>
              <p className="eyebrow">STUDY COACH ACTIVE · 2026 UTME</p>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight mt-1">
                Welcome back, {studentName} 👋
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                Your preparation is personalized to your 4 selected subjects.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-3.5 flex items-center gap-3 shadow-sm">
                <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-100 text-[#116149]">
                  <Target size={18} />
                </span>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Target Score</div>
                  <div className="text-lg font-bold text-[#092E28]">{targetScore} <span className="text-xs font-normal text-slate-400">/ 400</span></div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-3.5 flex items-center gap-3 shadow-sm">
                <span className="flex size-9 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
                  <Clock size={18} />
                </span>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Daily Allowance</div>
                  <div className="text-lg font-bold text-[#092E28]">15 <span className="text-xs font-normal text-slate-400">Free Qs</span></div>
                </div>
              </div>
            </div>
          </div>

          {/* Primary Recommended Action: "Find your starting point" */}
          <div className="rounded-3xl bg-[#EDF2E9] border border-emerald-950/10 p-6 sm:p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="max-w-xl">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-200/60 text-[#116149] text-xs font-bold uppercase tracking-wider mb-3">
                  <Award size={14} /> YOUR NEXT PURPOSEFUL STEP
                </span>
                <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight leading-snug">
                  Take your free <span className="serif-accent text-[#116149]">diagnostic mock exam.</span>
                </h2>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  Find your starting baseline across English and your three electives. No pressure—just a clear 180-question benchmark so your coach can identify your weak topics and build your revision plan.
                </p>
              </div>

              <div className="shrink-0 flex flex-col sm:flex-row md:flex-col gap-3">
                <Link
                  href="/practice"
                  className="min-h-12 inline-flex items-center justify-center gap-2 rounded-full bg-[#116149] px-7 text-sm font-semibold text-white hover:bg-[#0b4936] transition-all hover:-translate-y-0.5 shadow-md shadow-[#116149]/20"
                >
                  Start Topic Practice <ArrowRight size={16} />
                </Link>
                <Link
                  href="/mock"
                  className="min-h-12 inline-flex items-center justify-center gap-2 rounded-full border border-emerald-900/20 bg-white px-7 text-sm font-semibold text-[#092E28] hover:bg-emerald-50 transition-all"
                >
                  Full Mock Simulation
                </Link>
              </div>
            </div>
          </div>

          {/* Enrolled Subjects Cards */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-[#092E28]">Your Enrolled UTME Subjects</h3>
              <Link href="/onboarding" className="text-xs font-semibold text-[#116149] hover:underline">
                Change combination
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              {enrolledSubjects.map((sub) => (
                <div
                  key={sub.code}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-emerald-300 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-bold text-[#116149] bg-emerald-50 px-2 py-0.5 rounded">
                      {sub.code}
                    </span>
                    {sub.isCompulsory && (
                      <span className="text-[10px] font-semibold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                        Compulsory
                      </span>
                    )}
                  </div>
                  <h4 className="font-semibold text-sm text-[#092E28]">{sub.name}</h4>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {sub.isCompulsory ? "60 Questions" : "40 Questions"}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Viral Referral Milestone Widget */}
          <div className="rounded-3xl border border-amber-300/50 bg-[#F8F2DF] p-6 text-[#092E28] flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-900">
                <Users size={14} /> REFER-AND-EARN PROGRESS
              </div>
              <h4 className="text-lg font-bold mt-1">
                {has50PercentReward
                  ? "🎉 50% Discount Voucher Ready!"
                  : `[ ${qualifiedReferrals} / 2 ] Verified Friends Invited`}
              </h4>
              <p className="mt-1 text-xs text-amber-950/80 max-w-lg">
                {has50PercentReward
                  ? "You unlocked 50% off! Pay ₦500 instead of ₦1,000 when you start your first monthly access."
                  : "Invite 2 classmates with your link. Once both verify, you get 50% off your first 30 days of unlimited access."}
              </p>
            </div>

            <Link
              href="/referrals"
              className="shrink-0 min-h-11 inline-flex items-center justify-center gap-2 rounded-full bg-[#116149] px-5 text-xs font-semibold text-white hover:bg-[#0b4936] transition-all hover:-translate-y-0.5"
            >
              View Invite Link & Progress <ArrowRight size={14} />
            </Link>
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
