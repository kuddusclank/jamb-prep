import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { PolicyLinks } from "@/components/legal-page";
import { pageMetadata } from "@/lib/seo";
import { SchoolCalculatorClient } from "./school-calculator-client";
import { 
  CheckCircle2, 
  XCircle, 
  Monitor, 
  BarChart3, 
  Smartphone, 
  ArrowRight,
  ShieldCheck
} from "lucide-react";

export const metadata: Metadata = pageMetadata(
  "School & Tutorial Centre Partnerships",
  "Equip your secondary school or tutorial centre with authentic JAMB UTME computer-based practice and timed mock exams. ₦1,500/student/month.",
  "/schools/",
  true
);

export default function SchoolsPage() {
  return (
    <div className="min-h-screen bg-[#F8FAF7] text-[#092E28] flex flex-col justify-between">
      {/* Clean Top Navigation */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur">
        <div className="shell flex h-16 items-center justify-between gap-4">
          <Link href="/" aria-label="JAMBPrep home" className="flex items-center gap-2 text-lg font-bold tracking-tight">
            <span className="flex size-8 items-center justify-center rounded-xl bg-[#116149] text-white">
              <BrandMark size={28} />
            </span>
            <span>JAMBPrep</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
              For Schools
            </span>
          </Link>

          <nav aria-label="Institutional navigation" className="hidden items-center gap-6 text-xs font-medium text-slate-600 md:flex">
            <a href="#features" className="hover:text-[#116149] transition-colors">
              Features
            </a>
            <a href="#estimator" className="hover:text-[#116149] transition-colors">
              Pricing Calculator
            </a>
            <a href="#comparison" className="hover:text-[#116149] transition-colors">
              Comparison
            </a>
            <a href="#faqs" className="hover:text-[#116149] transition-colors">
              FAQs
            </a>
          </nav>

          <div className="flex items-center gap-2.5">
            <Link
              href="/schools/login"
              className="text-xs font-semibold text-slate-700 hover:text-slate-900 px-3 py-1.5 transition-colors"
            >
              School Sign In
            </Link>
            <Link
              href="/schools/register"
              className="rounded-full bg-[#116149] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#0c4a37] transition-colors"
            >
              Register School
            </Link>
          </div>
        </div>
      </header>

      <main id="main" className="flex-1">
        {/* Direct Hero Section */}
        <section className="shell pt-12 pb-10 sm:pt-16 sm:pb-14 text-center max-w-3xl mx-auto space-y-4">
          <span className="inline-block text-[11px] font-bold uppercase tracking-wider text-[#116149] px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100">
            Institutional CBT Licensing
          </span>

          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-[#092E28] leading-tight">
            JAMB UTME CBT Practice for Schools & Tutorial Centres
          </h1>

          <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Equip your computer lab with authentic timed mock exams, diagnose student weak topics, and prepare your graduating class for top tertiary cut-off marks.
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/schools/register"
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-[#116149] px-6 text-xs font-semibold text-white shadow-sm hover:bg-[#0c4a37] transition"
            >
              Register Your School <ArrowRight size={14} />
            </Link>
            <Link
              href="/schools/login"
              className="inline-flex min-h-11 items-center rounded-full border border-slate-300 bg-white px-5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              School Portal Sign In
            </Link>
          </div>

          <div className="pt-4 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-500">
            <span>• ₦1,500 / student / month</span>
            <span>• 1 to 12 Month Flexible Terms</span>
            <span>• Zero Software Installation</span>
            <span>• Non-Recurring Invoicing</span>
          </div>
        </section>

        {/* Cohort Investment Calculator */}
        <section className="shell pb-14 max-w-4xl mx-auto">
          <Suspense fallback={<div className="h-72 rounded-2xl bg-white border border-slate-200 animate-pulse" />}>
            <SchoolCalculatorClient />
          </Suspense>
        </section>

        {/* 3 Core Capabilities */}
        <section id="features" className="shell py-12 max-w-4xl mx-auto border-t border-slate-200/70">
          <div className="text-center mb-8">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#116149]">Built for Nigerian Classrooms</span>
            <h2 className="text-xl sm:text-2xl font-bold text-[#092E28] mt-1">
              Everything your teachers need to prepare candidates
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-2.5">
              <div className="size-9 rounded-xl bg-emerald-50 text-[#116149] flex items-center justify-center">
                <Monitor size={18} />
              </div>
              <h3 className="text-sm font-bold text-[#092E28]">Lab & Browser Ready</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Runs directly in Google Chrome on existing school PCs, laptops, and Chromebooks. No server setup, CDs, or IT overhead required.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-2.5">
              <div className="size-9 rounded-xl bg-emerald-50 text-[#116149] flex items-center justify-center">
                <BarChart3 size={18} />
              </div>
              <h3 className="text-sm font-bold text-[#092E28]">Syllabus Focus Diagnostics</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Teachers see cohort accuracy by topic across English, Mathematics, and Sciences, pinpointing weak areas for classroom remedial lessons.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-2.5">
              <div className="size-9 rounded-xl bg-emerald-50 text-[#116149] flex items-center justify-center">
                <Smartphone size={18} />
              </div>
              <h3 className="text-sm font-bold text-[#092E28]">Lab & Home Continuity</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Student accounts sync to cloud storage. Candidates practice in school labs and continue studying on their smartphones at home.
              </p>
            </div>
          </div>
        </section>

        {/* Clean Comparison Matrix */}
        <section id="comparison" className="shell py-12 max-w-4xl mx-auto border-t border-slate-200/70">
          <div className="text-center mb-8">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#116149]">Direct Comparison</span>
            <h2 className="text-xl sm:text-2xl font-bold text-[#092E28] mt-1">
              Why schools switch to JAMBPrep
            </h2>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="p-3.5 sm:p-4">Capability</th>
                  <th className="p-3.5 sm:p-4 text-[#116149] bg-emerald-50/60 font-extrabold">JAMBPrep for Schools</th>
                  <th className="p-3.5 sm:p-4 text-slate-600">Paper Past Questions</th>
                  <th className="p-3.5 sm:p-4 text-slate-600">Legacy Desktop CDs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                <tr>
                  <td className="p-3.5 sm:p-4 font-semibold text-slate-900">120-Min Timed CBT Hall Simulation</td>
                  <td className="p-3.5 sm:p-4 bg-emerald-50/30 text-[#116149] font-semibold flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-emerald-600 shrink-0" /> Full 8-key simulation
                  </td>
                  <td className="p-3.5 sm:p-4 text-slate-400 flex items-center gap-1.5">
                    <XCircle size={14} className="text-slate-400 shrink-0" /> None
                  </td>
                  <td className="p-3.5 sm:p-4 text-slate-500">Partial</td>
                </tr>

                <tr>
                  <td className="p-3.5 sm:p-4 font-semibold text-slate-900">Lab Hardware Requirements</td>
                  <td className="p-3.5 sm:p-4 bg-emerald-50/30 text-[#116149] font-semibold">
                    Any web browser (zero install)
                  </td>
                  <td className="p-3.5 sm:p-4 text-slate-500">Desks & printed books</td>
                  <td className="p-3.5 sm:p-4 text-slate-500">Windows PC local install</td>
                </tr>

                <tr>
                  <td className="p-3.5 sm:p-4 font-semibold text-slate-900">Student Mobile Access at Home</td>
                  <td className="p-3.5 sm:p-4 bg-emerald-50/30 text-[#116149] font-semibold flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-emerald-600 shrink-0" /> Included for every student
                  </td>
                  <td className="p-3.5 sm:p-4 text-slate-500">Book must be carried</td>
                  <td className="p-3.5 sm:p-4 text-slate-400 flex items-center gap-1.5">
                    <XCircle size={14} className="text-slate-400 shrink-0" /> Lab-locked only
                  </td>
                </tr>

                <tr>
                  <td className="p-3.5 sm:p-4 font-semibold text-slate-900">Pricing Model</td>
                  <td className="p-3.5 sm:p-4 bg-emerald-50/30 text-[#116149] font-semibold">
                    ₦1,500 / student / month
                  </td>
                  <td className="p-3.5 sm:p-4 text-slate-500">₦2,500 – ₦5,000 / subject book</td>
                  <td className="p-3.5 sm:p-4 text-slate-500">₦100k+ upfront CD licenses</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* 4 Concise FAQs */}
        <section id="faqs" className="shell py-12 max-w-4xl mx-auto border-t border-slate-200/70">
          <div className="text-center mb-8">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#116149]">Common Questions</span>
            <h2 className="text-xl sm:text-2xl font-bold text-[#092E28] mt-1">
              Frequently asked questions
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-600 leading-relaxed">
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-1">
              <strong className="block text-slate-800 text-sm font-semibold">
                What are the computer lab requirements?
              </strong>
              <p>
                JAMBPrep runs in any standard browser (Chrome, Edge, Safari) on desktop PCs, laptops, Chromebooks, and tablets. No executable files or servers required.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-1">
              <strong className="block text-slate-800 text-sm font-semibold">
                How do teachers create student accounts?
              </strong>
              <p>
                Through your School Portal: add students one by one, upload a simple CSV class roster, or share your school’s unique registration link for self-enrollment.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-1">
              <strong className="block text-slate-800 text-sm font-semibold">
                What is the default password for students?
              </strong>
              <p>
                When created by the school, the student signs in with their email and their last name in capital letters (e.g. AKANBI). They can update it after first sign-in.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-1">
              <strong className="block text-slate-800 text-sm font-semibold">
                How does payment work?
              </strong>
              <p>
                Select the students you want to activate and choose 1 to 12 months. Pay securely via Paystack debit card or bank transfer. Invoices are strictly one-time with zero recurring debit.
              </p>
            </div>
          </div>
        </section>

        {/* Clean Call to Action */}
        <section className="shell pb-16 max-w-4xl mx-auto">
          <div className="rounded-2xl bg-[#092E28] p-8 sm:p-10 text-white text-center space-y-4">
            <h3 className="text-xl sm:text-3xl font-bold tracking-tight">
              Ready to enroll your school or tutorial cohort?
            </h3>
            <p className="max-w-lg mx-auto text-xs sm:text-sm text-emerald-100/80 leading-relaxed">
              Register your institution in under two minutes, import your student roster, and begin computer-based mock testing immediately.
            </p>
            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/schools/register"
                className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-[#116149] px-6 text-xs font-semibold text-white shadow hover:bg-[#0c4a37] transition"
              >
                Register Your School <ArrowRight size={14} />
              </Link>
              <Link
                href="/schools/login"
                className="inline-flex min-h-11 items-center rounded-full border border-emerald-700/60 bg-emerald-950/40 px-5 text-xs font-semibold text-white hover:bg-emerald-900/60 transition"
              >
                Sign In to School Portal
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Clean Minimalist Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-8 text-center text-xs text-slate-400">
        <div className="shell flex flex-col items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-bold text-[#092E28]">
            <BrandMark size={20} />
            <span>JAMBPrep for Schools</span>
          </div>
          <p className="max-w-md text-slate-500 text-[11px]">
            Institutional UTME computer-based practice and diagnostics. An initiative of LecternIQ.
          </p>
          <PolicyLinks className="justify-center" />
          <p className="text-[11px]">
            © {new Date().getFullYear()} LecternIQ · Independent UTME preparation platform.
          </p>
        </div>
      </footer>
    </div>
  );
}
