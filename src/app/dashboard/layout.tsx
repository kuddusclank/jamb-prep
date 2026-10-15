import { pageMetadata } from '@/lib/seo';
import type { ReactNode } from 'react';
export const metadata = pageMetadata("Your study dashboard","Review your UTME preparation, progress and next study steps.","/dashboard/",false);
export default function Layout({children}:{children:ReactNode}){return children;}
