import { StudyWorkspace } from "@/components/study-workspace";
import { db } from "@/db";
import {
profiles,
studentPreferences,
studentSubjects,
subjects
} from "@/db/schema";
import { getUserSubscriptionStatus, SubscriptionStatus } from "@/lib/subscription";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { ProfileClient } from "./profile-client";

export const metadata = {
  title: "Candidate Profile & Settings — JAMBPrep",
  description: "View and edit your academic profile, target score, enrolled subjects, and subscription status.",
};

export default async function ProfilePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?redirectTo=/profile");
  }

  // Load profile, preferences, subscription, and enrolled subjects in parallel
  let profile = null;
  let preferences = null;
  let subStatus: SubscriptionStatus = { isPremium: false, expiresAt: null, daysRemaining: 0, planCode: null, autoRenew: true, cancelledAt: null };
  let enrolledRows: Array<{ name: string; code: string; isCompulsory: boolean }> = [];

  try {
    const [p, pref, sub, enrolled] = await Promise.race([
      Promise.all([
        db.query.profiles.findFirst({
          where: eq(profiles.id, user.id),
        }),
        db.query.studentPreferences.findFirst({
          where: eq(studentPreferences.userId, user.id),
        }),
        getUserSubscriptionStatus(user.id),
        db
          .select({
            name: subjects.name,
            code: subjects.code,
            isCompulsory: subjects.isCompulsory,
          })
          .from(studentSubjects)
          .innerJoin(subjects, eq(studentSubjects.subjectId, subjects.id))
          .where(eq(studentSubjects.userId, user.id)),
      ]),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Profile data timeout")), 3500)
      ),
    ]);

    profile = p;
    preferences = pref;
    subStatus = sub;
    enrolledRows = enrolled || [];
  } catch (err) {
    console.warn("Notice loading profile state:", err);
  }

  const displayName = profile?.displayName || user.user_metadata?.display_name || user.email?.split("@")[0] || "Candidate";

  return (
    <StudyWorkspace>
      {/* Header */}


      {/* Main Container */}
      <main className="shell section-space">
        <ProfileClient
          initialProfile={{
            displayName,
            email: user.email || "",
          }}
          initialPreferences={{
            targetScore: preferences?.targetScore ?? 280,
            targetInstitution: preferences?.targetInstitution ?? null,
            targetCourse: preferences?.targetCourse ?? null,
          }}
          subscription={{
            isPremium: subStatus.isPremium,
            expiresAt: subStatus.expiresAt ? subStatus.expiresAt.toISOString() : null,
            daysRemaining: subStatus.daysRemaining,
            planCode: subStatus.planCode,
            autoRenew: subStatus.autoRenew,
            cancelledAt: subStatus.cancelledAt ? subStatus.cancelledAt.toISOString() : null,
          }}
          enrolledSubjects={enrolledRows}
        />
      </main>

      {/* Footer */}

    </StudyWorkspace>
  );
}
