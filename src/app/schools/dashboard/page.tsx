"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { createClient } from "@/lib/supabase/client";
import { AddStudentModal } from "./add-student-modal";
import { CsvImportModal } from "./csv-import-modal";
import { StudentDrilldownModal } from "./student-drilldown-modal";
import { MockSchedulerModal } from "./mock-scheduler-modal";
import { SyllabusHeatmapView } from "./syllabus-heatmap-view";
import { CohortCheckoutModal } from "./cohort-checkout-modal";
import { EditStudentModal } from "./edit-student-modal";
import { DisconnectStudentModal } from "./disconnect-student-modal";
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
  Trophy,
  Medal,
  RefreshCw, 
  CheckSquare, 
  Square, 
  Check,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  AlertCircle,
  Play,
  Share2,
  FileSpreadsheet,
  Pencil,
  UserMinus,
  Menu,
  X,
  Search,
  RotateCw,
  MoreHorizontal,
  Lock,
  Layers,
  HelpCircle,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Shield,
  Download,
  Monitor
} from "lucide-react";

interface StudentItem {
  id: string;
  name: string;
  email: string;
  studentIdentifier?: string | null;
  defaultPassword?: string;
  subjects?: string[];
  licenseStatus: "active" | "inactive" | "expired";
  daysLeft?: number;
  lastActive?: string;
  averageScore?: number | null;
  practiceAccuracy?: number | null;
  totalPracticeQuestions?: number;
  enrolmentMethod?: string;
}

type DashboardView = "candidates" | "diagnostics" | "lab" | "billing" | "profile";
type FilterStatus = "all" | "active" | "unlicensed" | "expired";

const VALID_DASHBOARD_VIEWS: readonly DashboardView[] = [
  "candidates",
  "diagnostics",
  "lab",
  "billing",
  "profile",
] as const;

function isValidDashboardView(val: unknown): val is DashboardView {
  return typeof val === "string" && (VALID_DASHBOARD_VIEWS as readonly string[]).includes(val);
}

function getInitialDashboardView(): DashboardView {
  if (typeof window === "undefined") {
    return "candidates";
  }
  try {
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get("view") || params.get("tab");
    if (isValidDashboardView(viewParam)) {
      return viewParam;
    }
    const hash = window.location.hash.replace(/^#/, "");
    if (isValidDashboardView(hash)) {
      return hash;
    }
    const stored = localStorage.getItem("schools_dashboard_view");
    if (isValidDashboardView(stored)) {
      return stored;
    }
  } catch {}
  return "candidates";
}

interface NavItem {
  id: DashboardView;
  label: string;
  icon: any;
  badge: string | null;
  badgeColor?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

function parseSubjectsArray(val: unknown): string[] {
  if (Array.isArray(val)) {
    return val.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  }
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) {
        return parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
      }
    } catch {}
    return val.replace(/[{}"\s]/g, "").split(",").filter((s) => s.length > 0);
  }
  return [];
}

const SUBJECT_TAG_MAP: Record<string, { code: string; name: string }> = {
  // English (User requested EN key)
  eng: { code: "EN", name: "Use of English" },
  en: { code: "EN", name: "Use of English" },
  english: { code: "EN", name: "Use of English" },
  "use of english": { code: "EN", name: "Use of English" },

  // French (User requested FR key)
  fr: { code: "FR", name: "French" },
  frn: { code: "FR", name: "French" },
  french: { code: "FR", name: "French" },

  // Mathematics
  mth: { code: "MTH", name: "Mathematics" },
  math: { code: "MTH", name: "Mathematics" },
  maths: { code: "MTH", name: "Mathematics" },
  mathematics: { code: "MTH", name: "Mathematics" },

  // Physics
  phy: { code: "PHY", name: "Physics" },
  physics: { code: "PHY", name: "Physics" },

  // Chemistry
  chm: { code: "CHM", name: "Chemistry" },
  chem: { code: "CHM", name: "Chemistry" },
  chemistry: { code: "CHM", name: "Chemistry" },

  // Biology
  bio: { code: "BIO", name: "Biology" },
  biology: { code: "BIO", name: "Biology" },

  // Economics
  ecn: { code: "ECN", name: "Economics" },
  eco: { code: "ECN", name: "Economics" },
  economics: { code: "ECN", name: "Economics" },

  // Government
  gov: { code: "GOV", name: "Government" },
  government: { code: "GOV", name: "Government" },

  // Literature in English
  lit: { code: "LIT", name: "Literature in English" },
  literature: { code: "LIT", name: "Literature in English" },
  "literature in english": { code: "LIT", name: "Literature in English" },

  // Commerce
  com: { code: "COM", name: "Commerce" },
  commerce: { code: "COM", name: "Commerce" },

  // Principles of Accounting
  acc: { code: "ACC", name: "Principles of Accounting" },
  accounting: { code: "ACC", name: "Principles of Accounting" },
  "principles of accounting": { code: "ACC", name: "Principles of Accounting" },

  // Christian Religious Knowledge
  crk: { code: "CRK", name: "Christian Religious Knowledge" },
  crs: { code: "CRK", name: "Christian Religious Knowledge" },
  "christian religious knowledge": { code: "CRK", name: "Christian Religious Knowledge" },

  // Islamic Religious Studies
  irs: { code: "IRS", name: "Islamic Religious Studies" },
  "islamic religious studies": { code: "IRS", name: "Islamic Religious Studies" },

  // Geography
  geo: { code: "GEO", name: "Geography" },
  geography: { code: "GEO", name: "Geography" },

  // Agricultural Science
  agr: { code: "AGR", name: "Agricultural Science" },
  agric: { code: "AGR", name: "Agricultural Science" },
  "agricultural science": { code: "AGR", name: "Agricultural Science" },

  // History
  his: { code: "HIS", name: "History" },
  history: { code: "HIS", name: "History" },

  // Computer Studies
  cmp: { code: "CMP", name: "Computer Studies" },
  cs: { code: "CMP", name: "Computer Studies" },
  "computer studies": { code: "CMP", name: "Computer Studies" },

  // Arabic
  arb: { code: "ARB", name: "Arabic" },
  arabic: { code: "ARB", name: "Arabic" },

  // Art
  art: { code: "ART", name: "Art" },

  // Hausa
  hau: { code: "HAU", name: "Hausa" },
  hausa: { code: "HAU", name: "Hausa" },

  // Home Economics
  hec: { code: "HEC", name: "Home Economics" },
  "home economics": { code: "HEC", name: "Home Economics" },

  // Igbo
  igb: { code: "IGB", name: "Igbo" },
  igbo: { code: "IGB", name: "Igbo" },

  // Music
  mus: { code: "MUS", name: "Music" },
  music: { code: "MUS", name: "Music" },

  // Physical and Health Education
  phe: { code: "PHE", name: "Physical and Health Education" },
  "physical and health education": { code: "PHE", name: "Physical and Health Education" },

  // Yoruba
  yor: { code: "YOR", name: "Yoruba" },
  yoruba: { code: "YOR", name: "Yoruba" },
};

function getSubjectTag(subject: string): { code: string; name: string } {
  const clean = subject.trim();
  const lower = clean.toLowerCase();
  if (SUBJECT_TAG_MAP[lower]) {
    return SUBJECT_TAG_MAP[lower];
  }
  const fallbackCode = clean.length <= 4 ? clean.toUpperCase() : clean.slice(0, 3).toUpperCase();
  return { code: fallbackCode, name: clean };
}

const AVATAR_COLORS = [
  "bg-emerald-100 text-emerald-800 border-emerald-200",
  "bg-blue-100 text-blue-800 border-blue-200",
  "bg-purple-100 text-purple-800 border-purple-200",
  "bg-amber-100 text-amber-800 border-amber-200",
  "bg-rose-100 text-rose-800 border-rose-200",
  "bg-teal-100 text-teal-800 border-teal-200",
  "bg-indigo-100 text-indigo-800 border-indigo-200",
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

export default function SchoolDashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedPasswordId, setCopiedPasswordId] = useState<string | null>(null);

  // Active navigation view state with URL and localStorage persistence
  const [activeView, setActiveView] = useState<DashboardView>(getInitialDashboardView);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const changeView = (nextView: DashboardView, replaceHistory = false) => {
    setActiveView(nextView);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("schools_dashboard_view", nextView);
        const url = new URL(window.location.href);
        url.searchParams.set("view", nextView);
        if (replaceHistory) {
          window.history.replaceState({ view: nextView }, "", url.toString());
        } else {
          window.history.pushState({ view: nextView }, "", url.toString());
        }
      } catch {}
    }
  };

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [isMockSchedulerOpen, setIsMockSchedulerOpen] = useState(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [selectedDrilldownStudent, setSelectedDrilldownStudent] = useState<StudentItem | null>(null);
  const [editingStudent, setEditingStudent] = useState<StudentItem | null>(null);
  const [disconnectTargets, setDisconnectTargets] = useState<StudentItem[]>([]);

  // Selection & Expandable Rows state
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [expandedStudentIds, setExpandedStudentIds] = useState<string[]>([]);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // School cohort roster starts clean for fresh institutional registrations
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [scheduledMock, setScheduledMock] = useState<any | null>(null);
  const [activeMockData, setActiveMockData] = useState<any | null>(null);
  const [isMockLoading, setIsMockLoading] = useState(false);
  const [origin, setOrigin] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);

  // Loading phase state: "auth_loading" (StudyLoading) -> "data_loading" (shimmer skeleton) -> "ready"
  const [loadingPhase, setLoadingPhase] = useState<"auth_loading" | "data_loading" | "ready">("auth_loading");

  const fetchActiveMock = async (token?: string) => {
    setIsMockLoading(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "https://jambprep-api-foundation.abdulquddus-akanbi.workers.dev";
      let authToken = token;
      if (!authToken) {
        const supabase = createClient();
        const sessionRes = await supabase.auth.getSession();
        authToken = sessionRes?.data?.session?.access_token;
      }
      if (!authToken) return;

      const res = await fetch(`${apiBase}/api/v1/schools/mocks/active`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setActiveMockData(data);
        if (data?.mock) {
          setScheduledMock(data.mock);
        } else {
          setScheduledMock(null);
        }
      }
    } catch (err) {
      console.warn("Could not fetch active mock leaderboard:", err);
    } finally {
      setIsMockLoading(false);
    }
  };

  const handleEndMock = async (mockId: string) => {
    if (!confirm("Are you sure you want to conclude and archive this mock examination session?")) return;
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "https://jambprep-api-foundation.abdulquddus-akanbi.workers.dev";
      const supabase = createClient();
      const sessionRes = await supabase.auth.getSession();
      const token = sessionRes?.data?.session?.access_token;
      if (!token) return;

      await fetch(`${apiBase}/api/v1/schools/mocks/${mockId}/end`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      await fetchActiveMock(token);
    } catch (err) {
      console.warn("Could not end mock:", err);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  // Synchronize active view with URL query parameters, hash, and browser history
  useEffect(() => {
    if (typeof window !== "undefined") {
      const initial = getInitialDashboardView();
      if (initial !== activeView) {
        setActiveView(initial);
      }
      try {
        const url = new URL(window.location.href);
        if (!url.searchParams.has("view")) {
          url.searchParams.set("view", initial);
          window.history.replaceState({ view: initial }, "", url.toString());
        }
      } catch {}
    }

    const handlePopState = () => {
      const current = getInitialDashboardView();
      setActiveView(current);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (activeView === "lab") {
      fetchActiveMock();
    }
  }, [activeView]);

  const fetchCohortData = async (supabaseClient?: any) => {
    const supabase = supabaseClient || createClient();
    const res = await supabase.auth.getUser();
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
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            localCohort = parsed.map((item: any) => ({
              ...item,
              subjects: parseSubjectsArray(item.subjects),
            }));
          }
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

      if (token) {
        fetchActiveMock(token).catch(() => {});
      }

      const listRes = await fetch(`${apiBase}/api/v1/schools/students`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
      });

      if (listRes.ok) {
        const data = await listRes.json();
        if (data.activeLabMock) {
          setScheduledMock(data.activeLabMock);
          try {
            if (typeof window !== "undefined") {
              localStorage.setItem(`jambprep_school_lab_mock_${code}`, JSON.stringify(data.activeLabMock));
            }
          } catch {}
        }
        if (data.students && Array.isArray(data.students)) {
          const mappedStudents: StudentItem[] = data.students.map((s: any) => {
            const daysLeft = s.licenseExpiresAt
              ? Math.max(0, Math.ceil((new Date(s.licenseExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
              : 0;
            const rawStatus = s.licenseStatus || "inactive";
            const effectiveStatus: "active" | "inactive" | "expired" =
              rawStatus === "active" && s.licenseExpiresAt && daysLeft <= 0 ? "expired" : rawStatus;
            return {
              id: s.id,
              name: s.name,
              email: s.email,
              studentIdentifier: s.studentIdentifier || null,
              defaultPassword: s.defaultPassword,
              subjects: parseSubjectsArray(s.subjects),
              licenseStatus: effectiveStatus,
              daysLeft,
              lastActive: s.ingestionMethod === "link" ? "Self-Registered (Link)" : "Enrolled",
              averageScore: typeof s.averageScore === "number" ? s.averageScore : null,
              practiceAccuracy: typeof s.practiceAccuracy === "number" ? s.practiceAccuracy : null,
              totalPracticeQuestions: typeof s.totalPracticeQuestions === "number" ? s.totalPracticeQuestions : 0,
              enrolmentMethod: s.ingestionMethod || "link",
            };
          });

          setStudents(mappedStudents);
          try {
            if (typeof window !== "undefined") {
              localStorage.setItem(`jambprep_school_students_${code}`, JSON.stringify(mappedStudents));
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
  };

  useEffect(() => {
    fetchCohortData().finally(() => {
      setLoadingPhase("ready");
    });
  }, []);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await fetchCohortData();
    } finally {
      setTimeout(() => setIsSyncing(false), 500);
    }
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.assign("/schools");
  };

  const handleMockScheduled = (session: any) => {
    setScheduledMock(session);
    fetchActiveMock();
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
  const unlicensedStudentIds = students.filter((s) => s.licenseStatus !== "active").map((s) => s.id);
  const isAllSelected =
    unlicensedStudentIds.length > 0
      ? unlicensedStudentIds.every((id) => selectedStudentIds.includes(id))
      : students.length > 0 && selectedStudentIds.length === students.length;

  const toggleSelectAll = () => {
    if (isAllSelected || (unlicensedStudentIds.length === 0 && selectedStudentIds.length > 0)) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(unlicensedStudentIds);
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

  /** Checkout URL that carries the exact candidates to licence */
  const checkoutUrlFor = (ids: string[]) =>
    `/schools/checkout?students=${Math.max(1, ids.length)}${ids.length > 0 ? `&ids=${ids.map(encodeURIComponent).join(",")}` : ""}`;

  const handleCheckoutClick = () => {
    if (selectedStudentIds.length === 0) {
      return;
    }
    window.location.assign(checkoutUrlFor(selectedStudentIds));
  };

  const handleSelectPendingForCheckout = () => {
    const unlicensedIds = students.filter((s) => s.licenseStatus !== "active").map((s) => s.id);
    if (unlicensedIds.length > 0) {
      setSelectedStudentIds(unlicensedIds);
      changeView("candidates");
    }
  };

  const handleStudentUpdated = (updated: any) => {
    setStudents((prev) => {
      const next = prev.map((item) =>
        item.id === updated.id
          ? {
              ...item,
              name: updated.name || item.name,
              email: updated.email || item.email,
              studentIdentifier: updated.studentIdentifier !== undefined ? updated.studentIdentifier : item.studentIdentifier,
              defaultPassword: updated.defaultPassword !== undefined ? updated.defaultPassword : item.defaultPassword,
              subjects: Array.isArray(updated.subjects) ? parseSubjectsArray(updated.subjects) : item.subjects,
              enrolmentMethod: updated.ingestionMethod || item.enrolmentMethod,
            }
          : item
      );
      try {
        if (typeof window !== "undefined") {
          localStorage.setItem(`jambprep_school_students_${schoolCode}`, JSON.stringify(next));
        }
      } catch {}
      return next;
    });
  };

  const handleStudentsDisconnected = (disconnectedIds: string[]) => {
    const removedSet = new Set(disconnectedIds);
    setStudents((prev) => {
      const next = prev.filter((item) => !removedSet.has(item.id));
      try {
        if (typeof window !== "undefined") {
          localStorage.setItem(`jambprep_school_students_${schoolCode}`, JSON.stringify(next));
        }
      } catch {}
      return next;
    });
    setSelectedStudentIds((prev) => prev.filter((id) => !removedSet.has(id)));
    setExpandedStudentIds((prev) => prev.filter((id) => !removedSet.has(id)));
  };

  const handleModalProceed = (ids: string[]) => {
    setIsCheckoutModalOpen(false);
    setSelectedStudentIds(ids);
    window.location.assign(checkoutUrlFor(ids));
  };

  const handleStudentAdded = (newStudent: any) => {
    const formatted: StudentItem = {
      id: newStudent.id,
      name: newStudent.name,
      email: newStudent.email,
      studentIdentifier: newStudent.studentIdentifier || null,
      defaultPassword: newStudent.defaultPassword,
      subjects: newStudent.subjects || [],
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
      subjects: item.subjects || [],
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

  // Export CSV handler
  const handleExportCsv = () => {
    if (students.length === 0) return;
    const headers = ["Candidate Name", "Email", "Student ID", "Default Password", "Subjects", "Licence Status", "Average Score", "Enrolment Channel"];
    const rows = students.map((s) => [
      `"${s.name.replace(/"/g, '""')}"`,
      `"${s.email}"`,
      `"${s.studentIdentifier || ""}"`,
      `"${s.defaultPassword || ""}"`,
      `"${(s.subjects || []).join("; ")}"`,
      `"${s.licenseStatus}"`,
      `"${s.averageScore ?? ""}"`,
      `"${s.enrolmentMethod || "link"}"`
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${schoolCode}_candidates_roster.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const activeCount = students.filter((s) => s.licenseStatus === "active").length;
  const expiredCount = students.filter((s) => s.licenseStatus === "expired").length;
  const activeSpend = activeCount * 1500;
  const studentsWithScores = students.filter((s) => typeof s.averageScore === "number" && s.averageScore !== null);
  const cohortAvg = studentsWithScores.length > 0 
    ? Math.round(studentsWithScores.reduce((acc, s) => acc + (s.averageScore as number), 0) / studentsWithScores.length)
    : null;

  // Filtered and Paginated Candidates list
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      // Status filter
      if (filterStatus === "active" && s.licenseStatus !== "active") return false;
      if (filterStatus === "unlicensed" && s.licenseStatus !== "inactive") return false;
      if (filterStatus === "expired" && s.licenseStatus !== "expired") return false;

      // Query filter
      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase();
        const matchesName = s.name.toLowerCase().includes(q);
        const matchesEmail = s.email.toLowerCase().includes(q);
        const matchesId = (s.studentIdentifier || "").toLowerCase().includes(q);
        return matchesName || matchesEmail || matchesId;
      }
      return true;
    });
  }, [students, filterStatus, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / pageSize));
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredStudents.slice(start, start + pageSize);
  }, [filteredStudents, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, searchQuery]);

  if (loadingPhase === "auth_loading") {
    return <StudyLoading />;
  }

  if (loadingPhase === "data_loading") {
    return <SchoolDashboardSkeleton />;
  }

  const adminDisplayName = (user?.user_metadata?.display_name as string) || user?.email?.split("@")[0] || "Administrator";
  const adminEmail = user?.email || "admin@school.ng";

  // Sidebar navigation sections
  const navSections: NavSection[] = [
    {
      title: "COMMAND",
      items: [
        {
          id: "candidates" as DashboardView,
          label: "Candidate Queue",
          icon: Users,
          badge: students.length > 0 ? `${students.length}` : null,
        },
        {
          id: "diagnostics" as DashboardView,
          label: "Syllabus Monitor",
          icon: BarChart3,
          badge: null,
        },
        {
          id: "lab" as DashboardView,
          label: "CBT Mock Controller",
          icon: Clock,
          badge: scheduledMock ? "1 Ready" : null,
        },
      ],
    },
    {
      title: "COMMERCE & LICENSING",
      items: [
        {
          id: "billing" as DashboardView,
          label: "Licences & Billing",
          icon: CreditCard,
          badge: unlicensedCount > 0 ? `${unlicensedCount}` : null,
          badgeColor: "bg-amber-100 text-amber-900 font-medium",
        },
      ],
    },
    {
      title: "PLATFORM & SETTINGS",
      items: [
        {
          id: "profile" as DashboardView,
          label: "School Settings",
          icon: Building2,
          badge: null,
        },
      ],
    },
  ];

  const getBreadcrumbTitle = () => {
    switch (activeView) {
      case "candidates": return "Candidate Queue";
      case "diagnostics": return "Syllabus Monitor";
      case "lab": return "CBT Mock Controller";
      case "billing": return "Licences & Billing";
      case "profile": return "School Settings";
    }
  };

  return (
    <div className="min-h-screen bg-[#F1F5F9] text-[#0F172A] flex antialiased selection:bg-[#12664F]/15 selection:text-[#12664F]">
      {/* Mobile Sidebar Overlay Backdrop */}
      {mobileSidebarOpen && (
        <div 
          onClick={() => setMobileSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-xs lg:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Modern Left Sidebar (Matches reference "Confidency OS" design) */}
      <aside 
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col justify-between transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Brand Header */}
          <div className="p-5 border-b border-[#F1F5F9] flex items-center justify-between shrink-0">
            <Link 
              href="/schools" 
              className="flex items-center gap-3 font-semibold tracking-tight text-[#0F172A] group"
            >
              <span className="flex size-9 items-center justify-center rounded-xl bg-[#12664F] text-white group-hover:bg-[#0B3028] transition">
                <BrandMark size={22} />
              </span>
              <div className="flex flex-col leading-tight">
                <span className="text-sm font-semibold text-[#0F172A]">JAMBPrep OS</span>
                <span className="text-[11px] text-[#64748B] font-medium truncate max-w-[140px]">
                  {schoolName}
                </span>
              </div>
            </Link>

            <button
              type="button"
              onClick={() => setMobileSidebarOpen(false)}
              className="p-1 rounded text-slate-400 hover:text-slate-700 lg:hidden cursor-pointer"
              aria-label="Close sidebar"
            >
              <X size={18} />
            </button>
          </div>

          {/* Quick Search Input */}
          <div className="px-4 pt-4 pb-2">
            <div className="relative flex items-center">
              <Search size={14} className="absolute left-3 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (activeView !== "candidates") changeView("candidates");
                }}
                placeholder="Search candidates..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-8 pr-10 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#12664F] focus:outline-hidden transition"
              />
              <span className="absolute right-2.5 rounded border border-slate-200 bg-white px-1 text-[10px] font-medium text-slate-400">
                ⌘K
              </span>
            </div>
          </div>

          {/* Grouped Sidebar Navigation Links */}
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-5">
            {navSections.map((section) => (
              <div key={section.title}>
                <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  {section.title}
                </p>
                <nav className="space-y-0.5">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeView === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          changeView(item.id);
                          setMobileSidebarOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition cursor-pointer ${
                          isActive
                            ? "bg-[#12664F] text-white font-medium border border-[#0E5441]"
                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Icon 
                            size={16} 
                            className={isActive ? "text-white" : "text-slate-500"} 
                          />
                          <span className="truncate">{item.label}</span>
                        </div>
                        {item.badge && (
                          <span 
                            className={`text-[11px] px-2 py-0.5 rounded-full font-medium shrink-0 ${
                              isActive
                                ? "bg-white text-[#12664F]"
                                : item.badgeColor || "bg-slate-200 text-slate-800"
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </nav>
              </div>
            ))}
          </div>

          {/* Bottom Administrator Profile Card */}
          <div className="p-3 border-t border-[#F1F5F9] bg-white">
            <div className="flex items-center justify-between gap-2 p-1.5 rounded-xl hover:bg-slate-50 transition">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="size-8 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center text-xs font-semibold text-emerald-800 shrink-0">
                  {adminDisplayName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-900 truncate leading-tight">
                    {adminDisplayName}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate leading-tight mt-0.5">
                    {adminEmail}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSignOut}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer shrink-0"
                title="Sign out of portal"
                aria-label="Sign out"
              >
                <LogOut size={15} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main App Container */}
      <div className="lg:pl-64 flex-1 flex flex-col min-w-0">
        {/* Top Header / Breadcrumb & Action Toolbar */}
        <header className="sticky top-0 z-30 bg-[#F1F5F9]/95 backdrop-blur-xs px-4 sm:px-6 lg:px-8 pt-5 pb-4">
          <div className="space-y-2.5">
            {/* Top Breadcrumb line (Left: Location, Right: Refresh cadence) */}
            <div className="flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-2 min-w-0">
                <button
                  type="button"
                  onClick={() => setMobileSidebarOpen(true)}
                  className="p-1 rounded-md border border-slate-200 bg-white text-slate-600 hover:text-slate-900 lg:hidden cursor-pointer shrink-0 mr-1"
                  aria-label="Open sidebar"
                >
                  <Menu size={15} />
                </button>
                <Lock size={12} className="text-slate-400 shrink-0" />
                <Link href="/schools" className="hover:text-slate-900 transition text-slate-500 font-normal">
                  School Portal
                </Link>
                <span className="text-slate-300">/</span>
                <span className="text-slate-700 font-medium truncate max-w-[180px] sm:max-w-none">
                  {getBreadcrumbTitle()}
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-500 font-normal">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Auto-refreshing every 30s
                </span>
              </div>
            </div>

            {/* Main Action Bar: Section Title on left, Action Buttons on right */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-0.5">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                {getBreadcrumbTitle()}
              </h1>

              {/* Right Action Buttons */}
              <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={handleExportCsv}
                  disabled={students.length === 0}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 hover:border-slate-400 active:bg-slate-100 px-3.5 py-2 text-xs font-medium text-slate-700 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Export candidates to CSV file"
                >
                  <Download size={14} />
                  <span className="hidden sm:inline">Export</span>
                </button>

                <button
                  type="button"
                  onClick={handleSync}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 hover:border-slate-400 active:bg-slate-100 px-3.5 py-2 text-xs font-medium text-slate-700 transition cursor-pointer"
                  title="Synchronize cohort records"
                >
                  <RotateCw size={14} className={isSyncing ? "animate-spin text-[#12664F]" : ""} />
                  <span className="hidden sm:inline">Sync</span>
                </button>

                <button
                  type="button"
                  onClick={handleCheckoutClick}
                  disabled={selectedStudentIds.length === 0}
                  title={
                    selectedStudentIds.length === 0
                      ? "Select at least one candidate from the table below to checkout licences"
                      : `Checkout licences for ${selectedStudentIds.length} selected candidate(s)`
                  }
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 hover:border-slate-400 active:bg-slate-100 px-3.5 py-2 text-xs font-medium text-slate-700 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CreditCard size={14} />
                  <span className="hidden sm:inline">Checkout Licences</span>
                  {selectedStudentIds.length > 0 && (
                    <span className="rounded-full bg-emerald-100 text-[#12664F] px-1.5 py-0.5 text-[10px] font-semibold">
                      {selectedStudentIds.length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#12664F] hover:bg-[#0E5441] active:bg-[#0B3A2E] text-white font-medium text-xs px-4 py-2 border border-[#0E5441] transition cursor-pointer"
                >
                  <UserPlus size={14} />
                  <span>New Candidate</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* View Content Body */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 pt-1 pb-12 space-y-7 w-full">
          {/* VIEW 1: CANDIDATES (QUEUE) */}
          {activeView === "candidates" && (
            <div className="space-y-7">
              {/* Quick Stats Row (Matches reference screenshot 100%) */}
              <section className="space-y-3.5">
                <div className="flex items-center justify-between pb-0.5">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Quick Stats
                  </h2>
                  <button 
                    type="button" 
                    onClick={() => changeView("billing")}
                    className="text-xs text-slate-400 hover:text-slate-600 p-1"
                    title="View Billing breakdown"
                  >
                    <MoreHorizontal size={15} />
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-3.5">
                  {/* Card 1: Total Enrolled */}
                  <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-4.5 flex flex-col justify-between hover:border-slate-300 transition-colors">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-slate-500 truncate">Total Enrolled</span>
                      <Users size={15} className="text-slate-400 shrink-0" />
                    </div>
                    <div className="my-2.5">
                      <p className="text-2xl font-semibold tracking-tight text-slate-900 tabular-nums leading-none">
                        {students.length}
                      </p>
                    </div>
                    <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between min-h-[22px] text-[11px] text-slate-500 font-normal">
                      <span className="truncate">
                        {students.length === 1 ? "1 active student" : `${students.length} active students`}
                      </span>
                    </div>
                  </div>

                  {/* Card 2: Unlicensed */}
                  <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-4.5 flex flex-col justify-between hover:border-slate-300 transition-colors">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-slate-500 truncate">Unlicensed</span>
                      <Clock size={15} className="text-slate-400 shrink-0" />
                    </div>
                    <div className="my-2.5">
                      <p className="text-2xl font-semibold tracking-tight text-slate-900 tabular-nums leading-none">
                        {unlicensedCount}
                      </p>
                    </div>
                    <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between min-h-[22px] text-[11px]">
                      {unlicensedCount === 0 ? (
                        <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700 truncate">
                          <span className="size-1.5 rounded-full bg-emerald-600 shrink-0" />
                          <span>All licensed</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 font-medium text-amber-800 truncate">
                          <span className="size-1.5 rounded-full bg-amber-600 shrink-0" />
                          <span>{unlicensedCount} require licence</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card 3: Active Paid */}
                  <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-4.5 flex flex-col justify-between hover:border-slate-300 transition-colors">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-slate-500 truncate">Active Paid</span>
                      <ShieldCheck size={15} className="text-slate-400 shrink-0" />
                    </div>
                    <div className="my-2.5">
                      <p className="text-2xl font-semibold tracking-tight text-slate-900 tabular-nums leading-none">
                        {activeCount < 10 && activeCount > 0 ? `0${activeCount}` : activeCount}
                      </p>
                    </div>
                    <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between min-h-[22px] text-[11px] text-slate-500 font-normal">
                      <span className="truncate">₦1,500 per seat</span>
                    </div>
                  </div>

                  {/* Card 4: Lab Readiness */}
                  <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-4.5 flex flex-col justify-between hover:border-slate-300 transition-colors">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-slate-500 truncate">Lab Readiness</span>
                      <Monitor size={15} className="text-slate-400 shrink-0" />
                    </div>
                    <div className="my-2.5">
                      <p className="text-2xl font-semibold tracking-tight text-slate-900 tabular-nums leading-none">
                        {scheduledMock ? "01" : "00"}
                      </p>
                    </div>
                    <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between min-h-[22px] text-[11px]">
                      {scheduledMock ? (
                        <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700 truncate">
                          <span className="size-1.5 rounded-full bg-emerald-600 shrink-0" />
                          <span>Session ready</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 font-normal text-slate-400 truncate">
                          <span className="size-1.5 rounded-full bg-slate-300 shrink-0" />
                          <span>Session idle</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card 5: Active Spend */}
                  <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-4.5 flex flex-col justify-between hover:border-slate-300 transition-colors">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-slate-500 truncate">Active Spend</span>
                      <CreditCard size={15} className="text-slate-400 shrink-0" />
                    </div>
                    <div className="my-2.5">
                      <p className="text-2xl font-semibold tracking-tight text-slate-900 tabular-nums leading-none">
                        ₦{activeSpend.toLocaleString()}
                      </p>
                    </div>
                    <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between min-h-[22px] text-[11px] text-slate-500 font-normal">
                      <span className="truncate">30-day cycle</span>
                    </div>
                  </div>

                  {/* Card 6: Avg Mock Score */}
                  <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-4.5 flex flex-col justify-between hover:border-slate-300 transition-colors">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-slate-500 truncate">Avg Mock Score</span>
                      <BarChart3 size={15} className="text-slate-400 shrink-0" />
                    </div>
                    <div className="my-2.5">
                      <p className="text-2xl font-semibold tracking-tight text-slate-900 tabular-nums leading-none">
                        {cohortAvg !== null ? `${cohortAvg}` : "—"}
                      </p>
                    </div>
                    <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between min-h-[22px] text-[11px] text-slate-500 font-normal">
                      <div className="w-full flex items-center justify-between gap-2">
                        <span className="truncate">Target 280 / 400</span>
                        {cohortAvg !== null && (
                          <div 
                            className="w-10 bg-slate-100 rounded-full h-1 overflow-hidden shrink-0"
                            title={`Average: ${cohortAvg} / Target: 280 / Total: 400`}
                          >
                            <div 
                              className={`h-full rounded-full transition-all duration-300 ${
                                cohortAvg >= 280 ? "bg-emerald-600" : "bg-slate-700"
                              }`}
                              style={{ width: `${Math.min(100, Math.round((cohortAvg / 400) * 100))}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Main Candidate Table Card (Matches reference "All Orders" table) */}
              <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                {/* Table Filter & Search Controls Header */}
                <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <h2 className="text-base font-semibold text-slate-900">
                      All Candidates
                    </h2>
                    <span className="text-xs font-medium text-slate-500">
                      ({filteredStudents.length} candidate{filteredStudents.length === 1 ? "" : "s"})
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    {/* Search Bar */}
                    <div className="relative flex items-center min-w-[240px]">
                      <Search size={14} className="absolute left-3 text-slate-500 pointer-events-none" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search candidate, email, ID..."
                        className="w-full rounded-xl border border-slate-300 bg-white pl-8 pr-7 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#12664F] focus:outline-hidden transition"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery("")}
                          className="absolute right-2.5 text-slate-400 hover:text-slate-700 text-xs"
                        >
                          <X size={13} />
                        </button>
                      )}
                    </div>

                    {/* Filter Segmented Pill Tabs */}
                    <div className="inline-flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs">
                      <button
                        type="button"
                        onClick={() => setFilterStatus("all")}
                        className={`rounded-lg px-3.5 py-1.5 transition cursor-pointer ${
                          filterStatus === "all"
                            ? "bg-[#12664F] text-white font-medium"
                            : "text-slate-600 hover:text-slate-900 hover:bg-white font-medium"
                        }`}
                      >
                        All
                      </button>
                      <button
                        type="button"
                        onClick={() => setFilterStatus("active")}
                        className={`rounded-lg px-3.5 py-1.5 transition cursor-pointer ${
                          filterStatus === "active"
                            ? "bg-[#12664F] text-white font-medium"
                            : "text-slate-600 hover:text-slate-900 hover:bg-white font-medium"
                        }`}
                      >
                        Active Licences
                      </button>
                      <button
                        type="button"
                        onClick={() => setFilterStatus("unlicensed")}
                        className={`rounded-lg px-3.5 py-1.5 transition cursor-pointer ${
                          filterStatus === "unlicensed"
                            ? "bg-[#12664F] text-white font-medium"
                            : "text-slate-600 hover:text-slate-900 hover:bg-white font-medium"
                        }`}
                      >
                        Unlicensed {unlicensedCount > 0 && `(${unlicensedCount})`}
                      </button>
                      {expiredCount > 0 && (
                        <button
                          type="button"
                          onClick={() => setFilterStatus("expired")}
                          className={`rounded-lg px-3.5 py-1.5 transition cursor-pointer ${
                            filterStatus === "expired"
                              ? "bg-[#12664F] text-white font-medium"
                              : "text-slate-600 hover:text-slate-900 hover:bg-white font-medium"
                          }`}
                        >
                          Expired
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Multi-Select Floating Notification Bar */}
                {selectedStudentIds.length > 0 && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-[#0B3028] px-5 py-2.5 text-white text-xs border-b border-emerald-900 animate-in fade-in">
                    <div className="flex items-center gap-2">
                      <span className="flex size-5 items-center justify-center rounded-full bg-white/20 text-white font-semibold text-[11px]">
                        {selectedStudentIds.length}
                      </span>
                      <span className="text-slate-200">
                        candidate{selectedStudentIds.length > 1 ? "s" : ""} selected for cohort action
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => setSelectedStudentIds([])}
                        className="text-slate-300 hover:text-white transition cursor-pointer text-xs underline underline-offset-2"
                      >
                        Clear
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setDisconnectTargets(students.filter((s) => selectedStudentIds.includes(s.id)))
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300/40 bg-rose-950/60 text-rose-200 px-3 py-1 font-semibold text-xs hover:bg-rose-900 hover:text-white transition cursor-pointer"
                      >
                        <UserMinus size={12} />
                        <span>Disconnect Selected</span>
                      </button>
                      <Link
                        href={checkoutUrlFor(selectedStudentIds)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 text-[#0B3028] px-3.5 py-1 font-semibold text-xs hover:bg-white transition cursor-pointer"
                      >
                        <CreditCard size={12} />
                        <span>Checkout Selected (₦{(selectedStudentIds.length * 1500).toLocaleString()})</span>
                        <ArrowRight size={11} />
                      </Link>
                    </div>
                  </div>
                )}

                {/* Candidate List Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse min-w-[800px]">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-medium uppercase tracking-wider text-[11px] select-none">
                        <th className="py-3 px-3 w-8 text-center">
                          <span className="sr-only">Details</span>
                        </th>
                        <th className="py-3 px-3 w-10">
                          <button
                            type="button"
                            onClick={toggleSelectAll}
                            className="flex items-center justify-center text-slate-400 hover:text-slate-700 transition cursor-pointer"
                            title={isAllSelected ? "Deselect all" : "Select all candidates"}
                          >
                            {isAllSelected ? (
                              <CheckSquare size={15} className="text-[#12664F]" />
                            ) : (
                              <Square size={15} />
                            )}
                          </button>
                        </th>
                        <th className="py-3 px-4 font-semibold text-slate-600">Candidate</th>
                        <th className="py-3 px-4 font-semibold text-slate-600">Subjects</th>
                        <th className="py-3 px-4 font-semibold text-slate-600">Password</th>
                        <th className="py-3 px-4 font-semibold text-slate-600">Licence</th>
                        <th className="py-3 px-4 font-semibold text-slate-600">Mock Score</th>
                        <th className="py-3 px-4 font-semibold text-slate-600">Channel</th>
                        <th className="py-3 px-4 font-semibold text-slate-600 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-900">
                      {paginatedStudents.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-14 px-4 text-center">
                            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-emerald-50 text-[#12664F] mb-3">
                              <Users size={22} />
                            </div>
                            <h3 className="text-sm font-semibold text-slate-900">
                              {searchQuery || filterStatus !== "all" 
                                ? "No candidates match your current filter." 
                                : "No candidates enrolled in this cohort yet."}
                            </h3>
                            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4 leading-relaxed">
                              {searchQuery || filterStatus !== "all"
                                ? "Try resetting your search query or switching filter tabs."
                                : "Add candidates individually, import a CSV roster, or share your school registration link."}
                            </p>
                            <div className="flex items-center justify-center gap-2.5">
                              {searchQuery || filterStatus !== "all" ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSearchQuery("");
                                    setFilterStatus("all");
                                  }}
                                  className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                                >
                                  Reset Filters
                                </button>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => setIsAddModalOpen(true)}
                                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#12664F] px-4 py-2 text-xs font-medium text-white hover:bg-[#0B3028] transition cursor-pointer"
                                  >
                                    <UserPlus size={13} />
                                    <span>Add Candidate</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setIsCsvModalOpen(true)}
                                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                                  >
                                    <Upload size={13} />
                                    <span>Import CSV</span>
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ) : (
                        paginatedStudents.map((std) => {
                          const isSelected = selectedStudentIds.includes(std.id);
                          const isExpanded = expandedStudentIds.includes(std.id);
                          const isSelfRegistered = std.enrolmentMethod === "link" || !std.defaultPassword;
                          const pwd = std.defaultPassword || null;
                          const isCopied = copiedPasswordId === std.id;
                          const validSubjects = parseSubjectsArray(std.subjects);
                          const avatarColorClass = getAvatarColor(std.name);

                          return (
                            <div key={std.id} className="contents">
                              <tr 
                                className={`transition select-none group ${
                                  isSelected ? "bg-emerald-50/40" : "hover:bg-slate-50/70"
                                }`}
                              >
                                <td className="py-3.5 px-3 w-8 text-center">
                                  <button
                                    type="button"
                                    onClick={() => toggleExpandStudent(std.id)}
                                    className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                                    title="Toggle candidate details"
                                  >
                                    <ChevronDown 
                                      size={14} 
                                      className={`transition-transform duration-200 ${
                                        isExpanded ? "rotate-180 text-[#12664F]" : "text-slate-400"
                                      }`} 
                                    />
                                  </button>
                                </td>
                                <td className="py-3.5 px-3 w-10">
                                  <button
                                    type="button"
                                    onClick={() => toggleSelectStudent(std.id)}
                                    className="flex items-center justify-center text-slate-400 hover:text-slate-700 transition cursor-pointer"
                                  >
                                    {isSelected ? (
                                      <CheckSquare size={15} className="text-[#12664F]" />
                                    ) : (
                                      <Square size={15} />
                                    )}
                                  </button>
                                </td>

                                {/* Name + Avatar column (Matches reference screenshot) */}
                                <td className="py-3.5 px-4">
                                  <div className="flex items-center gap-3">
                                    <div className={`size-8 rounded-full border flex items-center justify-center text-xs font-medium shrink-0 ${avatarColorClass}`}>
                                      {std.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                      <button
                                        type="button"
                                        onClick={() => toggleExpandStudent(std.id)}
                                        className="font-medium text-slate-900 hover:text-[#12664F] text-left truncate block cursor-pointer"
                                      >
                                        {std.name}
                                      </button>
                                      <span className="text-[11px] text-slate-500 font-normal truncate block">
                                        {std.email}
                                      </span>
                                    </div>
                                  </div>
                                </td>

                                {/* Subjects column (Shows subject key tags, e.g. EN, FR, MTH, PHY) */}
                                <td className="py-3.5 px-4 text-slate-700">
                                  {validSubjects.length > 0 ? (
                                    <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 max-w-[220px]">
                                      {validSubjects.map((sub, idx) => {
                                        const info = getSubjectTag(sub);
                                        const isCompulsoryEnglish = info.code === "EN";
                                        return (
                                          <span
                                            key={idx}
                                            title={info.name}
                                            className={`inline-flex items-center px-1.5 py-0.5 rounded-md border text-[10.5px] font-medium tracking-wide select-none cursor-default transition ${
                                              isCompulsoryEnglish
                                                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                                                : "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200/80"
                                            }`}
                                          >
                                            {info.code}
                                          </span>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <span className="text-slate-400 italic text-[11px]">Not chosen</span>
                                  )}
                                </td>

                                {/* Default Password column */}
                                <td className="py-3.5 px-4">
                                  {isSelfRegistered || !pwd ? (
                                    <span className="text-[11px] text-slate-400 italic">
                                      Private
                                    </span>
                                  ) : (
                                    <div className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 border border-slate-300 px-2 py-0.5 font-mono text-xs font-medium text-slate-900">
                                      <span>{pwd}</span>
                                      <button
                                        type="button"
                                        onClick={() => handleCopyPassword(std.id, pwd)}
                                        className="text-slate-500 hover:text-slate-900 p-0.5 cursor-pointer"
                                        title="Copy default password"
                                      >
                                        {isCopied ? <Check size={11} className="text-[#12664F]" /> : <Copy size={11} />}
                                      </button>
                                    </div>
                                  )}
                                </td>

                                {/* Licence Status pill */}
                                <td className="py-3.5 px-4">
                                  {std.licenseStatus === "active" ? (
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 border border-emerald-300 px-3 py-1 text-xs font-medium text-emerald-900">
                                      <span className="size-2 rounded-full bg-emerald-600" />
                                      Active ({std.daysLeft ?? 28}d)
                                    </span>
                                  ) : std.licenseStatus === "expired" ? (
                                    <button
                                      type="button"
                                      onClick={() => window.location.assign(checkoutUrlFor([std.id]))}
                                      className="inline-flex items-center gap-1 rounded-full bg-rose-100 border border-rose-300 px-3 py-1 text-xs font-medium text-rose-950 hover:bg-rose-200 transition cursor-pointer"
                                      title="Licence expired. Click to renew."
                                    >
                                      Expired · Renew
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => window.location.assign(checkoutUrlFor([std.id]))}
                                      className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-300 px-3 py-1 text-xs font-medium text-amber-950 hover:bg-amber-200 transition cursor-pointer"
                                      title="Unlicensed. Click to checkout 1 licence."
                                    >
                                      Unlicensed · Pay
                                    </button>
                                  )}
                                </td>

                                {/* Score & Accuracy */}
                                <td className="py-3.5 px-4">
                                  {std.averageScore ? (
                                    <span className="font-medium text-slate-900 text-xs tabular-nums">
                                      {std.averageScore} / 400
                                    </span>
                                  ) : typeof std.practiceAccuracy === "number" ? (
                                    <span className="font-medium text-[#12664F] text-xs tabular-nums">
                                      {std.practiceAccuracy}% Acc
                                    </span>
                                  ) : (
                                    <span className="text-slate-400">—</span>
                                  )}
                                </td>

                                {/* Channel */}
                                <td className="py-3.5 px-4 text-slate-700">
                                  <span className="text-xs font-medium text-slate-600">
                                    {std.enrolmentMethod === "link"
                                      ? "Registration Link"
                                      : std.enrolmentMethod === "csv"
                                      ? "CSV Upload"
                                      : "Manual"}
                                  </span>
                                </td>

                                {/* Actions */}
                                <td className="py-3.5 px-4 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => setEditingStudent(std)}
                                      className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-950 transition cursor-pointer"
                                      title="Edit candidate"
                                      aria-label={`Edit ${std.name}`}
                                    >
                                      <Pencil size={13} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setDisconnectTargets([std])}
                                      className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-rose-50 hover:border-rose-400 text-slate-700 hover:text-rose-700 transition cursor-pointer"
                                      title="Disconnect candidate"
                                      aria-label={`Disconnect ${std.name}`}
                                    >
                                      <UserMinus size={13} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setSelectedDrilldownStudent(std)}
                                      className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-emerald-50 hover:border-emerald-400 text-slate-700 hover:text-[#12664F] transition cursor-pointer"
                                      title="Inspect student report"
                                    >
                                      <MoreHorizontal size={14} />
                                    </button>
                                  </div>
                                </td>
                              </tr>

                              {/* Expandable Accordion Drawer */}
                              {isExpanded && (
                                <tr className="bg-slate-50/50 border-b border-slate-100 animate-in fade-in duration-150">
                                  <td colSpan={9} className="p-4 sm:p-5">
                                    <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
                                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                                        {/* Card 1: CBT Mock Performance */}
                                        <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 space-y-2.5">
                                          <div className="flex items-center justify-between">
                                            <span className="font-medium text-slate-900 flex items-center gap-1.5">
                                              <BarChart3 size={13} className="text-[#12664F]" />
                                              <span>Performance & Diagnostics</span>
                                            </span>
                                            <span className="font-mono text-xs font-medium text-[#12664F]">
                                              {std.averageScore ? `${std.averageScore} / 400` : "No Mock Taken"}
                                            </span>
                                          </div>

                                          <div className="space-y-1.5 text-[11px]">
                                            <div className="flex items-center justify-between text-slate-500">
                                              <span>Practice Accuracy:</span>
                                              <span className="font-medium text-slate-900">
                                                {typeof std.practiceAccuracy === "number" ? `${std.practiceAccuracy}%` : "—"}
                                              </span>
                                            </div>
                                            <div className="flex items-center justify-between text-slate-500">
                                              <span>Questions Solved:</span>
                                              <span className="font-medium text-slate-900">
                                                {std.totalPracticeQuestions || 0} questions
                                              </span>
                                            </div>
                                            <div className="flex items-center justify-between text-slate-500 gap-2">
                                              <span className="shrink-0">Subject Combination:</span>
                                              {validSubjects.length > 0 ? (
                                                <div className="flex flex-wrap items-center gap-1 justify-end">
                                                  {validSubjects.map((sub, idx) => {
                                                    const info = getSubjectTag(sub);
                                                    return (
                                                      <span
                                                        key={idx}
                                                        title={info.name}
                                                        className="inline-flex items-center px-1.5 py-0.5 rounded border border-slate-200 bg-white text-[10px] font-medium text-slate-700"
                                                      >
                                                        {info.code}
                                                      </span>
                                                    );
                                                  })}
                                                </div>
                                              ) : (
                                                <span className="text-slate-400 italic">Not selected yet</span>
                                              )}
                                            </div>
                                          </div>

                                          <button
                                            type="button"
                                            onClick={() => setSelectedDrilldownStudent(std)}
                                            className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 py-1.5 text-xs font-medium hover:bg-slate-50 transition cursor-pointer"
                                          >
                                            <BarChart3 size={12} />
                                            <span>Full Diagnostic Drilldown</span>
                                            <ArrowRight size={11} />
                                          </button>
                                        </div>

                                        {/* Card 2: Credentials & Access */}
                                        <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 space-y-2.5">
                                          <span className="font-medium text-slate-900 flex items-center gap-1.5">
                                            <KeyRound size={13} className="text-slate-500" />
                                            <span>Credentials & Identification</span>
                                          </span>

                                          <div className="space-y-1.5 text-[11px]">
                                            <div className="flex items-center justify-between text-slate-500">
                                              <span>Candidate ID:</span>
                                              <span className="font-mono text-slate-900 font-medium">
                                                {std.studentIdentifier || std.id.slice(0, 8)}
                                              </span>
                                            </div>
                                            <div className="flex items-center justify-between text-slate-500">
                                              <span>Channel:</span>
                                              <span className="font-medium text-slate-900">
                                                {std.enrolmentMethod === "link"
                                                  ? "Registration Link"
                                                  : std.enrolmentMethod === "csv"
                                                  ? "CSV Ingestion"
                                                  : "Manual Entry"}
                                              </span>
                                            </div>
                                            <div className="flex items-center justify-between text-slate-500">
                                              <span>Password:</span>
                                              {isSelfRegistered || !pwd ? (
                                                <span className="text-slate-400 italic">Self-created private password</span>
                                              ) : (
                                                <div className="inline-flex items-center gap-1 font-mono font-medium text-slate-900">
                                                  <span>{pwd}</span>
                                                  <button
                                                    type="button"
                                                    onClick={() => handleCopyPassword(std.id, pwd)}
                                                    className="text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
                                                  >
                                                    {isCopied ? <Check size={11} className="text-[#12664F]" /> : <Copy size={11} />}
                                                  </button>
                                                </div>
                                              )}
                                            </div>
                                          </div>

                                          <div className="pt-2 border-t border-slate-200/60 flex items-center gap-2">
                                            <button
                                              type="button"
                                              onClick={() => setEditingStudent(std)}
                                              className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                                            >
                                              <Pencil size={11} />
                                              <span>Edit</span>
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => setDisconnectTargets([std])}
                                              className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg border border-rose-200 bg-rose-50 py-1.5 text-[11px] font-medium text-rose-700 hover:bg-rose-100 transition cursor-pointer"
                                            >
                                              <UserMinus size={11} />
                                              <span>Disconnect</span>
                                            </button>
                                          </div>
                                        </div>

                                        {/* Card 3: Licence Status & Direct Renewal */}
                                        <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 space-y-2.5 flex flex-col justify-between">
                                          <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                              <span className="font-medium text-slate-900 flex items-center gap-1.5">
                                                <CreditCard size={13} className="text-[#12664F]" />
                                                <span>Licence Status</span>
                                              </span>
                                              {std.licenseStatus === "active" ? (
                                                <span className="rounded-full bg-emerald-50 text-emerald-700 px-2.5 py-0.5 text-[10px] font-medium">
                                                  Active
                                                </span>
                                              ) : (
                                                <span className="rounded-full bg-amber-50 text-amber-800 px-2.5 py-0.5 text-[10px] font-medium">
                                                  Unlicensed
                                                </span>
                                              )}
                                            </div>

                                            {std.licenseStatus === "active" ? (
                                              <p className="text-[11px] text-slate-500 leading-relaxed">
                                                Active candidate licence. Full access to CBT mock tests and weakness analytics. Expires in <strong>{std.daysLeft ?? 28} days</strong>.
                                              </p>
                                            ) : (
                                              <p className="text-[11px] text-amber-900 leading-relaxed bg-amber-50 p-2 rounded-lg border border-amber-200/50">
                                                Candidate requires a valid licence to sit for synchronized CBT mocks and access past question solutions.
                                              </p>
                                            )}
                                          </div>

                                          {std.licenseStatus !== "active" ? (
                                            <Link
                                              href={checkoutUrlFor([std.id])}
                                              className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#12664F] text-white py-1.5 text-xs font-medium hover:bg-[#0B3028] transition cursor-pointer"
                                            >
                                              <CreditCard size={12} />
                                              <span>Licence (₦1,500 / mo)</span>
                                              <ArrowRight size={11} />
                                            </Link>
                                          ) : (
                                            <Link
                                              href={checkoutUrlFor([std.id])}
                                              className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 py-1.5 text-xs font-medium hover:bg-slate-50 transition cursor-pointer"
                                            >
                                              <CreditCard size={12} />
                                              <span>Renew Licence</span>
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

                {/* Table Footer with Numbered Pagination (Matches reference screenshot 100%) */}
                <div className="p-4 sm:p-5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-slate-500">
                  <div>
                    {filteredStudents.length > 0 ? (
                      <span>
                        Showing <strong className="font-semibold text-slate-900">{(currentPage - 1) * pageSize + 1}</strong>–<strong className="font-semibold text-slate-900">{Math.min(currentPage * pageSize, filteredStudents.length)}</strong> of <strong className="font-semibold text-slate-900">{filteredStudents.length}</strong> candidate{filteredStudents.length === 1 ? "" : "s"}
                      </span>
                    ) : (
                      <span>Showing 0 of 0 candidates</span>
                    )}
                  </div>

                  {totalPages > 1 && (
                    <div className="flex items-center gap-1 self-center sm:self-auto">
                      <button
                        type="button"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="p-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                        aria-label="Previous page"
                      >
                        <ChevronLeft size={14} />
                      </button>

                      {Array.from({ length: totalPages }).map((_, idx) => {
                        const pageNum = idx + 1;
                        const isCurrent = pageNum === currentPage;
                        return (
                          <button
                            key={pageNum}
                            type="button"
                            onClick={() => setCurrentPage(pageNum)}
                            className={`min-w-[28px] h-7 px-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                              isCurrent
                                ? "bg-[#12664F] text-white"
                                : "border border-slate-300 bg-white text-slate-800 hover:bg-slate-100"
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}

                      <button
                        type="button"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="p-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                        aria-label="Next page"
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </section>
            </div>
          )}

          {/* VIEW 2: SYLLABUS DIAGNOSTICS */}
          {activeView === "diagnostics" && (
            <div className="space-y-6">
              <SyllabusHeatmapView schoolName={schoolName} cohortSize={students.length} />
            </div>
          )}

          {/* VIEW 3: CBT LAB CONTROLLER & LIVE RANKED LEADERBOARD */}
          {activeView === "lab" && (
            <div className="space-y-6">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
                  <div>
                    <h2 className="text-base sm:text-lg font-semibold text-slate-900 flex items-center gap-2">
                      <Clock size={18} className="text-[#12664F]" />
                      <span>Computer Laboratory Mock Controller</span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Proctor your school&apos;s 120-minute UTME simulation and monitor the live ranked student leaderboard.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => fetchActiveMock()}
                      disabled={isMockLoading}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 transition cursor-pointer disabled:opacity-50"
                      title="Refresh live examination scores"
                    >
                      <RefreshCw size={12} className={isMockLoading ? "animate-spin text-[#12664F]" : ""} />
                      <span>Refresh Scores</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsMockSchedulerOpen(true)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#12664F] hover:bg-[#0E5441] px-4 py-2 text-xs font-medium text-white transition cursor-pointer"
                    >
                      <Play size={12} fill="currentColor" />
                      <span>{activeMockData?.mock ? "Schedule New Mock" : "Schedule Lab Mock"}</span>
                    </button>
                  </div>
                </div>

                {/* Empty State: No Mock Scheduled */}
                {!activeMockData?.mock && !scheduledMock ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 sm:p-10 text-center space-y-3">
                    <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-white border border-slate-300 text-slate-600">
                      <Clock size={22} />
                    </div>
                    <div className="space-y-1 max-w-md mx-auto">
                      <h3 className="text-sm font-semibold text-slate-900">No mock exam session active</h3>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Schedule your school&apos;s synchronized 120-minute UTME simulation. Once scheduled, your enrolled candidates will automatically see the mock card on their devices and their scores will rank here upon completion.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsMockSchedulerOpen(true)}
                      className="inline-flex items-center gap-2 rounded-xl bg-[#12664F] hover:bg-[#0E5441] px-4 py-2 text-xs font-medium text-white transition cursor-pointer"
                    >
                      <Play size={12} fill="currentColor" />
                      <span>Schedule Lab Mock Exam</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Active Mock Session Header Card */}
                    {activeMockData?.mock && (
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              {activeMockData.mock.windowStatus === "open" ? (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 border border-emerald-300 px-3 py-0.5 text-[11px] font-medium text-emerald-900">
                                  <span className="size-2 rounded-full bg-emerald-600 animate-pulse" />
                                  <span>Live Examination Window Open</span>
                                </span>
                              ) : activeMockData.mock.windowStatus === "scheduled" ? (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 border border-amber-300 px-3 py-0.5 text-[11px] font-medium text-amber-900">
                                  <Clock size={11} />
                                  <span>Scheduled Lab Hour</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-200 border border-slate-300 px-3 py-0.5 text-[11px] font-medium text-slate-700">
                                  <span>Lab Window Closed</span>
                                </span>
                              )}
                            </div>

                            <h3 className="text-base sm:text-lg font-bold text-slate-900">
                              {activeMockData.mock.title || "UTME Computer Lab Mock"}
                            </h3>
                            <p className="text-xs text-slate-600">
                              Standard 4-subject UTME simulation · Automatic candidate binding · Strict lab hours enforced
                            </p>
                          </div>

                          <div className="flex items-center gap-2 self-start sm:self-auto">
                            <button
                              type="button"
                              onClick={() => handleEndMock(activeMockData.mock.id)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-200 bg-white text-xs font-semibold text-red-700 hover:bg-red-50 transition cursor-pointer"
                            >
                              <span>Conclude Session</span>
                            </button>
                          </div>
                        </div>

                        {/* Timing and Window Specs */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 text-xs">
                          <div className="rounded-xl bg-white p-3 border border-slate-200">
                            <span className="text-slate-500 block text-[10px] font-medium">Scheduled Start</span>
                            <strong className="text-slate-900 text-xs sm:text-sm font-semibold">
                              {new Date(activeMockData.mock.scheduled_start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </strong>
                          </div>

                          <div className="rounded-xl bg-white p-3 border border-slate-200">
                            <span className="text-slate-500 block text-[10px] font-medium">Duration</span>
                            <strong className="text-slate-900 text-xs sm:text-sm font-semibold">
                              {activeMockData.mock.duration_minutes || 120}:00 Countdown
                            </strong>
                          </div>

                          <div className="rounded-xl bg-white p-3 border border-slate-200">
                            <span className="text-slate-500 block text-[10px] font-medium">Window Closes</span>
                            <strong className="text-slate-900 text-xs sm:text-sm font-semibold">
                              {activeMockData.mock.windowEndsAt
                                ? new Date(activeMockData.mock.windowEndsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                                : "—"}
                            </strong>
                          </div>

                          <div className="rounded-xl bg-white p-3 border border-slate-200">
                            <span className="text-slate-500 block text-[10px] font-medium">Proctoring</span>
                            <strong className="text-[#12664F] text-xs sm:text-sm font-semibold">
                              8-Key Keyboard Strict
                            </strong>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Cohort Diagnostic Summary KPIs */}
                    {activeMockData?.summary && (
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-1">
                          <span className="text-xs font-medium text-slate-500 block">Class Completion</span>
                          <div className="flex items-baseline gap-2">
                            <strong className="text-xl sm:text-2xl font-bold text-slate-900">
                              {activeMockData.summary.completedCount}
                            </strong>
                            <span className="text-xs text-slate-500">/ {activeMockData.summary.totalStudents}</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden mt-2">
                            <div 
                              className="h-full bg-[#12664F] rounded-full transition-all"
                              style={{ width: `${Math.round(((activeMockData.summary.completedCount || 0) / (activeMockData.summary.totalStudents || 1)) * 100)}%` }}
                            />
                          </div>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-1">
                          <span className="text-xs font-medium text-slate-500 block">Active in Lab</span>
                          <strong className="text-xl sm:text-2xl font-bold text-blue-700 block">
                            {activeMockData.summary.inProgressCount}
                          </strong>
                          <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-1">
                            <span className="size-1.5 rounded-full bg-blue-500 animate-pulse" />
                            <span>Currently answering</span>
                          </span>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-1">
                          <span className="text-xs font-medium text-slate-500 block">Class Average</span>
                          <strong className="text-xl sm:text-2xl font-bold text-slate-900 block">
                            {activeMockData.summary.averageScore !== null ? `${activeMockData.summary.averageScore}` : "—"}
                            <span className="text-xs font-normal text-slate-500"> / 400</span>
                          </strong>
                          <span className="text-[11px] text-slate-500 block mt-1">
                            {activeMockData.summary.completedCount > 0 ? "Completed candidates" : "Awaiting submissions"}
                          </span>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-1">
                          <span className="text-xs font-medium text-slate-500 block">Top Score / Pass Rate</span>
                          <strong className="text-xl sm:text-2xl font-bold text-emerald-800 block">
                            {activeMockData.summary.highestScore !== null ? `${activeMockData.summary.highestScore}` : "—"}
                            <span className="text-xs font-normal text-slate-500"> / 400</span>
                          </strong>
                          <span className="text-[11px] text-slate-500 block mt-1">
                            Pass Rate: <strong className="text-slate-800 font-semibold">{activeMockData.summary.passRate !== null ? `${activeMockData.summary.passRate}%` : "—"}</strong> (≥200)
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Official Ranked Student Leaderboard Table */}
                    <div className="space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Trophy size={16} className="text-amber-500" />
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                            Class Mock Leaderboard & Ranked Scores
                          </h4>
                        </div>
                        <span className="text-[11px] text-slate-500 font-medium bg-slate-100 px-2.5 py-0.5 rounded-full self-start sm:self-auto">
                          Administrator View Only · Ranked by total score
                        </span>
                      </div>

                      {activeMockData?.leaderboard && activeMockData.leaderboard.length > 0 ? (
                        <div className="overflow-x-auto rounded-xl border border-slate-200">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                                <th className="py-3 px-3 w-14 text-center">Rank</th>
                                <th className="py-3 px-3">Candidate</th>
                                <th className="py-3 px-3 text-center">Total Score</th>
                                <th className="py-3 px-3 text-center hidden md:table-cell">English</th>
                                <th className="py-3 px-3 text-center hidden lg:table-cell">Sub 2</th>
                                <th className="py-3 px-3 text-center hidden lg:table-cell">Sub 3</th>
                                <th className="py-3 px-3 text-center hidden lg:table-cell">Sub 4</th>
                                <th className="py-3 px-3 text-center hidden sm:table-cell">Time Spent</th>
                                <th className="py-3 px-3 text-right">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                              {activeMockData.leaderboard.map((row: any) => {
                                const isTop1 = row.rank === 1;
                                const isTop2 = row.rank === 2;
                                const isTop3 = row.rank === 3;

                                return (
                                  <tr 
                                    key={row.studentUserId}
                                    className={`hover:bg-slate-50/80 transition ${
                                      isTop1 ? "bg-amber-50/30" : ""
                                    }`}
                                  >
                                    {/* Rank Column with Badges */}
                                    <td className="py-3 px-3 text-center">
                                      {row.status === "completed" && row.rank !== null ? (
                                        isTop1 ? (
                                          <span className="inline-flex items-center justify-center size-6 rounded-full bg-amber-100 text-amber-900 font-bold text-xs shadow-xs">
                                            🥇
                                          </span>
                                        ) : isTop2 ? (
                                          <span className="inline-flex items-center justify-center size-6 rounded-full bg-slate-200 text-slate-800 font-bold text-xs shadow-xs">
                                            🥈
                                          </span>
                                        ) : isTop3 ? (
                                          <span className="inline-flex items-center justify-center size-6 rounded-full bg-amber-50 text-amber-800 font-bold text-xs border border-amber-200">
                                            🥉
                                          </span>
                                        ) : (
                                          <span className="text-slate-600 font-bold">#{row.rank}</span>
                                        )
                                      ) : (
                                        <span className="text-slate-300 font-mono">—</span>
                                      )}
                                    </td>

                                    {/* Candidate Name & Identifier */}
                                    <td className="py-3 px-3">
                                      <div className="font-semibold text-slate-900">{row.studentName}</div>
                                      <div className="text-[11px] text-slate-500 font-mono">
                                        {row.studentIdentifier ? row.studentIdentifier : row.studentEmail}
                                      </div>
                                    </td>

                                    {/* Total Score / 400 */}
                                    <td className="py-3 px-3 text-center">
                                      {row.totalScore !== null ? (
                                        <div className="inline-block">
                                          <span className={`inline-block px-2.5 py-0.5 rounded-lg font-bold text-xs ${
                                            row.totalScore >= 250
                                              ? "bg-emerald-100 text-emerald-900"
                                              : row.totalScore >= 200
                                              ? "bg-blue-100 text-blue-900"
                                              : "bg-slate-100 text-slate-800"
                                          }`}>
                                            {row.totalScore}
                                          </span>
                                          <span className="text-[10px] text-slate-400 block font-normal mt-0.5">/ 400</span>
                                        </div>
                                      ) : (
                                        <span className="text-slate-300 font-mono">—</span>
                                      )}
                                    </td>

                                    {/* English Score */}
                                    <td className="py-3 px-3 text-center hidden md:table-cell font-mono text-slate-700">
                                      {row.englishScore !== null ? `${row.englishScore}` : "—"}
                                    </td>

                                    {/* Subject 2 Score */}
                                    <td className="py-3 px-3 text-center hidden lg:table-cell font-mono text-slate-700">
                                      {row.subject2Score !== null ? `${row.subject2Score}` : "—"}
                                    </td>

                                    {/* Subject 3 Score */}
                                    <td className="py-3 px-3 text-center hidden lg:table-cell font-mono text-slate-700">
                                      {row.subject3Score !== null ? `${row.subject3Score}` : "—"}
                                    </td>

                                    {/* Subject 4 Score */}
                                    <td className="py-3 px-3 text-center hidden lg:table-cell font-mono text-slate-700">
                                      {row.subject4Score !== null ? `${row.subject4Score}` : "—"}
                                    </td>

                                    {/* Time Spent */}
                                    <td className="py-3 px-3 text-center hidden sm:table-cell text-slate-600 font-mono text-[11px]">
                                      {row.timeSpentSeconds !== null ? (
                                        `${Math.floor(row.timeSpentSeconds / 60)}m ${row.timeSpentSeconds % 60}s`
                                      ) : (
                                        "—"
                                      )}
                                    </td>

                                    {/* Status Badge */}
                                    <td className="py-3 px-3 text-right">
                                      {row.status === "completed" ? (
                                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                                          <Check size={11} /> Completed
                                        </span>
                                      ) : row.status === "in_progress" ? (
                                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-800 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                                          <span className="size-1.5 rounded-full bg-blue-600 animate-pulse" /> Answering
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center text-[11px] font-medium text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md">
                                          Not Started
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-xs text-slate-500">
                          Candidates enrolled in your school will appear here. As they submit their exams in the computer lab, their scores will rank automatically.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </section>
            </div>
          )}

          {/* VIEW 4: LICENSING & BILLING */}
          {activeView === "billing" && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
                  <div>
                    <h2 className="text-base sm:text-lg font-semibold text-slate-900 flex items-center gap-2">
                      <CreditCard size={18} className="text-[#12664F]" />
                      <span>Licensing & Cohort Checkout</span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Transparent institutional licensing at ₦1,500 per candidate per month with full CBT mock & diagnostic access.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsCheckoutModalOpen(true)}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#12664F] hover:bg-[#0E5441] px-4 py-2 text-xs font-medium text-white transition cursor-pointer self-start sm:self-auto"
                  >
                    <CreditCard size={13} />
                    <span>Open Cohort Checkout Modal</span>
                  </button>
                </div>

                {/* Key Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-1">
                    <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                      Active Licences
                    </span>
                    <p className="text-2xl font-semibold text-[#12664F]">
                      {activeCount} / {students.length}
                    </p>
                    <span className="text-xs text-slate-600 font-medium block">
                      {Math.round((activeCount / Math.max(1, students.length)) * 100)}% of cohort licensed
                    </span>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-1">
                    <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                      Pending Licences
                    </span>
                    <p className="text-2xl font-semibold text-amber-900">
                      {unlicensedCount} Candidates
                    </p>
                    <span className="text-xs text-slate-600 font-medium block">
                      Awaiting activation to sit for CBT mocks
                    </span>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-1">
                    <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                      Current Monthly Spend
                    </span>
                    <p className="text-2xl font-semibold text-slate-900">
                      ₦{activeSpend.toLocaleString()}
                    </p>
                    <span className="text-xs text-slate-600 font-medium block">
                      Billed at ₦1,500 / candidate / 30-day cycle
                    </span>
                  </div>
                </div>

                {/* Unlicensed Candidate Cohort Activation Callout */}
                {unlicensedCount > 0 ? (
                  <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold text-amber-950 flex items-center gap-1.5">
                          <AlertCircle size={15} className="text-amber-800" />
                          <span>{unlicensedCount} Unlicensed Candidates Ready for Activation</span>
                        </h3>
                        <p className="text-xs text-amber-900 mt-1">
                          You have {unlicensedCount} registered candidates who currently cannot sit for synchronized CBT mocks. Activate their licences together in one single transaction.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={handleSelectPendingForCheckout}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#12664F] hover:bg-[#0E5441] px-4 py-2 text-xs font-medium text-white transition cursor-pointer shrink-0"
                      >
                        <CreditCard size={13} />
                        <span>Select All Pending ({unlicensedCount})</span>
                        <ArrowRight size={12} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4 flex items-center gap-3">
                    <CheckCircle2 size={18} className="text-[#12664F] shrink-0" />
                    <p className="text-xs text-[#12664F] font-medium">
                      All currently enrolled candidates have active licences. Newly enrolled students will appear here for batch activation.
                    </p>
                  </div>
                )}

                {/* Pricing Structure & Terms */}
                <div className="rounded-2xl border border-slate-200 p-5 space-y-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-800">
                    Institutional Pricing & Payment Terms
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1.5">
                      <h4 className="font-semibold text-slate-900">Direct Instant Activation</h4>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        Pay instantly using Paystack (Debit Card, Bank Transfer, USSD). Licences activate automatically upon payment verification without manual intervention.
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <h4 className="font-semibold text-slate-900">Individual & Cohort Invoicing</h4>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        Each transaction issues an institutional receipt with school stamp, candidate IDs, and reference numbers for your bursary records.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 5: SCHOOL PROFILE & SETTINGS */}
          {activeView === "profile" && (
            <div className="space-y-6">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
                  <div>
                    <div className="inline-flex items-center gap-2 text-[10px] font-medium uppercase tracking-wider text-slate-500">
                      <span>VERIFIED INSTITUTION</span>
                      <span>·</span>
                      <span className="text-[#12664F]">{schoolType.replace(/_/g, " ").toUpperCase()}</span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900 mt-1">
                      {schoolName}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Institutional profile, administrative credentials, and student registration link.
                    </p>
                  </div>

                  <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 border border-emerald-300 px-3.5 py-1 text-xs font-medium text-[#12664F] self-start sm:self-auto">
                    <ShieldCheck size={14} />
                    <span>Verified Partner</span>
                  </div>
                </div>

                {/* Profile Fields Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-1">
                    <span className="text-slate-500 font-medium block text-[11px]">School Code</span>
                    <strong className="font-mono text-sm text-[#12664F] font-semibold block">{schoolCode}</strong>
                    <span className="text-[10px] text-slate-500 block">Permanent institutional identifier</span>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-1">
                    <span className="text-slate-500 font-medium block text-[11px]">Category</span>
                    <strong className="text-sm text-slate-900 font-semibold block capitalize">
                      {schoolType.replace(/_/g, " ")}
                    </strong>
                    <span className="text-[10px] text-slate-500 block">Accredited testing centre</span>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-1">
                    <span className="text-slate-500 font-medium block text-[11px]">Location</span>
                    <strong className="text-sm text-slate-900 font-semibold block">{state}, Nigeria</strong>
                    <span className="text-[10px] text-slate-500 block">Designated examination zone</span>
                  </div>
                </div>

                {/* Permanent Student Registration Link Widget */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                      <Share2 size={13} className="text-[#12664F]" />
                      <span>Dedicated Student Registration Link</span>
                    </h3>
                    <span className="font-mono text-[11px] font-medium bg-white border border-slate-300 text-[#12664F] px-2 py-0.5 rounded-lg">
                      {schoolCode}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Students can use this direct link to register for JAMBPrep and automatically attach themselves to your school cohort:
                  </p>
                  <div className="flex items-center rounded-xl border border-slate-300 bg-white overflow-hidden">
                    <span className="truncate flex-1 pl-3 pr-2 py-2 font-mono text-xs text-slate-900 select-all font-normal">
                      {inviteLink}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyInviteLink}
                      className="inline-flex shrink-0 items-center gap-1.5 bg-[#12664F] hover:bg-[#0E5441] px-4 py-2 text-xs font-medium text-white transition cursor-pointer"
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

                {/* Administrator Profile Details */}
                <div className="space-y-3 pt-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <Shield size={13} className="text-slate-500" />
                    <span>Administrator Credentials</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-1">
                      <span className="text-slate-500 block text-[11px] font-medium">Primary Contact</span>
                      <strong className="text-sm text-slate-900 block font-semibold">{adminDisplayName}</strong>
                      <span className="text-[10px] text-slate-500 block">Designated portal administrator</span>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-1">
                      <span className="text-slate-500 block text-[11px] font-medium">Admin Login Email</span>
                      <strong className="text-sm text-slate-900 block font-semibold">{adminEmail}</strong>
                      <span className="text-[10px] text-slate-500 block">Used for authentication and invoices</span>
                    </div>
                  </div>
                </div>

                {/* Password Policy & Security Notes */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 space-y-2">
                  <h4 className="font-semibold text-slate-900 flex items-center gap-1.5">
                    <KeyRound size={13} className="text-[#12664F]" />
                    <span>Batch Candidate Password Policy</span>
                  </h4>
                  <p className="text-[11px] leading-relaxed">
                    For all students added manually or via CSV import, their temporary initial password is automatically formatted as their <strong>LASTNAME in full capital letters</strong> (e.g. ADEWALE). Students who enroll themselves via the registration link create their own private credentials.
                  </p>
                </div>
              </section>
            </div>
          )}
        </main>
      </div>

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

      {/* Candidate Edit Modal */}
      <EditStudentModal
        isOpen={!!editingStudent}
        onClose={() => setEditingStudent(null)}
        student={editingStudent}
        onStudentUpdated={handleStudentUpdated}
      />

      {/* Single / Batch Candidate Disconnect Modal (Requires Admin Password) */}
      <DisconnectStudentModal
        isOpen={disconnectTargets.length > 0}
        onClose={() => setDisconnectTargets([])}
        targets={disconnectTargets.map((s) => ({ id: s.id, name: s.name, email: s.email }))}
        schoolName={schoolName}
        onDisconnected={handleStudentsDisconnected}
      />
    </div>
  );
}
