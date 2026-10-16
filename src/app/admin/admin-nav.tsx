"use client";

import { BrandMark } from "@/components/brand-mark";
import {Menu,X} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useBrowserAccount } from "@/components/browser-account-boundary";
import { buildLoginRedirectUrl } from "@/lib/auth/redirect";
import { signOutAction } from "@/lib/client-actions";

export function AdminNav() {
  const [mobileOpen,setMobileOpen]=useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { session } = useBrowserAccount();

  useEffect(() => {
    if (session.status === "unauthenticated") {
      router.replace(buildLoginRedirectUrl(pathname || "/admin/"));
    }
  }, [session.status, pathname, router]);

  const navLinks = [
    { label: "Overview", href: "/admin/" },
    { label: "Question Library", href: "/admin/questions/" },
    { label: "New Question", href: "/admin/questions/edit/" },
    { label: "CSV Import", href: "/admin/import/" },
    { label: "Mock blueprints", href: "/admin/assessment/" },
    { label: "Curriculum", href: "/admin/curriculum/" },
    { label: "Passages", href: "/admin/passages/" },
    { label: "Support", href: "/admin/support/" },
    { label: "System health", href: "/admin/system/" },
    { label: "Activity log", href: "/admin/audit/" },
    { label: "Student Reports", href: "/admin/reports/" },
    { label: "App ratings", href: "/admin/app-ratings/" },
  ];

  return (
    <header className="border-b border-slate-200 bg-white lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex lg:w-64 lg:flex-col lg:border-b-0 lg:border-r">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-5 lg:flex-col lg:items-start lg:px-6">
        <div className="flex items-center gap-3">
          <BrandMark size={32}/>
          <Link href="/admin/" className="flex flex-wrap items-center gap-2">
            <span className="text-xl font-bold tracking-tight text-[#116149]">
              JAMBPrep
            </span>
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
              Admin Portal
            </span>
          </Link>
        </div>

        <button type="button" aria-controls="admin-navigation" aria-expanded={mobileOpen} onClick={()=>setMobileOpen(open=>!open)} className="rounded-xl border border-slate-200 p-2 lg:hidden" aria-label={mobileOpen?"Close administration menu":"Open administration menu"}>{mobileOpen?<X size={22}/>:<Menu size={22}/>}</button>
        <div className="flex min-w-0 flex-wrap items-center gap-3 text-sm lg:mt-4 lg:w-full">
          <Link
            href="/dashboard"
            className="hidden font-medium text-slate-600 hover:text-[#116149] sm:inline-block"
          >
            ← Student Dashboard
          </Link>
          <span className="hidden text-xs text-slate-400 sm:inline">|</span>
          <span className="max-w-48 truncate text-xs text-slate-500">
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

      <nav id="admin-navigation" className={`${mobileOpen?"block":"hidden"} px-4 pb-4 lg:block lg:flex-1 lg:overflow-y-auto lg:px-3 lg:pt-4`}>
        <ul className="grid grid-cols-2 gap-1 text-sm font-medium text-slate-600 lg:flex lg:flex-col">
          {navLinks.map((link) => {
            const isActive =
              link.href === "/admin/"
                ? pathname === "/admin" || pathname === "/admin/"
                : link.href === "/admin/questions/" ? pathname.replace(/\/$/, "") === "/admin/questions" : pathname.startsWith(link.href.replace(/\/$/, ""));
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={()=>setMobileOpen(false)}
                  aria-current={isActive ? "page" : undefined}
                  className={`block whitespace-nowrap rounded-xl px-4 py-3 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 ${
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
