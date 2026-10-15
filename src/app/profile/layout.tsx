import { pageMetadata } from '@/lib/seo';
import type { ReactNode } from 'react';
export const metadata = pageMetadata("Your profile","Manage your student profile and selected subjects.","/profile/",false);
export default function Layout({children}:{children:ReactNode}){return children;}
