"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { createClient } from "@/lib/supabase/client";
import { AddStudentModal } from "./add-student-modal";
import { CsvImportModal } from "./csv-import-modal";
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
  KeyRound,
  CheckSquare,
  Square,
  Trash2,
  Check
} from "lucide-react";

interface StudentItem {
  id: string;
  name: string;
  email: string;
  studentIdentifier?: string | null;
  defaultPassword?: string;
  subjects?: string[];
  licenseStatus: "active" | "inactive";
  daysLeft?: number;
  lastActive?: string;
  averageScore?: number | null;
  enrolmentMethod?: string;
}

export default function SchoolDashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedPasswordId, setCopiedPasswordId] = useState<string | null>(null);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);

  // Selection state
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  // Initial Demo Roster with standard Nigerian secondary school candidate profiles
  const [students, setStudents] = useState<StudentItem[]>([
    {
      id: "std-1",
      name: "Chinedu Okonkwo",
      email: "c.okonkwo@school.edu.ng",
      studentIdentifier: "ST-001",
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
      studentIdentifier: "ST-002",
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
      studentIdentifier: "ST-003",
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
      studentIdentifier: "ST-004",
      defaultPassword: "DANJUMA",
      subjects: ["ENG", "MTH", "ECN", "GEO"],
      licenseStatus: "active",
      daysLeft: 14,
      lastActive: "2 days ago",
      averageScore: 246,
    },
  ]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async (res: any) => {
      const u = res?.data?.user;
      if (!u) {
        window.location.assign("/schools/login?redirectTo=/schools/dashboard");
        return;
      }
      const role = u.user_metadata?.role || "student";
      if (role === "student") {
        window.location.assign("/dashboard?error=unauthorized_school_portal");
        return;
      }
      setUser(u);

      // Attempt to load enrolled students from server API
      try {
        const listRes = await fetch("/api/schools/students/list/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        if (listRes.ok) {
          const data = await listRes.json();
          if (data.students && Array.isArray(data.students) && data.students.length > 0) {
            setStudents(data.students.map((s: any) => ({
              id: s.id,
              name: s.name,
              email: s.email,
              studentIdentifier: s.studentIdentifier || null,
              defaultPassword: s.defaultPassword,
              subjects: s.subjects || ["ENG", "MTH", "PHY", "CHM"],
              licenseStatus: s.licenseStatus || "inactive",
              daysLeft: s.licenseExpiresAt ? Math.max(0, Math.ceil((new Date(s.licenseExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 0,
              lastActive: "Enrolled",
              averageScore: null,
            })));
          }
        }
      } catch (err) {
        console.warn("Could not load dynamic roster, using local cohort state:", err);
      }
    });
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.assign("/schools");
  };

  const schoolName = (user?.user_metadata?.school_name as string) || "Institutional Partner";
  const state = (user?.user_metadata?.state as string) || "Lagos";
  const schoolType = (user?.user_metadata?.school_type as string) || "secondary_school";
  const schoolCode = (user?.user_metadata?.school_code as string) || (user?.id ? "SCH-XYZ" + user.id.slice(0, 4).toUpperCase() : "SCH-XYZ0000");
  const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL || "https://jambprep.com"}/register?school=${schoolCode}`;

  const handleCopyInviteLink = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(inviteLink);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2500);
      }
    } catch (e) {
      console.warn("Failed to copy link:", e);
    }
  };

  const handleCopyPassword = (studentId: string, pwd: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(pwd);
      setCopiedPasswordId(studentId);
      setTimeout(() => setCopiedPasswordId(null), 2000);
    }
  };

  // Selection handlers
  const isAllSelected = students.length > 0 && selectedStudentIds.length === students.length;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(students.map((s) => s.id));
    }
  };

  const toggleSelectStudent = (id: string) => {
    setSelectedStudentIds((prev) => 
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Callback when a single student is created via Pathway A
  const handleStudentAdded = (newStudent: any) => {
    const formatted: StudentItem = {
      id: newStudent.id,
      name: newStudent.name,
      email: newStudent.email,
      studentIdentifier: newStudent.studentIdentifier || null,
      defaultPassword: newStudent.defaultPassword,
      subjects: ["ENG", "MTH", "PHY", "CHM"],
      licenseStatus: "inactive",
      daysLeft: 0,
      lastActive: "Just added",
      averageScore: null,
      enrolmentMethod: "manual",
    };
    setStudents((prev) => [formatted, ...prev]);
    setSelectedStudentIds((prev) => [...prev, formatted.id]);
  };

  // Callback when batch CSV is imported via Pathway B
  const handleImportComplete = (importedList: any[]) => {
    const formatted: StudentItem[] = importedList.map((item) => ({
      id: item.id,
      name: item.name,
      email: item.email,
      studentIdentifier: item.studentIdentifier || null,
      defaultPassword: item.defaultPassword,
      subjects: ["ENG", "MTH", "PHY", "CHM"],
      licenseStatus: "inactive",
      daysLeft: 0,
      lastActive: "Imported via CSV",
      averageScore: null,
      enrolmentMethod: "csv",
    }));

    setStudents((prev) => [...formatted, ...prev]);
    setSelectedStudentIds((prev) => [...prev, ...formatted.map((f) => f.id)]);
  };

  // Metrics
  const activeCount = students.filter((s) => s.licenseStatus === "active").length;
  const activeSpend = activeCount * 1500;

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
                {(user?.user_metadata?.display_name as string) || user?.email || "Administrator"}
              </span>
              <span className="text-[11px] text-slate-500 uppercase tracking-wider">
                School Administrator
              </span>
            </div>

            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 shadow-xs hover:bg-slate-50 hover:text-slate-900 transition cursor-pointer"
              title="Sign out of school portal"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
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
            <div className="flex items-center gap-2 rounded-xl bg-black/30 p-2 text-xs font-mono text-[#d8dfd5] border border-white/10">
              <span className="truncate flex-1 pl-1 text-[11px]">{inviteLink}</span>
              <button
                type="button"
                onClick={handleCopyInviteLink}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white shadow-xs hover:bg-emerald-500 transition cursor-pointer"
                title="Copy student invite link"
              >
                {copiedLink ? (
                  <>
                    <CheckCircle2 size={13} className="text-emerald-100" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy size={13} />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
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
            <p className="text-2xl sm:text-3xl font-bold text-slate-900">{students.length} Candidates</p>
            <span className="text-[11px] text-slate-500 block">{activeCount} active licenses</span>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Active Paid</span>
              <CreditCard size={18} className="text-emerald-600" />
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-slate-900">₦{activeSpend.toLocaleString()} / mo</p>
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
            {/* Card 1: Manual */}
            <div 
              onClick={() => setIsAddModalOpen(true)}
              className="group rounded-2xl border border-slate-200 p-5 space-y-3 hover:border-[#116149] hover:bg-emerald-50/20 transition cursor-pointer"
            >
              <div className="size-9 rounded-xl bg-emerald-50 text-[#116149] flex items-center justify-center group-hover:bg-[#116149] group-hover:text-white transition">
                <UserPlus size={18} />
              </div>
              <h3 className="text-sm font-bold text-slate-900">1. Manual Registration</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Add an individual candidate directly by typing in their full name, email, and candidate ID.
              </p>
              <button 
                type="button" 
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#116149] group-hover:underline pt-1 cursor-pointer"
              >
                Add Single Candidate <ArrowRight size={13} />
              </button>
            </div>

            {/* Card 2: Bulk CSV */}
            <div 
              onClick={() => setIsCsvModalOpen(true)}
              className="group rounded-2xl border border-slate-200 p-5 space-y-3 hover:border-blue-600 hover:bg-blue-50/20 transition cursor-pointer"
            >
              <div className="size-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition">
                <Upload size={18} />
              </div>
              <h3 className="text-sm font-bold text-slate-900">2. Bulk CSV Upload</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Upload your school spreadsheet template to enroll an entire class of 50 to 500+ candidates in seconds.
              </p>
              <button 
                type="button" 
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 group-hover:underline pt-1 cursor-pointer"
              >
                Upload Student CSV <ArrowRight size={13} />
              </button>
            </div>

            {/* Card 3: School Invite Link */}
            <div 
              onClick={handleCopyInviteLink}
              className="group rounded-2xl border border-slate-200 p-5 space-y-3 hover:border-purple-600 hover:bg-purple-50/20 transition cursor-pointer"
            >
              <div className="size-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition">
                <Share2 size={18} />
              </div>
              <h3 className="text-sm font-bold text-slate-900">3. School Invite Link</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Allow students to self-register via your custom URL; they are automatically attached to your school cohort.
              </p>
              <button 
                type="button" 
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-700 group-hover:underline pt-1 cursor-pointer"
              >
                {copiedLink ? "Link Copied!" : "Copy Invite Link"} <ArrowRight size={13} />
              </button>
            </div>
          </div>

          {/* Roster Multi-Select Action Bar (Shows when candidates are selected) */}
          {selectedStudentIds.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl bg-[#092E28] p-4 text-white shadow-md animate-in slide-in-from-top-2">
              <div className="flex items-center gap-3">
                <span className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-300 font-bold text-xs">
                  {selectedStudentIds.length}
                </span>
                <span className="text-xs text-[#d8dfd5]">
                  candidate{selectedStudentIds.length > 1 ? "s" : ""} selected for cohort action
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedStudentIds([])}
                  className="rounded-xl px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
                >
                  Clear Selection
                </button>
                <Link
                  href={`/schools/checkout?students=${selectedStudentIds.length}`}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#d6ed9f] px-4 py-2 text-xs font-bold text-[#092E28] shadow-xs hover:bg-[#e2f5b3] transition cursor-pointer"
                >
                  <CreditCard size={14} />
                  <span>Proceed to Cohort Licensing (₦{(selectedStudentIds.length * 1500).toLocaleString()})</span>
                  <ArrowRight size={13} />
                </Link>
              </div>
            </div>
          )}

          {/* Student Cohort Table */}
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[700px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 font-bold text-slate-600 select-none">
                    <th className="py-3 px-4 w-10">
                      <button
                        type="button"
                        onClick={toggleSelectAll}
                        className="flex items-center justify-center text-slate-500 hover:text-[#116149] transition cursor-pointer"
                        title={isAllSelected ? "Deselect all" : "Select all candidates"}
                      >
                        {isAllSelected ? (
                          <CheckSquare size={16} className="text-[#116149]" />
                        ) : (
                          <Square size={16} />
                        )}
                      </button>
                    </th>
                    <th className="py-3 px-4">Candidate Name</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Default Password</th>
                    <th className="py-3 px-4">Subject Pack</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Avg Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {students.map((std) => {
                    const isSelected = selectedStudentIds.includes(std.id);
                    const pwd = std.defaultPassword || "PASSWORD";
                    const isCopied = copiedPasswordId === std.id;

                    return (
                      <tr 
                        key={std.id} 
                        className={`transition ${isSelected ? "bg-emerald-50/40" : "hover:bg-slate-50/50"}`}
                      >
                        <td className="py-3 px-4">
                          <button
                            type="button"
                            onClick={() => toggleSelectStudent(std.id)}
                            className="flex items-center justify-center text-slate-400 hover:text-[#116149] transition cursor-pointer"
                          >
                            {isSelected ? (
                              <CheckSquare size={16} className="text-[#116149]" />
                            ) : (
                              <Square size={16} />
                            )}
                          </button>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          <div className="flex items-center gap-2">
                            <span>{std.name}</span>
                            {std.studentIdentifier && (
                              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono text-slate-600">
                                {std.studentIdentifier}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {std.email}
                        </td>
                        <td className="py-3 px-4">
                          <div className="inline-flex items-center gap-1.5">
                            <code className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-800">
                              {pwd}
                            </code>
                            <button
                              type="button"
                              onClick={() => handleCopyPassword(std.id, pwd)}
                              className="text-slate-400 hover:text-slate-700 transition cursor-pointer p-0.5"
                              title="Copy default password"
                            >
                              {isCopied ? (
                                <Check size={12} className="text-emerald-600" />
                              ) : (
                                <Copy size={12} />
                              )}
                            </button>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1">
                            {(std.subjects || ["ENG", "MTH", "PHY", "CHM"]).map((sub) => (
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
                              Active ({std.daysLeft ?? 28}d left)
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
                    );
                  })}
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
              {activeCount} Candidates Active
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

      {/* Ingestion Pathway Modals */}
      <AddStudentModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onStudentAdded={handleStudentAdded}
        schoolCode={schoolCode}
      />

      <CsvImportModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        onImportComplete={handleImportComplete}
        schoolCode={schoolCode}
      />
    </div>
  );
}
