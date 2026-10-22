import type { Metadata } from "next";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { PolicyLinks } from "@/components/legal-page";
import { pageMetadata } from "@/lib/seo";
import { 
  CheckCircle2, 
  XCircle, 
  Monitor, 
  BarChart3, 
  Smartphone, 
  ArrowRight,
  ShieldCheck,
  Check,
  Sparkles,
  Clock,
  Keyboard,
  WifiOff,
  Flame,
  Award
} from "lucide-react";

export const metadata: Metadata = pageMetadata(
  "School & Tutorial Centre Partnerships",
  "Equip your secondary school or tutorial centre with authentic JAMB UTME computer-based practice and timed mock exams. ₦1,500/student/month.",
  "/schools/",
  true
);

export default function SchoolsPage() {
  return (
    <div className="min-h-screen bg-[#FBFDFB] text-[#092E28] flex flex-col justify-between selection:bg-emerald-200">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur">
        <div className="shell flex h-16 items-center justify-between gap-4">
          <Link href="/" aria-label="JAMBPrep home" className="flex items-center gap-2 text-lg font-bold tracking-tight">
            <span className="flex size-8 items-center justify-center rounded-xl bg-[#116149] text-white shadow-sm">
              <BrandMark size={28} />
            </span>
            <span>JAMBPrep</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
              For Schools
            </span>
          </Link>

          <nav aria-label="Institutional navigation" className="hidden items-center gap-6 text-xs font-semibold text-slate-600 md:flex">
            <a href="#lab-simulator" className="hover:text-[#116149] transition-colors">
              CBT Lab Simulator
            </a>
            <a href="#syllabus-diagnostics" className="hover:text-[#116149] transition-colors">
              Teacher Diagnostics
            </a>
            <a href="#mobile-continuity" className="hover:text-[#116149] transition-colors">
              Home & Mobile Study
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
        {/* ========================================================
            RE-ENGINEERED HERO SECTION (Bold Split Layout with Real Lab Visual)
           ======================================================== */}
        <section className="shell pt-10 pb-16 sm:pt-16 sm:pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Left Column: Clear Value Proposition */}
            <div className="lg:col-span-7 space-y-6">
              <h1 className="text-3xl sm:text-5xl lg:text-5xl font-bold tracking-tight text-[#092E28] leading-[1.12]">
                Turn your computer lab into an authentic{" "}
                <span className="serif-accent text-[#116149]">UTME examination hall.</span>
              </h1>

              <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-xl">
                Equip your secondary school or tutorial centre with authentic timed mock exams, diagnose weak syllabus topics in real time, and prepare your graduating class for top tertiary cut-off marks.
              </p>

              {/* Pricing & Terms Strip */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 max-w-lg shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Institutional Rate</span>
                    <div className="flex items-baseline gap-1.5 mt-0.5">
                      <span className="text-2xl sm:text-3xl font-extrabold text-[#116149]">₦1,500</span>
                      <span className="text-xs text-slate-500 font-medium">/ student / month</span>
                    </div>
                  </div>
                  <div className="text-xs font-medium text-slate-600 sm:text-right">
                    <span className="text-emerald-800 font-semibold block">1 to 12 Month Flexible Terms</span>
                    <span className="text-slate-400 text-[11px]">Strictly one-time invoice · No auto-debit</span>
                  </div>
                </div>

                <div className="pt-3 grid grid-cols-2 gap-2 text-xs text-slate-600 font-medium">
                  <div className="flex items-center gap-1.5">
                    <Check size={14} className="text-[#116149] shrink-0" />
                    <span>8 Core UTME Subjects</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Check size={14} className="text-[#116149] shrink-0" />
                    <span>Exact 120-Min Hall Timing</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Check size={14} className="text-[#116149] shrink-0" />
                    <span>Zero Local Server Setup</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Check size={14} className="text-[#116149] shrink-0" />
                    <span>Home & Mobile App Sync</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-1 flex flex-wrap items-center gap-3">
                <Link
                  href="/schools/register"
                  className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#116149] px-7 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-[#0c4a37] transition"
                >
                  Register Your School <ArrowRight size={15} />
                </Link>
                <Link
                  href="/schools/login"
                  className="inline-flex min-h-12 items-center rounded-full border border-slate-300 bg-white px-6 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  School Portal Sign In
                </Link>
              </div>
            </div>

            {/* Right Column: Hero Photograph with Contextual UI Overlay */}
            <div className="lg:col-span-5 relative">
              <div className="relative rounded-3xl overflow-hidden border border-slate-200 bg-slate-100 shadow-xl shadow-emerald-950/5">
                <img
                  src="/images/schools/hero-lab.jpg"
                  alt="Nigerian secondary school students taking JAMB CBT practice in a modern school computer lab"
                  className="w-full h-auto object-cover aspect-[4/3] block"
                  width={800}
                  height={600}
                  loading="eager"
                />

                {/* Simulated Floating UI Overlays */}
                <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-2xl px-3.5 py-2 shadow-md flex items-center gap-2.5">
                  <span className="size-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <div className="text-left">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Exam Hall Simulation</span>
                    <span className="text-xs font-bold text-[#092E28] font-mono">118:42 Remaining</span>
                  </div>
                </div>

                <div className="absolute bottom-4 right-4 bg-[#092E28]/95 backdrop-blur-md text-white border border-emerald-900/40 rounded-2xl p-3 shadow-lg max-w-[210px] text-left">
                  <div className="flex items-center gap-1.5 text-emerald-300 text-[11px] font-semibold mb-0.5">
                    <Award size={13} /> Cohort Readiness
                  </div>
                  <div className="text-lg font-bold tracking-tight">284 / 400</div>
                  <p className="text-[10px] text-emerald-100/75 mt-0.5 leading-snug">
                    Class average tracking +38 pts above last year&apos;s cut-off.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================
            FULL-WIDTH FEATURE 1: Computer Lab CBT Simulator
           ======================================================== */}
        <section id="lab-simulator" className="border-t border-slate-200/80 bg-white py-16 sm:py-24">
          <div className="shell">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">
              {/* Image Left */}
              <div className="lg:col-span-6 order-2 lg:order-1 relative">
                <div className="rounded-3xl overflow-hidden border border-slate-200 bg-slate-100 shadow-lg">
                  <img
                    src="/images/schools/hero-lab.jpg"
                    alt="Students seated at desktop PCs in computer lab taking timed JAMB mock tests"
                    className="w-full h-auto object-cover aspect-[16/10] block"
                    width={800}
                    height={500}
                    loading="lazy"
                  />
                </div>

                {/* Keyboard Hotkey Badge */}
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-slate-700 font-semibold">
                    <Keyboard size={16} className="text-[#116149]" />
                    <span>JAMB 8-Key Hotkeys:</span>
                  </div>
                  <div className="flex items-center gap-1 font-mono text-[11px] font-bold">
                    <span className="px-2 py-0.5 rounded bg-white border border-slate-300 shadow-xs">A</span>
                    <span className="px-2 py-0.5 rounded bg-white border border-slate-300 shadow-xs">B</span>
                    <span className="px-2 py-0.5 rounded bg-white border border-slate-300 shadow-xs">C</span>
                    <span className="px-2 py-0.5 rounded bg-white border border-slate-300 shadow-xs">D</span>
                    <span className="text-slate-300 px-1">•</span>
                    <span className="px-2 py-0.5 rounded bg-white border border-slate-300 shadow-xs">P</span>
                    <span className="px-2 py-0.5 rounded bg-white border border-slate-300 shadow-xs">N</span>
                    <span className="px-2 py-0.5 rounded bg-white border border-slate-300 shadow-xs">S</span>
                    <span className="px-2 py-0.5 rounded bg-white border border-slate-300 shadow-xs">R</span>
                  </div>
                </div>
              </div>

              {/* Content Right */}
              <div className="lg:col-span-6 order-1 lg:order-2 space-y-5">
                <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#116149]">
                  <Monitor size={15} />
                  <span>Lab & Browser Ready</span>
                </div>

                <h2 className="text-2xl sm:text-4xl font-bold text-[#092E28] tracking-tight leading-tight">
                  Zero local servers. Zero software installations.
                </h2>

                <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                  Forget about purchasing dedicated school servers, fragile CD-ROM installations, or configuring local intranet IP addresses. JAMBPrep runs directly in Google Chrome or any modern browser on the desktop PCs, laptops, or Chromebooks already in your computer laboratory.
                </p>

                <div className="space-y-3 pt-2">
                  <div className="flex items-start gap-3">
                    <div className="size-6 rounded-full bg-emerald-100 text-[#116149] flex items-center justify-center shrink-0 mt-0.5">
                      <Check size={14} />
                    </div>
                    <div>
                      <strong className="block text-sm font-semibold text-slate-900">Official 8-Key Desktop Navigation</strong>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Students build authentic muscle memory with JAMB hotkeys (<code className="bg-slate-100 px-1 py-0.5 rounded text-[11px]">A,B,C,D,P,N,S,R</code>), eliminating mouse hesitation on exam day.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="size-6 rounded-full bg-emerald-100 text-[#116149] flex items-center justify-center shrink-0 mt-0.5">
                      <Check size={14} />
                    </div>
                    <div>
                      <strong className="block text-sm font-semibold text-slate-900">Synchronized Hall Mocks</strong>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Exam officers and teachers can run batch mock sessions for 10 to 500+ candidates simultaneously under strict 120-minute countdown rules.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="size-6 rounded-full bg-emerald-100 text-[#116149] flex items-center justify-center shrink-0 mt-0.5">
                      <Check size={14} />
                    </div>
                    <div>
                      <strong className="block text-sm font-semibold text-slate-900">Offline Network Resilient</strong>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Tests are pre-cached locally. If school Wi-Fi temporarily drops or flickers, students continue testing uninterrupted and answers reconcile automatically.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================
            FULL-WIDTH FEATURE 2: Teacher Diagnostics & Syllabus Heatmap
           ======================================================== */}
        <section id="syllabus-diagnostics" className="border-t border-slate-200/80 bg-[#FBFDFB] py-16 sm:py-24">
          <div className="shell">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">
              {/* Content Left */}
              <div className="lg:col-span-6 space-y-5">
                <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#116149]">
                  <BarChart3 size={15} />
                  <span>Syllabus Remedial Radar</span>
                </div>

                <h2 className="text-2xl sm:text-4xl font-bold text-[#092E28] tracking-tight leading-tight">
                  Know exactly what to teach in class on Monday morning.
                </h2>

                <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                  Traditional mock exams only tell you who passed and who failed. JAMBPrep aggregates thousands of question attempts across your entire cohort into an actionable syllabus heatmap so teachers know exactly which topics require classroom revision.
                </p>

                <div className="space-y-3 pt-2">
                  <div className="flex items-start gap-3">
                    <div className="size-6 rounded-full bg-emerald-100 text-[#116149] flex items-center justify-center shrink-0 mt-0.5">
                      <Check size={14} />
                    </div>
                    <div>
                      <strong className="block text-sm font-semibold text-slate-900">Pinpoint High-Failure Curriculum Topics</strong>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Instantly see when 60% of students fail Organic Chemistry or Concord idioms, allowing teachers to hold focused revision classes before the real UTME.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="size-6 rounded-full bg-emerald-100 text-[#116149] flex items-center justify-center shrink-0 mt-0.5">
                      <Check size={14} />
                    </div>
                    <div>
                      <strong className="block text-sm font-semibold text-slate-900">Individual Candidate Drilldowns</strong>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Inspect any student’s full subject combination, target university score, practice frequency, and topic accuracy breakdown in one click.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="size-6 rounded-full bg-emerald-100 text-[#116149] flex items-center justify-center shrink-0 mt-0.5">
                      <Check size={14} />
                    </div>
                    <div>
                      <strong className="block text-sm font-semibold text-slate-900">Study Streak & Engagement Tracking</strong>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Track which students practice consistently every day and identify disengaged candidates who need motivation or guidance.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Visual Right: Teacher Photograph + Simulated Diagnostic Heatmap Card */}
              <div className="lg:col-span-6 relative">
                <div className="rounded-3xl overflow-hidden border border-slate-200 bg-slate-100 shadow-lg">
                  <img
                    src="/images/schools/teacher-diagnostics.jpg"
                    alt="Nigerian teacher guiding high school student with educational analytics charts"
                    className="w-full h-auto object-cover aspect-[16/10] block"
                    width={800}
                    height={500}
                    loading="lazy"
                  />
                </div>

                {/* Simulated Heatmap Card Overlay */}
                <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-2.5 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">Class Syllabus Diagnostic Sample</span>
                    <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full">50 Candidates</span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-700 font-medium truncate max-w-[200px]">Chemistry: Organic Nomenclature</span>
                      <span className="text-red-700 font-bold bg-red-50 border border-red-200 px-2 py-0.5 rounded text-[10px]">32% (Remedial Needed)</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-700 font-medium truncate max-w-[200px]">English: Concord & Inversion</span>
                      <span className="text-amber-800 font-bold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[10px]">54% (Average)</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-700 font-medium truncate max-w-[200px]">Physics: Mechanics & Vectors</span>
                      <span className="text-[#116149] font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[10px]">82% (Mastered)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================
            FULL-WIDTH FEATURE 3: Lab to Living Room Mobile Continuity
           ======================================================== */}
        <section id="mobile-continuity" className="border-t border-slate-200/80 bg-white py-16 sm:py-24">
          <div className="shell">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">
              {/* Image Left */}
              <div className="lg:col-span-6 relative">
                <div className="rounded-3xl overflow-hidden border border-slate-200 bg-slate-100 shadow-lg">
                  <img
                    src="/images/schools/student-mobile-study.jpg"
                    alt="Nigerian student continuing UTME practice at home on a tablet in the evening"
                    className="w-full h-auto object-cover aspect-[16/10] block"
                    width={800}
                    height={500}
                    loading="lazy"
                  />
                </div>

                {/* Mobile Sync Pill */}
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-slate-700 font-semibold">
                    <Smartphone size={16} className="text-[#116149]" />
                    <span>Cross-Device Cloud Sync:</span>
                  </div>
                  <span className="text-[11px] font-bold text-[#116149] bg-emerald-100/70 px-2.5 py-0.5 rounded-full">
                    Computer Lab ⇄ Smartphone ⇄ Tablet
                  </span>
                </div>
              </div>

              {/* Content Right */}
              <div className="lg:col-span-6 space-y-5">
                <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#116149]">
                  <Smartphone size={15} />
                  <span>Lab to Living Room</span>
                </div>

                <h2 className="text-2xl sm:text-4xl font-bold text-[#092E28] tracking-tight leading-tight">
                  Learning doesn&apos;t stop when the school bell rings.
                </h2>

                <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                  Every student license provisioned by your school includes full desktop and mobile access. Candidates can take supervised mock examinations in your computer lab by day, and continue revising weak topics on their smartphones at home by night.
                </p>

                <div className="space-y-3 pt-2">
                  <div className="flex items-start gap-3">
                    <div className="size-6 rounded-full bg-emerald-100 text-[#116149] flex items-center justify-center shrink-0 mt-0.5">
                      <Check size={14} />
                    </div>
                    <div>
                      <strong className="block text-sm font-semibold text-slate-900">Effortless Account Setup</strong>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Student accounts are created with their email address and their last name in capital letters as the default password. No complicated password handoffs.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="size-6 rounded-full bg-emerald-100 text-[#116149] flex items-center justify-center shrink-0 mt-0.5">
                      <Check size={14} />
                    </div>
                    <div>
                      <strong className="block text-sm font-semibold text-slate-900">Seamless Progress Sync</strong>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Mock results, topic mastery ratings, and review bookmarks sync securely to the candidate&apos;s cloud profile across all devices.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="size-6 rounded-full bg-emerald-100 text-[#116149] flex items-center justify-center shrink-0 mt-0.5">
                      <Check size={14} />
                    </div>
                    <div>
                      <strong className="block text-sm font-semibold text-slate-900">100% Included in the ₦1,500/Month Rate</strong>
                      <p className="text-xs text-slate-600 mt-0.5">
                        No additional fees for mobile apps or home studying. One flat institutional fee covers the entire student experience.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================
            DIRECT COMPARISON MATRIX
           ======================================================== */}
        <section id="comparison" className="shell py-16 sm:py-20 border-t border-slate-200/80">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#116149]">Institutional Evaluation</span>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#092E28] mt-1">
              Why top secondary schools choose JAMBPrep
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Ditch unmaintained offline CD software and photocopied question papers for an authentic digital assessment system.
            </p>
          </div>

          <div className="max-w-4xl mx-auto overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="p-4">Feature / Capability</th>
                  <th className="p-4 text-[#116149] bg-emerald-50/60 font-extrabold">JAMBPrep for Schools</th>
                  <th className="p-4 text-slate-600">Paper Past Question Books</th>
                  <th className="p-4 text-slate-600">Legacy Desktop CD Software</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                <tr>
                  <td className="p-4 font-semibold text-slate-900">120-Min Timed CBT Hall Simulation</td>
                  <td className="p-4 bg-emerald-50/30 text-[#116149] font-semibold flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-emerald-600 shrink-0" /> Full 8-key simulation
                  </td>
                  <td className="p-4 text-slate-400 flex items-center gap-1.5">
                    <XCircle size={14} className="text-slate-400 shrink-0" /> None (paper only)
                  </td>
                  <td className="p-4 text-slate-500">Partial or outdated</td>
                </tr>

                <tr>
                  <td className="p-4 font-semibold text-slate-900">Computer Lab Installation</td>
                  <td className="p-4 bg-emerald-50/30 text-[#116149] font-semibold">
                    Zero install (runs in Chrome)
                  </td>
                  <td className="p-4 text-slate-500">Desks & print printing</td>
                  <td className="p-4 text-slate-500">Windows PC local setup per device</td>
                </tr>

                <tr>
                  <td className="p-4 font-semibold text-slate-900">Teacher Syllabus Diagnostics</td>
                  <td className="p-4 bg-emerald-50/30 text-[#116149] font-semibold flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-emerald-600 shrink-0" /> Real-time topic heatmaps
                  </td>
                  <td className="p-4 text-slate-400 flex items-center gap-1.5">
                    <XCircle size={14} className="text-slate-400 shrink-0" /> Manual grading by hand
                  </td>
                  <td className="p-4 text-slate-400 flex items-center gap-1.5">
                    <XCircle size={14} className="text-slate-400 shrink-0" /> No cohort aggregation
                  </td>
                </tr>

                <tr>
                  <td className="p-4 font-semibold text-slate-900">Home & Mobile Student Practice</td>
                  <td className="p-4 bg-emerald-50/30 text-[#116149] font-semibold flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-emerald-600 shrink-0" /> Included for every student
                  </td>
                  <td className="p-4 text-slate-500">Physical book must be carried</td>
                  <td className="p-4 text-slate-400 flex items-center gap-1.5">
                    <XCircle size={14} className="text-slate-400 shrink-0" /> Lab-locked only
                  </td>
                </tr>

                <tr>
                  <td className="p-4 font-semibold text-slate-900">Pricing Structure</td>
                  <td className="p-4 bg-emerald-50/30 text-[#116149] font-semibold">
                    ₦1,500 / student / month
                  </td>
                  <td className="p-4 text-slate-500">₦2,500 – ₦5,000 / subject book</td>
                  <td className="p-4 text-slate-500">₦100k+ upfront CD licenses</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* ========================================================
            COMMON FAQS
           ======================================================== */}
        <section id="faqs" className="shell py-16 sm:py-20 border-t border-slate-200/80">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#116149]">Answers for Administrators</span>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#092E28] mt-1">
              Frequently asked questions
            </h2>
          </div>

          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-600 leading-relaxed">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-1.5">
              <strong className="block text-slate-900 text-sm font-semibold">
                What are the computer lab requirements?
              </strong>
              <p>
                JAMBPrep runs in Google Chrome or any modern browser on standard desktop PCs, laptops, Chromebooks, and tablets. There are no executable files to download and no local servers to configure.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-1.5">
              <strong className="block text-slate-900 text-sm font-semibold">
                How do teachers create student accounts?
              </strong>
              <p>
                In the School Portal, administrators can create students one-by-one, upload a class CSV roster for instant batch creation, or share a unique school registration link for students to self-enroll.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-1.5">
              <strong className="block text-slate-900 text-sm font-semibold">
                What is the default student login password?
              </strong>
              <p>
                For accounts provisioned by the school, the student logs in with their email address and their last name in capital letters (e.g. <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px]">AKANBI</code>). They can customize it upon first sign-in.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-1.5">
              <strong className="block text-slate-900 text-sm font-semibold">
                How does payment work for schools?
              </strong>
              <p>
                Select the students you wish to activate and choose 1 to 12 months. Pay securely via Paystack using Nigerian debit cards, bank transfer, or institutional EFT. Invoices are strictly one-time with zero recurring debit.
              </p>
            </div>
          </div>
        </section>

        {/* ========================================================
            FINAL CALL TO ACTION
           ======================================================== */}
        <section className="shell pb-20 max-w-4xl mx-auto">
          <div className="rounded-3xl bg-[#092E28] p-8 sm:p-12 text-white text-center space-y-5 shadow-lg">
            <h3 className="text-2xl sm:text-4xl font-bold tracking-tight">
              Ready to enroll your school or tutorial cohort?
            </h3>

            <p className="max-w-xl mx-auto text-xs sm:text-sm text-emerald-100/80 leading-relaxed">
              Register your institution in under two minutes, import your student roster, and begin computer-based mock testing immediately.
            </p>

            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/schools/register"
                className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#116149] px-7 text-xs sm:text-sm font-semibold text-white shadow-md hover:bg-[#0c4a37] transition"
              >
                Register Your School <ArrowRight size={15} />
              </Link>
              <Link
                href="/schools/login"
                className="inline-flex min-h-12 items-center rounded-full border border-emerald-700/60 bg-emerald-950/40 px-6 text-xs sm:text-sm font-semibold text-white hover:bg-emerald-900/60 transition"
              >
                Sign In to School Portal
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Clean Minimalist Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-10 text-center text-xs text-slate-400">
        <div className="shell flex flex-col items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-bold text-[#092E28]">
            <BrandMark size={20} />
            <span>JAMBPrep for Schools</span>
          </div>
          <p className="max-w-md text-slate-500 text-[11px]">
            Institutional UTME computer-based practice, diagnostics, and cohort monitoring. An initiative of LecternIQ.
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
