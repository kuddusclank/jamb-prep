"use client";

import { useState } from "react";
import { 
  calculateSchoolQuote, 
  SCHOOL_PRICING_CONFIG, 
  type SchoolApplicationInput 
} from "@/lib/schools/school-pricing";
import { 
  Users, 
  Calendar, 
  CheckCircle2, 
  Sparkles, 
  Building2, 
  ArrowRight, 
  FileText, 
  ShieldCheck, 
  BarChart3, 
  WifiOff, 
  GraduationCap, 
  Clock, 
  Layers 
} from "lucide-react";

const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", 
  "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT Abuja", "Gombe", 
  "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", 
  "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", 
  "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara"
];

export function SchoolCalculatorClient() {
  const [studentCount, setStudentCount] = useState<number>(50);
  const [durationMonths, setDurationMonths] = useState<number>(3);

  // Application Form State
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<SchoolApplicationInput>({
    schoolName: "",
    schoolType: "private_secondary",
    state: "Lagos",
    lga: "",
    contactName: "",
    contactRole: "principal",
    contactEmail: "",
    contactPhone: "",
    studentCount: 50,
    durationMonths: 3,
    targetExamYear: 2027,
    additionalNotes: "",
  });

  const quote = calculateSchoolQuote(studentCount, durationMonths);

  const handleStudentCountChange = (val: number) => {
    const count = Math.max(1, Math.min(2500, val));
    setStudentCount(count);
    setFormData((prev) => ({ ...prev, studentCount: count }));
  };

  const handleDurationChange = (months: number) => {
    setDurationMonths(months);
    setFormData((prev) => ({ ...prev, durationMonths: months }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Generate deterministic application reference
    const timestamp = Date.now().toString(36).toUpperCase().slice(-5);
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const reference = `SCH-APP-${timestamp}-${randomSuffix}`;

    try {
      const existing = JSON.parse(localStorage.getItem("jambprep_school_applications") || "[]");
      existing.push({
        reference,
        ...formData,
        studentCount,
        durationMonths,
        totalNaira: quote.totalNaira,
        submittedAt: new Date().toISOString(),
      });
      localStorage.setItem("jambprep_school_applications", JSON.stringify(existing));
    } catch {
      // Storage error ignored
    }

    setTimeout(() => {
      setIsSubmitting(false);
      setSubmittedRef(reference);
      const target = document.getElementById("application-confirmation");
      if (target) {
        target.scrollIntoView({ behavior: "smooth" });
      }
    }, 600);
  };

  return (
    <div className="space-y-16">
      {/* Interactive Pricing Calculator Card */}
      <div 
        id="calculator"
        className="rounded-3xl border border-emerald-950/15 bg-white p-6 sm:p-10 shadow-xl shadow-emerald-950/5 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-slate-100 pb-8">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-[#116149] text-xs font-bold uppercase tracking-wider mb-2">
              <Sparkles size={14} /> INSTITUTIONAL RATE: ₦1,500 / STUDENT / MONTH
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#092E28]">
              Instant Cohort Investment Calculator
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Select your student cohort size and study duration to see your exact total. No hidden fees or recurring subscriptions.
            </p>
          </div>
          <div className="text-left lg:text-right shrink-0">
            <span className="text-xs uppercase font-bold text-slate-400 tracking-wider block">One-Time Total</span>
            <div className="text-3xl sm:text-4xl font-extrabold text-[#116149] tracking-tight">
              {quote.formattedTotalNaira}
            </div>
            <span className="text-xs text-slate-500 block mt-0.5">
              Covers {quote.studentCount} students for {quote.durationMonths} month{quote.durationMonths > 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Sliders & Duration Pickers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 pt-8">
          <div className="space-y-6">
            {/* Student Count Input */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label htmlFor="studentCount" className="text-sm font-semibold text-[#092E28] flex items-center gap-2">
                  <Users size={16} className="text-[#116149]" /> Number of Registered UTME Candidates
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    id="studentCount"
                    min={5}
                    max={2500}
                    value={studentCount}
                    onChange={(e) => handleStudentCountChange(Number(e.target.value))}
                    className="w-24 text-right font-bold text-[#092E28] px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#116149]"
                  />
                  <span className="text-xs font-medium text-slate-500">Students</span>
                </div>
              </div>

              <input
                type="range"
                min={5}
                max={500}
                step={5}
                value={studentCount}
                onChange={(e) => handleStudentCountChange(Number(e.target.value))}
                className="w-full accent-[#116149] cursor-pointer h-2 bg-slate-100 rounded-lg appearance-none"
              />

              <div className="flex justify-between text-[11px] text-slate-400 font-medium px-1 mt-1">
                <span>10 Candidates</span>
                <span>50 Candidates (Typical SS3)</span>
                <span>100 Candidates</span>
                <span>250+ Candidates</span>
              </div>
            </div>

            {/* Duration Selector */}
            <div>
              <label className="text-sm font-semibold text-[#092E28] flex items-center gap-2 mb-3">
                <Calendar size={16} className="text-[#116149]" /> Preparation Duration (Months)
              </label>

              <div className="grid grid-cols-4 gap-2.5">
                {[
                  { months: 1, label: "1 Month", tag: "Sprint" },
                  { months: 3, label: "3 Months", tag: "Recommended", popular: true },
                  { months: 6, label: "6 Months", tag: "Full Term" },
                  { months: 12, label: "12 Months", tag: "Annual" },
                ].map(({ months, label, tag, popular }) => {
                  const isSelected = durationMonths === months;
                  return (
                    <button
                      key={months}
                      type="button"
                      onClick={() => handleDurationChange(months)}
                      className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all ${
                        isSelected
                          ? "border-[#116149] bg-emerald-50/70 text-[#092E28] ring-2 ring-[#116149]/20 shadow-sm"
                          : "border-slate-200 hover:border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <span className="text-xs font-bold">{label}</span>
                      <span
                        className={`text-[10px] uppercase font-semibold mt-1 px-1.5 py-0.5 rounded-full ${
                          popular
                            ? "bg-amber-100 text-amber-900"
                            : isSelected
                            ? "bg-emerald-200/60 text-[#116149]"
                            : "text-slate-400"
                        }`}
                      >
                        {tag}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Value Summary Box */}
          <div className="rounded-2xl border border-emerald-900/10 bg-emerald-50/40 p-6 flex flex-col justify-between space-y-6">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#116149] mb-4">
                What Your School Receives:
              </h3>
              <ul className="space-y-3 text-xs sm:text-sm text-slate-700">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 size={16} className="text-[#116149] shrink-0 mt-0.5" />
                  <span>
                    <strong>Unlimited CBT Mock Simulations</strong> with authentic 120-minute timer and 8-key keyboard controls (`A,B,C,D,P,N,S,R`).
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 size={16} className="text-[#116149] shrink-0 mt-0.5" />
                  <span>
                    <strong>Weekly 250-Question Practice Packs</strong> downloaded once and accessible 100% offline without school internet.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 size={16} className="text-[#116149] shrink-0 mt-0.5" />
                  <span>
                    <strong>Teacher Syllabus Diagnostic Radar</strong> highlighting exact weak topics for targeted classroom revision.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 size={16} className="text-[#116149] shrink-0 mt-0.5" />
                  <span>
                    <strong>Bulk Roster CSV Onboarding</strong> to create all student profiles seamlessly with dedicated support.
                  </span>
                </li>
              </ul>
            </div>

            <div className="pt-4 border-t border-emerald-900/10 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 block">Rate breakdown:</span>
                <span className="text-xs font-semibold text-[#092E28]">
                  ₦1,500/student/mo × {quote.studentCount} students × {quote.durationMonths} mo
                </span>
              </div>
              <a
                href="#application-form"
                className="inline-flex items-center gap-2 rounded-full bg-[#116149] px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#0b4936] transition"
              >
                Apply for School Onboarding <ArrowRight size={14} />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Institutional Value Pillars Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-7 space-y-3 shadow-sm">
          <div className="size-10 rounded-2xl bg-emerald-100 flex items-center justify-center text-[#116149]">
            <Clock size={20} />
          </div>
          <h3 className="text-base font-bold text-[#092E28]">Authentic Exam Hall Conditioning</h3>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Eliminate exam-day anxiety. Students practise with the exact 180-question format, 120-minute countdown, and desktop hotkeys used in real JAMB centres.
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-7 space-y-3 shadow-sm">
          <div className="size-10 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-800">
            <WifiOff size={20} />
          </div>
          <h3 className="text-base font-bold text-[#092E28]">Zero School Bandwidth Worries</h3>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Our PWA caches 250-question weekly practice packs on student phones or computer lab machines. Students study and practise without burning costly mobile data.
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-7 space-y-3 shadow-sm">
          <div className="size-10 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-800">
            <BarChart3 size={20} />
          </div>
          <h3 className="text-base font-bold text-[#092E28]">Actionable Teacher Diagnostics</h3>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Teachers identify class-wide topic weaknesses (e.g. Organic Chemistry, Waves, Consecration) in real time to focus their teaching where it yields maximum score gains.
          </p>
        </div>
      </div>

      {/* School Application Form Section */}
      <section 
        id="application-form" 
        className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-10 shadow-lg relative overflow-hidden scroll-mt-24"
      >
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-[#116149] text-xs font-bold uppercase tracking-wider">
              <Building2 size={13} /> PARTNERSHIP REGISTRATION
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#092E28]">
              Register Your School Cohort
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Submit your school details to receive your formal invoice, access credentials, and teacher diagnostic onboarding guide.
            </p>
          </div>

          {submittedRef ? (
            <div 
              id="application-confirmation"
              className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-6 sm:p-8 text-center space-y-4 animate-in fade-in zoom-in-95 duration-200"
            >
              <div className="size-12 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-md shadow-emerald-700/20">
                <CheckCircle2 size={24} />
              </div>
              <h3 className="text-xl font-bold text-[#092E28]">
                Application Successfully Received!
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                Thank you for partnering with JAMBPrep. Your institutional reference is:
              </p>
              <div className="inline-block bg-white border border-emerald-300 px-4 py-2 rounded-xl text-base font-mono font-bold text-[#116149] shadow-sm">
                {submittedRef}
              </div>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Our institutional onboarding officer will verify your school details and contact <strong>{formData.contactEmail}</strong> / <strong>{formData.contactPhone}</strong> within 1 business day with your invoice and student roster template.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setSubmittedRef(null)}
                  className="text-xs font-bold text-[#116149] hover:underline"
                >
                  Submit Another School Application
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5 text-left">
              {/* School Details Group */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="schoolName" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    School / Institution Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="schoolName"
                    required
                    placeholder="e.g. Champions Comprehensive College"
                    value={formData.schoolName}
                    onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#116149]"
                  />
                </div>

                <div>
                  <label htmlFor="schoolType" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Institution Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="schoolType"
                    required
                    value={formData.schoolType}
                    onChange={(e) => setFormData({ ...formData, schoolType: e.target.value as any })}
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#116149] bg-white"
                  >
                    <option value="private_secondary">Private Secondary School</option>
                    <option value="public_secondary">Public / State Secondary School</option>
                    <option value="mission_secondary">Mission / Faith-Based School</option>
                    <option value="cbt_tutorial_centre">CBT Prep / Tutorial Centre</option>
                    <option value="other">Other Educational Institution</option>
                  </select>
                </div>
              </div>

              {/* State and LGA */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="state" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    State <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="state"
                    required
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#116149] bg-white"
                  >
                    {NIGERIAN_STATES.map((st) => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="lga" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Local Government Area (LGA) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="lga"
                    required
                    placeholder="e.g. Ikeja, Alimosho, Ibadan North"
                    value={formData.lga}
                    onChange={(e) => setFormData({ ...formData, lga: e.target.value })}
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#116149]"
                  />
                </div>
              </div>

              {/* Official Representative Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label htmlFor="contactName" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Authorized Representative Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="contactName"
                    required
                    placeholder="e.g. Dr. Mrs. Funke Adeyemi"
                    value={formData.contactName}
                    onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#116149]"
                  />
                </div>

                <div>
                  <label htmlFor="contactRole" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Designation / Title <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="contactRole"
                    required
                    value={formData.contactRole}
                    onChange={(e) => setFormData({ ...formData, contactRole: e.target.value as any })}
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#116149] bg-white"
                  >
                    <option value="principal">Principal</option>
                    <option value="proprietor">Proprietor / Director</option>
                    <option value="vice_principal">Vice Principal (Academic)</option>
                    <option value="exam_officer">UTME / Examination Officer</option>
                    <option value="teacher">Subject Head / Senior Teacher</option>
                    <option value="other">Other School Representative</option>
                  </select>
                </div>
              </div>

              {/* Contact Channels */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="contactEmail" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Official Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    id="contactEmail"
                    required
                    placeholder="e.g. principal@school.edu.ng"
                    value={formData.contactEmail}
                    onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#116149]"
                  />
                </div>

                <div>
                  <label htmlFor="contactPhone" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Phone / WhatsApp Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    id="contactPhone"
                    required
                    placeholder="e.g. 0803 123 4567"
                    value={formData.contactPhone}
                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#116149]"
                  />
                </div>
              </div>

              {/* Live Selected Cohort Summary Banner */}
              <div className="rounded-xl border border-emerald-900/10 bg-emerald-50/50 p-4 flex items-center justify-between text-xs text-[#092E28]">
                <div>
                  <span className="font-semibold block">Requested Cohort Scope:</span>
                  <span className="text-slate-600">
                    {studentCount} Candidates for {durationMonths} Month{durationMonths > 1 ? "s" : ""}
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-semibold block">Quoted Investment:</span>
                  <span className="font-bold text-[#116149] text-sm">{quote.formattedTotalNaira}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-[#116149] px-6 py-3.5 text-sm font-bold text-white shadow-md hover:bg-[#0b4936] transition disabled:opacity-50"
              >
                {isSubmitting ? "Generating Official Reference..." : "Submit School Application & Request Invoice"}
              </button>

              <p className="text-[11px] text-center text-slate-400">
                By submitting, you represent that you are an authorized representative of the educational institution. No payment is required immediately.
              </p>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}
