import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { studentSubjects, subjects } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import Link from "next/link";
import { BookOpen, ArrowLeft } from "lucide-react";
import { PracticeClient } from "./practice-client";

export const metadata = {
  title: "Self-Paced Practice — JAMBPrep",
  description: "Focused UTME topic practice with step-by-step diagnostic solutions and formulas.",
};

interface PracticePageProps {
  searchParams: Promise<{ subject?: string; topic?: string }>;
}

export default async function PracticePage({ searchParams }: PracticePageProps) {
  const { subject: querySubject, topic: queryTopic } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Load candidate's chosen subjects from database
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
      // Fallback to core subjects if onboarding wasn't completed
      const defaultSubs = await db
        .select({
          name: subjects.name,
          code: subjects.code,
          isCompulsory: subjects.isCompulsory,
        })
        .from(subjects)
        .where(eq(subjects.isActive, true))
        .limit(4);
      enrolledSubjects = defaultSubs;
    }
  } catch (err) {
    console.warn("Notice loading enrolled subjects:", err);
  }

  return (
    <div className="min-h-screen bg-[#F6F8F5] text-[#092E28] flex flex-col justify-between">
      {/* Header */}
      <header className="border-b border-emerald-950/10 bg-[#FAFBF7]">
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

          <div className="flex items-center gap-4 text-xs sm:text-sm font-semibold">
            <span className="px-3 py-1 rounded-full bg-emerald-100 text-[#116149]">
              15 Free Daily Questions
            </span>
          </div>
        </div>
      </header>

      {/* Main Practice Container */}
      <main className="shell section-space">
        <PracticeClient 
          enrolledSubjects={enrolledSubjects} 
          initialSubjectCode={querySubject}
          initialTopicSlug={queryTopic}
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-emerald-950/10 bg-[#FAFBF7] py-6 text-center text-xs text-slate-500">
        JAMBPrep • Authentic Computer-Based Practice & Diagnostic Coaching for UTME Candidates
      </footer>
    </div>
  );
}
