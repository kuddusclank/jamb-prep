import { pageMetadata } from '@/lib/seo';
import type { ReactNode } from 'react';
import { getCurrentUser } from '@/lib/supabase/current-user';
import { redirect } from 'next/navigation';

export const metadata = pageMetadata("Your study dashboard", "Review your UTME preparation, progress and next study steps.", "/dashboard/", false);

export default async function Layout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (user?.user_metadata?.role === 'school_admin') {
    redirect('/schools/dashboard?error=unauthorized_student_access');
  }
  return children;
}
