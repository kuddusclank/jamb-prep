import AdminLayoutClient from './admin-layout-client';
import { pageMetadata } from '@/lib/seo';
import type { ReactNode } from 'react';
export const metadata=pageMetadata('Administration','Private JAMBPrep administration.','/admin/');
export default function Layout({children}:{children:ReactNode}){return <AdminLayoutClient>{children}</AdminLayoutClient>;}
