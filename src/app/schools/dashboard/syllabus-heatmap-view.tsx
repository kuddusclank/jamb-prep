"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  BarChart3, 
  AlertTriangle, 
  CheckCheck, 
  Calendar, 
  Download, 
  Search, 
  Clock, 
  Loader2 
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
}

export function SyllabusHeatmapView({ schoolName }: SyllabusHeatmapViewProps) {
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [topics, setTopics] = useState<DiagnosticTopicItem[]>([]);
  const [timetable, setTimetable] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);

    const loadSummary = async () => {
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

      // 1. Query tenant-scoped Worker API
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

      if (!active) return;

      if (data) {
        if (data.topics) setTopics(data.topics);
        if (data.revisionTimetable) setTimetable(data.revisionTimetable);
        setLoading(false);
      } else {
        setTopics([]);
        setTimetable([]);
        setLoading(false);
      }
    };

    void loadSummary();

    return () => {
      active = false;
    };
  }, []);

  const subjects = [
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

  const filteredTopics = topics.filter((t: any) => {
    const selectedObj = subjects.find((s) => s.id === selectedSubject);
    const matchesSubject =
      selectedSubject === "all" ||
      (t.subject && t.subject.toLowerCase() === selectedSubject.toLowerCase()) ||
      (selectedObj && (t.subject?.toUpperCase() === selectedObj.code || t.subjectCode?.toUpperCase() === selectedObj.code));
    const matchesStatus = statusFilter === "all" || t.status === statusFilter;
    const matchesSearch = !searchQuery || 
      t.topic.toLowerCase().includes(searchQuery.toLowerCase()) || 
      t.subject.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSubject && matchesStatus && matchesSearch;
  });

  const exportDiagnosticLedger = () => {
    if (!topics.length) return;
    let csv = "Subject,Syllabus Topic,Accuracy Rate,Questions Attempted,Diagnostic Status,Recommended Teaching Action\n";
    for (const t of topics) {
      const safeTopic = `"${t.topic.replace(/"/g, '""')}"`;
      const safeAction = `"${t.recommendedAction.replace(/"/g, '""')}"`;
      csv += `"${t.subject}",${safeTopic},${t.accuracyRate}%,${t.questionsAttempted},"${t.status.replace(/_/g, " ")}",${safeAction}\n`;
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

  const urgentCount = topics.filter((t) => t.status === "urgent_remedial").length;
  const revisionCount = topics.filter((t) => t.status === "revision_recommended").length;
  const readyCount = topics.filter((t) => t.status === "exam_ready").length;

  return (
    <div className="space-y-6">
      {/* Top Header & Export */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E3E8E4]">
        <div>
          <h2 className="text-base sm:text-lg font-semibold text-[#17231F] flex items-center gap-2">
            <BarChart3 size={18} className="text-[#12664F]" />
            <span>Aggregated Syllabus Diagnostic Heatmap</span>
          </h2>
          <p className="text-xs text-[#68766F] mt-0.5">
            Real-time mastery matrix generated from computer lab mock test attempts across your student cohort.
          </p>
        </div>

        <button
          type="button"
          onClick={exportDiagnosticLedger}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer self-start sm:self-auto"
        >
          <Download size={13} />
          <span>Export Diagnostic Ledger (.csv)</span>
        </button>
      </div>

      {/* 3 Metric Summary Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div 
          onClick={() => setStatusFilter(statusFilter === "urgent_remedial" ? "all" : "urgent_remedial")}
          className={`rounded-lg border p-4 space-y-1 transition cursor-pointer ${
            statusFilter === "urgent_remedial"
              ? "border-red-400 bg-red-100/70 ring-1 ring-red-400"
              : "border-red-200 bg-red-50/50 hover:bg-red-50"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-red-800">
              Urgent Remedial
            </span>
            <AlertTriangle size={14} className="text-red-600" />
          </div>
          <p className="text-2xl font-semibold tabular-nums text-red-900">{urgentCount} Topics</p>
          <span className="text-[11px] text-red-700 block">
            {urgentCount > 0 ? "<40% accuracy · Immediate review needed" : "No urgent remedial topics"}
          </span>
        </div>

        <div 
          onClick={() => setStatusFilter(statusFilter === "revision_recommended" ? "all" : "revision_recommended")}
          className={`rounded-lg border p-4 space-y-1 transition cursor-pointer ${
            statusFilter === "revision_recommended"
              ? "border-amber-400 bg-amber-100/70 ring-1 ring-amber-400"
              : "border-amber-200 bg-amber-50/50 hover:bg-amber-50"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-800">
              Revision Recommended
            </span>
            <Clock size={14} className="text-amber-700" />
          </div>
          <p className="text-2xl font-semibold tabular-nums text-amber-900">{revisionCount} Topics</p>
          <span className="text-[11px] text-amber-800 block">
            {revisionCount > 0 ? "40% - 69% accuracy · Speed drills suggested" : "No revision topics flagged"}
          </span>
        </div>

        <div 
          onClick={() => setStatusFilter(statusFilter === "exam_ready" ? "all" : "exam_ready")}
          className={`rounded-lg border p-4 space-y-1 transition cursor-pointer ${
            statusFilter === "exam_ready"
              ? "border-[#12664F] bg-[#EAF4EF] ring-1 ring-[#12664F]"
              : "border-[#12664F]/30 bg-[#EAF4EF]/50 hover:bg-[#EAF4EF]"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#12664F]">
              Examination Ready
            </span>
            <CheckCheck size={15} className="text-[#12664F]" />
          </div>
          <p className="text-2xl font-semibold tabular-nums text-[#0B3028]">{readyCount} Topics</p>
          <span className="text-[11px] text-[#12664F] block">
            {readyCount > 0 ? "≥70% accuracy · High retention" : "No completed test data yet"}
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="space-y-2.5">
        {/* Subject Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {subjects.map((sub) => (
            <button
              key={sub.id}
              type="button"
              onClick={() => setSelectedSubject(sub.id)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium shrink-0 transition cursor-pointer ${
                selectedSubject === sub.id
                  ? "bg-[#12664F] text-white"
                  : "bg-[#F7F8F6] border border-[#E3E8E4] text-[#68766F] hover:text-[#17231F]"
              }`}
            >
              {sub.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#68766F]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search syllabus topic or concept (e.g. Calculus, Concord, Chemical Bonding)..."
            className="w-full rounded-md border border-[#E3E8E4] bg-white pl-8 pr-3 py-1.5 text-xs text-[#17231F] placeholder:text-[#68766F]/60 focus:outline-none focus:ring-1 focus:ring-[#12664F] focus:border-[#12664F]"
          />
        </div>
      </div>

      {/* Topic Grid */}
      {loading ? (
        <div className="py-12 text-center space-y-2">
          <Loader2 size={24} className="animate-spin text-[#12664F] mx-auto" />
          <p className="text-xs text-[#68766F]">Checking syllabus performance records...</p>
        </div>
      ) : filteredTopics.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[#E3E8E4] bg-[#F7F8F6] p-10 text-center">
          <div className="mx-auto flex size-10 items-center justify-center rounded-lg bg-white border border-[#E3E8E4] text-[#68766F] mb-2.5">
            <BarChart3 size={20} />
          </div>
          <h3 className="text-sm font-semibold text-[#17231F]">No diagnostic test data yet</h3>
          <p className="text-xs text-[#68766F] max-w-sm mx-auto mt-1 leading-relaxed">
            Students haven&apos;t done any test or mock activities yet. Aggregated syllabus mastery and topic weakness heatmaps will appear here once candidates complete tests.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {filteredTopics.map((item) => {
            const isUrgent = item.status === "urgent_remedial";
            const isRevision = item.status === "revision_recommended";

            return (
              <div
                key={item.id}
                className={`rounded-xl border p-4 space-y-2.5 bg-white transition hover:border-slate-300 ${
                  isUrgent
                    ? "border-red-200"
                    : isRevision
                    ? "border-amber-200"
                    : "border-[#E3E8E4]"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-semibold text-[#68766F] uppercase tracking-wider block">
                      {item.subject}
                    </span>
                    <h4 className="text-xs font-semibold text-[#17231F]">{item.topic}</h4>
                  </div>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-semibold tabular-nums shrink-0 ${
                      isUrgent
                        ? "bg-red-100 text-red-800"
                        : isRevision
                        ? "bg-amber-100 text-amber-800"
                        : "bg-[#EAF4EF] text-[#12664F]"
                    }`}
                  >
                    {item.accuracyRate}% Accuracy
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-[#F7F8F6] rounded-full h-1.5 overflow-hidden border border-[#E3E8E4]/50">
                  <div
                    className={`h-full rounded-full ${
                      isUrgent ? "bg-red-600" : isRevision ? "bg-amber-500" : "bg-[#12664F]"
                    }`}
                    style={{ width: `${item.accuracyRate}%` }}
                  />
                </div>

                <div className="rounded-md bg-[#F7F8F6] p-2.5 text-[11px] text-[#68766F] border border-[#E3E8E4] leading-relaxed">
                  <strong className="text-[#17231F] font-semibold">Teacher Action: </strong>
                  {item.recommendedAction}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Actionable Weekly Revision Schedule */}
      <div className="rounded-lg border border-[#E3E8E4] bg-white p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-[#E3E8E4]">
          <div className="space-y-0.5">
            <h3 className="text-xs sm:text-sm font-semibold text-[#17231F] flex items-center gap-1.5">
              <Calendar size={14} className="text-[#12664F]" />
              <span>Recommended Weekly Remedial Timetable</span>
            </h3>
            <p className="text-[11px] text-[#68766F]">
              Generated automatically to help your teaching staff target the highest failure-rate topics first.
            </p>
          </div>
        </div>

        {timetable.length === 0 ? (
          <div className="rounded-md border border-dashed border-[#E3E8E4] bg-[#F7F8F6] p-6 text-center text-xs text-[#68766F]">
            <Calendar size={18} className="mx-auto text-[#68766F] mb-1.5" />
            <p className="font-semibold text-[#17231F]">No remedial schedule needed yet</p>
            <p className="text-[11px] text-[#68766F] mt-0.5">
              Students haven&apos;t done any test activities yet. Targeted remedial sessions will appear here as soon as weak syllabus areas are identified.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
            {timetable.map((slot, idx) => (
              <div key={idx} className="rounded-md border border-[#E3E8E4] bg-[#F7F8F6] p-3 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[#17231F]">{slot.day}</span>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[9px] font-semibold ${
                      slot.priority === "Urgent"
                        ? "bg-red-100 text-red-800"
                        : slot.priority === "Mock"
                        ? "bg-[#EAF4EF] text-[#12664F]"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {slot.priority}
                  </span>
                </div>
                <p className="text-[#68766F] text-[11px] flex items-center gap-1">
                  <Clock size={11} />
                  <span>{slot.time}</span>
                </p>
                <div className="pt-0.5 font-medium text-[#17231F] text-[11px]">
                  {slot.subject}: <span className="text-[#12664F]">{slot.topic}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
