import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { studentSubjects, subjects, attempts } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { redirect } from "next/navigation";
import Link from "next/link";
import { 
  BookOpen, 
  Keyboard, 
  ArrowRight, 
  ShieldCheck, 
  CheckCircle2,
  Sparkles
} from "lucide-react";
import { MockStartButton } from "./mock-start-button";
import { getUserSubscriptionStatus } from "@/lib/subscription";

export const metadata = {
  title: "CBT Mock Exam Instructions — JAMBPrep",
  description: "JAMBPrep mock exam briefing, 180 questions, 120 minutes, 8-key hotkey guide.",
};

export default async function MockInstructionsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const subStatus = await getUserSubscriptionStatus(user.id);
  const completedMocks = await db.query.attempts.findMany({
    where: and(
      eq(attempts.userId, user.id),
      eq(attempts.mode, "mock"),
      eq(attempts.status, "completed")
    ),
  });
  const hasExhaustedFreeMock = !subStatus.isPremium && completedMocks.length >= 1;

  // Load enrolled subjects
  let enrolledSubjects: Array<{ name: string; code: string; isCompulsory: boolean }> = [];
  try {
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
    } else {
      enrolledSubjects = await db
        .select({
          name: subjects.name,
          code: subjects.code,
          isCompulsory: subjects.isCompulsory,
        })
        .from(subjects)
        .where(eq(subjects.isActive, true))
        .limit(4);
    }
  } catch (err) {
    console.warn("Notice loading enrolled subjects:", err);
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
          <div className="flex items-center gap-3 text-xs sm:text-sm font-semibold">
            <span className="px-3 py-1 rounded-full bg-emerald-100 text-[#116149]">
              Diagnostic Mock Simulation
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="shell section-space">
        <div className="max-w-3xl mx-auto space-y-8">
          {/* Header Banner */}
          <div className="rounded-3xl bg-[#102F29] text-white p-6 sm:p-10 shadow-xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold uppercase tracking-wider mb-4">
              <ShieldCheck size={14} /> YOUR MOCK EXAM BRIEFING
            </span>
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight leading-tight">
              JAMB UTME Mock <span className="serif-accent text-[#E7B85A]">Examination Briefing</span>
            </h1>
            <p className="mt-3 text-sm sm:text-base text-emerald-100/90 leading-relaxed max-w-xl">
              Practise with a timed UTME-style mock: 120 minutes, 180 questions across your 4 registered subjects, and 8-key desktop keyboard controls.
            </p>
          </div>

          {/* Test Structure & Registered Subjects */}
          <div className="rounded-3xl border border-emerald-950/10 bg-white p-6 sm:p-8 shadow-sm space-y-6">
            <h2 className="text-base font-bold text-[#092E28] uppercase tracking-wider">
              1. Your 4-Subject Combination (180 Total Questions)
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {enrolledSubjects.map((sub, idx) => (
                <div key={sub.code} className="p-4 rounded-2xl bg-[#F6F8F5] border border-slate-200">
                  <div className="font-mono text-xs font-bold text-[#116149]">{sub.code}</div>
                  <div className="text-sm font-semibold text-[#092E28] mt-1">{sub.name}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {idx === 0 ? "60 Questions" : "40 Questions"}
                  </div>
                </div>
              ))}
            </div>

            {/* 8-Key Hotkey Guide */}
            <div className="pt-4 border-t border-slate-100">
              <div className="flex items-center gap-2 mb-3 text-xs font-bold uppercase tracking-wider text-slate-700">
                <Keyboard size={16} className="text-[#116149]" /> 2. The 8-Key Desktop Hotkeys System
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                <div className="p-3 rounded-xl border border-slate-200 bg-white">
                  <span className="font-mono font-bold text-sm text-[#116149] bg-emerald-50 px-2 py-0.5 rounded">A, B, C, D</span>
                  <p className="mt-1.5 text-slate-600">Select corresponding option</p>
                </div>
                <div className="p-3 rounded-xl border border-slate-200 bg-white">
                  <span className="font-mono font-bold text-sm text-[#116149] bg-emerald-50 px-2 py-0.5 rounded">P</span>
                  <p className="mt-1.5 text-slate-600">Previous question</p>
                </div>
                <div className="p-3 rounded-xl border border-slate-200 bg-white">
                  <span className="font-mono font-bold text-sm text-[#116149] bg-emerald-50 px-2 py-0.5 rounded">N</span>
                  <p className="mt-1.5 text-slate-600">Next question</p>
                </div>
                <div className="p-3 rounded-xl border border-slate-200 bg-white">
                  <span className="font-mono font-bold text-sm text-[#116149] bg-emerald-50 px-2 py-0.5 rounded">R</span>
                  <p className="mt-1.5 text-slate-600">Reverse / deselect answer</p>
                </div>
              </div>
            </div>

            {/* Examination Hall Rules */}
            <div className="pt-4 border-t border-slate-100 space-y-2 text-xs text-slate-600">
              <div className="flex items-start gap-2">
                <CheckCircle2 size={16} className="text-[#116149] shrink-0 mt-0.5" />
                <span>The timer is server-authoritative (120 minutes) and begins immediately upon entering the hall.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 size={16} className="text-[#116149] shrink-0 mt-0.5" />
                <span>Your answers autosave continuously to your local device and sync with the database in the background.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 size={16} className="text-[#116149] shrink-0 mt-0.5" />
                <span>When 120 minutes expire, your examination will automatically submit for server grading.</span>
              </div>
            </div>

            {/* Start Button or Upgrade Prompt */}
            <div className="pt-4">
              {hasExhaustedFreeMock ? (
                <div className="rounded-2xl border-2 border-emerald-800/20 bg-emerald-50/70 p-6 text-center space-y-3">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-200/80 text-[#116149] text-xs font-bold uppercase tracking-wider">
                    <Sparkles size={13} /> DIAGNOSTIC BENCHMARK COMPLETED
                  </div>
                  <h3 className="text-xl font-bold text-[#092E28]">
                    You&apos;ve completed your free diagnostic baseline mock!
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
                    Upgrade to Premium Study Coach to unlock unlimited 180-question timed CBT simulations, full KaTeX step-by-step solutions, and personalized revision.
                  </p>
                  <div className="pt-2">
                    <Link
                      href="/pricing"
                      className="min-h-12 inline-flex items-center justify-center gap-2 rounded-full bg-[#116149] px-7 text-sm font-semibold text-white hover:bg-[#0b4936] transition-all hover:-translate-y-0.5 shadow-md shadow-[#116149]/20"
                    >
                      Upgrade to Premium (from ₦500) <ArrowRight size={15} />
                    </Link>
                  </div>
                </div>
              ) : (
                <div>
                  {subStatus.isPremium ? (
                    <div className="mb-3 flex items-center justify-center gap-1.5 text-xs text-[#116149] font-semibold bg-emerald-50 py-2 rounded-xl">
                      <Sparkles size={14} /> Premium Active • Unlimited CBT Simulations Available
                    </div>
                  ) : (
                    <div className="mb-3 flex items-center justify-center gap-1.5 text-xs text-amber-900 font-semibold bg-[#F8F2DF] py-2 rounded-xl">
                      <span>Free Diagnostic Mock (1 of 1 Remaining)</span>
                    </div>
                  )}
                  <MockStartButton />
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-emerald-950/10 bg-[#FAFBF7] py-6 text-center text-xs text-slate-500">
        JAMBPrep • Authentic Computer-Based Practice & Diagnostic Coaching for UTME Candidates
      </footer>
    </div>
  );
}
