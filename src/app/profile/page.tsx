import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { 
  profiles, 
  studentPreferences, 
  studentSubjects, 
  subjects 
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import { ProfileClient } from "./profile-client";
import { UserDropdown } from "@/components/user-dropdown";
import { getUserSubscriptionStatus } from "@/lib/subscription";

export const metadata = {
  title: "Candidate Profile & Settings — JAMBPrep",
  description: "View and edit your academic profile, target score, enrolled subjects, and subscription status.",
};

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirectTo=/profile");
  }

  // Load profile, preferences, subscription, and enrolled subjects in parallel
  const [profile, preferences, subStatus, enrolledRows] = await Promise.all([
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
  ]);

  const displayName = profile?.displayName || user.user_metadata?.display_name || user.email?.split("@")[0] || "Candidate";

  return (
    <div className="min-h-screen bg-[#F6F8F5] text-[#092E28] flex flex-col justify-between">
      {/* Header */}
      <header className="border-b border-emerald-950/10 bg-[#FAFBF7] sticky top-0 z-30">
        <div className="shell flex h-20 items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 text-xl font-bold tracking-tight">
            <span className="flex size-9 items-center justify-center rounded-xl bg-[#116149] text-white">
              <BookOpen size={20} />
            </span>
            <span>jambprep<span className="text-[#116149]">.</span></span>
          </Link>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
            <Link href="/dashboard" className="hover:text-[#116149] transition-colors">
              Dashboard
            </Link>
            <Link 
              href={subStatus.isPremium ? "/practice" : "/pricing"} 
              className="hover:text-[#116149] transition-colors"
            >
              Topic Practice
            </Link>
            <Link href="/mock" className="hover:text-[#116149] transition-colors">
              CBT Simulation
            </Link>
            <Link 
              href={subStatus.isPremium ? "/analytics" : "/pricing"} 
              className="hover:text-[#116149] transition-colors"
            >
              Performance
            </Link>
            <Link href="/profile" className="text-[#116149] font-bold">
              Profile
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <UserDropdown
              user={{ name: displayName, email: user.email }}
              isPremium={subStatus.isPremium}
              expiresAt={subStatus.expiresAt}
            />
          </div>
        </div>
      </header>

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
          }}
          enrolledSubjects={enrolledRows}
        />
      </main>

      {/* Footer */}
      <footer className="shell py-8 border-t border-emerald-950/10 text-xs text-slate-500 text-center">
        © 2026 JAMBPrep. Know what to study next.
      </footer>
    </div>
  );
}
