"use client";

import { useState } from "react";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { PolicyLinks } from "@/components/legal-page";
import { ArrowLeft, Building2, ShieldCheck, ArrowRight } from "lucide-react";

const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", 
  "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT Abuja", "Gombe", 
  "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", 
  "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", 
  "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara"
];

export default function SchoolRegisterPage() {
  const [formData, setFormData] = useState({
    schoolName: "",
    schoolType: "secondary_school",
    state: "Lagos",
    adminName: "",
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulates initial school account registration handshake
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 700);
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
          href="/schools/login"
          className="text-xs font-semibold text-slate-700 hover:text-slate-900 px-3 py-1.5 transition"
        >
          Already registered? Sign In
        </Link>
      </header>

      <main className="shell flex-1 flex items-center justify-center py-10">
        <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
          <Link href="/schools" className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 mb-6 transition">
            <ArrowLeft size={13} /> Back to overview
          </Link>

          <div className="mb-6">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#116149]">
              INSTITUTIONAL ONBOARDING
            </span>
            <h1 className="text-2xl font-bold text-[#092E28] mt-1">
              Register Your School
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Create an administrative account to enroll students, generate school invite codes, and track mock results.
            </p>
          </div>

          {submitted ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-5 text-center space-y-3">
              <div className="size-10 rounded-full bg-[#116149] text-white flex items-center justify-center mx-auto">
                <ShieldCheck size={20} />
              </div>
              <h3 className="text-base font-bold text-[#092E28]">School Registered</h3>
              <p className="text-xs text-slate-600">
                Administrative account created for <strong>{formData.schoolName || "your institution"}</strong>.
              </p>
              <div className="pt-2">
                <Link
                  href="/schools/login"
                  className="inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-full bg-[#116149] px-4 text-xs font-semibold text-white shadow-sm hover:bg-[#0c4a37] transition"
                >
                  Proceed to School Sign In <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  School or Institution Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. King's College Lagos"
                  value={formData.schoolName}
                  onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                  className="w-full text-xs text-[#092E28] px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#116149]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Institution Type
                  </label>
                  <select
                    value={formData.schoolType}
                    onChange={(e) => setFormData({ ...formData, schoolType: e.target.value })}
                    className="w-full text-xs text-[#092E28] px-2.5 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-[#116149]"
                  >
                    <option value="secondary_school">Secondary School</option>
                    <option value="tutorial_centre">Tutorial Centre</option>
                    <option value="college">College / Academy</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    State *
                  </label>
                  <select
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full text-xs text-[#092E28] px-2.5 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-[#116149]"
                  >
                    {NIGERIAN_STATES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Administrator / Principal Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Olumide Adeleke"
                  value={formData.adminName}
                  onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
                  className="w-full text-xs text-[#092E28] px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#116149]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Admin Official Email *
                </label>
                <input
                  type="email"
                  required
                  placeholder="admin@school.edu.ng"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full text-xs text-[#092E28] px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#116149]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Administrative Password *
                </label>
                <input
                  type="password"
                  required
                  placeholder="At least 8 characters"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full text-xs text-[#092E28] px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#116149]"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full min-h-11 rounded-full bg-[#116149] text-xs font-semibold text-white shadow-sm hover:bg-[#0c4a37] transition disabled:opacity-60"
                >
                  {loading ? "Creating School Account..." : "Create School Account"}
                </button>
              </div>

              <p className="text-[11px] text-slate-400 text-center pt-2">
                By registering, you agree to JAMBPrep’s institutional terms. Student records are encrypted and protected.
              </p>
            </form>
          )}
        </div>
      </main>

      <footer className="shell py-6 text-center text-xs text-slate-400">
        <PolicyLinks className="justify-center" />
      </footer>
    </div>
  );
}
