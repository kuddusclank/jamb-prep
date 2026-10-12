"use client";
import type { ReactNode } from "react";
import { useApiResource, ResourceStatus } from "@/lib/api/use-api-resource";
import { AdminNav } from "./admin-nav";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const access = useApiResource<{ authenticated: boolean }>("/api/v1/auth/admin-session");
  return <div className="min-h-screen bg-slate-50 text-slate-900">
    <AdminNav />
    <div className="lg:pl-64">
      {access.data ? children : <main className="mx-auto max-w-3xl p-6 sm:p-10"><h1 className="mb-4 text-2xl font-semibold">Administrator access</h1><ResourceStatus error={access.error} retry={access.retry} /></main>}
    </div>
  </div>;
}
