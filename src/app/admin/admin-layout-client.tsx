"use client";
import type { ReactNode } from "react";
import { useApiResource, ResourceStatus } from "@/lib/api/use-api-resource";
import { AdminNav } from "./admin-nav";
import { useNetworkStatus, isNetworkOrTimeoutError } from "@/lib/offline/network-state";
import Link from "@/components/pending-link";
import { ArrowLeft, WifiOff } from "lucide-react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const access = useApiResource<{ authenticated: boolean }>("/api/v1/auth/admin-session");
  const { isOffline } = useNetworkStatus();
  const isNetworkFailure = access.error ? isNetworkOrTimeoutError(access.error) : false;

  return <div className="min-h-screen bg-slate-50 text-slate-900 [&_button]:min-h-11 [&_input:not([type=checkbox])]:min-h-11 [&_select]:min-h-11 [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-offset-2 [&_button:focus-visible]:outline-emerald-700">
    <AdminNav />
    <div className="lg:pl-64">
      {access.data ? (
        children
      ) : isOffline || isNetworkFailure ? (
        <main className="mx-auto max-w-2xl p-6 sm:p-10">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center space-y-4 shadow-sm">
            <div className="size-12 rounded-2xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center mx-auto">
              <WifiOff size={22} />
            </div>
            <h1 className="text-xl font-bold text-[#092E28]">Administrator Access Requires Internet</h1>
            <p className="text-sm text-slate-600 leading-relaxed max-w-md mx-auto">
              Administrative management and verification portals are strictly online-only. Offline study mode is available for student practice.
            </p>
            <div className="pt-2">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-full bg-[#116149] px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#0e523e] transition"
              >
                <ArrowLeft size={16} /> Return to Dashboard
              </Link>
            </div>
          </div>
        </main>
      ) : (
        <main className="mx-auto max-w-3xl p-6 sm:p-10">
          <h1 className="mb-4 text-2xl font-semibold">Administrator access</h1>
          <ResourceStatus error={access.error} retry={access.retry} />
        </main>
      )}
    </div>
  </div>;
}
