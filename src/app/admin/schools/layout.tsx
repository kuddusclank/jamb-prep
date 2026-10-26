import { pageMetadata } from '@/lib/seo';
import type { ReactNode } from 'react';

export const metadata = pageMetadata(
  'Registered Schools & Licensing',
  'Private JAMBPrep registered schools and institutional candidate licensing administration.',
  '/admin/schools/'
);

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
