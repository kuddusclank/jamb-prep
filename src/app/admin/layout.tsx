import AdminLayoutClient from './admin-layout-client';
import { pageMetadata } from '@/lib/seo';
import type { ReactNode } from 'react';
import { getCurrentUser } from '@/lib/supabase/current-user';
import { redirect } from 'next/navigation';

export const metadata = pageMetadata('Administration', 'Private JAMBPrep administration.', '/admin/');

export default async function Layout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login?redirectTo=/admin');
  }

  const role = user.user_metadata?.role;
  if (role === 'school_admin') {
    redirect('/schools/dashboard?error=unauthorized_admin');
  }
  if (role !== 'admin') {
    redirect('/dashboard?error=unauthorized_admin');
  }

  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
