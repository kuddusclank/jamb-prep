"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useBrowserAccount } from "@/components/browser-account-boundary";
import { signOutAction } from "@/lib/client-actions";

export function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { session } = useBrowserAccount();

  useEffect(() => {
    if (session.status === "unauthenticated") {
      router.replace(`/login?redirect=${encodeURIComponent(pathname || "/admin")}`);
    }
  }, [session.status, pathname, router]);

  const navLinks = [
    { label: "Overview", href: "/admin/" },
    { label: "Question Library", href: "/admin/questions/" },
    { label: "New Question", href: "/admin/questions/edit/" },
    { label: "CSV Import", href: "/admin/import/" },
    { label: "Curriculum", href: "/admin/curriculum/" },
    { label: "Student Reports", href: "/admin/reports/" },
  ];

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <Link href="/admin/" className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight text-[#116149]">
              JAMBPrep
            </span>
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
              Admin Portal
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-4 text-sm">
          <Link
            href="/dashboard"
            className="hidden font-medium text-slate-600 hover:text-[#116149] sm:inline-block"
          >
            ← Student Dashboard
          </Link>
          <span className="hidden text-xs text-slate-400 sm:inline">|</span>
          <span className="font-mono text-xs text-slate-500">
            {session.user?.email ?? "Administrator"}
          </span>
          <button
            onClick={() => void signOutAction()}
            type="button"
            className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50"
          >
            Sign out
          </button>
        </div>
      </div>

      <nav className="mx-auto flex max-w-7xl overflow-x-auto px-4 sm:px-6">
        <ul className="flex items-center gap-1 border-t border-slate-100 py-1 text-sm font-medium text-slate-600 sm:border-0 sm:py-0">
          {navLinks.map((link) => {
            const isActive =
              link.href === "/admin/"
                ? pathname === "/admin" || pathname === "/admin/"
                : pathname.startsWith(link.href.replace(/\/$/, ""));
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={`inline-block whitespace-nowrap rounded-lg px-3 py-2 transition-colors ${
                    isActive
                      ? "bg-[#116149]/10 font-semibold text-[#116149]"
                      : "hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
