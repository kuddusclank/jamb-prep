import { pageMetadata } from '@/lib/seo';
import type { ReactNode } from 'react';
import { getCurrentUser } from '@/lib/supabase/current-user';
import { redirect } from 'next/navigation';

export const metadata = pageMetadata(
  "School & Tutorial Centre Portal",
  "Institutional UTME computer lab simulation, student rosters, and syllabus diagnostics.",
  "/schools/dashboard/",
  false
);

export default async function SchoolDashboardLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/schools/login?redirectTo=/schools/dashboard');
  }

  const role = user.user_metadata?.role || 'student';
  if (role === 'student') {
    redirect('/dashboard?error=unauthorized_school_portal');
  }

  return children;
}
