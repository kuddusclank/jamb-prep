"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { createClient } from "@/lib/supabase/client";
import { AddStudentModal } from "./add-student-modal";
import { CsvImportModal } from "./csv-import-modal";
import { StudentDrilldownModal } from "./student-drilldown-modal";
import { MockSchedulerModal } from "./mock-scheduler-modal";
import { SyllabusHeatmapView } from "./syllabus-heatmap-view";
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
  Check,
  ChevronRight,
  ExternalLink,
  Zap,
  Play
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

  // Active workspace tab
  const [activeTab, setActiveTab] = useState<"roster" | "diagnostics" | "lab">("roster");

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [isMockSchedulerOpen, setIsMockSchedulerOpen] = useState(false);
  const [selectedDrilldownStudent, setSelectedDrilldownStudent] = useState<StudentItem | null>(null);

  // Selection state
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  // School cohort roster starts clean for fresh institutional registrations
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

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

      const code = (u.user_metadata?.school_code as string) || (u.id ? "SCH-" + u.id.slice(0, 8).toUpperCase() : "SCH-DEFAULT");

      // Load any actual previously added or imported candidates for this school
      let localCohort: StudentItem[] = [];
      try {
        if (typeof window !== "undefined") {
          const stored = localStorage.getItem(`jambprep_school_students_${code}`);
          if (stored) {
            localCohort = JSON.parse(stored);
          }
        }
      } catch (e) {
        console.warn("Could not read local cohort:", e);
      }

      // Attempt to load enrolled students from server API if active
      try {
        const listRes = await fetch("/api/schools/students/list/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        if (listRes.ok) {
          const text = await listRes.text();
          const data = text ? JSON.parse(text) : {};
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
            return;
          }
        }
      } catch (err) {
        console.warn("Could not load dynamic roster, checking local cohort state:", err);
      }

      setStudents(localCohort);
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
  const schoolCode = (user?.user_metadata?.school_code as string) || (user?.id ? "SCH-" + user.id.slice(0, 8).toUpperCase() : "SCH-XYZ0000");
  const baseUrl = origin || (typeof window !== "undefined" && window.location.origin ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL || "https://jambprep.pages.dev"));
  const inviteLink = `${baseUrl}/register?school=${schoolCode}`;

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
    setStudents((prev) => {
      const updated = [formatted, ...prev];
      try {
        if (typeof window !== "undefined") {
          localStorage.setItem(`jambprep_school_students_${schoolCode}`, JSON.stringify(updated));
        }
      } catch (e) {
        console.warn("Could not save student to local cohort:", e);
      }
      return updated;
    });
    setSelectedStudentIds((prev) => [...prev, formatted.id]);
  };

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

    setStudents((prev) => {
      const updated = [...formatted, ...prev];
      try {
        if (typeof window !== "undefined") {
          localStorage.setItem(`jambprep_school_students_${schoolCode}`, JSON.stringify(updated));
        }
      } catch (e) {
        console.warn("Could not save imported students to local cohort:", e);
      }
      return updated;
    });
    setSelectedStudentIds((prev) => [...prev, ...formatted.map((f) => f.id)]);
  };

  const activeCount = students.filter((s) => s.licenseStatus === "active").length;
  const activeSpend = activeCount * 1500;
  const studentsWithScores = students.filter((s) => typeof s.averageScore === "number" && s.averageScore !== null);
  const cohortAvg = studentsWithScores.length > 0 
    ? Math.round(studentsWithScores.reduce((acc, s) => acc + (s.averageScore as number), 0) / studentsWithScores.length)
    : null;

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
            <button
              type="button"
              onClick={() => setIsMockSchedulerOpen(true)}
              className="hidden md:inline-flex items-center gap-1.5 rounded-full bg-[#116149] px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-[#0b4936] transition cursor-pointer"
            >
              <Play size={13} fill="currentColor" />
              <span>Schedule CBT Mock</span>
            </button>

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
            <p className="text-2xl sm:text-3xl font-bold text-slate-900">
              {cohortAvg !== null ? `${cohortAvg} / 400` : "—"}
            </p>
            <span className="text-[11px] text-slate-500 block">
              {cohortAvg !== null ? `${Math.round((cohortAvg / 400) * 100)}% target reach` : "No mock results yet"}
            </span>
          </div>
        </div>

        {/* Primary Workspace Navigation Tabs */}
        <div className="border-b border-slate-200 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("roster")}
            className={`pb-3 px-3 text-xs font-bold flex items-center gap-2 border-b-2 transition cursor-pointer ${
              activeTab === "roster"
                ? "border-[#116149] text-[#116149]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Users size={16} />
            <span>Candidate Roster & Licenses ({students.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("diagnostics")}
            className={`pb-3 px-3 text-xs font-bold flex items-center gap-2 border-b-2 transition cursor-pointer ${
              activeTab === "diagnostics"
                ? "border-[#116149] text-[#116149]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <BarChart3 size={16} />
            <span>Syllabus Diagnostic Heatmap</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("lab")}
            className={`pb-3 px-3 text-xs font-bold flex items-center gap-2 border-b-2 transition cursor-pointer ${
              activeTab === "lab"
                ? "border-[#116149] text-[#116149]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Clock size={16} />
            <span>CBT Lab Mock Controller</span>
          </button>
        </div>

        {/* TAB 1: Roster & Ingestion View */}
        {activeTab === "roster" && (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-6 animate-in fade-in duration-150">
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

            {/* Roster Multi-Select Action Bar */}
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
                      <th className="py-3 px-4">Avg Score</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {students.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-14 px-4 text-center">
                          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-emerald-50 text-[#116149] mb-3">
                            <Users size={24} />
                          </div>
                          <h3 className="text-sm font-bold text-slate-900">No candidates enrolled yet</h3>
                          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-5 leading-relaxed">
                            Your school cohort is currently clean. Add candidates manually, upload a school CSV spreadsheet, or share your invite link for student self-registration.
                          </p>
                          <div className="flex items-center justify-center gap-3">
                            <button
                              type="button"
                              onClick={() => setIsAddModalOpen(true)}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-[#116149] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#0b4936] transition cursor-pointer"
                            >
                              <UserPlus size={14} />
                              <span>Add Single Candidate</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setIsCsvModalOpen(true)}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition cursor-pointer"
                            >
                              <Upload size={14} />
                              <span>Upload Student CSV</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      students.map((std) => {
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
                              <button
                                type="button"
                                onClick={() => setSelectedDrilldownStudent(std)}
                                className="flex items-center gap-2 hover:text-[#116149] hover:underline text-left cursor-pointer"
                              >
                                <span>{std.name}</span>
                                {std.studentIdentifier && (
                                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono text-slate-600">
                                    {std.studentIdentifier}
                                  </span>
                                )}
                              </button>
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
                            <td className="py-3 px-4 font-bold text-slate-900">
                              {std.averageScore ? `${std.averageScore} / 400` : "—"}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                type="button"
                                onClick={() => setSelectedDrilldownStudent(std)}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#116149] hover:underline cursor-pointer"
                              >
                                <span>Inspect</span>
                                <ChevronRight size={13} />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Diagnostics & Heatmap View */}
        {activeTab === "diagnostics" && (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs animate-in fade-in duration-150">
            <SyllabusHeatmapView schoolName={schoolName} />
          </div>
        )}

        {/* TAB 3: CBT Lab Controller View */}
        {activeTab === "lab" && (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-6 animate-in fade-in duration-150">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Clock size={20} className="text-[#116149]" />
                  Computer Laboratory Mock Controller
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Synchronize and proctor full 120-minute, 180-question mock exams across all laboratory monitors simultaneously.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsMockSchedulerOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#116149] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#0b4936] transition cursor-pointer self-start sm:self-auto"
              >
                <Play size={13} fill="currentColor" />
                <span>Launch New Lab Session</span>
              </button>
            </div>

            {/* Active Session Simulation Card */}
            <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-bold text-blue-900">
                    <span className="size-1.5 rounded-full bg-blue-600 animate-pulse" />
                    <span>Synchronized Lab Ready</span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900">
                    SS3 Term 2 Grand UTME Mock Simulation
                  </h3>
                  <p className="text-xs text-slate-600">
                    Standard 4-subject exam (Use of English 60 questions + 3 Subjects 40 questions = 180 questions).
                  </p>
                </div>

                <div className="rounded-xl bg-white p-3 border border-blue-200 text-center min-w-[140px] shadow-xs">
                  <span className="text-[10px] text-slate-500 font-semibold uppercase block">Session Code</span>
                  <span className="font-mono text-base font-extrabold text-blue-900">{schoolCode}-MOCK</span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="rounded-xl bg-white p-3 border border-slate-200 text-xs">
                  <span className="text-slate-500 block text-[10px]">Timer Control</span>
                  <strong className="text-slate-900 text-sm">120:00 Countdown</strong>
                </div>
                <div className="rounded-xl bg-white p-3 border border-slate-200 text-xs">
                  <span className="text-slate-500 block text-[10px]">Proctor Mode</span>
                  <strong className="text-slate-900 text-sm">8-Key Hotkey Strict</strong>
                </div>
                <div className="rounded-xl bg-white p-3 border border-slate-200 text-xs">
                  <span className="text-slate-500 block text-[10px]">Eligible Roster</span>
                  <strong className="text-[#116149] text-sm">{activeCount} Licensed Students</strong>
                </div>
                <div className="rounded-xl bg-white p-3 border border-slate-200 text-xs">
                  <span className="text-slate-500 block text-[10px]">Instant Result</span>
                  <strong className="text-purple-700 text-sm">Immediate Diagnostic</strong>
                </div>
              </div>
            </div>

            {/* Step-by-Step Lab Proctoring Checklist */}
            <div className="rounded-2xl border border-slate-200 p-5 space-y-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Laboratory Proctoring Protocol
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="rounded-xl bg-slate-50 p-3 space-y-1 border border-slate-100">
                  <span className="font-bold text-slate-800 block">1. Lab Desktops Setup</span>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Open desktop browsers to <code className="bg-slate-200 px-1 py-0.5 rounded text-[10px]">/mock</code>. Verify keyboards are functioning for 8-key shortcuts.
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3 space-y-1 border border-slate-100">
                  <span className="font-bold text-slate-800 block">2. Candidate Authentication</span>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Students log in using their email and default surname password, then enter the whiteboard session code.
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3 space-y-1 border border-slate-100">
                  <span className="font-bold text-slate-800 block">3. Immediate Diagnostics</span>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Upon exam submission, scores synchronize directly to this dashboard, populating the syllabus heatmap.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
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

      {/* Student Drilldown Drawer */}
      <StudentDrilldownModal
        isOpen={!!selectedDrilldownStudent}
        onClose={() => setSelectedDrilldownStudent(null)}
        student={selectedDrilldownStudent}
        schoolName={schoolName}
      />

      {/* CBT Lab Mock Scheduler Modal */}
      <MockSchedulerModal
        isOpen={isMockSchedulerOpen}
        onClose={() => setIsMockSchedulerOpen(false)}
        schoolName={schoolName}
        schoolCode={schoolCode}
        activeCandidatesCount={activeCount}
      />
    </div>
  );
}
