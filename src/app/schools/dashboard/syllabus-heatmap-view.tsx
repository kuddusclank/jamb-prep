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
  TrendingDown
} from "lucide-react";

export interface DiagnosticTopicItem {
  id: string;
  subject: string;
  subjectCode?: string;
  topic: string;
  accuracyRate: number;
  questionsAttempted: number;
  status: "urgent_remedial" | "revision_recommended" | "exam_ready";
  recommendedAction: string;
}

interface SyllabusHeatmapViewProps {
  schoolName: string;
  cohortSize?: number;
}

type SortOption = "lowest_accuracy" | "highest_accuracy" | "attempts" | "alphabetical";
type ViewMode = "grid" | "table";

const SUBJECTS = [
  { id: "all", code: "ALL", label: "All Subjects" },
  { id: "Use of English", code: "ENG", label: "Use of English" },
  { id: "Mathematics", code: "MTH", label: "Mathematics" },
  { id: "Physics", code: "PHY", label: "Physics" },
  { id: "Chemistry", code: "CHM", label: "Chemistry" },
  { id: "Biology", code: "BIO", label: "Biology" },
  { id: "Economics", code: "ECN", label: "Economics" },
  { id: "Government", code: "GOV", label: "Government" },
  { id: "Literature in English", code: "LIT", label: "Literature" },
];

export function SyllabusHeatmapView({ schoolName, cohortSize = 0 }: SyllabusHeatmapViewProps) {
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("lowest_accuracy");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [topics, setTopics] = useState<DiagnosticTopicItem[]>([]);
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
      if (data.topics) setTopics(data.topics);
      if (data.revisionTimetable) setTimetable(data.revisionTimetable);
    } else {
      setTopics([]);
      setTimetable([]);
    }

    setLoading(false);
    setIsRefreshing(false);
  };

  useEffect(() => {
    void fetchDiagnostics(false);
  }, []);

  // Subject-specific topic counts for filter badges
  const subjectCounts = useMemo(() => {
    const counts: Record<string, number> = { all: topics.length };
    for (const sub of SUBJECTS) {
      if (sub.id === "all") continue;
      counts[sub.id] = topics.filter(
        (t) =>
          (t.subject && t.subject.toLowerCase() === sub.id.toLowerCase()) ||
          t.subjectCode?.toUpperCase() === sub.code ||
          t.subject?.toUpperCase() === sub.code
      ).length;
    }
    return counts;
  }, [topics]);

  // Filtered and Sorted Topics
  const processedTopics = useMemo(() => {
    return topics
      .filter((t) => {
        const selectedObj = SUBJECTS.find((s) => s.id === selectedSubject);
        const matchesSubject =
          selectedSubject === "all" ||
          (t.subject && t.subject.toLowerCase() === selectedSubject.toLowerCase()) ||
          (selectedObj && (t.subject?.toUpperCase() === selectedObj.code || t.subjectCode?.toUpperCase() === selectedObj.code));

        const matchesStatus = statusFilter === "all" || t.status === statusFilter;

        const cleanSearch = searchQuery.trim().toLowerCase();
        const matchesSearch =
          !cleanSearch ||
          t.topic.toLowerCase().includes(cleanSearch) ||
          t.subject.toLowerCase().includes(cleanSearch) ||
          (t.subjectCode && t.subjectCode.toLowerCase().includes(cleanSearch));

        return matchesSubject && matchesStatus && matchesSearch;
      })
      .sort((a, b) => {
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
      });
  }, [topics, selectedSubject, statusFilter, searchQuery, sortBy]);

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

  const exportDiagnosticLedger = () => {
    if (!topics.length) return;
    let csv = "Subject,Subject Code,Syllabus Topic,Accuracy Rate,Questions Attempted,Diagnostic Status,Recommended Teaching Action\n";
    for (const t of topics) {
      const safeTopic = `"${t.topic.replace(/"/g, '""')}"`;
      const safeAction = `"${t.recommendedAction.replace(/"/g, '""')}"`;
      const code = t.subjectCode || t.subject.slice(0, 3).toUpperCase();
      csv += `"${t.subject}","${code}",${safeTopic},${t.accuracyRate}%,${t.questionsAttempted},"${t.status.replace(/_/g, " ")}",${safeAction}\n`;
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
              Identify topic-level learning gaps and prioritise revision across your candidate cohort.
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
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3.5 py-1.5 text-xs font-medium text-slate-700 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              title="Export complete diagnostic ledger to CSV"
            >
              <Download size={13} className="text-slate-500" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* 2. THREE COMPACT RESTRAINED OVERVIEW METRICS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
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
                ? "border-slate-400 bg-slate-50 ring-1 ring-slate-300"
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
                : "No urgent remedial gaps identified across assessed topics"}
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
                  Showing <strong>{statusFilter.replace(/_/g, " ")}</strong> topics ({processedTopics.length} of {totalTracked})
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

      {/* 4. PRACTICAL CONTROLS & FILTER TOOLBAR */}
      <section className="space-y-3">
        {/* Subject Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
          {SUBJECTS.map((sub) => {
            const count = subjectCounts[sub.id] || 0;
            const isSelected = selectedSubject === sub.id;

            return (
              <button
                key={sub.id}
                type="button"
                onClick={() => setSelectedSubject(sub.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium shrink-0 transition cursor-pointer select-none ${
                  isSelected
                    ? "bg-[#12664F] text-white font-semibold"
                    : "bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <span>{sub.label}</span>
                {sub.id !== "all" && (
                  <span
                    className={`text-[10px] px-1 py-0.2 rounded font-mono ${
                      isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {sub.code}
                  </span>
                )}
                <span
                  className={`text-[10px] rounded-full px-1.5 py-0.2 font-medium ${
                    isSelected ? "bg-white/25 text-white" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {count}
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
              placeholder="Search syllabus topic, concept or code..."
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
                Sort:
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
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-md text-xs transition cursor-pointer ${
                  viewMode === "grid" ? "bg-white text-slate-900 font-semibold" : "text-slate-500 hover:text-slate-900"
                }`}
                title="Grid Cards View"
                aria-label="Grid cards view"
              >
                <LayoutGrid size={14} />
              </button>
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
            </div>

            {/* Results count */}
            <span className="text-[11px] text-slate-500 font-medium pl-1">
              {processedTopics.length} of {totalTracked}
            </span>
          </div>
        </div>
      </section>

      {/* 5. TOPIC DIAGNOSTIC DATA DISPLAY */}
      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center space-y-3">
          <Loader2 size={24} className="animate-spin text-slate-500 mx-auto" />
          <p className="text-xs text-slate-500 font-medium">Analyzing cohort syllabus mastery...</p>
        </div>
      ) : processedTopics.length === 0 ? (
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
      ) : viewMode === "grid" ? (
        /* RESTRAINED CLEAN GRID CARDS VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
          {processedTopics.map((item) => {
            const isUrgent = item.status === "urgent_remedial";
            const isRevision = item.status === "revision_recommended";
            const isReady = item.status === "exam_ready";
            const attempts = item.questionsAttempted || 0;
            const isUnassessed = attempts === 0;
            const isInsufficient = attempts > 0 && attempts < 3;

            // Subject Code Tag
            const subjectCode =
              item.subjectCode ||
              SUBJECTS.find((s) => s.id.toLowerCase() === item.subject?.toLowerCase())?.code ||
              item.subject.slice(0, 3).toUpperCase();

            return (
              <div
                key={item.id}
                className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 transition hover:border-slate-300"
              >
                {/* TOP ROW: Subject Label + Key Tag, Topic Title, Accuracy/Status Badge */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                        {item.subject}
                      </span>
                      <span className="font-mono text-[9px] font-medium px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                        {subjectCode}
                      </span>
                    </div>
                    <h4 className="text-sm font-semibold text-slate-900 leading-snug truncate" title={item.topic}>
                      {item.topic}
                    </h4>
                  </div>

                  {/* Accuracy Badge */}
                  <div className="shrink-0">
                    {isUnassessed ? (
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500 border border-slate-200">
                        Not Assessed
                      </span>
                    ) : (
                      <span className="rounded-md bg-slate-50 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-slate-800 border border-slate-200">
                        {item.accuracyRate}% Accuracy
                      </span>
                    )}
                  </div>
                </div>

                {/* MIDDLE ROW: Clean Progress Bar + Cohort Attempt Context */}
                <div className="space-y-1.5">
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-slate-800 transition-all"
                      style={{ width: `${isUnassessed ? 0 : Math.max(item.accuracyRate, 2)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>
                      {isUnassessed
                        ? "No cohort attempts recorded"
                        : attempts === 1
                        ? "1 question attempted across cohort"
                        : `${attempts} questions attempted across cohort`}
                      {isInsufficient && " (Early signal)"}
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

                {/* BOTTOM ROW: Context-Aware Concise Teacher Action */}
                <div className="rounded-lg bg-slate-50 border border-slate-200/80 p-2.5 text-xs text-slate-600 space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                      Action:
                    </span>
                    <span className="text-[10px] font-medium text-slate-700">
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
      ) : (
        /* DENSE TABLE VIEW (For teachers scanning large volumes of topics) */
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-medium uppercase tracking-wider text-[11px] select-none">
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Syllabus Topic</th>
                  <th className="py-3 px-4 text-center">Attempts</th>
                  <th className="py-3 px-4">Cohort Accuracy</th>
                  <th className="py-3 px-4">Diagnostic Status</th>
                  <th className="py-3 px-4">Recommended Intervention</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {processedTopics.map((item) => {
                  const isUrgent = item.status === "urgent_remedial";
                  const isRevision = item.status === "revision_recommended";
                  const isReady = item.status === "exam_ready";
                  const attempts = item.questionsAttempted || 0;

                  const subjectCode =
                    item.subjectCode ||
                    SUBJECTS.find((s) => s.id.toLowerCase() === item.subject?.toLowerCase())?.code ||
                    item.subject.slice(0, 3).toUpperCase();

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                            {subjectCode}
                          </span>
                          <span className="text-slate-600 text-xs">{item.subject}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900 max-w-[240px] truncate" title={item.topic}>
                        {item.topic}
                      </td>
                      <td className="py-3 px-4 text-center tabular-nums text-slate-600 font-medium">
                        {attempts}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 min-w-[120px]">
                          <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden shrink-0">
                            <div
                              className="h-full rounded-full bg-slate-800"
                              style={{ width: `${Math.max(item.accuracyRate, 2)}%` }}
                            />
                          </div>
                          <span className="font-semibold tabular-nums text-slate-800 text-xs">
                            {item.accuracyRate}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="rounded px-2 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                          {isUrgent ? "Urgent Remedial" : isRevision ? "Revision Recommended" : "Examination Ready"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[11px] text-slate-600 max-w-[320px] truncate" title={item.recommendedAction}>
                        {item.recommendedAction}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
