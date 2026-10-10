import { StudyWorkspace } from "@/components/study-workspace";
import { db } from "@/db";
import {
attemptInterruptions,
attemptQuestions,
attemptResults,
attempts,
studentPreferences,
subjects
} from "@/db/schema";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { and,eq } from "drizzle-orm";
import {
ArrowRight,
Award
} from "lucide-react";
import Link from "@/components/pending-link";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Diagnostic CBT Scorecard — JAMBPrep",
  description: "Official UTME 400-point performance breakdown, subject mastery, and weak-topic study recommendations.",
};

interface ResultPageProps {
  params: Promise<{ attemptId: string }>;
}

export default async function MockResultPage({ params }: ResultPageProps) {
  const { attemptId } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  // 1. Fetch attempt and result records
  const result = await db.query.attemptResults.findFirst({
    where: and(
      eq(attemptResults.attemptId, attemptId),
      eq(attemptResults.userId, user.id)
    ),
  });

  if (!result) {
    redirect("/dashboard");
  }

  const attempt = await db.query.attempts.findFirst({ where: eq(attempts.id, result.attemptId) });
  const interruptions = await db.select().from(attemptInterruptions).where(eq(attemptInterruptions.attemptId, result.attemptId));

  // 2. Fetch student preferences for target score comparison
  const pref = await db.query.studentPreferences.findFirst({
    where: eq(studentPreferences.userId, user.id),
  });
  const targetScore = pref?.targetScore || 280;

  // 3. Fetch subjects in this attempt
  const attemptSubs = await db
    .select({
      subjectCode: subjects.code,
      subjectName: subjects.name,
      isCompulsory: subjects.isCompulsory,
    })
    .from(attemptQuestions)
    .innerJoin(subjects, eq(attemptQuestions.subjectId, subjects.id))
    .where(eq(attemptQuestions.attemptId, attemptId))
    .groupBy(subjects.code, subjects.name, subjects.isCompulsory);

  attemptSubs.sort((a, b) => (b.isCompulsory ? 1 : 0) - (a.isCompulsory ? 1 : 0));

  const subjectScores = [
    { name: attemptSubs[0]?.subjectName || "Use of English", score: result.englishScore },
    { name: attemptSubs[1]?.subjectName || "Subject 2", score: result.subject2Score },
    { name: attemptSubs[2]?.subjectName || "Subject 3", score: result.subject3Score },
    { name: attemptSubs[3]?.subjectName || "Subject 4", score: result.subject4Score },
  ];

  const scoreDifference = result.totalScore - targetScore;
  const isTargetAchieved = result.totalScore >= targetScore;

  // Format time spent (MM:SS)
  const spentMinutes = Math.floor(result.timeSpentSeconds / 60);
  const spentSeconds = result.timeSpentSeconds % 60;

  return (
    <StudyWorkspace>
      <section className="shell py-5 text-sm" aria-label="Mock conditions summary">
        <strong>{attempt?.examConditions ? "Exam Conditions" : "Standard mock"}</strong>
        <p>{attempt?.examConditions ? `${interruptions.length} recorded interruption(s). This is a browser observation, not proof of malpractice; missing events do not prove uninterrupted work.` : "Interruption monitoring was off."}</p>
        <p>Your academic score is calculated independently of these observations.</p>
      </section>
      {/* Header */}


      {/* Main Scorecard */}
      <main className="shell section-space">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Hero Banner with Score */}
          <div className="rounded-3xl bg-gradient-to-br from-[#102F29] to-[#092E28] text-white p-6 sm:p-10 shadow-2xl relative overflow-hidden">
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold uppercase tracking-wider mb-4">
                  <Award size={14} /> OFFICIAL CBT SIMULATION SCORECARD
                </span>
                <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight leading-snug">
                  Your UTME <span className="serif-accent text-[#E7B85A]">Diagnostic Report</span>
                </h1>
                <p className="mt-2 text-sm sm:text-base text-emerald-100/90 leading-relaxed max-w-lg">
                  Server-graded against official JAMB scoring parameters. Use this breakdown to focus your study time on high-impact weak topics.
                </p>
              </div>

              {/* Total Score Badge */}
              <div className="shrink-0 rounded-3xl bg-white/10 backdrop-blur-md border border-white/15 p-6 text-center min-w-56">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-300 block">
                  AGGREGATE SCORE
                </span>
                <div className="mt-1 flex items-baseline justify-center gap-1">
                  <span className="text-5xl font-black text-white">{result.totalScore}</span>
                  <span className="text-xl text-emerald-200/70 font-semibold">/ 400</span>
                </div>
                <div className="mt-3 pt-3 border-t border-white/15 text-xs font-medium text-emerald-200">
                  Target: <strong>{targetScore}</strong> ({isTargetAchieved ? `+${scoreDifference} pts` : `${scoreDifference} pts`})
                </div>
              </div>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Answered</span>
              <div className="text-2xl font-bold text-[#092E28] mt-1">{result.totalAnswered}</div>
              <small className="text-[11px] text-slate-500">of 180 questions</small>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Correct Answers</span>
              <div className="text-2xl font-bold text-[#116149] mt-1">{result.totalCorrect}</div>
              <small className="text-[11px] text-slate-500">verified keys</small>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Time Spent</span>
              <div className="text-2xl font-bold text-[#092E28] mt-1">{spentMinutes}m {spentSeconds}s</div>
              <small className="text-[11px] text-slate-500">of 120 minutes</small>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Goal Delta</span>
              <div className={`text-2xl font-bold mt-1 ${isTargetAchieved ? 'text-[#116149]' : 'text-amber-600'}`}>
                {scoreDifference >= 0 ? `+${scoreDifference}` : scoreDifference}
              </div>
              <small className="text-[11px] text-slate-500">vs target {targetScore}</small>
            </div>
          </div>

          {/* Subject Breakdown Cards */}
          <div className="rounded-3xl border border-emerald-950/10 bg-white p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="eyebrow">SUBJECT PERFORMANCE</span>
                <h2 className="text-xl font-bold text-[#092E28] mt-1">4-Subject Score Breakdown</h2>
              </div>
              <span className="text-xs font-semibold text-slate-500">Scaled to 100 per subject</span>
            </div>

            <div className="grid gap-3.5 sm:grid-cols-2">
              {subjectScores.map((sub, idx) => {
                const percentage = sub.score;
                const isStrong = percentage >= 65;
                const isWeak = percentage < 50;

                return (
                  <div key={idx} className="p-5 rounded-2xl border border-slate-200/90 bg-[#F6F8F5] space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-[#092E28]">{sub.name}</span>
                      <span className="text-lg font-bold font-mono text-[#092E28]">{sub.score} <span className="text-xs font-normal text-slate-400">/ 100</span></span>
                    </div>

                    {/* Progress Bar */}
                    <div className="h-2.5 w-full bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isStrong ? "bg-[#116149]" : isWeak ? "bg-amber-600" : "bg-emerald-600"
                        }`}
                        style={{ width: `${Math.min(100, Math.max(5, percentage))}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Status: {isStrong ? "Strong Mastery" : isWeak ? "Needs Revision" : "Moderate"}</span>
                      <Link
                        href={`/practice?subject=${encodeURIComponent(sub.name)}`}
                        className="text-[#116149] font-semibold hover:underline"
                      >
                        Practice this subject &rarr;
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/practice"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-[#116149] px-8 py-4 text-sm font-semibold text-white shadow-md hover:bg-[#0e523e] transition-colors"
            >
              Start Focused Topic Revision <ArrowRight size={16} />
            </Link>
            <Link
              href="/dashboard"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-8 py-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Return to Dashboard
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}

    </StudyWorkspace>
  );
}
