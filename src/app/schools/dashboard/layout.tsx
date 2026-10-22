import { pageMetadata } from '@/lib/seo';
import type { ReactNode } from 'react';

export const metadata = pageMetadata(
  "School & Tutorial Centre Portal",
  "Institutional UTME computer lab simulation, student rosters, and syllabus diagnostics.",
  "/schools/dashboard/",
  false
);

export default function SchoolDashboardLayout({ children }: { children: ReactNode }) {
  return children;
}
