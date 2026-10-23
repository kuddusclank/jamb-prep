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
import { CohortCheckoutModal } from "./cohort-checkout-modal";
import StudyLoading from "@/components/study-loading";
import { SchoolDashboardSkeleton } from "@/components/school-dashboard-skeleton";
import { 
  Users, 
  CreditCard, 
  Copy, 
  UserPlus, 
  Upload, 
  BarChart3, 
  CheckCircle2, 
  Clock, 
  ArrowRight, 
  LogOut, 
  Building2, 
  Calendar, 
  KeyRound, 
  CheckSquare, 
  Square, 
  Check,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Play,
  Share2,
  FileSpreadsheet
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
  practiceAccuracy?: number | null;
  totalPracticeQuestions?: number;
  enrolmentMethod?: string;
}

export default function SchoolDashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedPasswordId, setCopiedPasswordId] = useState<string | null>(null);

  // Active workspace tab with shimmer transition state
  const [activeTab, setActiveTab] = useState<"roster" | "diagnostics" | "lab">("roster");
  const [tabTransitioning, setTabTransitioning] = useState(false);

  const handleTabChange = (tab: "roster" | "diagnostics" | "lab") => {
    if (tab === activeTab) return;
    setTabTransitioning(true);
    setActiveTab(tab);
    setTimeout(() => {
      setTabTransitioning(false);
    }, 280);
  };

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [isMockSchedulerOpen, setIsMockSchedulerOpen] = useState(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [selectedDrilldownStudent, setSelectedDrilldownStudent] = useState<StudentItem | null>(null);

  // Selection & Expandable Rows state
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [expandedStudentIds, setExpandedStudentIds] = useState<string[]>([]);

  // School cohort roster starts clean for fresh institutional registrations
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [scheduledMock, setScheduledMock] = useState<any | null>(null);
  const [origin, setOrigin] = useState("");

  // Loading phase state: "auth_loading" (StudyLoading) -> "data_loading" (shimmer skeleton) -> "ready"
  const [loadingPhase, setLoadingPhase] = useState<"auth_loading" | "data_loading" | "ready">("auth_loading");

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

      // Load any actual scheduled lab mock for this school
      try {
        if (typeof window !== "undefined") {
          const storedMock = localStorage.getItem(`jambprep_school_lab_mock_${code}`);
          if (storedMock) {
            setScheduledMock(JSON.parse(storedMock));
          }
        }
      } catch (e) {
        console.warn("Could not read scheduled mock:", e);
      }

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

      // Attempt to load enrolled students from native worker API or fallback to local
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "https://jambprep-api-foundation.abdulquddus-akanbi.workers.dev";
        const sessionRes = await supabase.auth.getSession();
        const token = sessionRes?.data?.session?.access_token;

        const listRes = await fetch(`${apiBase}/api/v1/schools/students`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { "Authorization": `Bearer ${token}` } : {})
          },
        });

        if (listRes.ok) {
          const data = await listRes.json();
          if (data.students && Array.isArray(data.students)) {
            const mappedStudents: StudentItem[] = data.students.map((s: any) => ({
              id: s.id,
              name: s.name,
              email: s.email,
              studentIdentifier: s.studentIdentifier || null,
              defaultPassword: s.defaultPassword,
              subjects: s.subjects || ["ENG", "MTH", "PHY", "CHM"],
              licenseStatus: s.licenseStatus || "inactive",
              daysLeft: s.licenseExpiresAt ? Math.max(0, Math.ceil((new Date(s.licenseExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 0,
              lastActive: s.ingestionMethod === "link" ? "Self-Registered (Link)" : "Enrolled",
              averageScore: typeof s.averageScore === "number" ? s.averageScore : null,
              practiceAccuracy: typeof s.practiceAccuracy === "number" ? s.practiceAccuracy : null,
              totalPracticeQuestions: typeof s.totalPracticeQuestions === "number" ? s.totalPracticeQuestions : 0,
              enrolmentMethod: s.ingestionMethod || "link",
            }));

            // Merge with local cohort to preserve any offline items
            const serverIds = new Set(mappedStudents.map((s) => s.id));
            const serverEmails = new Set(mappedStudents.map((s) => s.email?.toLowerCase()));
            const localOnly = localCohort.filter(
              (item) => !serverIds.has(item.id) && !serverEmails.has(item.email?.toLowerCase())
            );
            const combined = [...mappedStudents, ...localOnly];

            setStudents(combined);
            try {
              if (typeof window !== "undefined") {
                localStorage.setItem(`jambprep_school_students_${code}`, JSON.stringify(combined));
              }
            } catch (e) {
              console.warn("Could not cache cohort:", e);
            }
            return;
          }
        }
      } catch (err) {
        console.warn("Could not load dynamic roster from native API, checking local cohort state:", err);
      }

      setStudents(localCohort);
    }).finally(() => {
      // Transition from auth loading to shimmer skeleton for visual polish, then reveal live dashboard
      setLoadingPhase("data_loading");
      setTimeout(() => {
        setLoadingPhase("ready");
      }, 350);
    });
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.assign("/schools");
  };

  const handleMockScheduled = (session: any) => {
    setScheduledMock(session);
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem(`jambprep_school_lab_mock_${schoolCode}`, JSON.stringify(session));
      }
    } catch (e) {
      console.warn("Could not save scheduled mock:", e);
    }
  };

  const schoolName = (user?.user_metadata?.school_name as string) || "LecternIQ Academy";
  const state = (user?.user_metadata?.state as string) || "Lagos";
  const schoolType = (user?.user_metadata?.school_type as string) || "secondary_school";
  const schoolCode = (user?.user_metadata?.school_code as string) || (user?.id ? "SCH-" + user.id.slice(0, 8).toUpperCase() : "SCH-LECTITEP");
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

  // Expandable row handlers
  const toggleExpandStudent = (id: string) => {
    setExpandedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleExpandAll = () => {
    if (expandedStudentIds.length === students.length) {
      setExpandedStudentIds([]);
    } else {
      setExpandedStudentIds(students.map((s) => s.id));
    }
  };

  const unlicensedCount = students.filter((s) => s.licenseStatus !== "active").length;

  const handleCheckoutClick = () => {
    if (selectedStudentIds.length > 0) {
      window.location.assign(`/schools/checkout?students=${selectedStudentIds.length}`);
    } else {
      setIsCheckoutModalOpen(true);
    }
  };

  const handleSelectAllAndProceed = () => {
    const unlicensed = students.filter((s) => s.licenseStatus !== "active");
    const targetCount = unlicensed.length > 0 ? unlicensed.length : Math.max(1, students.length);
    window.location.assign(`/schools/checkout?students=${targetCount}`);
  };

  const handleModalProceed = (ids: string[]) => {
    setIsCheckoutModalOpen(false);
    setSelectedStudentIds(ids);
    window.location.assign(`/schools/checkout?students=${ids.length}`);
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

  if (loadingPhase === "auth_loading") {
    return <StudyLoading />;
  }

  if (loadingPhase === "data_loading") {
    return <SchoolDashboardSkeleton />;
  }

  return (
    <div className="min-h-screen bg-[#F7F8F6] text-[#17231F] flex flex-col justify-between selection:bg-[#EAF4EF] selection:text-[#12664F] animate-in fade-in duration-200">
      {/* Application Header */}
      <header className="sticky top-0 z-40 border-b border-[#E3E8E4] bg-white">
        <div className="shell flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <Link 
              href="/schools" 
              className="flex items-center gap-2.5 text-base font-semibold tracking-tight text-[#17231F] shrink-0"
            >
              <span className="flex size-8 items-center justify-center rounded-lg bg-[#12664F] text-white shadow-xs">
                <BrandMark size={24} />
              </span>
              <span>JAMBPrep</span>
            </Link>

            <span className="hidden sm:inline-block h-4 w-px bg-[#E3E8E4] shrink-0" />

            <div className="hidden sm:flex items-center gap-2 min-w-0 text-xs">
              <span className="font-semibold text-[#17231F] truncate max-w-[200px] md:max-w-[280px]">
                {schoolName}
              </span>
              <span className="rounded bg-[#EAF4EF] px-2 py-0.5 text-[11px] font-mono font-medium text-[#12664F] border border-[#12664F]/20 shrink-0">
                {schoolCode}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setIsMockSchedulerOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-md bg-[#12664F] px-3 py-1.5 text-xs font-medium text-white shadow-xs hover:bg-[#0B3028] transition cursor-pointer"
            >
              <Play size={12} fill="currentColor" />
              <span className="hidden sm:inline">Schedule CBT Mock</span>
              <span className="sm:hidden">Mock</span>
            </button>

            <span className="hidden md:inline-block h-4 w-px bg-[#E3E8E4]" />

            <div className="hidden md:flex flex-col text-right">
              <span className="text-xs font-semibold text-[#17231F] leading-tight">
                {(user?.user_metadata?.display_name as string) || user?.email || "Administrator"}
              </span>
              <span className="text-[11px] text-[#68766F] font-medium leading-tight">
                School Administrator
              </span>
            </div>

            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center gap-1.5 rounded-md border border-[#E3E8E4] bg-white px-2.5 py-1.5 text-xs font-medium text-[#68766F] shadow-xs hover:bg-[#F7F8F6] hover:text-[#17231F] transition cursor-pointer"
              title="Sign out of school portal"
            >
              <LogOut size={13} />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Examination Operations Console */}
      <main className="shell flex-1 py-6 sm:py-8 space-y-6">
        {/* Page Introduction & Enrolment Link Card */}
        <section className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 rounded-lg border border-[#E3E8E4] bg-white p-5 sm:p-6 shadow-xs">
          <div className="space-y-1 max-w-xl">
            <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-[#68766F]">
              <span>SCHOOL ADMINISTRATION</span>
              <span>·</span>
              <span className="text-[#12664F]">{schoolType.replace(/_/g, " ").toUpperCase()}</span>
              <span>·</span>
              <span>{state.toUpperCase()}</span>
            </div>
            <h1 className="text-2xl sm:text-[28px] font-semibold tracking-tight text-[#17231F]">
              {schoolName}
            </h1>
            <p className="text-xs sm:text-sm text-[#68766F] leading-relaxed">
              Manage student enrolment, examination access, and CBT performance from one workspace.
            </p>
          </div>

          {/* Compact Registration Link Console */}
          <div className="rounded-md border border-[#E3E8E4] bg-[#F7F8F6] p-3.5 sm:p-4 min-w-[280px] sm:min-w-[340px] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-[#68766F]">Dedicated School Code</span>
              <span className="font-mono font-semibold text-[#12664F] bg-white px-2 py-0.5 rounded border border-[#E3E8E4] text-xs">
                {schoolCode}
              </span>
            </div>
            <p className="text-[11px] text-[#68766F]">
              Share this registration link with students for instant cohort enrolment:
            </p>
            <div className="flex items-center rounded-md border border-[#E3E8E4] bg-white overflow-hidden shadow-2xs">
              <span className="truncate flex-1 pl-2.5 pr-2 py-1.5 font-mono text-[11px] text-[#17231F] select-all">
                {inviteLink}
              </span>
              <button
                type="button"
                onClick={handleCopyInviteLink}
                className="inline-flex shrink-0 items-center gap-1.5 bg-[#12664F] hover:bg-[#0B3028] px-3 py-1.5 text-xs font-medium text-white transition cursor-pointer"
                title="Copy student registration link"
              >
                {copiedLink ? (
                  <>
                    <Check size={13} className="text-emerald-200" />
                    <span>Copied</span>
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
        </section>

        {/* 4 Overview Metrics */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="rounded-lg border border-[#E3E8E4] bg-white p-4 sm:p-5 shadow-xs space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#68766F] block">
              Total Candidates
            </span>
            <p className="text-2xl sm:text-[26px] font-semibold tabular-nums text-[#17231F]">
              {students.length} Candidates
            </p>
            <span className="text-[11px] text-[#68766F] block">
              {activeCount} active paid {activeCount === 1 ? "licence" : "licences"}
            </span>
          </div>

          <div className="rounded-lg border border-[#E3E8E4] bg-white p-4 sm:p-5 shadow-xs space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#68766F] block">
              Active Paid Licences
            </span>
            <p className="text-2xl sm:text-[26px] font-semibold tabular-nums text-[#17231F]">
              {activeCount} Licences
            </p>
            <div className="flex items-center justify-between pt-0.5 text-[11px]">
              <span className="text-[#12664F] font-medium truncate">
                ₦1,500 / candidate / month
              </span>
              {students.length > activeCount && (
                <button
                  type="button"
                  onClick={handleCheckoutClick}
                  className="font-semibold text-[#12664F] hover:text-[#0B3028] hover:underline cursor-pointer shrink-0 ml-1 inline-flex items-center gap-0.5"
                >
                  <span>Licence {students.length - activeCount} pending</span>
                  <ArrowRight size={10} />
                </button>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-[#E3E8E4] bg-white p-4 sm:p-5 shadow-xs space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#68766F] block">
              CBT Lab Readiness
            </span>
            <p className="text-2xl sm:text-[26px] font-semibold text-[#17231F]">
              {scheduledMock ? "1 Session Ready" : "CBT Lab Ready"}
            </p>
            <span className="text-[11px] text-[#68766F] block truncate">
              120-min timed simulation · {scheduledMock ? (scheduledMock.labSessionCode || "Proctor session ready") : "8-key proctor mode"}
            </span>
          </div>

          <div className="rounded-lg border border-[#E3E8E4] bg-white p-4 sm:p-5 shadow-xs space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#68766F] block">
              Cohort Performance
            </span>
            <p className="text-2xl sm:text-[26px] font-semibold tabular-nums text-[#17231F]">
              {cohortAvg !== null ? `${cohortAvg} / 400` : "No data yet"}
            </p>
            <span className="text-[11px] text-[#68766F] block truncate">
              {cohortAvg !== null 
                ? `${Math.round((cohortAvg / 400) * 100)}% target reach` 
                : "Students haven't completed any assessments yet"}
            </span>
          </div>
        </section>

        {/* Primary Workspace Navigation Tabs */}
        <nav aria-label="Dashboard views" className="border-b border-[#E3E8E4] flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={() => handleTabChange("roster")}
            className={`pb-2.5 px-3 text-xs flex items-center gap-2 border-b-2 transition cursor-pointer ${
              activeTab === "roster"
                ? "border-[#12664F] text-[#12664F] font-semibold"
                : "border-transparent text-[#68766F] hover:text-[#17231F] font-medium"
            }`}
          >
            <Users size={14} />
            <span>Candidate Roster & Licences ({students.length})</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("diagnostics")}
            className={`pb-2.5 px-3 text-xs flex items-center gap-2 border-b-2 transition cursor-pointer ${
              activeTab === "diagnostics"
                ? "border-[#12664F] text-[#12664F] font-semibold"
                : "border-transparent text-[#68766F] hover:text-[#17231F] font-medium"
            }`}
          >
            <BarChart3 size={14} />
            <span>Syllabus Diagnostic Heatmap</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("lab")}
            className={`pb-2.5 px-3 text-xs flex items-center gap-2 border-b-2 transition cursor-pointer ${
              activeTab === "lab"
                ? "border-[#12664F] text-[#12664F] font-semibold"
                : "border-transparent text-[#68766F] hover:text-[#17231F] font-medium"
            }`}
          >
            <Clock size={14} />
            <span>CBT Lab Mock Controller</span>
          </button>
        </nav>

        {/* Tab Transition Shimmer State */}
        {tabTransitioning && (
          <div className="rounded-lg border border-[#E3E8E4] bg-white p-6 shadow-xs space-y-4 animate-in fade-in duration-100">
            <div className="flex items-center justify-between gap-4 pb-3 border-b border-slate-100">
              <div className="space-y-1.5">
                <div className="h-5 w-40 rounded bg-slate-200/70 animate-pulse" />
                <div className="h-3 w-64 rounded bg-slate-100 animate-pulse" />
              </div>
              <div className="h-8 w-28 rounded-md bg-slate-100 animate-pulse" />
            </div>
            <div className="space-y-3 pt-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between gap-4 py-2 border-b border-slate-50 last:border-0">
                  <div className="h-4 w-48 rounded bg-slate-100 animate-pulse" />
                  <div className="h-4 w-32 rounded bg-slate-100 animate-pulse" />
                  <div className="h-5 w-20 rounded bg-slate-100 animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 1: Candidates Management Workspace (Main Focus) */}
        {!tabTransitioning && activeTab === "roster" && (
          <section className="rounded-lg border border-[#E3E8E4] bg-white shadow-xs overflow-hidden animate-in fade-in duration-150">
            {/* Header & Compact Actions Toolbar */}
            <div className="p-4 sm:p-5 border-b border-[#E3E8E4] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base sm:text-lg font-semibold text-[#17231F]">Candidates</h2>
                <p className="text-xs text-[#68766F] mt-0.5">
                  Manage enrolment, examination access, and candidate records.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-[#E3E8E4] bg-white px-3 py-1.5 text-xs font-medium text-[#17231F] shadow-xs hover:bg-[#F7F8F6] transition cursor-pointer"
                >
                  <UserPlus size={13} />
                  <span>Add Candidate</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsCsvModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-[#E3E8E4] bg-white px-3 py-1.5 text-xs font-medium text-[#17231F] shadow-xs hover:bg-[#F7F8F6] transition cursor-pointer"
                >
                  <Upload size={13} />
                  <span>Import CSV</span>
                </button>

                <button
                  type="button"
                  onClick={handleSelectAllAndProceed}
                  className="inline-flex items-center gap-1.5 rounded-md border border-[#12664F]/30 bg-[#EAF4EF] text-[#0B3028] px-3 py-1.5 text-xs font-semibold hover:bg-white hover:border-[#12664F] transition cursor-pointer"
                  title="Select all unlicensed candidates and proceed directly to checkout"
                >
                  <CheckSquare size={13} className="text-[#12664F]" />
                  <span>Select All & Proceed</span>
                  <ArrowRight size={12} />
                </button>

                <button
                  type="button"
                  onClick={handleCheckoutClick}
                  className="inline-flex items-center gap-1.5 rounded-md bg-[#12664F] px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-[#0B3028] transition cursor-pointer"
                >
                  <CreditCard size={13} />
                  <span>Checkout Licences</span>
                  {unlicensedCount > 0 && (
                    <span className="rounded-full bg-white/20 px-1.5 py-0.2 text-[10px] font-bold">
                      {unlicensedCount}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Compact Enrolment Note & Password Policy Bar */}
            <div className="px-4 sm:px-5 py-2.5 bg-[#F7F8F6] border-b border-[#E3E8E4] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-[#68766F]">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="inline-flex items-center gap-1.5">
                  <KeyRound size={13} className="text-[#68766F] shrink-0" />
                  <span>
                    Default password rule: <strong className="text-[#17231F] font-semibold">LASTNAME in capital letters</strong>
                  </span>
                </div>
                {unlicensedCount > 0 ? (
                  <span className="inline-flex items-center gap-1 rounded bg-amber-100/70 border border-amber-200 px-2 py-0.5 text-[11px] font-semibold text-amber-900">
                    <AlertCircle size={11} className="text-amber-700" />
                    {unlicensedCount} candidate{unlicensedCount > 1 ? "s" : ""} awaiting licence
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded bg-[#EAF4EF] border border-[#12664F]/20 px-2 py-0.5 text-[11px] font-semibold text-[#12664F]">
                    <CheckCircle2 size={11} />
                    All candidates licensed
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={toggleExpandAll}
                  className="text-xs font-medium text-[#68766F] hover:text-[#17231F] transition cursor-pointer"
                >
                  {expandedStudentIds.length === students.length && students.length > 0 ? "Collapse All" : "Expand All"}
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={handleSelectAllAndProceed}
                  className="inline-flex items-center gap-1 font-semibold text-xs text-[#12664F] hover:text-[#0B3028] hover:underline transition cursor-pointer"
                >
                  <CreditCard size={12} />
                  <span>Checkout All (₦{(Math.max(1, unlicensedCount > 0 ? unlicensedCount : students.length) * 1500).toLocaleString()}) →</span>
                </button>
              </div>
            </div>

            {/* Roster Multi-Select Action Bar */}
            {selectedStudentIds.length > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0B3028] px-4 sm:px-5 py-3 text-white text-xs border-b border-[#E3E8E4] animate-in fade-in">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-5 items-center justify-center rounded bg-white/20 text-white font-semibold text-[11px]">
                    {selectedStudentIds.length}
                  </span>
                  <span className="text-slate-200">
                    candidate{selectedStudentIds.length > 1 ? "s" : ""} selected for cohort action
                  </span>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setSelectedStudentIds([])}
                    className="text-slate-300 hover:text-white transition cursor-pointer text-xs underline underline-offset-2"
                  >
                    Clear Selection
                  </button>
                  <Link
                    href={`/schools/checkout?students=${selectedStudentIds.length}`}
                    className="inline-flex items-center gap-1.5 rounded-md bg-[#EAF4EF] text-[#0B3028] px-3 py-1.5 font-semibold text-xs hover:bg-white transition cursor-pointer"
                  >
                    <CreditCard size={13} />
                    <span>Proceed to Cohort Licensing (₦{(selectedStudentIds.length * 1500).toLocaleString()})</span>
                    <ArrowRight size={12} />
                  </Link>
                </div>
              </div>
            )}

            {/* Candidate Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[760px]">
                <thead>
                  <tr className="border-b border-[#E3E8E4] bg-[#F7F8F6] text-[#68766F] font-medium select-none">
                    <th className="py-2.5 px-3 w-8 text-center" title="Expand row details">
                      <span className="sr-only">Expand</span>
                    </th>
                    <th className="py-2.5 px-3 w-10">
                      <button
                        type="button"
                        onClick={toggleSelectAll}
                        className="flex items-center justify-center text-[#68766F] hover:text-[#12664F] transition cursor-pointer"
                        title={isAllSelected ? "Deselect all" : "Select all candidates"}
                      >
                        {isAllSelected ? (
                          <CheckSquare size={15} className="text-[#12664F]" />
                        ) : (
                          <Square size={15} />
                        )}
                      </button>
                    </th>
                    <th className="py-2.5 px-4">Candidate Name</th>
                    <th className="py-2.5 px-4">Email</th>
                    <th className="py-2.5 px-4">Default Password</th>
                    <th className="py-2.5 px-4">Subject Pack</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4">Score & Practice Progress</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E3E8E4] text-[#17231F]">
                  {students.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 px-4 text-center">
                        <div className="mx-auto flex size-10 items-center justify-center rounded-lg bg-[#EAF4EF] text-[#12664F] mb-2.5">
                          <Users size={20} />
                        </div>
                        <h3 className="text-sm font-semibold text-[#17231F]">No candidates enrolled yet.</h3>
                        <p className="text-xs text-[#68766F] max-w-sm mx-auto mt-1 mb-4 leading-relaxed">
                          Add students individually, import your class list, or share the school registration link.
                        </p>
                        <div className="flex items-center justify-center gap-2.5">
                          <button
                            type="button"
                            onClick={() => setIsAddModalOpen(true)}
                            className="inline-flex items-center gap-1.5 rounded-md bg-[#12664F] px-3.5 py-1.5 text-xs font-medium text-white shadow-xs hover:bg-[#0B3028] transition cursor-pointer"
                          >
                            <UserPlus size={13} />
                            <span>Add Candidate</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsCsvModalOpen(true)}
                            className="inline-flex items-center gap-1.5 rounded-md border border-[#E3E8E4] bg-white px-3.5 py-1.5 text-xs font-medium text-[#17231F] shadow-xs hover:bg-[#F7F8F6] transition cursor-pointer"
                          >
                            <Upload size={13} />
                            <span>Import CSV</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    students.map((std) => {
                      const isSelected = selectedStudentIds.includes(std.id);
                      const isExpanded = expandedStudentIds.includes(std.id);
                      const isSelfRegistered = std.enrolmentMethod === "link" || !std.defaultPassword;
                      const pwd = std.defaultPassword || null;
                      const isCopied = copiedPasswordId === std.id;

                      return (
                        <div key={std.id} className="contents">
                          <tr 
                            className={`transition select-none ${isSelected ? "bg-[#EAF4EF]/40" : "hover:bg-[#F7F8F6]"} ${isExpanded ? "border-b-0" : ""}`}
                          >
                            <td className="py-3 px-3 w-8 text-center">
                              <button
                                type="button"
                                onClick={() => toggleExpandStudent(std.id)}
                                className="p-1 rounded text-[#68766F] hover:text-[#12664F] hover:bg-[#EAF4EF] transition cursor-pointer"
                                title={isExpanded ? "Collapse candidate details" : "Expand candidate details"}
                              >
                                <ChevronDown 
                                  size={15} 
                                  className={`transition-transform duration-200 ${isExpanded ? "rotate-180 text-[#12664F]" : "text-[#68766F]"}`} 
                                />
                              </button>
                            </td>
                            <td className="py-3 px-3 w-10">
                              <button
                                type="button"
                                onClick={() => toggleSelectStudent(std.id)}
                                className="flex items-center justify-center text-[#68766F] hover:text-[#12664F] transition cursor-pointer"
                              >
                                {isSelected ? (
                                  <CheckSquare size={15} className="text-[#12664F]" />
                                ) : (
                                  <Square size={15} />
                                )}
                              </button>
                            </td>
                            <td className="py-3 px-4 font-medium text-[#17231F]">
                              <button
                                type="button"
                                onClick={() => toggleExpandStudent(std.id)}
                                className="flex items-center gap-2 hover:text-[#12664F] text-left cursor-pointer"
                              >
                                <span className="font-semibold">{std.name}</span>
                                {std.studentIdentifier && (
                                  <span className="rounded bg-[#F7F8F6] border border-[#E3E8E4] px-1.5 py-0.5 text-[10px] font-mono text-[#68766F]">
                                    {std.studentIdentifier}
                                  </span>
                                )}
                              </button>
                            </td>
                            <td className="py-3 px-4 text-[#68766F]">
                              {std.email}
                            </td>
                            <td className="py-3 px-4">
                              {isSelfRegistered || !pwd ? (
                                <span 
                                  className="inline-flex items-center gap-1 rounded bg-[#F7F8F6] border border-[#E3E8E4] px-2 py-0.5 text-[11px] text-[#68766F]"
                                  title="Candidate created their own private password via the registration link"
                                >
                                  Self-registered
                                </span>
                              ) : (
                                <div className="inline-flex items-center gap-1.5">
                                  <code className="rounded bg-[#F7F8F6] border border-[#E3E8E4] px-1.5 py-0.5 font-mono text-[11px] font-semibold text-[#17231F]">
                                    {pwd}
                                  </code>
                                  <button
                                    type="button"
                                    onClick={() => handleCopyPassword(std.id, pwd)}
                                    className="text-[#68766F] hover:text-[#17231F] transition cursor-pointer p-0.5"
                                    title="Copy default password"
                                  >
                                    {isCopied ? (
                                      <Check size={12} className="text-[#12664F]" />
                                    ) : (
                                      <Copy size={12} />
                                    )}
                                  </button>
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-1">
                                {(std.subjects || ["ENG", "MTH", "PHY", "CHM"]).map((sub) => (
                                  <span key={sub} className="rounded bg-[#F7F8F6] border border-[#E3E8E4] px-1.5 py-0.5 text-[10px] font-medium text-[#68766F]">
                                    {sub}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              {std.licenseStatus === "active" ? (
                                <span className="inline-flex items-center gap-1 rounded bg-[#EAF4EF] px-2 py-0.5 text-[10px] font-medium text-[#12664F] border border-[#12664F]/20">
                                  <span className="size-1.5 rounded-full bg-[#12664F]" />
                                  Active ({std.daysLeft ?? 28}d left)
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => window.location.assign(`/schools/checkout?students=1`)}
                                  className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-900 border border-amber-200 hover:bg-amber-100 transition cursor-pointer"
                                  title="Candidate unlicensed. Click to checkout 1 licence."
                                >
                                  <AlertCircle size={10} className="text-amber-700" />
                                  <span>Unlicensed</span>
                                  <span className="text-[9px] underline">Licence</span>
                                </button>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              {std.averageScore ? (
                                <div>
                                  <span className="font-semibold tabular-nums text-[#17231F] block">
                                    {std.averageScore} / 400
                                  </span>
                                  {typeof std.practiceAccuracy === "number" && (
                                    <span className="text-[10px] text-[#68766F] block">
                                      {std.practiceAccuracy}% practice accuracy
                                    </span>
                                  )}
                                </div>
                              ) : typeof std.practiceAccuracy === "number" ? (
                                <div>
                                  <span className="font-medium text-[#12664F] block">
                                    {std.practiceAccuracy}% Practice
                                  </span>
                                  <span className="text-[10px] text-[#68766F] block">
                                    {std.totalPracticeQuestions || 0} questions solved
                                  </span>
                                </div>
                              ) : (
                                <span className="text-[#68766F]">—</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => toggleExpandStudent(std.id)}
                                  className="text-[11px] font-medium text-[#68766F] hover:text-[#12664F] px-1.5 py-0.5 rounded hover:bg-[#F7F8F6] transition cursor-pointer"
                                >
                                  {isExpanded ? "Collapse" : "Details"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setSelectedDrilldownStudent(std)}
                                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#12664F] hover:underline cursor-pointer"
                                >
                                  <span>Inspect</span>
                                  <ChevronRight size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* Expandable Accordion Drawer */}
                          {isExpanded && (
                            <tr className="bg-[#F8FAF8] border-b border-[#E3E8E4] animate-in fade-in duration-150">
                              <td colSpan={9} className="p-4 sm:p-5">
                                <div className="rounded-lg border border-[#E3E8E4] bg-white p-4 space-y-4 shadow-2xs">
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                                    {/* Card 1: CBT Mock & Practice Performance */}
                                    <div className="rounded-md border border-[#E3E8E4] bg-[#F7F8F6] p-3.5 space-y-2.5">
                                      <div className="flex items-center justify-between">
                                        <span className="font-semibold text-[#17231F] flex items-center gap-1.5">
                                          <BarChart3 size={13} className="text-[#12664F]" />
                                          <span>Performance & Diagnostics</span>
                                        </span>
                                        <span className="font-mono text-xs font-bold text-[#12664F]">
                                          {std.averageScore ? `${std.averageScore} / 400` : "No Mock Taken"}
                                        </span>
                                      </div>

                                      <div className="space-y-1.5 text-[11px]">
                                        <div className="flex items-center justify-between text-[#68766F]">
                                          <span>Practice Accuracy:</span>
                                          <span className="font-semibold text-[#17231F]">
                                            {typeof std.practiceAccuracy === "number" ? `${std.practiceAccuracy}%` : "—"}
                                          </span>
                                        </div>
                                        <div className="flex items-center justify-between text-[#68766F]">
                                          <span>Questions Solved:</span>
                                          <span className="font-semibold text-[#17231F]">
                                            {std.totalPracticeQuestions || 0} questions
                                          </span>
                                        </div>
                                        <div className="flex items-center justify-between text-[#68766F]">
                                          <span>Subject Combination:</span>
                                          <span className="font-mono text-[#12664F] font-medium">
                                            {(std.subjects || ["ENG", "MTH", "PHY", "CHM"]).join(" · ")}
                                          </span>
                                        </div>
                                      </div>

                                      <button
                                        type="button"
                                        onClick={() => setSelectedDrilldownStudent(std)}
                                        className="w-full inline-flex items-center justify-center gap-1.5 rounded-md border border-[#12664F]/30 bg-[#EAF4EF] text-[#12664F] py-1.5 text-xs font-semibold hover:bg-[#12664F] hover:text-white transition cursor-pointer"
                                      >
                                        <BarChart3 size={12} />
                                        <span>Open Full Diagnostic Drilldown</span>
                                        <ArrowRight size={11} />
                                      </button>
                                    </div>

                                    {/* Card 2: Account & Security Profile */}
                                    <div className="rounded-md border border-[#E3E8E4] bg-[#F7F8F6] p-3.5 space-y-2.5">
                                      <span className="font-semibold text-[#17231F] flex items-center gap-1.5">
                                        <KeyRound size={13} className="text-[#68766F]" />
                                        <span>Enrolment & Credentials</span>
                                      </span>

                                      <div className="space-y-1.5 text-[11px]">
                                        <div className="flex items-center justify-between text-[#68766F]">
                                          <span>Candidate ID:</span>
                                          <span className="font-mono text-[#17231F] font-semibold">
                                            {std.studentIdentifier || std.id.slice(0, 8)}
                                          </span>
                                        </div>
                                        <div className="flex items-center justify-between text-[#68766F]">
                                          <span>Enrolment Channel:</span>
                                          <span className="font-medium text-[#17231F]">
                                            {std.enrolmentMethod === "link"
                                              ? "Self-registered (Link)"
                                              : std.enrolmentMethod === "csv"
                                              ? "CSV Class Ingestion"
                                              : "Manual Enrolment"}
                                          </span>
                                        </div>
                                        <div className="flex items-center justify-between text-[#68766F]">
                                          <span>Account Password:</span>
                                          {isSelfRegistered || !pwd ? (
                                            <span className="text-[#68766F] italic">Private Password</span>
                                          ) : (
                                            <div className="inline-flex items-center gap-1 font-mono font-bold text-[#17231F]">
                                              <span>{pwd}</span>
                                              <button
                                                type="button"
                                                onClick={() => handleCopyPassword(std.id, pwd)}
                                                className="text-[#68766F] hover:text-[#17231F] p-0.5 cursor-pointer"
                                                title="Copy password"
                                              >
                                                {isCopied ? <Check size={11} className="text-[#12664F]" /> : <Copy size={11} />}
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      </div>

                                      <p className="text-[10px] text-[#68766F] pt-1 leading-relaxed">
                                        Students sign in at <strong className="text-[#17231F]">jambprep.pages.dev/login</strong> using their registered email and credentials.
                                      </p>
                                    </div>

                                    {/* Card 3: Licensing Status & Instant Action */}
                                    <div className="rounded-md border border-[#E3E8E4] bg-[#F7F8F6] p-3.5 space-y-2.5 flex flex-col justify-between">
                                      <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                          <span className="font-semibold text-[#17231F] flex items-center gap-1.5">
                                            <CreditCard size={13} className="text-[#12664F]" />
                                            <span>Institutional Licence</span>
                                          </span>
                                          {std.licenseStatus === "active" ? (
                                            <span className="rounded bg-[#EAF4EF] text-[#12664F] px-1.5 py-0.5 text-[10px] font-semibold border border-[#12664F]/20">
                                              Active
                                            </span>
                                          ) : (
                                            <span className="rounded bg-amber-100 text-amber-900 px-1.5 py-0.5 text-[10px] font-semibold border border-amber-200">
                                              Unlicensed
                                            </span>
                                          )}
                                        </div>

                                        {std.licenseStatus === "active" ? (
                                          <p className="text-[11px] text-[#68766F] leading-relaxed">
                                            Active licence with full access to CBT mock tests and AI study tools. Expires in <strong className="text-[#17231F]">{std.daysLeft ?? 28} days</strong>.
                                          </p>
                                        ) : (
                                          <p className="text-[11px] text-amber-900 leading-relaxed bg-amber-50/80 p-2 rounded border border-amber-200/60">
                                            Candidate has demo-only access. CBT mock exams and weak topic remedial plans require an active licence.
                                          </p>
                                        )}
                                      </div>

                                      {std.licenseStatus !== "active" ? (
                                        <Link
                                          href="/schools/checkout?students=1"
                                          className="w-full inline-flex items-center justify-center gap-1.5 rounded-md bg-[#12664F] text-white py-2 text-xs font-semibold hover:bg-[#0B3028] shadow-xs transition cursor-pointer"
                                        >
                                          <CreditCard size={13} />
                                          <span>Licence Candidate (₦1,500 / mo)</span>
                                          <ArrowRight size={12} />
                                        </Link>
                                      ) : (
                                        <Link
                                          href="/schools/checkout?students=1"
                                          className="w-full inline-flex items-center justify-center gap-1.5 rounded-md border border-[#E3E8E4] bg-white text-[#17231F] py-1.5 text-xs font-medium hover:bg-[#F7F8F6] transition cursor-pointer"
                                        >
                                          <CreditCard size={12} />
                                          <span>Renew / Extend Licence</span>
                                        </Link>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </div>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* TAB 2: Diagnostics & Heatmap View */}
        {!tabTransitioning && activeTab === "diagnostics" && (
          <section className="rounded-lg border border-[#E3E8E4] bg-white p-5 sm:p-6 shadow-xs animate-in fade-in duration-150">
            <SyllabusHeatmapView schoolName={schoolName} />
          </section>
        )}

        {/* TAB 3: CBT Lab Controller View */}
        {!tabTransitioning && activeTab === "lab" && (
          <section className="rounded-lg border border-[#E3E8E4] bg-white p-5 sm:p-6 shadow-xs space-y-6 animate-in fade-in duration-150">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E3E8E4]">
              <div>
                <h2 className="text-base sm:text-lg font-semibold text-[#17231F] flex items-center gap-2">
                  <Clock size={18} className="text-[#12664F]" />
                  <span>Computer Laboratory Mock Controller</span>
                </h2>
                <p className="text-xs text-[#68766F] mt-0.5">
                  Synchronize and proctor full 120-minute, 180-question mock exams across all laboratory monitors simultaneously.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsMockSchedulerOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-md bg-[#12664F] px-3.5 py-1.5 text-xs font-medium text-white shadow-xs hover:bg-[#0B3028] transition cursor-pointer self-start sm:self-auto"
              >
                <Play size={12} fill="currentColor" />
                <span>Launch New Lab Session</span>
              </button>
            </div>

            {/* Scheduled Session Card or Clean Empty State */}
            {!scheduledMock ? (
              <div className="rounded-lg border border-dashed border-[#E3E8E4] bg-[#F7F8F6] p-8 sm:p-10 text-center space-y-3">
                <div className="mx-auto flex size-10 items-center justify-center rounded-lg bg-white border border-[#E3E8E4] text-[#68766F] shadow-xs">
                  <Clock size={20} />
                </div>
                <div className="space-y-1 max-w-md mx-auto">
                  <h3 className="text-sm font-semibold text-[#17231F]">No mock exam session scheduled yet</h3>
                  <p className="text-xs text-[#68766F] leading-relaxed">
                    You haven&apos;t scheduled any computer laboratory mock exams. Launch a new lab session to configure your title, duration, and generate a synchronized entry code.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMockSchedulerOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-md bg-[#12664F] px-3.5 py-1.5 text-xs font-medium text-white shadow-xs hover:bg-[#0B3028] transition cursor-pointer"
                >
                  <Play size={12} fill="currentColor" />
                  <span>Schedule First Lab Mock</span>
                </button>
              </div>
            ) : (
              <div className="rounded-lg border border-[#E3E8E4] bg-[#F7F8F6] p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-1.5 rounded bg-[#EAF4EF] border border-[#12664F]/20 px-2 py-0.5 text-[10px] font-medium text-[#12664F]">
                      <span className="size-1.5 rounded-full bg-[#12664F]" />
                      <span>Synchronized Lab Ready</span>
                    </div>
                    <h3 className="text-base font-semibold text-[#17231F]">
                      {scheduledMock.title || "UTME Computer Lab Mock"}
                    </h3>
                    <p className="text-xs text-[#68766F]">
                      Standard 4-subject exam (Use of English 60 questions + 3 Subjects 40 questions = 180 questions).
                    </p>
                  </div>

                  <div className="rounded-md bg-white p-3 border border-[#E3E8E4] text-center min-w-[140px] shadow-xs">
                    <span className="text-[10px] text-[#68766F] font-semibold uppercase tracking-wider block">Session Code</span>
                    <span className="font-mono text-base font-bold text-[#17231F]">{scheduledMock.labSessionCode || `${schoolCode}-MOCK`}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                  <div className="rounded-md bg-white p-3 border border-[#E3E8E4] text-xs">
                    <span className="text-[#68766F] block text-[10px] font-medium">Timer Control</span>
                    <strong className="text-[#17231F] text-xs sm:text-sm">120:00 Countdown</strong>
                  </div>
                  <div className="rounded-md bg-white p-3 border border-[#E3E8E4] text-xs">
                    <span className="text-[#68766F] block text-[10px] font-medium">Proctor Mode</span>
                    <strong className="text-[#17231F] text-xs sm:text-sm">8-Key Hotkey Strict</strong>
                  </div>
                  <div className="rounded-md bg-white p-3 border border-[#E3E8E4] text-xs">
                    <span className="text-[#68766F] block text-[10px] font-medium">Eligible Roster</span>
                    <strong className="text-[#12664F] text-xs sm:text-sm">{activeCount} Licensed Students</strong>
                  </div>
                  <div className="rounded-md bg-white p-3 border border-[#E3E8E4] text-xs">
                    <span className="text-[#68766F] block text-[10px] font-medium">Instant Result</span>
                    <strong className="text-[#17231F] text-xs sm:text-sm">Immediate Diagnostic</strong>
                  </div>
                </div>
              </div>
            )}

            {/* Step-by-Step Lab Proctoring Checklist */}
            <div className="rounded-lg border border-[#E3E8E4] p-4 sm:p-5 space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[#17231F]">
                Laboratory Proctoring Protocol
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="rounded-md bg-[#F7F8F6] p-3 space-y-1 border border-[#E3E8E4]">
                  <span className="font-semibold text-[#17231F] block">1. Lab Desktops Setup</span>
                  <p className="text-[11px] text-[#68766F] leading-relaxed">
                    Open desktop browsers to <code className="bg-white border border-[#E3E8E4] px-1 py-0.5 rounded text-[10px]">/mock</code>. Verify keyboards are functioning for 8-key shortcuts.
                  </p>
                </div>
                <div className="rounded-md bg-[#F7F8F6] p-3 space-y-1 border border-[#E3E8E4]">
                  <span className="font-semibold text-[#17231F] block">2. Candidate Authentication</span>
                  <p className="text-[11px] text-[#68766F] leading-relaxed">
                    Students log in using their email and default surname password, then enter the whiteboard session code.
                  </p>
                </div>
                <div className="rounded-md bg-[#F7F8F6] p-3 space-y-1 border border-[#E3E8E4]">
                  <span className="font-semibold text-[#17231F] block">3. Immediate Diagnostics</span>
                  <p className="text-[11px] text-[#68766F] leading-relaxed">
                    Upon exam submission, scores synchronize directly to this dashboard, populating the syllabus heatmap.
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Institutional Footer */}
      <footer className="border-t border-[#E3E8E4] bg-white py-5 text-center text-xs text-[#68766F]">
        <div className="shell flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>JAMBPrep for Schools · Institutional UTME examination & diagnostics platform.</span>
          <div className="flex items-center gap-3 text-[11px]">
            <span>Encrypted Session</span>
            <span>•</span>
            <span>Role: Administrator</span>
            <span>•</span>
            <Link href="/schools" className="hover:text-[#17231F] underline underline-offset-2">Schools Overview</Link>
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
        onScheduled={handleMockScheduled}
      />

      {/* Cohort Licensing & Checkout Selection Modal */}
      <CohortCheckoutModal
        isOpen={isCheckoutModalOpen}
        onClose={() => setIsCheckoutModalOpen(false)}
        students={students}
        schoolName={schoolName}
        onProceed={handleModalProceed}
      />
    </div>
  );
}
