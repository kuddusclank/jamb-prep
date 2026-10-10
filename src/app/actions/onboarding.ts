"use server";

import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { 
  studentPreferences, 
  studentSubjects, 
  subjects 
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

export type OnboardingState = {
  error?: string;
  success?: boolean;
};

export async function saveOnboardingAction(
  prevState: OnboardingState | null, 
  formData: FormData
): Promise<OnboardingState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // If no auth user (e.g. local preview), redirect to login
  if (!user) {
    redirect("/login");
  }

  const selectedElectivesRaw = formData.get("electives") as string;
  const targetScoreRaw = formData.get("targetScore") as string;
  const targetInstitution = (formData.get("targetInstitution") as string)?.trim() || null;
  const targetCourse = (formData.get("targetCourse") as string)?.trim() || null;

  let electives: string[] = [];
  try {
    electives = JSON.parse(selectedElectivesRaw || "[]");
  } catch {
    electives = [];
  }

  if (electives.length !== 3) {
    return { error: "Please select exactly 3 elective subjects in addition to English." };
  }

  const targetScore = parseInt(targetScoreRaw, 10);
  if (isNaN(targetScore) || targetScore < 100 || targetScore > 400) {
    return { error: "Please enter a valid target score between 100 and 400." };
  }

  try {
    // 1. Ensure subjects exist in database
    const allSubjects = ["Use of English", ...electives];
    
    // Upsert student preferences
    await db.insert(studentPreferences).values({
      userId: user.id,
      targetScore,
      examYear: 2026,
      targetInstitution,
      targetCourse,
    }).onConflictDoUpdate({
      target: studentPreferences.userId,
      set: {
        targetScore,
        targetInstitution,
        targetCourse,
        updatedAt: new Date(),
      },
    });

    // Save selected subjects
    // Retrieve subject UUIDs
    for (const subName of allSubjects) {
      let subRecord = await db.query.subjects.findFirst({
        where: eq(subjects.name, subName),
      });

      if (!subRecord) {
        // Auto-seed subject if missing
        const codeMap: Record<string, string> = {
          "Use of English": "ENG",
          "Mathematics": "MTH",
          "Physics": "PHY",
          "Chemistry": "CHM",
          "Biology": "BIO",
          "Economics": "ECN",
          "Government": "GOV",
          "Literature in English": "LIT",
        };
        const [newSub] = await db.insert(subjects).values({
          name: subName,
          code: codeMap[subName] || subName.slice(0, 3).toUpperCase(),
          isCompulsory: subName === "Use of English",
          isActive: true,
        }).returning();
        subRecord = newSub;
      }

      if (subRecord) {
        await db.insert(studentSubjects).values({
          userId: user.id,
          subjectId: subRecord.id,
        }).onConflictDoNothing();
      }
    }
  } catch (err) {
    console.warn("Database notice on onboarding save:", err);
  }

  redirect("/pricing");
}

