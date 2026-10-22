import { getCurrentUser } from "@/lib/supabase/current-user";
import { redirect } from "next/navigation";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { 
  Users, 
  ShieldCheck, 
  CreditCard, 
  Sparkles, 
  Copy, 
  UserPlus, 
  Upload, 
  Share2, 
  BarChart3, 
  CheckCircle2, 
  Clock, 
  ArrowRight,
  LogOut,
  Building2,
  Calendar,
  Layers,
  KeyRound
} from "lucide-react";

export default async function SchoolDashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/schools/login?redirectTo=/schools/dashboard");
  }

  // Strict RBAC Guard: Students cannot access School Dashboard
  const role = user.user_metadata?.role || "student";
  if (role === "student") {
    redirect("/dashboard?error=unauthorized_school_portal");
  }

  const schoolName = (user.user_metadata?.school_name as string) || "Institutional Partner";
  const state = (user.user_metadata?.state as string) || "Lagos";
  const schoolType = (user.user_metadata?.school_type as string) || "secondary_school";
  const schoolCode = "SCH-XYZ" + user.id.slice(0, 4).toUpperCase();
  const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL || "https://jambprep.com"}/register?school=${schoolCode}`;

  // Mock initial demo roster to demonstrate the ingestion pathways and password rules
  const demoStudents = [
    {
      id: "std-1",
      name: "Chinedu Okonkwo",
      email: "c.okonkwo@school.edu.ng",
      defaultPassword: "OKONKWO",
      subjects: ["ENG", "MTH", "PHY", "CHM"],
      licenseStatus: "active",
      daysLeft: 28,
      lastActive: "Today, 10:15 AM",
      averageScore: 284,
    },
    {
      id: "std-2",
      name: "Amina Bello",
      email: "a.bello@school.edu.ng",
      defaultPassword: "BELLO",
      subjects: ["ENG", "LIT", "GOV", "ECN"],
      licenseStatus: "active",
      daysLeft: 28,
      lastActive: "Yesterday",
      averageScore: 292,
    },
    {
      id: "std-3",
      name: "Oluwaseun Adeleke",
      email: "o.adeleke@school.edu.ng",
      defaultPassword: "ADELEKE",
      subjects: ["ENG", "BIO", "CHM", "PHY"],
      licenseStatus: "inactive",
      daysLeft: 0,
      lastActive: "Not started",
      averageScore: null,
    },
    {
      id: "std-4",
      name: "Fatima Danjuma",
      email: "f.danjuma@school.edu.ng",
      defaultPassword: "DANJUMA",
      subjects: ["ENG", "MTH", "ECN", "GEO"],
      licenseStatus: "active",
      daysLeft: 14,
      lastActive: "2 days ago",
      averageScore: 246,
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAF7] text-[#092E28] flex flex-col justify-between">
      {/* Top Administrative Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200/90 bg-white/95 backdrop-blur-md">
        <div className="shell flex h-20 items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/schools" className="flex items-center gap-2.5 text-lg font-bold tracking-tight">
              <span className="flex size-9 items-center justify-center rounded-xl bg-[#116149] text-white shadow-xs">
                <BrandMark size={30} />
              </span>
              <span className="font-bold tracking-tight">JAMBPrep</span>
            </Link>

            <div className="hidden sm:flex items-center gap-2 border-l border-slate-200 pl-4 text-xs">
              <span className="font-semibold text-slate-800">{schoolName}</span>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-[#116149]">
                {schoolCode}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex flex-col text-right">
              <span className="text-xs font-semibold text-slate-800">
                {(user.user_metadata?.display_name as string) || user.email}
              </span>
              <span className="text-[11px] text-slate-500 uppercase tracking-wider">
                School Administrator
              </span>
            </div>

            <form action="/api/schools/auth/signout/" method="POST">
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 shadow-xs hover:bg-slate-50 hover:text-slate-900 transition cursor-pointer"
                title="Sign out of school portal"
              >
                <LogOut size={14} />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Administrative Workspace */}
      <main className="shell flex-1 py-8 sm:py-10 space-y-8">
        {/* Welcome Banner & Instant School Invite Link */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 rounded-3xl bg-[#092E28] p-6 sm:p-8 text-white shadow-lg">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-[#d6ed9f]">
              <Building2 size={14} />
              <span>{schoolType.replace(/_/g, " ").toUpperCase()} · {state.toUpperCase()}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-normal tracking-tight text-[#f2f3eb]">
              {schoolName} Portal
            </h1>
            <p className="text-xs sm:text-sm text-[#d8dfd5] leading-relaxed">
              Synchronize your computer laboratory mocks, manage student licenses, and pinpoint syllabus revision topics across all classes.
            </p>
          </div>

          {/* Quick School Code & Link Card */}
          <div className="rounded-2xl border border-white/15 bg-white/10 p-4 sm:p-5 backdrop-blur-md space-y-3 min-w-[280px]">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#d8dfd5]">Dedicated School Code</span>
              <span className="font-mono font-bold text-[#d6ed9f] text-sm">{schoolCode}</span>
            </div>
            <div className="text-[11px] text-[#d8dfd5]/80">
              Share this code or registration link with students for instant roster enrollment:
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-black/30 px-3 py-2 text-xs font-mono text-[#d8dfd5] border border-white/10">
              <span className="truncate">{inviteLink}</span>
            </div>
          </div>
        </div>

        {/* 4 Key Institutional KPI Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Enrolled</span>
              <Users size={18} className="text-[#116149]" />
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-slate-900">4 Candidates</p>
            <span className="text-[11px] text-slate-500 block">3 active licenses</span>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Active Paid</span>
              <CreditCard size={18} className="text-emerald-600" />
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-slate-900">₦4,500 / mo</p>
            <span className="text-[11px] text-emerald-800 font-medium block">₦1,500 / candidate rate</span>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Lab Simulation</span>
              <Calendar size={18} className="text-blue-600" />
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-slate-900">120:00 Mocks</p>
            <span className="text-[11px] text-slate-500 block">8-Key hotkey ready</span>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Cohort Avg</span>
              <BarChart3 size={18} className="text-purple-600" />
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-slate-900">274 / 400</p>
            <span className="text-[11px] text-emerald-700 font-medium block">78% target reach</span>
          </div>
        </div>

        {/* Ingestion Pathways Action Row */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Candidate Roster & Ingestion Pathways</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Choose any of the 3 supported ingestion workflows to populate your student examination cohort.
              </p>
            </div>

            <div className="inline-flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs text-amber-900">
              <KeyRound size={14} className="shrink-0 text-amber-700" />
              <span>Default password rule: <strong>LASTNAME in capital letters</strong></span>
            </div>
          </div>

          {/* 3 Pathway Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-slate-200 p-5 space-y-3 hover:border-slate-300 transition">
              <div className="size-9 rounded-xl bg-emerald-50 text-[#116149] flex items-center justify-center">
                <UserPlus size={18} />
              </div>
              <h3 className="text-sm font-bold text-slate-900">1. Manual Registration</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Add an individual candidate directly by typing in their full name, email, and 4-subject combination.
              </p>
              <button 
                type="button" 
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#116149] hover:underline pt-1 cursor-pointer"
              >
                Add Single Candidate <ArrowRight size={13} />
              </button>
            </div>

            <div className="rounded-2xl border border-slate-200 p-5 space-y-3 hover:border-slate-300 transition">
              <div className="size-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                <Upload size={18} />
              </div>
              <h3 className="text-sm font-bold text-slate-900">2. Bulk CSV Upload</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Upload your school spreadsheet template to enroll an entire class of 50 to 500+ candidates in seconds.
              </p>
              <button 
                type="button" 
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#116149] hover:underline pt-1 cursor-pointer"
              >
                Upload Student CSV <ArrowRight size={13} />
              </button>
            </div>

            <div className="rounded-2xl border border-slate-200 p-5 space-y-3 hover:border-slate-300 transition">
              <div className="size-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
                <Share2 size={18} />
              </div>
              <h3 className="text-sm font-bold text-slate-900">3. School Invite Link</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Allow students to self-register via your custom URL; they are automatically attached to your school cohort.
              </p>
              <button 
                type="button" 
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#116149] hover:underline pt-1 cursor-pointer"
              >
                Copy Invite Link <ArrowRight size={13} />
              </button>
            </div>
          </div>

          {/* Student Cohort Table */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 pt-2">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[700px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 font-bold text-slate-600">
                    <th className="py-3 px-4">Candidate Name</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Default Password</th>
                    <th className="py-3 px-4">Subject Pack</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Avg Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {demoStudents.map((std) => (
                    <tr key={std.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {std.name}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {std.email}
                      </td>
                      <td className="py-3 px-4">
                        <code className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-800">
                          {std.defaultPassword}
                        </code>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1">
                          {std.subjects.map((sub) => (
                            <span key={sub} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                              {sub}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {std.licenseStatus === "active" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
                            <span className="size-1.5 rounded-full bg-emerald-500" />
                            Active ({std.daysLeft}d left)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                            Unlicensed
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        {std.averageScore ? `${std.averageScore} / 400` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Syllabus Diagnostic Heatmap Preview for School */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">Aggregated Syllabus Diagnostic Heatmap</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Automatically generated from computer lab mock attempts. Use this to schedule Monday revision sessions.
              </p>
            </div>
            <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              4 Candidates Active
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="rounded-2xl border border-red-200 bg-red-50/50 p-4 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-red-700 block">High Failure Rate (Remedial Urgent)</span>
              <p className="text-sm font-bold text-slate-900">Chemistry: Organic Nomenclature</p>
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>Accuracy Rate:</span>
                <span className="font-bold text-red-700">32%</span>
              </div>
              <div className="w-full bg-red-200 rounded-full h-1.5 overflow-hidden">
                <div className="bg-red-600 h-full rounded-full" style={{ width: "32%" }} />
              </div>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">Moderate Mastery (Revision Recommended)</span>
              <p className="text-sm font-bold text-slate-900">English: Concord & Inversion Idioms</p>
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>Accuracy Rate:</span>
                <span className="font-bold text-amber-800">54%</span>
              </div>
              <div className="w-full bg-amber-200 rounded-full h-1.5 overflow-hidden">
                <div className="bg-amber-600 h-full rounded-full" style={{ width: "54%" }} />
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#116149] block">Mastered (Examination Ready)</span>
              <p className="text-sm font-bold text-slate-900">Physics: Mechanics & Vector Resolution</p>
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>Accuracy Rate:</span>
                <span className="font-bold text-[#116149]">82%</span>
              </div>
              <div className="w-full bg-emerald-200 rounded-full h-1.5 overflow-hidden">
                <div className="bg-emerald-600 h-full rounded-full" style={{ width: "82%" }} />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Institutional Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-6 text-center text-xs text-slate-500">
        <div className="shell flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>JAMBPrep for Schools · Institutional UTME examination & diagnostics platform.</span>
          <div className="flex items-center gap-3 text-slate-400 text-[11px]">
            <span>Encrypted Session</span>
            <span>•</span>
            <span>Role: Administrator</span>
            <span>•</span>
            <Link href="/schools" className="hover:text-slate-700 underline">Schools Overview</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
