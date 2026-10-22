"use client";

import { useState } from "react";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { PolicyLinks } from "@/components/legal-page";
import { ArrowLeft, ArrowRight } from "lucide-react";

export default function SchoolLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Prepared for stage 3 portal connection
    setTimeout(() => {
      setLoading(false);
      window.location.href = "/schools/dashboard";
    }, 600);
  };

  return (
    <div className="min-h-screen bg-[#F8FAF7] text-[#092E28] flex flex-col justify-between">
      <header className="shell flex h-16 items-center justify-between py-4">
        <Link href="/schools" aria-label="JAMBPrep schools home" className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <span className="flex size-8 items-center justify-center rounded-xl bg-[#116149] text-white">
            <BrandMark size={28} />
          </span>
          <span>JAMBPrep</span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
            For Schools
          </span>
        </Link>
        <Link
          href="/schools/register"
          className="text-xs font-semibold text-slate-700 hover:text-slate-900 px-3 py-1.5 transition"
        >
          New School? Register
        </Link>
      </header>

      <main className="shell flex-1 flex items-center justify-center py-10">
        <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
          <Link href="/schools" className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 mb-6 transition">
            <ArrowLeft size={13} /> Back to overview
          </Link>

          <div className="mb-6">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#116149]">
              INSTITUTIONAL ACCESS
            </span>
            <h1 className="text-2xl font-bold text-[#092E28] mt-1">
              School Portal Sign In
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Sign in with your administrative or exam officer credentials to manage student rosters and view analytics.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Admin Official Email
              </label>
              <input
                type="email"
                required
                placeholder="admin@school.edu.ng"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full text-xs text-[#092E28] px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#116149]"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold text-slate-700">
                  Password
                </label>
                <Link href="/forgot-password" className="text-[11px] text-[#116149] hover:underline">
                  Forgot?
                </Link>
              </div>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full text-xs text-[#092E28] px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#116149]"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full min-h-11 rounded-full bg-[#116149] text-xs font-semibold text-white shadow-sm hover:bg-[#0c4a37] transition disabled:opacity-60 flex items-center justify-center gap-1.5"
              >
                {loading ? "Signing in..." : "Sign In to School Portal"}
                <ArrowRight size={14} />
              </button>
            </div>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500">
              Are you a student?{" "}
              <Link href="/login" className="font-semibold text-[#116149] hover:underline">
                Student Sign In
              </Link>
            </p>
          </div>
        </div>
      </main>

      <footer className="shell py-6 text-center text-xs text-slate-400">
        <PolicyLinks className="justify-center" />
      </footer>
    </div>
  );
}
