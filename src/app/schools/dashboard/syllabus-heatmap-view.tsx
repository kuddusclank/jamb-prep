"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  BarChart3, 
  AlertTriangle, 
  CheckCheck, 
  Calendar, 
  Download, 
  Search, 
  Clock, 
  Loader2,
  Users,
  Layers,
  ArrowUpDown,
  BookOpen,
  CheckCircle2,
  X,
  Target,
  Sparkles,
  LayoutGrid,
  Table as TableIcon,
  RotateCw,
  HelpCircle,
  TrendingDown,
  GraduationCap
} from "lucide-react";

export interface DiagnosticTopicItem {
  id: string;
  subjectId?: string;
  subject: string;
  subjectCode?: string;
  topic: string;
  accuracyRate: number;
  questionsAttempted: number;
  status: "urgent_remedial" | "revision_recommended" | "exam_ready";
  recommendedAction: string;
}

export interface OfferedSubject {
  id: string;
  name: string;
  code: string;
  isCompulsory: boolean;
  enrolledCandidateCount: number;
  topicsAssessedCount: number;
  totalQuestionsAttempted: number;
  averageAccuracy: number | null;
  urgentCount: number;
  revisionCount: number;
  readyCount: number;
}

interface SyllabusHeatmapViewProps {
  schoolName: string;
  cohortSize?: number;
}

type SortOption = "lowest_accuracy" | "highest_accuracy" | "attempts" | "alphabetical";
type ViewMode = "grid" | "table";

export function SyllabusHeatmapView({ schoolName, cohortSize = 0 }: SyllabusHeatmapViewProps) {
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("lowest_accuracy");
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [searchQuery, setSearchQuery] = useState("");
  const [topics, setTopics] = useState<DiagnosticTopicItem[]>([]);
  const [offeredSubjects, setOfferedSubjects] = useState<OfferedSubject[]>([]);
  const [timetable, setTimetable] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchDiagnostics = async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    else setLoading(true);

    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "https://jambprep-api-foundation.abdulquddus-akanbi.workers.dev";
    let token: string | undefined;
    try {
      const supabase = createClient();
      const sessionRes = await supabase.auth.getSession();
      token = sessionRes?.data?.session?.access_token;
    } catch {
      // Proceed without token
    }

    const headers = {
      "Content-Type": "application/json",
      ...(token ? { "Authorization": `Bearer ${token}` } : {}),
    };

    let data: any = null;

    try {
      const res = await fetch(`${apiBase}/api/v1/schools/diagnostics/summary`, {
        method: "POST",
        headers,
        body: JSON.stringify({}),
      });
      if (res.ok) {
        data = await res.json();
      }
    } catch {
      // Fall through
    }

    if (data) {
      if (Array.isArray(data.offeredSubjects)) setOfferedSubjects(data.offeredSubjects);
      if (Array.isArray(data.topics)) setTopics(data.topics);
      if (Array.isArray(data.revisionTimetable)) setTimetable(data.revisionTimetable);
    } else {
      setOfferedSubjects([]);
      setTopics([]);
      setTimetable([]);
    }

    setLoading(false);
    setIsRefreshing(false);
  };

  useEffect(() => {
    void fetchDiagnostics(false);
  }, []);

  // Dynamically resolve only subjects offered by the candidate cohort (no hardcoded ghost subjects!)
  const subjectsList = useMemo<OfferedSubject[]>(() => {
    if (offeredSubjects.length > 0) return offeredSubjects;

    // Fallback: extract distinct subjects dynamically from loaded topics
    const map = new Map<string, OfferedSubject>();
    for (const t of topics) {
      const code = t.subjectCode || t.subject.slice(0, 3).toUpperCase();
      if (!map.has(code)) {
        map.set(code, {
          id: t.subjectId || code,
          name: t.subject,
          code,
          isCompulsory: code === "ENG",
          enrolledCandidateCount: cohortSize,
          topicsAssessedCount: 0,
          totalQuestionsAttempted: 0,
          averageAccuracy: null,
          urgentCount: 0,
          revisionCount: 0,
          readyCount: 0,
        });
      }
    }
    return Array.from(map.values());
  }, [offeredSubjects, topics, cohortSize]);

  // Global counts for top overview
  const urgentCount = topics.filter((t) => t.status === "urgent_remedial").length;
  const revisionCount = topics.filter((t) => t.status === "revision_recommended").length;
  const readyCount = topics.filter((t) => t.status === "exam_ready").length;
  const totalTracked = topics.length;

  const assessedCount = topics.filter((t) => (t.questionsAttempted || 0) > 0).length;
  const unassessedCount = totalTracked - assessedCount;

  // Cohort average accuracy across all evaluated topics
  const averageAccuracy = useMemo(() => {
    const assessed = topics.filter((t) => (t.questionsAttempted || 0) > 0);
    if (!assessed.length) return null;
    const sum = assessed.reduce((acc, t) => acc + (t.accuracyRate || 0), 0);
    return Math.round(sum / assessed.length);
  }, [topics]);

  // Grouped by Subject: Filters topics and groups them strictly under their respective subject department
  const groupedData = useMemo(() => {
    const cleanSearch = searchQuery.trim().toLowerCase();

    // 1. Filter topics by status and search
    const filtered = topics.filter((t) => {
      const matchesStatus = statusFilter === "all" || t.status === statusFilter;
      const matchesSearch =
        !cleanSearch ||
        t.topic.toLowerCase().includes(cleanSearch) ||
        t.subject.toLowerCase().includes(cleanSearch) ||
        (t.subjectCode && t.subjectCode.toLowerCase().includes(cleanSearch));

      return matchesStatus && matchesSearch;
    });

    // 2. Sorting function within each subject group
    const sortFn = (a: DiagnosticTopicItem, b: DiagnosticTopicItem) => {
      switch (sortBy) {
        case "lowest_accuracy":
          if (a.accuracyRate !== b.accuracyRate) return a.accuracyRate - b.accuracyRate;
          return b.questionsAttempted - a.questionsAttempted;
        case "highest_accuracy":
          if (a.accuracyRate !== b.accuracyRate) return b.accuracyRate - a.accuracyRate;
          return b.questionsAttempted - a.questionsAttempted;
        case "attempts":
          if (a.questionsAttempted !== b.questionsAttempted) return b.questionsAttempted - a.questionsAttempted;
          return a.accuracyRate - b.accuracyRate;
        case "alphabetical":
          return a.topic.localeCompare(b.topic);
        default:
          return 0;
      }
    };

    // 3. Filter target subjects if single subject pill is selected
    const targetSubjects =
      selectedSubject === "all"
        ? subjectsList
        : subjectsList.filter(
            (s) =>
              s.code.toUpperCase() === selectedSubject.toUpperCase() ||
              s.name.toLowerCase() === selectedSubject.toLowerCase()
          );

    return targetSubjects
      .map((subj) => {
        const subjTopics = filtered
          .filter(
            (t) =>
              (t.subjectCode && t.subjectCode.toUpperCase() === subj.code.toUpperCase()) ||
              t.subject.toLowerCase() === subj.name.toLowerCase()
          )
          .sort(sortFn);

        const subUrgent = subjTopics.filter((t) => t.status === "urgent_remedial").length;
        const subRevision = subjTopics.filter((t) => t.status === "revision_recommended").length;
        const subReady = subjTopics.filter((t) => t.status === "exam_ready").length;
        const subAttempts = subjTopics.reduce((sum, t) => sum + t.questionsAttempted, 0);
        const subAvgAccuracy =
          subjTopics.length > 0
            ? Math.round(subjTopics.reduce((sum, t) => sum + t.accuracyRate, 0) / subjTopics.length)
            : null;

        return {
          subject: subj,
          topics: subjTopics,
          urgentCount: subUrgent,
          revisionCount: subRevision,
          readyCount: subReady,
          totalAttempts: subAttempts,
          averageAccuracy: subAvgAccuracy,
        };
      })
      .filter((group) => {
        // If searching, hide subjects with zero matching topics
        if (cleanSearch && group.topics.length === 0) return false;
        return true;
      });
  }, [topics, subjectsList, selectedSubject, statusFilter, searchQuery, sortBy]);

  const totalMatchingTopics = useMemo(() => {
    return groupedData.reduce((acc, g) => acc + g.topics.length, 0);
  }, [groupedData]);

  const exportDiagnosticLedger = () => {
    if (!topics.length) return;
    let csv = "Subject,Subject Code,Syllabus Topic,Accuracy Rate,Questions Attempted,Diagnostic Status,Recommended Teaching Action\n";

    // Export sorted strictly by subject first, then accuracy
    for (const group of groupedData) {
      for (const t of group.topics) {
        const safeTopic = `"${t.topic.replace(/"/g, '""')}"`;
        const safeAction = `"${t.recommendedAction.replace(/"/g, '""')}"`;
        const code = t.subjectCode || group.subject.code;
        csv += `"${group.subject.name}","${code}",${safeTopic},${t.accuracyRate}%,${t.questionsAttempted},"${t.status.replace(/_/g, " ")}",${safeAction}\n`;
      }
    }

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${schoolName.replace(/\s+/g, "_")}_Syllabus_Diagnostic_Ledger.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* 1. CONSOLIDATED SECTION HEADER & CONTEXTUAL CONTROLS */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-slate-900 flex items-center gap-2">
              <BarChart3 size={18} className="text-[#12664F]" />
              <span>Syllabus Diagnostic Heatmap</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Identify topic-level learning gaps grouped strictly by department across your enrolled candidates.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 self-start sm:self-auto shrink-0">
            {cohortSize > 0 && (
              <div className="inline-flex items-center gap-1.5 rounded-xl bg-slate-50 px-3 py-1.5 text-xs text-slate-600 font-medium border border-slate-200">
                <Users size={13} className="text-slate-400" />
                <span>Cohort:</span>
                <strong className="text-slate-900">{cohortSize} {cohortSize === 1 ? "Candidate" : "Candidates"}</strong>
              </div>
            )}

            <button
              type="button"
              onClick={() => fetchDiagnostics(true)}
              disabled={isRefreshing || loading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 transition cursor-pointer disabled:opacity-50"
              title="Refresh syllabus performance data"
            >
              <RotateCw size={13} className={isRefreshing ? "animate-spin text-[#12664F]" : "text-slate-500"} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              type="button"
              onClick={exportDiagnosticLedger}
              disabled={topics.length === 0}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 transition cursor-pointer disabled:opacity-50"
              title="Download full cohort syllabus diagnostic ledger as CSV"
            >
              <Download size={13} className="text-slate-500" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* 2. THREE SUMMARY KPI CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4">
          {/* Card 1: Urgent Remedial */}
          <div
            role="button"
            tabIndex={0}
            aria-pressed={statusFilter === "urgent_remedial"}
            onClick={() => setStatusFilter(statusFilter === "urgent_remedial" ? "all" : "urgent_remedial")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setStatusFilter(statusFilter === "urgent_remedial" ? "all" : "urgent_remedial");
              }
            }}
            className={`rounded-xl border p-4 space-y-1.5 transition cursor-pointer select-none ${
              statusFilter === "urgent_remedial"
                ? "border-slate-800 bg-slate-50 ring-1 ring-slate-800"
                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-700">
                Urgent Remedial
              </span>
              <AlertTriangle size={15} className="text-slate-400" />
            </div>

            <div className="flex items-baseline gap-2 pt-0.5">
              <p className="text-2xl font-bold tabular-nums text-slate-900">{urgentCount}</p>
              <span className="text-xs text-slate-500 font-medium">Topics</span>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              {urgentCount > 0
                ? "<40% cohort accuracy · Re-teach core syllabus fundamentals"
                : "No critical topic-level syllabus failure detected"}
            </p>

            <div className="pt-1 flex items-center justify-between text-[11px] text-slate-400">
              <span>Benchmark: &lt;40%</span>
              <span className="font-medium text-slate-600">
                {statusFilter === "urgent_remedial" ? "Filtered (click to reset)" : "Filter"}
              </span>
            </div>
          </div>

          {/* Card 2: Revision Recommended */}
          <div
            role="button"
            tabIndex={0}
            aria-pressed={statusFilter === "revision_recommended"}
            onClick={() => setStatusFilter(statusFilter === "revision_recommended" ? "all" : "revision_recommended")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setStatusFilter(statusFilter === "revision_recommended" ? "all" : "revision_recommended");
              }
            }}
            className={`rounded-xl border p-4 space-y-1.5 transition cursor-pointer select-none ${
              statusFilter === "revision_recommended"
                ? "border-slate-400 bg-slate-50 ring-1 ring-slate-300"
                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-700">
                Revision Recommended
              </span>
              <Clock size={15} className="text-slate-400" />
            </div>

            <div className="flex items-baseline gap-2 pt-0.5">
              <p className="text-2xl font-bold tabular-nums text-slate-900">{revisionCount}</p>
              <span className="text-xs text-slate-500 font-medium">Topics</span>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              {revisionCount > 0
                ? "40% – 69% accuracy · Speed drills and exam practice suggested"
                : "No topics currently flagged for intermediate revision"}
            </p>

            <div className="pt-1 flex items-center justify-between text-[11px] text-slate-400">
              <span>Benchmark: 40% – 69%</span>
              <span className="font-medium text-slate-600">
                {statusFilter === "revision_recommended" ? "Filtered (click to reset)" : "Filter"}
              </span>
            </div>
          </div>

          {/* Card 3: Examination Ready */}
          <div
            role="button"
            tabIndex={0}
            aria-pressed={statusFilter === "exam_ready"}
            onClick={() => setStatusFilter(statusFilter === "exam_ready" ? "all" : "exam_ready")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setStatusFilter(statusFilter === "exam_ready" ? "all" : "exam_ready");
              }
            }}
            className={`rounded-xl border p-4 space-y-1.5 transition cursor-pointer select-none ${
              statusFilter === "exam_ready"
                ? "border-slate-400 bg-slate-50 ring-1 ring-slate-300"
                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-700">
                Examination Ready
              </span>
              <CheckCheck size={16} className="text-slate-400" />
            </div>

            <div className="flex items-baseline gap-2 pt-0.5">
              <p className="text-2xl font-bold tabular-nums text-slate-900">{readyCount}</p>
              <span className="text-xs text-slate-500 font-medium">Topics</span>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              {readyCount > 0
                ? "≥70% accuracy · Strong syllabus mastery and candidate retention"
                : totalTracked > 0
                ? "0 topics meeting ≥70% threshold across currently assessed tests"
                : "No completed test data yet"}
            </p>

            <div className="pt-1 flex items-center justify-between text-[11px] text-slate-400">
              <span>Benchmark: ≥70% Target</span>
              <span className="font-medium text-slate-600">
                {statusFilter === "exam_ready" ? "Filtered (click to reset)" : "Filter"}
              </span>
            </div>
          </div>
        </div>

        {/* 3. RESTRAINED COHORT MASTERY BREAKDOWN BAR */}
        {totalTracked > 0 && (
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-700">Cohort Mastery Distribution:</span>
                <span className="text-slate-500">
                  {totalTracked} topics
                  {averageAccuracy !== null && ` · ${averageAccuracy}% avg accuracy`}
                </span>
              </div>

              {/* Clean Muted Legend */}
              <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-slate-800" />
                  Urgent ({urgentCount})
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-slate-500" />
                  Revision ({revisionCount})
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-[#12664F]" />
                  Ready ({readyCount})
                </span>
                {unassessedCount > 0 && (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-slate-200" />
                    Unassessed ({unassessedCount})
                  </span>
                )}
              </div>
            </div>

            {/* Muted Segmented Bar */}
            <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden flex">
              {urgentCount > 0 && (
                <div
                  className="bg-slate-800 h-full transition-all"
                  style={{ width: `${(urgentCount / totalTracked) * 100}%` }}
                  title={`Urgent Remedial: ${urgentCount} topics (${Math.round((urgentCount / totalTracked) * 100)}%)`}
                />
              )}
              {revisionCount > 0 && (
                <div
                  className="bg-slate-500 h-full transition-all"
                  style={{ width: `${(revisionCount / totalTracked) * 100}%` }}
                  title={`Revision Recommended: ${revisionCount} topics (${Math.round((revisionCount / totalTracked) * 100)}%)`}
                />
              )}
              {readyCount > 0 && (
                <div
                  className="bg-[#12664F] h-full transition-all"
                  style={{ width: `${(readyCount / totalTracked) * 100}%` }}
                  title={`Examination Ready: ${readyCount} topics (${Math.round((readyCount / totalTracked) * 100)}%)`}
                />
              )}
              {unassessedCount > 0 && (
                <div
                  className="bg-slate-300 h-full transition-all"
                  style={{ width: `${(unassessedCount / totalTracked) * 100}%` }}
                  title={`Unassessed Topics: ${unassessedCount} topics`}
                />
              )}
            </div>

            {/* Status filter reset shortcut if active */}
            {statusFilter !== "all" && (
              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200">
                <span className="text-slate-600">
                  Showing <strong>{statusFilter.replace(/_/g, " ")}</strong> topics ({totalMatchingTopics} of {totalTracked})
                </span>
                <button
                  type="button"
                  onClick={() => setStatusFilter("all")}
                  className="text-xs font-semibold text-[#12664F] hover:underline cursor-pointer"
                >
                  Clear status filter
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      {/* 4. DYNAMIC SUBJECT FILTER PILLS (Only Enrolled Subjects) */}
      <section className="space-y-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
          {/* All Subjects Pill */}
          <button
            type="button"
            onClick={() => setSelectedSubject("all")}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium shrink-0 transition cursor-pointer select-none ${
              selectedSubject === "all"
                ? "bg-[#12664F] text-white font-semibold"
                : "bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <Layers size={13} />
            <span>All Offered Subjects</span>
            <span
              className={`text-[10px] rounded-full px-1.5 py-0.2 font-medium ${
                selectedSubject === "all" ? "bg-white/25 text-white" : "bg-slate-100 text-slate-500"
              }`}
            >
              {totalTracked}
            </span>
          </button>

          {/* Dynamic Subject Pills (Strictly for subjects enrolled by candidates) */}
          {subjectsList.map((sub) => {
            const isSelected = selectedSubject.toUpperCase() === sub.code.toUpperCase();
            const subjectTopicCount = topics.filter(
              (t) =>
                t.subjectCode?.toUpperCase() === sub.code.toUpperCase() ||
                t.subject.toLowerCase() === sub.name.toLowerCase()
            ).length;

            return (
              <button
                key={sub.id}
                type="button"
                onClick={() => setSelectedSubject(sub.code)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium shrink-0 transition cursor-pointer select-none ${
                  isSelected
                    ? "bg-[#12664F] text-white font-semibold"
                    : "bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <span>{sub.name}</span>
                <span
                  className={`text-[10px] px-1 py-0.2 rounded font-mono ${
                    isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {sub.code}
                </span>
                <span
                  className={`text-[10px] rounded-full px-1.5 py-0.2 font-medium ${
                    isSelected ? "bg-white/25 text-white" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {subjectTopicCount}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search, Sort, and View Mode Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3 sm:p-3.5 rounded-xl border border-slate-200">
          {/* Search Bar */}
          <div className="relative flex-1 min-w-[240px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search syllabus topic, concept or code across active subjects..."
              className="w-full rounded-lg border border-slate-200 bg-white pl-8 pr-8 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-slate-400 transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                aria-label="Clear search"
              >
                <X size={13} />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0 text-xs">
            {/* Sort Selector */}
            <div className="flex items-center gap-1.5 border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white">
              <ArrowUpDown size={12} className="text-slate-400" />
              <label htmlFor="diagnostic-sort" className="text-slate-500 font-normal">
                Sort within department:
              </label>
              <select
                id="diagnostic-sort"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="bg-transparent text-slate-700 font-medium focus:outline-hidden cursor-pointer"
              >
                <option value="lowest_accuracy">Lowest Accuracy First</option>
                <option value="highest_accuracy">Highest Accuracy First</option>
                <option value="attempts">Most Questions Attempted</option>
                <option value="alphabetical">Topic Name (A–Z)</option>
              </select>
            </div>

            {/* View Mode Toggle: Grid Cards vs Dense Table */}
            <div className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5">
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`p-1.5 rounded-md text-xs transition cursor-pointer ${
                  viewMode === "table" ? "bg-white text-slate-900 font-semibold" : "text-slate-500 hover:text-slate-900"
                }`}
                title="Dense Diagnostic Table View"
                aria-label="Dense table view"
              >
                <TableIcon size={14} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-md text-xs transition cursor-pointer ${
                  viewMode === "grid" ? "bg-white text-slate-900 font-semibold" : "text-slate-500 hover:text-slate-900"
                }`}
                title="Grid Cards View"
                aria-label="Grid cards view"
              >
                <LayoutGrid size={14} />
              </button>
            </div>

            {/* Results count */}
            <span className="text-[11px] text-slate-500 font-medium pl-1">
              {totalMatchingTopics} of {totalTracked} topics
            </span>
          </div>
        </div>
      </section>

      {/* 5. TOPIC DIAGNOSTIC DATA DISPLAY (Cleanly Grouped by Subject) */}
      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center space-y-3">
          <Loader2 size={24} className="animate-spin text-slate-500 mx-auto" />
          <p className="text-xs text-slate-500 font-medium">Analyzing cohort syllabus mastery by department...</p>
        </div>
      ) : totalMatchingTopics === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center space-y-3">
          <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
            <BarChart3 size={22} />
          </div>
          <h3 className="text-sm font-semibold text-slate-900">
            {searchQuery || selectedSubject !== "all" || statusFilter !== "all"
              ? "No matching syllabus topics found"
              : "No diagnostic test data yet"}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            {searchQuery || selectedSubject !== "all" || statusFilter !== "all"
              ? "No topics match your current filter and search criteria. Try selecting another subject or resetting filters."
              : "Students haven't completed any test or CBT mock activities yet. Aggregated syllabus mastery and topic weakness analytics will appear here once candidates take practice questions."}
          </p>
          {(searchQuery || selectedSubject !== "all" || statusFilter !== "all") && (
            <button
              type="button"
              onClick={() => {
                setSelectedSubject("all");
                setStatusFilter("all");
                setSearchQuery("");
              }}
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Reset all filters
            </button>
          )}
        </div>
      ) : (
        /* SUBJECT-GROUPED SECTIONS */
        <div className="space-y-6">
          {groupedData.map((group) => {
            const hasTopics = group.topics.length > 0;
            if (!hasTopics && searchQuery) return null;

            return (
              <section
                key={group.subject.id || group.subject.code}
                className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs"
              >
                {/* Department / Subject Header Banner */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 bg-slate-50/80 border-b border-slate-200">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-white text-[#12664F] border border-[#12664F]/20 shadow-xs">
                      {group.subject.code}
                    </span>
                    <div>
                      <h3 className="text-sm sm:text-base font-semibold text-slate-900 flex items-center gap-2">
                        <span>{group.subject.name}</span>
                        {group.subject.isCompulsory && (
                          <span className="text-[10px] font-medium px-2 py-0.2 rounded-full bg-slate-200/80 text-slate-700">
                            Compulsory
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-slate-500 font-normal mt-0.5">
                        <span>{group.subject.enrolledCandidateCount} {group.subject.enrolledCandidateCount === 1 ? "Candidate enrolled" : "Candidates enrolled"}</span>
                        {group.averageAccuracy !== null && (
                          <span> · <strong className="text-slate-800">{group.averageAccuracy}%</strong> department accuracy</span>
                        )}
                        <span> · {group.topics.length} {group.topics.length === 1 ? "topic assessed" : "topics assessed"}</span>
                      </p>
                    </div>
                  </div>

                  {/* Status Pills for this specific department */}
                  <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                    {group.urgentCount > 0 && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-50 text-red-700 border border-red-200 text-xs font-semibold">
                        <span className="size-1.5 rounded-full bg-red-600" />
                        {group.urgentCount} Urgent Remedial
                      </span>
                    )}
                    {group.revisionCount > 0 && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold">
                        <span className="size-1.5 rounded-full bg-amber-600" />
                        {group.revisionCount} Revision
                      </span>
                    )}
                    {group.readyCount > 0 && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
                        <span className="size-1.5 rounded-full bg-emerald-600" />
                        {group.readyCount} Ready
                      </span>
                    )}
                  </div>
                </div>

                {/* Subject-Specific Topic Content */}
                {!hasTopics ? (
                  <div className="p-8 text-center text-xs text-slate-500">
                    No evaluated topics for this subject matching current filter.
                  </div>
                ) : viewMode === "table" ? (
                  /* DENSE TABLE VIEW GROUPED UNDER SUBJECT */
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse min-w-[650px]">
                      <thead>
                        <tr className="border-b border-slate-200 bg-white text-slate-500 font-medium uppercase tracking-wider text-[11px] select-none">
                          <th className="py-3 px-4 sm:px-5">Syllabus Topic</th>
                          <th className="py-3 px-4 text-center">Attempts</th>
                          <th className="py-3 px-4">Cohort Accuracy</th>
                          <th className="py-3 px-4">Diagnostic Status</th>
                          <th className="py-3 px-4 sm:px-5">Recommended Intervention</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {group.topics.map((item) => {
                          const isUrgent = item.status === "urgent_remedial";
                          const isRevision = item.status === "revision_recommended";
                          const isReady = item.status === "exam_ready";
                          const attempts = item.questionsAttempted || 0;

                          return (
                            <tr key={item.id} className="hover:bg-slate-50/70 transition">
                              <td className="py-3.5 px-4 sm:px-5 font-medium text-slate-900 max-w-[260px] truncate" title={item.topic}>
                                {item.topic}
                              </td>
                              <td className="py-3.5 px-4 text-center tabular-nums text-slate-600 font-medium">
                                {attempts}
                              </td>
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                <div className="flex items-center gap-2 min-w-[130px]">
                                  <div className="w-20 bg-slate-100 rounded-full h-1.5 overflow-hidden shrink-0">
                                    <div
                                      className={`h-full rounded-full transition-all ${
                                        isReady ? "bg-[#12664F]" : isUrgent ? "bg-red-600" : "bg-amber-500"
                                      }`}
                                      style={{ width: `${Math.max(item.accuracyRate, 2)}%` }}
                                    />
                                  </div>
                                  <span className="font-semibold tabular-nums text-slate-800 text-xs">
                                    {item.accuracyRate}%
                                  </span>
                                </div>
                              </td>
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                <span
                                  className={`rounded-md px-2 py-0.5 text-[10px] font-semibold border ${
                                    isUrgent
                                      ? "bg-red-50 text-red-700 border-red-200"
                                      : isRevision
                                      ? "bg-amber-50 text-amber-700 border-amber-200"
                                      : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  }`}
                                >
                                  {isUrgent ? "Urgent Remedial" : isRevision ? "Revision Recommended" : "Examination Ready"}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 sm:px-5 text-[11px] text-slate-600 max-w-[340px] truncate" title={item.recommendedAction}>
                                {item.recommendedAction}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  /* GRID CARDS VIEW GROUPED UNDER SUBJECT */
                  <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4 bg-slate-50/30">
                    {group.topics.map((item) => {
                      const isUrgent = item.status === "urgent_remedial";
                      const isRevision = item.status === "revision_recommended";
                      const isReady = item.status === "exam_ready";
                      const attempts = item.questionsAttempted || 0;
                      const isUnassessed = attempts === 0;

                      return (
                        <div
                          key={item.id}
                          className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 transition hover:border-slate-300 shadow-2xs"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <h4 className="text-sm font-semibold text-slate-900 leading-snug truncate" title={item.topic}>
                              {item.topic}
                            </h4>

                            <span
                              className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-semibold tabular-nums border ${
                                isReady
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                  : isUrgent
                                  ? "bg-red-50 text-red-800 border-red-200"
                                  : "bg-amber-50 text-amber-800 border-amber-200"
                              }`}
                            >
                              {item.accuracyRate}% Accuracy
                            </span>
                          </div>

                          <div className="space-y-1.5">
                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  isReady ? "bg-[#12664F]" : isUrgent ? "bg-red-600" : "bg-amber-500"
                                }`}
                                style={{ width: `${Math.max(item.accuracyRate, 2)}%` }}
                              />
                            </div>

                            <div className="flex items-center justify-between text-[11px] text-slate-500">
                              <span>
                                {attempts === 1 ? "1 question attempted" : `${attempts} questions attempted across cohort`}
                              </span>
                              <span className="font-medium text-slate-600">
                                {isReady
                                  ? "Target met"
                                  : isUrgent
                                  ? `${70 - item.accuracyRate}% below target`
                                  : `${70 - item.accuracyRate}% to target`}
                              </span>
                            </div>
                          </div>

                          <div className="rounded-lg bg-slate-50 border border-slate-200/80 p-2.5 text-xs text-slate-600 space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                                Action:
                              </span>
                              <span className="text-[10px] font-semibold text-slate-700">
                                {isUrgent ? "Re-teach Concept" : isRevision ? "Speed Drill" : "Retention Check"}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-600 leading-relaxed font-normal">
                              {item.recommendedAction}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      {/* 6. ACTIONABLE WEEKLY REMEDIAL TIMETABLE */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-2">
          <div className="space-y-0.5">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Calendar size={16} className="text-[#12664F]" />
              <span>Recommended Weekly Remedial Timetable</span>
            </h3>
            <p className="text-xs text-slate-500">
              Generated automatically to help your teaching staff target the highest failure-rate topics first.
            </p>
          </div>
        </div>

        {timetable.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-xs text-slate-500 space-y-1">
            <Calendar size={18} className="mx-auto text-slate-400 mb-1" />
            <p className="font-semibold text-slate-800">No remedial timetable required yet</p>
            <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
              Students haven&apos;t completed enough test activities to reveal systemic learning gaps. Once weak topics emerge, remedial class schedules appear here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-1">
            {timetable.map((slot, idx) => {
              return (
                <div
                  key={idx}
                  className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 space-y-2 text-xs flex flex-col justify-between"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900 text-xs">{slot.day}</span>
                      <span className="rounded px-1.5 py-0.5 text-[9px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                        {slot.priority || "Remedial"}
                      </span>
                    </div>

                    <p className="text-slate-500 text-[11px] flex items-center gap-1 font-normal">
                      <Clock size={11} className="text-slate-400" />
                      <span>{slot.time || "45 Mins Block"}</span>
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-200/80 space-y-0.5">
                    <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500 block">
                      {slot.subject}
                    </span>
                    <strong className="text-xs font-semibold text-slate-900 line-clamp-2" title={slot.topic}>
                      {slot.topic}
                    </strong>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
