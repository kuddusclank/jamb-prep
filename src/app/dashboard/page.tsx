import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { 
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
  LogOut,
  AlertCircle,
  TrendingUp,
  BarChart3,
  Calendar,
  Flame,
  ArrowUpRight
} from "lucide-react";
import { signOutAction } from "@/app/actions/auth";
import { getStudentCoachInsights } from "@/lib/coach";

export const metadata = {
  title: "Dashboard — JAMBPrep",
  description: "Personalized UTME study coach dashboard, target scores, and weak-topic revision.",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Load coach insights and referral state concurrently in a single roundtrip
  let qualifiedReferrals = 0;
  let has50PercentReward = false;
  let insights;

  try {
    const [insightsRes, refCountRows, rewardRecord] = await Promise.all([
      getStudentCoachInsights(user.id),
      db.select({ value: count() }).from(referrals).where(eq(referrals.referrerId, user.id)),
      db.query.referralRewards.findFirst({
        where: eq(referralRewards.userId, user.id),
      }),
    ]);

    insights = insightsRes;
    if (refCountRows?.[0]) qualifiedReferrals = refCountRows[0].value;
    if (rewardRecord && rewardRecord.status === "available") has50PercentReward = true;
  } catch (err) {
    console.warn("Notice loading dashboard state:", err);
    insights = await getStudentCoachInsights(user.id);
  }

  const studentName = user.user_metadata?.display_name || user.email?.split("@")[0] || "Student";
  const { 
    targetScore, 
    latestScore, 
    gapToTarget, 
    coachRecommendation, 
    weakestTopics, 
    subjectSummaries, 
    recentMockHistory,
    totalMocksCompleted 
  } = insights;

  // Percentage to target score
  const scorePercent = latestScore ? Math.min(100, Math.round((latestScore / targetScore) * 100)) : 0;

  return (
    <div className="min-h-screen bg-[#F6F8F5] text-[#092E28] flex flex-col justify-between">
      {/* Navigation Header */}
      <header className="border-b border-emerald-950/10 bg-[#FAFBF7] sticky top-0 z-30">
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
            <Link href="/analytics" className="hover:text-[#116149] transition-colors flex items-center gap-1">
              <BarChart3 size={15} /> Performance
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
        <div className="max-w-5xl mx-auto space-y-8">
          
          {/* Welcome & Target Strip */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 border-b border-slate-200 pb-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-[#116149] text-[11px] font-bold uppercase tracking-wider">
                  <Flame size={12} /> STUDY COACH ACTIVE
                </span>
                <span className="text-xs text-slate-400 font-medium">2026 UTME</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight mt-1.5">
                Welcome back, {studentName} 👋
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                Your preparation is personalized to your target of <strong className="text-[#092E28]">{targetScore} / 400</strong>.
              </p>
            </div>

            {/* Target and Progress Gauges */}
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-3.5 flex items-center gap-3 shadow-sm min-w-[140px]">
                <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-100 text-[#116149]">
                  <Target size={20} />
                </span>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Target Score</div>
                  <div className="text-xl font-bold text-[#092E28]">{targetScore} <span className="text-xs font-normal text-slate-400">/ 400</span></div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-3.5 flex items-center gap-3 shadow-sm min-w-[140px]">
                <span className="flex size-10 items-center justify-center rounded-xl bg-blue-100 text-blue-800">
                  <TrendingUp size={20} />
                </span>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Latest Score</div>
                  <div className="text-xl font-bold text-[#092E28]">
                    {latestScore !== null ? (
                      <>
                        {latestScore} <span className="text-xs font-normal text-slate-400">/ 400</span>
                      </>
                    ) : (
                      <span className="text-sm font-semibold text-slate-400">Pending</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Central Study Coach Advice Banner ("Know what to study next") */}
          <div className="rounded-3xl bg-[#EDF2E9] border border-emerald-950/10 p-6 sm:p-8 relative overflow-hidden shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
              <div className="max-w-xl">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-200/70 text-[#116149] text-xs font-bold uppercase tracking-wider mb-3">
                  <Award size={14} /> {coachRecommendation.badge}
                </span>
                <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight leading-snug text-[#092E28]">
                  {coachRecommendation.headline}
                </h2>
                <p className="mt-2.5 text-sm text-slate-600 leading-relaxed">
                  {coachRecommendation.explanation}
                </p>

                {/* Score Target Meter if completed mocks exist */}
                {latestScore !== null && (
                  <div className="mt-4 pt-4 border-t border-emerald-950/10">
                    <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                      <span className="text-slate-600">Goal Progression ({latestScore} / {targetScore})</span>
                      <span className="text-[#116149] font-bold">
                        {gapToTarget === 0 ? "Target Reached! 🎉" : `${gapToTarget} points to goal`}
                      </span>
                    </div>
                    <div className="h-2.5 w-full bg-emerald-950/10 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[#116149] rounded-full transition-all duration-500" 
                        style={{ width: `${scorePercent}%` }} 
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="shrink-0 flex flex-col sm:flex-row md:flex-col gap-3">
                {coachRecommendation.suggestedTopicSlug ? (
                  <Link
                    href={`/practice?subject=${coachRecommendation.suggestedSubjectCode}&topic=${coachRecommendation.suggestedTopicSlug}`}
                    className="min-h-12 inline-flex items-center justify-center gap-2 rounded-full bg-[#116149] px-7 text-sm font-semibold text-white hover:bg-[#0b4936] transition-all hover:-translate-y-0.5 shadow-md shadow-[#116149]/20"
                  >
                    Practice Weak Topic Now <ArrowRight size={16} />
                  </Link>
                ) : (
                  <Link
                    href="/practice"
                    className="min-h-12 inline-flex items-center justify-center gap-2 rounded-full bg-[#116149] px-7 text-sm font-semibold text-white hover:bg-[#0b4936] transition-all hover:-translate-y-0.5 shadow-md shadow-[#116149]/20"
                  >
                    Start Topic Practice <ArrowRight size={16} />
                  </Link>
                )}

                <Link
                  href="/mock"
                  className="min-h-12 inline-flex items-center justify-center gap-2 rounded-full border border-emerald-900/20 bg-white px-7 text-sm font-semibold text-[#092E28] hover:bg-emerald-50 transition-all text-center"
                >
                  Full Mock Simulation (180 Qs)
                </Link>
              </div>
            </div>
          </div>

          {/* Diagnostic Weak Topics Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-[#092E28] flex items-center gap-2">
                  <AlertCircle size={18} className="text-amber-700" />
                  Diagnostic Weak Topics
                </h3>
                <p className="text-xs text-slate-500">
                  Topics where targeted practice yields the highest score gain.
                </p>
              </div>

              <Link href="/analytics" className="text-xs font-semibold text-[#116149] hover:underline flex items-center gap-1">
                View all topics <ArrowRight size={12} />
              </Link>
            </div>

            {weakestTopics.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                {weakestTopics.map((item) => (
                  <div
                    key={item.topicId}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-emerald-300 transition-colors flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-[11px] font-bold text-[#116149] bg-emerald-50 px-2 py-0.5 rounded">
                          {item.subjectCode}
                        </span>
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                          item.priority === 'critical' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {item.priority === 'critical' ? 'Needs Attention' : 'Review'}
                        </span>
                      </div>

                      <h4 className="font-semibold text-sm text-[#092E28] line-clamp-1">{item.topicTitle}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">{item.subjectName}</p>

                      <div className="mt-3 flex items-center justify-between text-xs font-medium text-slate-600">
                        <span>Accuracy: <strong>{item.accuracyPercent}%</strong></span>
                        <span className="text-slate-400">{item.totalCorrect}/{item.totalAttempted} correct</span>
                      </div>

                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden mt-1.5">
                        <div 
                          className={`h-full rounded-full ${item.priority === 'critical' ? 'bg-red-500' : 'bg-amber-500'}`}
                          style={{ width: `${item.accuracyPercent}%` }}
                        />
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100">
                      <Link
                        href={`/practice?subject=${item.subjectCode}&topic=${item.topicSlug}`}
                        className="text-xs font-semibold text-[#116149] hover:text-[#0b4936] flex items-center justify-between group"
                      >
                        <span>Practice this topic</span>
                        <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center">
                <p className="text-sm text-slate-600">
                  {totalMocksCompleted === 0 
                    ? "Complete your first diagnostic mock exam or topic practice session to generate your weak-topic breakdown."
                    : "🎉 Great job! No critical weak topics identified. Keep reviewing and taking full mocks!"}
                </p>
                <Link
                  href="/practice"
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#116149] hover:underline"
                >
                  Start practice questions <ArrowRight size={12} />
                </Link>
              </div>
            )}
          </div>

          {/* Enrolled Subjects Cards */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-[#092E28]">Your 4 UTME Subjects</h3>
                <p className="text-xs text-slate-500">Your examination profile and current subject performance.</p>
              </div>
              <Link href="/onboarding" className="text-xs font-semibold text-[#116149] hover:underline">
                Change combination
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              {subjectSummaries.map((sub) => (
                <div
                  key={sub.subjectCode}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-emerald-300 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-bold text-[#116149] bg-emerald-50 px-2 py-0.5 rounded">
                      {sub.subjectCode}
                    </span>
                    {sub.isCompulsory ? (
                      <span className="text-[10px] font-semibold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                        Compulsory
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400">
                        Elective
                      </span>
                    )}
                  </div>
                  <h4 className="font-semibold text-sm text-[#092E28]">{sub.subjectName}</h4>
                  
                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-medium">Est. Score</span>
                    <span className="font-bold text-[#092E28]">{sub.estimatedScore} / 100</span>
                  </div>

                  <Link
                    href={`/practice?subject=${sub.subjectCode}`}
                    className="mt-3 block text-center py-1.5 rounded-lg bg-emerald-50 text-[11px] font-semibold text-[#116149] hover:bg-emerald-100 transition-colors"
                  >
                    Practice {sub.subjectCode}
                  </Link>
                </div>
              ))}
            </div>
          </div>

          {/* Past CBT Mock History */}
          {recentMockHistory.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-[#092E28] flex items-center gap-2">
                    <Calendar size={18} className="text-[#116149]" />
                    Mock Simulation History
                  </h3>
                  <p className="text-xs text-slate-500">
                    Review your completed simulations and question solutions.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                <div className="divide-y divide-slate-100">
                  {recentMockHistory.map((mock, idx) => {
                    const mins = Math.floor(mock.timeSpentSeconds / 60);
                    const formattedDate = new Date(mock.completedAt).toLocaleDateString("en-NG", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    });

                    return (
                      <div 
                        key={mock.attemptId} 
                        className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
                      >
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold uppercase tracking-wider text-[#116149]">
                              Mock Attempt #{recentMockHistory.length - idx}
                            </span>
                            <span className="text-xs text-slate-400">• {formattedDate}</span>
                            <span className="text-xs text-slate-400">• {mins} mins spent</span>
                          </div>

                          <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-[#092E28]">
                              {mock.totalScore}
                            </span>
                            <span className="text-xs text-slate-400">/ 400 points</span>
                          </div>

                          {/* Quick 4-subject breakdown pills */}
                          <div className="flex flex-wrap gap-2 mt-2">
                            <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                              ENG: {mock.englishScore}/100
                            </span>
                            <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                              Sub 2: {mock.subject2Score}/100
                            </span>
                            <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                              Sub 3: {mock.subject3Score}/100
                            </span>
                            <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                              Sub 4: {mock.subject4Score}/100
                            </span>
                          </div>
                        </div>

                        <div className="shrink-0">
                          <Link
                            href={`/mock/result/${mock.attemptId}`}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-slate-200 text-xs font-semibold text-[#092E28] hover:bg-emerald-50 hover:border-emerald-200 hover:text-[#116149] transition-all"
                          >
                            Review Solutions <ArrowUpRight size={13} />
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

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
