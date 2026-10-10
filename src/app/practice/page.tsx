import { StudyWorkspace } from "@/components/study-workspace";
import { db } from "@/db";
import { studentSubjects,subjects } from "@/db/schema";
import { getUserSubscriptionStatus } from "@/lib/subscription";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
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
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const subStatus = await getUserSubscriptionStatus(user.id);

  // If a free tier user attempts topic-specific practice, redirect to pricing
  if (!subStatus.isPremium && queryTopic) {
    redirect("/pricing");
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
    <StudyWorkspace>
      {/* Header */}


      {/* Main Practice Container */}
      <main className="shell section-space">
        <PracticeClient 
          enrolledSubjects={enrolledSubjects} 
          initialSubjectCode={querySubject}
          initialTopicSlug={queryTopic}
          isPremium={subStatus.isPremium}
        />
      </main>

      {/* Footer */}

    </StudyWorkspace>
  );
}
