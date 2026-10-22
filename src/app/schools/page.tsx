import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { PolicyLinks } from "@/components/legal-page";
import { pageMetadata } from "@/lib/seo";
import { SchoolCalculatorClient } from "./school-calculator-client";
import { 
  Building2, 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  Monitor, 
  Users, 
  ShieldCheck, 
  Sparkles,
  ArrowRight
} from "lucide-react";

export const metadata: Metadata = pageMetadata(
  "School & Tutorial Centre Partnerships",
  "Equip your secondary school, college, or tutorial centre with authentic JAMB UTME computer-based practice and timed mock exams. Bulk licensing at ₦1,500/student/month.",
  "/schools/",
  true
);

export default function SchoolsPage() {
  return (
    <div className="min-h-screen bg-[#F6F8F5] text-[#092E28] flex flex-col justify-between selection:bg-emerald-200">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 border-b border-emerald-950/10 bg-[#fafbf7]/95 backdrop-blur-lg">
        <div className="shell flex h-20 items-center justify-between gap-4">
          <Link href="/" aria-label="JAMBPrep home" className="flex items-center gap-2 text-xl font-bold tracking-tight">
            <span className="flex size-9 items-center justify-center rounded-xl bg-[#116149] text-white">
              <BrandMark size={36} />
            </span>
            <span>JAMBPrep</span>
          </Link>

          <nav aria-label="Institutional navigation" className="hidden items-center gap-6 text-sm text-slate-600 md:flex">
            <a href="#calculator" className="hover:text-[#116149] font-medium transition-colors">
              Pricing Calculator
            </a>
            <a href="#comparison" className="hover:text-[#116149] font-medium transition-colors">
              Comparison
            </a>
            <a href="#apply" className="hover:text-[#116149] font-medium transition-colors">
              Request Onboarding
            </a>
            <a href="#faqs" className="hover:text-[#116149] font-medium transition-colors">
              FAQs
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/pricing"
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors hidden sm:inline-block"
            >
              Candidate Plans
            </Link>
            <a
              href="#apply"
              className="rounded-full bg-[#116149] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#0c4a37] transition-colors"
            >
              Partner With Us
            </a>
          </div>
        </div>
      </header>

      <main id="main" className="flex-1">
        {/* Hero Section */}
        <section className="shell pt-12 pb-14 sm:pt-20 sm:pb-16 text-center max-w-4xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100/80 border border-emerald-200 text-[#116149] text-xs font-bold uppercase tracking-wider">
            <Building2 size={14} className="text-[#116149]" />
            Institutional Cohort Licensing
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[#092E28] leading-[1.12]">
            Turn your computer lab into an authentic{" "}
            <span className="serif-accent text-[#116149]">UTME examination hall.</span>
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-lg text-slate-600 leading-relaxed">
            Secondary schools and tutorial centres across Nigeria use JAMBPrep to run simulated CBT mocks, 
            diagnose weak subjects, and prepare entire graduating classes for top tertiary admissions.
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-4 text-xs sm:text-sm text-slate-700">
            <span className="inline-flex items-center gap-1.5 font-medium">
              <CheckCircle2 size={16} className="text-[#116149]" />
              <strong>₦1,500</strong> / student / month
            </span>
            <span className="hidden sm:inline text-slate-300">•</span>
            <span className="inline-flex items-center gap-1.5 font-medium">
              <CheckCircle2 size={16} className="text-[#116149]" />
              Authentic 8-key CBT simulation
            </span>
            <span className="hidden sm:inline text-slate-300">•</span>
            <span className="inline-flex items-center gap-1.5 font-medium">
              <CheckCircle2 size={16} className="text-[#116149]" />
              Zero installation or server setup
            </span>
          </div>
        </section>

        {/* Interactive Calculator & Application Form */}
        <section id="calculator" className="shell pb-16">
          <Suspense fallback={<div className="h-96 rounded-3xl bg-white border border-slate-200 animate-pulse" />}>
            <SchoolCalculatorClient />
          </Suspense>
        </section>

        {/* Feature Comparison Matrix */}
        <section id="comparison" className="shell py-16 border-t border-slate-200/80">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-[#116149]">Institutional Comparison</span>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#092E28] mt-2">
              Why leading educators choose JAMBPrep over legacy alternatives
            </h2>
            <p className="text-sm text-slate-600 mt-3">
              Eliminate outdated CD-ROM software, unmaintained local school servers, and static photocopied past question booklets.
            </p>
          </div>

          <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm text-slate-700 border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs uppercase tracking-wider font-bold">
                  <th className="p-4 sm:p-5 text-slate-500">Capability</th>
                  <th className="p-4 sm:p-5 text-[#116149] bg-emerald-50/60 font-extrabold">JAMBPrep for Schools</th>
                  <th className="p-4 sm:p-5 text-slate-600">Local CD / Desktop Apps</th>
                  <th className="p-4 sm:p-5 text-slate-600">Paper Past Questions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                <tr>
                  <td className="p-4 sm:p-5 font-medium text-slate-900">Authentic 8-key CBT Keyboard Navigation</td>
                  <td className="p-4 sm:p-5 bg-emerald-50/30 font-semibold text-[#116149] flex items-center gap-1.5">
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0" /> Full hall simulation
                  </td>
                  <td className="p-4 sm:p-5 text-slate-500">Partial or outdated</td>
                  <td className="p-4 sm:p-5 text-slate-400 flex items-center gap-1.5">
                    <XCircle size={16} className="text-slate-400 shrink-0" /> None (paper only)
                  </td>
                </tr>

                <tr>
                  <td className="p-4 sm:p-5 font-medium text-slate-900">Lab Hardware Requirements</td>
                  <td className="p-4 sm:p-5 bg-emerald-50/30 font-semibold text-[#116149]">
                    Any modern browser (no installs)
                  </td>
                  <td className="p-4 sm:p-5 text-slate-500">Windows OS only; local installs</td>
                  <td className="p-4 sm:p-5 text-slate-500">Desks and printing ink</td>
                </tr>

                <tr>
                  <td className="p-4 sm:p-5 font-medium text-slate-900">At-Home & Mobile Student Practice</td>
                  <td className="p-4 sm:p-5 bg-emerald-50/30 font-semibold text-[#116149] flex items-center gap-1.5">
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0" /> Included for all students
                  </td>
                  <td className="p-4 sm:p-5 text-slate-400 flex items-center gap-1.5">
                    <XCircle size={16} className="text-slate-400 shrink-0" /> Lab-locked licenses
                  </td>
                  <td className="p-4 sm:p-5 text-slate-500">Physical book required</td>
                </tr>

                <tr>
                  <td className="p-4 sm:p-5 font-medium text-slate-900">Question Accuracy & Explanations</td>
                  <td className="p-4 sm:p-5 bg-emerald-50/30 font-semibold text-[#116149] flex items-center gap-1.5">
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0" /> Detailed coaching on all answers
                  </td>
                  <td className="p-4 sm:p-5 text-slate-500">Answer keys only, rarely verified</td>
                  <td className="p-4 sm:p-5 text-slate-500">Frequent typos and errata</td>
                </tr>

                <tr>
                  <td className="p-4 sm:p-5 font-medium text-slate-900">Pricing Model</td>
                  <td className="p-4 sm:p-5 bg-emerald-50/30 font-semibold text-[#116149]">
                    ₦1,500 / student / month (flexible terms)
                  </td>
                  <td className="p-4 sm:p-5 text-slate-500">High upfront license fees (₦100k+)</td>
                  <td className="p-4 sm:p-5 text-slate-500">₦2,500 – ₦5,000 per subject booklet</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Institutional FAQs */}
        <section id="faqs" className="shell py-16 border-t border-slate-200/80">
          <div className="max-w-2xl mx-auto text-center mb-10">
            <span className="text-xs font-bold uppercase tracking-wider text-[#116149]">Frequently Asked Questions</span>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#092E28] mt-2">
              Everything your school board needs to know
            </h2>
          </div>

          <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 text-xs sm:text-sm text-slate-600 leading-relaxed">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-2">
              <strong className="block font-semibold text-slate-800 text-sm">
                What are the technical requirements for our computer lab?
              </strong>
              <p>
                JAMBPrep runs in any standard web browser (Chrome, Edge, Safari, Firefox) on desktop PCs, laptops, Chromebooks, and tablets. There are no executable files to download, no server to configure, and no complex firewall rules.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-2">
              <strong className="block font-semibold text-slate-800 text-sm">
                Can students also use their accounts at home?
              </strong>
              <p>
                Yes! Student accounts are personal and cloud-synced. Once provisioned by the school, candidates can practise in your school lab during class hours and continue studying on their smartphones or home PCs in the evenings.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-2">
              <strong className="block font-semibold text-slate-800 text-sm">
                How does payment work for schools?
              </strong>
              <p>
                We issue a formal digital invoice with integer kobo breakdown. Payments are processed securely via Paystack via Nigerian debit card, bank transfer, or institutional electronic funds transfer (EFT). Invoices are strictly one-time with no unexpected auto-debit.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-2">
              <strong className="block font-semibold text-slate-800 text-sm">
                How fast is cohort onboarding?
              </strong>
              <p>
                Once an application is submitted and confirmed, cohort access codes are generated within 12 hours. Teachers can distribute activation passes directly or upload a simple student roster spreadsheet for bulk activation.
              </p>
            </div>
          </div>
        </section>

        {/* CTA Banner */}
        <section className="shell pb-20">
          <div className="rounded-3xl bg-[#092E28] p-8 sm:p-12 text-white text-center max-w-4xl mx-auto space-y-6">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-900/60 text-emerald-300 text-xs font-semibold">
              <Sparkles size={13} />
              Empowering Nigerian Secondary Education
            </span>
            <h3 className="text-2xl sm:text-4xl font-bold tracking-tight">
              Ready to elevate your school&apos;s UTME performance?
            </h3>
            <p className="max-w-xl mx-auto text-sm sm:text-base text-emerald-100/80 leading-relaxed">
              Calculate your cohort quote in seconds and submit your application to schedule a walkthrough with our education partnership team.
            </p>
            <div className="pt-2">
              <a
                href="#calculator"
                className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#116149] px-7 font-semibold text-white shadow-lg hover:bg-[#0c4a37] transition"
              >
                Calculate Cohort Quote <ArrowRight size={16} />
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-10 text-center text-xs text-slate-500">
        <div className="shell flex flex-col items-center gap-4">
          <div className="flex items-center gap-2 text-base font-bold text-[#092E28]">
            <BrandMark size={24} />
            <span>JAMBPrep for Schools</span>
          </div>
          <p className="max-w-md text-slate-400">
            A specialized institutional service of LecternIQ. Empowering schools and tutorial centres with purposeful digital CBT assessment.
          </p>
          <PolicyLinks className="justify-center" />
          <p className="text-slate-400">
            © {new Date().getFullYear()} LecternIQ · Independent UTME preparation platform.
          </p>
        </div>
      </footer>
    </div>
  );
}
