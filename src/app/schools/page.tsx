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
  Keyboard,
  Award,
  ChevronDown
} from "lucide-react";

export const metadata: Metadata = pageMetadata(
  "School & Tutorial Centre Partnerships",
  "The complete CBT assessment platform for Nigerian secondary schools and tutorial centres. ₦1,500/student/month.",
  "/schools/",
  true
);

export default function SchoolsPage() {
  return (
    <div className="min-h-screen bg-white text-[#092E28] flex flex-col justify-between selection:bg-emerald-200">
      {/* ========================================================
          TOP NAVIGATION BAR (Clean with Segmented Switcher)
         ======================================================== */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
        <div className="shell flex h-20 items-center justify-between gap-4">
          {/* Brand + Segmented Toggle */}
          <div className="flex items-center gap-4 shrink-0">
            <Link href="/" aria-label="JAMBPrep home" className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-[#092E28]">
              <span className="flex size-9 items-center justify-center rounded-xl bg-[#116149] text-white shadow-xs">
                <BrandMark size={30} />
              </span>
              <span className="font-bold tracking-tight">JAMBPrep</span>
            </Link>

            {/* Segmented Toggle Pill (like reference screenshot) */}
            <div className="hidden sm:inline-flex items-center rounded-full bg-slate-100 p-1 border border-slate-200 text-xs font-semibold">
              <Link 
                href="/" 
                className="px-3.5 py-1 rounded-full text-slate-500 hover:text-slate-900 transition whitespace-nowrap"
              >
                Candidates
              </Link>
              <span className="px-3.5 py-1 rounded-full bg-white text-[#092E28] shadow-xs font-bold whitespace-nowrap">
                For Schools
              </span>
            </div>
          </div>

          {/* Right Action Button */}
          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/schools/register"
              className="rounded-full bg-slate-900 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-[#116149] transition-colors whitespace-nowrap"
            >
              Register School
            </Link>
          </div>
        </div>
      </header>

      <main id="main" className="flex-1">
        {/* ========================================================
            HERO SECTION (Centered & Balanced at Exact Viewport Height)
           ======================================================== */}
        <section className="relative h-[calc(100dvh-5rem)] min-h-[640px] flex flex-col items-center justify-center text-center overflow-hidden bg-slate-50 px-4">
          {/* Full-Bleed Lab Image Background (No School Name on Walls) */}
          <div className="absolute inset-0 z-0 pointer-events-none select-none">
            <img
              src="/images/schools/hero-backdrop.jpg"
              alt="Modern CBT computer examination laboratory with secondary school students"
              className="w-full h-full object-cover object-bottom"
              width={1800}
              height={1000}
              loading="eager"
            />
            {/* Pure white top backdrop transitioning smoothly to reveal lab in lower half */}
            <div className="absolute inset-0 bg-gradient-to-b from-white via-white via-50% to-white/10" />
            {/* Bottom blend into the subsequent content */}
            <div className="absolute inset-x-0 bottom-0 h-24 sm:h-28 bg-gradient-to-t from-white via-white/80 to-transparent" />
          </div>

          {/* Centered Editorial Content (Balanced in Center of Hero Viewport) */}
          <div className="shell relative z-10 max-w-4xl mx-auto space-y-5 sm:space-y-6 my-auto">
            {/* Editorial Serif Display Headline */}
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-serif font-normal tracking-tight text-[#092E28] leading-[1.08]">
              The Complete CBT Platform<br className="hidden sm:inline" /> for Modern Nigerian Schools.
            </h1>

            {/* Subtitle */}
            <p className="max-w-2xl mx-auto text-base sm:text-lg text-slate-700 leading-relaxed font-normal">
              Turn your computer lab into an authentic UTME hall. Synchronized mock exams, real-time teacher syllabus diagnostics, and bulk student licensing across all 36 states.
            </p>

            {/* Centered CTA Buttons */}
            <div className="pt-2 flex flex-wrap items-center justify-center gap-3.5">
              <Link
                href="/schools/register"
                className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#112F28] px-8 text-sm font-semibold text-white shadow-md hover:bg-[#071F1A] transition whitespace-nowrap"
              >
                Register your school today! <ArrowRight size={15} />
              </Link>
              <Link
                href="/schools/login"
                className="inline-flex min-h-12 items-center rounded-full border border-slate-300 bg-white/95 backdrop-blur-xs px-7 text-sm font-semibold text-[#092E28] hover:bg-white transition shadow-xs whitespace-nowrap"
              >
                School portal sign in
              </Link>
            </div>

            {/* Social Proof / Geographies Row (High-Contrast Protected Backdrop) */}
            <div className="pt-4 sm:pt-6">
              <div className="inline-flex flex-col items-center rounded-2xl bg-white/95 backdrop-blur-md px-6 py-3 border border-slate-200/90 shadow-xs">
                <span className="text-[11px] uppercase font-bold text-slate-500 tracking-wider block">
                  Prepared for secondary schools and tutorial centres nationwide
                </span>
                <div className="mt-2 flex flex-wrap items-center justify-center gap-3.5 sm:gap-6 text-xs sm:text-sm font-bold text-[#092E28]">
                  <span>Lagos State</span>
                  <span className="text-slate-300">•</span>
                  <span>Abuja (FCT)</span>
                  <span className="text-slate-300">•</span>
                  <span>Rivers State</span>
                  <span className="text-slate-300">•</span>
                  <span>Oyo State</span>
                  <span className="text-slate-300">•</span>
                  <span>Ogun & Kano</span>
                  <span className="text-slate-300">•</span>
                  <span>Edo & Kaduna</span>
                </div>
              </div>
            </div>
          </div>

          {/* Contextual Floating Overlay Badges Anchored to Bottom */}
          <div className="shell absolute bottom-4 sm:bottom-6 inset-x-0 z-10 w-full flex flex-col sm:flex-row items-center justify-between gap-3 pointer-events-none">
            <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl px-4 py-2 shadow-lg flex items-center gap-3 pointer-events-auto">
              <span className="size-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <div className="text-left">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Synchronized Hall Simulation</span>
                <span className="text-xs font-bold text-[#092E28] font-mono">120:00 Countdown · Official 8-Key Controls</span>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-[#092E28]/95 backdrop-blur-md text-white border border-emerald-900/40 rounded-2xl px-4 py-2 shadow-lg text-xs font-semibold pointer-events-auto">
              <span className="size-2 rounded-full bg-emerald-400" />
              <span>₦1,500 / student / month · Zero lab servers</span>
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
            DIRECT COMPARISON MATRIX (High-End SaaS Differences Table)
           ======================================================== */}
        <section id="comparison" className="shell py-20 sm:py-28 border-t border-slate-200/80 bg-slate-50/50">
          <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16 space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-100 text-[#116149] text-xs font-bold uppercase tracking-wider">
              <Sparkles size={13} />
              <span>Institutional Capability Comparison</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-serif font-normal text-[#092E28] tracking-tight">
              Why top secondary schools are replacing legacy CD software.
            </h2>
            <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
              Compare how modern browser-based CBT simulation stacks up against outdated desktop CDs and photocopied past question booklets.
            </p>
          </div>

          <div className="max-w-5xl mx-auto">
            <div className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm border-collapse min-w-[680px]">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-700 font-bold">
                      <th className="py-5 px-6 w-[36%] text-xs uppercase tracking-wider text-slate-400">Capability</th>
                      <th className="py-5 px-6 w-[28%] bg-emerald-50/80 text-[#092E28] border-x border-emerald-200/80">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-sm text-[#116149]">JAMBPrep for Schools</span>
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-[#116149] text-white px-2 py-0.5 rounded-full">
                            Modern CBT
                          </span>
                        </div>
                      </th>
                      <th className="py-5 px-5 w-[18%] text-slate-600 font-semibold text-xs">Legacy Desktop CDs</th>
                      <th className="py-5 px-5 w-[18%] text-slate-600 font-semibold text-xs">Paper Past Books</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    <tr className="hover:bg-slate-50/50 transition">
                      <td className="py-4 px-6 font-semibold text-slate-900">
                        <span className="block text-sm">Official 8-Key UTME Hall Simulation</span>
                        <span className="text-xs text-slate-500 font-normal mt-0.5 block">Standardized 120-minute timer with A, B, C, D, P, N, S, R hotkeys</span>
                      </td>
                      <td className="py-4 px-6 bg-emerald-50/40 border-x border-emerald-200/80">
                        <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#116149]">
                          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                          <span>Authentic 1:1 JAMB Engine</span>
                        </div>
                      </td>
                      <td className="py-4 px-5 text-slate-500 text-xs">
                        <div className="inline-flex items-center gap-1.5 text-slate-500">
                          <XCircle size={15} className="text-amber-500 shrink-0" />
                          <span>Mouse-click only</span>
                        </div>
                      </td>
                      <td className="py-4 px-5 text-slate-400 text-xs">
                        <div className="inline-flex items-center gap-1.5 text-slate-400">
                          <XCircle size={15} className="text-slate-400 shrink-0" />
                          <span>Zero simulation</span>
                        </div>
                      </td>
                    </tr>

                    <tr className="hover:bg-slate-50/50 transition">
                      <td className="py-4 px-6 font-semibold text-slate-900">
                        <span className="block text-sm">Lab Hardware & Installation</span>
                        <span className="text-xs text-slate-500 font-normal mt-0.5 block">Setup requirements for school computer workstations</span>
                      </td>
                      <td className="py-4 px-6 bg-emerald-50/40 border-x border-emerald-200/80">
                        <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#116149]">
                          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                          <span>Zero install (Chrome browser)</span>
                        </div>
                      </td>
                      <td className="py-4 px-5 text-slate-500 text-xs">
                        <span>Requires manual Windows setup per PC</span>
                      </td>
                      <td className="py-4 px-5 text-slate-500 text-xs">
                        <span>Desks, pens & print copies</span>
                      </td>
                    </tr>

                    <tr className="hover:bg-slate-50/50 transition">
                      <td className="py-4 px-6 font-semibold text-slate-900">
                        <span className="block text-sm">Teacher Syllabus Diagnostics</span>
                        <span className="text-xs text-slate-500 font-normal mt-0.5 block">Aggregated topic accuracy heatmaps across entire class</span>
                      </td>
                      <td className="py-4 px-6 bg-emerald-50/40 border-x border-emerald-200/80">
                        <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#116149]">
                          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                          <span>Real-time topic analytics</span>
                        </div>
                      </td>
                      <td className="py-4 px-5 text-slate-500 text-xs">
                        <div className="inline-flex items-center gap-1.5 text-slate-400">
                          <XCircle size={15} className="text-slate-400 shrink-0" />
                          <span>Scores trapped on single PC</span>
                        </div>
                      </td>
                      <td className="py-4 px-5 text-slate-500 text-xs">
                        <div className="inline-flex items-center gap-1.5 text-slate-400">
                          <XCircle size={15} className="text-slate-400 shrink-0" />
                          <span>Manual hand grading</span>
                        </div>
                      </td>
                    </tr>

                    <tr className="hover:bg-slate-50/50 transition">
                      <td className="py-4 px-6 font-semibold text-slate-900">
                        <span className="block text-sm">Mobile & Home Study Access</span>
                        <span className="text-xs text-slate-500 font-normal mt-0.5 block">Continuity beyond the school computer lab</span>
                      </td>
                      <td className="py-4 px-6 bg-emerald-50/40 border-x border-emerald-200/80">
                        <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#116149]">
                          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                          <span>Included on phone & tablet</span>
                        </div>
                      </td>
                      <td className="py-4 px-5 text-slate-500 text-xs">
                        <div className="inline-flex items-center gap-1.5 text-slate-400">
                          <XCircle size={15} className="text-slate-400 shrink-0" />
                          <span>Lab-locked only</span>
                        </div>
                      </td>
                      <td className="py-4 px-5 text-slate-500 text-xs">
                        <span>Heavy books must be carried</span>
                      </td>
                    </tr>

                    <tr className="hover:bg-slate-50/50 transition">
                      <td className="py-4 px-6 font-semibold text-slate-900">
                        <span className="block text-sm">Question Bank & Syllabus Updates</span>
                        <span className="text-xs text-slate-500 font-normal mt-0.5 block">New syllabus texts, verified corrections & novel questions</span>
                      </td>
                      <td className="py-4 px-6 bg-emerald-50/40 border-x border-emerald-200/80">
                        <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#116149]">
                          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                          <span>Continuous cloud updates</span>
                        </div>
                      </td>
                      <td className="py-4 px-5 text-slate-500 text-xs">
                        <span>Static; must buy new CDs</span>
                      </td>
                      <td className="py-4 px-5 text-slate-500 text-xs">
                        <span>New printed edition every year</span>
                      </td>
                    </tr>

                    <tr className="hover:bg-slate-50/50 transition bg-emerald-50/10">
                      <td className="py-4 px-6 font-semibold text-slate-900">
                        <span className="block text-sm">Pricing Model</span>
                        <span className="text-xs text-slate-500 font-normal mt-0.5 block">Transparent cohort invoicing</span>
                      </td>
                      <td className="py-4 px-6 bg-emerald-100/40 border-x border-emerald-200/80">
                        <strong className="block text-sm font-bold text-[#116149]">₦1,500 / student / month</strong>
                        <span className="text-[11px] text-emerald-800">One-time payment, no lock-in</span>
                      </td>
                      <td className="py-4 px-5 text-slate-700 text-xs">
                        <span className="font-semibold text-slate-900">₦100k+ upfront</span>
                        <span className="block text-slate-400 text-[11px] mt-0.5">+ technician support fees</span>
                      </td>
                      <td className="py-4 px-5 text-slate-700 text-xs">
                        <span className="font-semibold text-slate-900">₦2,500 – ₦5,000</span>
                        <span className="block text-slate-400 text-[11px] mt-0.5">per subject booklet</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================
            COMMON FAQS (Modern Accordion UI with Clean Details)
           ======================================================== */}
        <section id="faqs" className="shell py-20 sm:py-28 border-t border-slate-200/80 bg-white">
          <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[#116149]">Institutional FAQs</span>
            <h2 className="text-3xl sm:text-5xl font-serif font-normal text-[#092E28] tracking-tight">
              Frequently asked questions.
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal">
              Everything school administrators, principals, and ICT directors need to know about setting up and running JAMBPrep.
            </p>
          </div>

          <div className="max-w-3xl mx-auto space-y-3.5">
            <details className="group rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 transition-all duration-200 hover:border-slate-300 open:border-emerald-200 open:bg-emerald-50/20 open:shadow-xs">
              <summary className="flex cursor-pointer items-center justify-between text-base font-semibold text-[#092E28] select-none list-none [&::-webkit-details-marker]:hidden">
                <span>What are the computer lab hardware and network requirements?</span>
                <span className="ml-4 flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-transform duration-200 group-open:rotate-180 group-open:bg-[#116149] group-open:text-white">
                  <ChevronDown size={18} />
                </span>
              </summary>
              <div className="mt-3.5 pt-3 border-t border-slate-100 text-sm text-slate-600 leading-relaxed space-y-2">
                <p>
                  JAMBPrep runs directly inside Google Chrome or any modern web browser. It operates flawlessly on standard school desktop PCs, laptops, Chromebooks, and tablets.
                </p>
                <p>
                  Because it is lightweight, you do not need expensive dedicated lab servers, software dongles, or local database installations. Once loaded, exams run smoothly even over modest school internet connections.
                </p>
              </div>
            </details>

            <details className="group rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 transition-all duration-200 hover:border-slate-300 open:border-emerald-200 open:bg-emerald-50/20 open:shadow-xs">
              <summary className="flex cursor-pointer items-center justify-between text-base font-semibold text-[#092E28] select-none list-none [&::-webkit-details-marker]:hidden">
                <span>How do we enroll our students and generate their login accounts?</span>
                <span className="ml-4 flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-transform duration-200 group-open:rotate-180 group-open:bg-[#116149] group-open:text-white">
                  <ChevronDown size={18} />
                </span>
              </summary>
              <div className="mt-3.5 pt-3 border-t border-slate-100 text-sm text-slate-600 leading-relaxed space-y-2">
                <p>
                  Your School Admin Portal gives you 3 convenient roster ingestion pathways:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-slate-700">
                  <li><strong>Manual Addition:</strong> Quickly type in individual candidate details.</li>
                  <li><strong>Bulk CSV Upload:</strong> Download our sample CSV template, paste your students&apos; names and emails, and import an entire class of 200+ students in 10 seconds.</li>
                  <li><strong>Unique School Registration Link:</strong> Share a dedicated school invite link (e.g., <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">/register?school=SCH-XYZ</code>) so candidates can register themselves directly into your roster.</li>
                </ul>
              </div>
            </details>

            <details className="group rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 transition-all duration-200 hover:border-slate-300 open:border-emerald-200 open:bg-emerald-50/20 open:shadow-xs">
              <summary className="flex cursor-pointer items-center justify-between text-base font-semibold text-[#092E28] select-none list-none [&::-webkit-details-marker]:hidden">
                <span>What is the default student password rule?</span>
                <span className="ml-4 flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-transform duration-200 group-open:rotate-180 group-open:bg-[#116149] group-open:text-white">
                  <ChevronDown size={18} />
                </span>
              </summary>
              <div className="mt-3.5 pt-3 border-t border-slate-100 text-sm text-slate-600 leading-relaxed">
                <p>
                  To eliminate login confusion during lab mock exams, every account created by the school uses the student&apos;s email address as their username and their <strong>last name in CAPITAL letters</strong> as the initial password (for example, if the student&apos;s name is Chinedu Okonkwo, the default password is <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs font-mono font-bold text-slate-800">OKONKWO</code>). Students can change their password at any time from their profile settings.
                </p>
              </div>
            </details>

            <details className="group rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 transition-all duration-200 hover:border-slate-300 open:border-emerald-200 open:bg-emerald-50/20 open:shadow-xs">
              <summary className="flex cursor-pointer items-center justify-between text-base font-semibold text-[#092E28] select-none list-none [&::-webkit-details-marker]:hidden">
                <span>How does cohort licensing and Paystack checkout work?</span>
                <span className="ml-4 flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-transform duration-200 group-open:rotate-180 group-open:bg-[#116149] group-open:text-white">
                  <ChevronDown size={18} />
                </span>
              </summary>
              <div className="mt-3.5 pt-3 border-t border-slate-100 text-sm text-slate-600 leading-relaxed space-y-2">
                <p>
                  In your School Portal, simply select the students you want to activate (or click &quot;Select All&quot;), pick a duration (1 to 12 months at ₦1,500/student/month), and check out securely via Paystack.
                </p>
                <p>
                  You can pay with Nigerian debit cards, bank transfers, or corporate accounts. Once payment is confirmed, an automated background queue immediately activates all student licenses and issues a downloadable PDF invoice for your school bursary. Payments are strictly one-time with zero recurring subscription debits.
                </p>
              </div>
            </details>

            <details className="group rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 transition-all duration-200 hover:border-slate-300 open:border-emerald-200 open:bg-emerald-50/20 open:shadow-xs">
              <summary className="flex cursor-pointer items-center justify-between text-base font-semibold text-[#092E28] select-none list-none [&::-webkit-details-marker]:hidden">
                <span>Can candidates practice on their smartphones at home?</span>
                <span className="ml-4 flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-transform duration-200 group-open:rotate-180 group-open:bg-[#116149] group-open:text-white">
                  <ChevronDown size={18} />
                </span>
              </summary>
              <div className="mt-3.5 pt-3 border-t border-slate-100 text-sm text-slate-600 leading-relaxed">
                <p>
                  Yes, 100%! Every student license provisioned by your school includes unrestricted access across all devices. Students can take full 4-subject mock exams in your school computer lab, and then use their smartphone or tablet at home to review explanations, practice weekly packs, or play educational learning games. Everything syncs to their cloud profile.
                </p>
              </div>
            </details>

            <details className="group rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 transition-all duration-200 hover:border-slate-300 open:border-emerald-200 open:bg-emerald-50/20 open:shadow-xs">
              <summary className="flex cursor-pointer items-center justify-between text-base font-semibold text-[#092E28] select-none list-none [&::-webkit-details-marker]:hidden">
                <span>How do teachers use syllabus diagnostics to improve pass rates?</span>
                <span className="ml-4 flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-transform duration-200 group-open:rotate-180 group-open:bg-[#116149] group-open:text-white">
                  <ChevronDown size={18} />
                </span>
              </summary>
              <div className="mt-3.5 pt-3 border-t border-slate-100 text-sm text-slate-600 leading-relaxed">
                <p>
                  Instead of teachers spending weekends manually marking paper tests, JAMBPrep aggregates student test answers automatically. The teacher dashboard highlights syllabus topics where the cohort is struggling (e.g. <em>&quot;Chemistry: Organic Nomenclature (32% accuracy)&quot;</em>), allowing your instructors to deliver targeted remedial classes before the real examination.
                </p>
              </div>
            </details>
          </div>

          {/* Need help banner */}
          <div className="mt-12 max-w-3xl mx-auto rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center space-y-2">
            <h4 className="text-sm font-semibold text-slate-900">Have a unique school requirement or question?</h4>
            <p className="text-xs text-slate-600 max-w-lg mx-auto">
              Our institutional onboarding team works directly with Nigerian school principals, ICT coordinators, and tutorial centres.
            </p>
            <div className="pt-2">
              <Link
                href="/schools/register"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#116149] hover:underline"
              >
                Register your school to get started <ArrowRight size={14} />
              </Link>
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
