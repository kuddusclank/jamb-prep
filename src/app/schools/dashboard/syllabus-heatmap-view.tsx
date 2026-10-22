"use client";

import { useState, useEffect } from "react";
import { 
  BarChart3, 
  AlertTriangle, 
  Sparkles, 
  Calendar, 
  Download, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  BookOpen, 
  ArrowRight,
  TrendingUp,
  Loader2
} from "lucide-react";
import { DiagnosticTopicItem } from "@/app/api/schools/diagnostics/summary/route";

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
    fetch("/api/schools/diagnostics/summary/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.topics) setTopics(data.topics);
        if (data.revisionTimetable) setTimetable(data.revisionTimetable);
        setLoading(false);
      })
      .catch((err) => {
        console.warn("Could not load diagnostic summary:", err);
        setLoading(false);
      });
  }, []);

  const subjects = [
    { id: "all", label: "All Subjects" },
    { id: "Use of English", label: "Use of English" },
    { id: "Mathematics", label: "Mathematics" },
    { id: "Physics", label: "Physics" },
    { id: "Chemistry", label: "Chemistry" },
    { id: "Biology", label: "Biology" },
    { id: "Economics", label: "Economics" },
    { id: "Government", label: "Government" },
  ];

  const filteredTopics = topics.filter((t) => {
    const matchesSubject = selectedSubject === "all" || t.subject.toLowerCase() === selectedSubject.toLowerCase();
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 size={20} className="text-[#116149]" />
            Aggregated Syllabus Diagnostic Heatmap
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time mastery matrix generated from computer lab mock test attempts across your student cohort.
          </p>
        </div>

        <button
          type="button"
          onClick={exportDiagnosticLedger}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition cursor-pointer self-start sm:self-auto"
        >
          <Download size={14} />
          <span>Export Diagnostic Ledger (.csv)</span>
        </button>
      </div>

      {/* 3 Metric Summary Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div 
          onClick={() => setStatusFilter(statusFilter === "urgent_remedial" ? "all" : "urgent_remedial")}
          className={`rounded-2xl border p-4 space-y-1 transition cursor-pointer ${
            statusFilter === "urgent_remedial"
              ? "border-red-400 bg-red-100/60 ring-2 ring-red-400"
              : "border-red-200 bg-red-50/50 hover:bg-red-50"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-red-800">
              Urgent Remedial
            </span>
            <AlertTriangle size={15} className="text-red-600" />
          </div>
          <p className="text-2xl font-bold text-red-900">{urgentCount} Topics</p>
          <span className="text-[11px] text-red-700 block">&lt;40% accuracy · Immediate review needed</span>
        </div>

        <div 
          onClick={() => setStatusFilter(statusFilter === "revision_recommended" ? "all" : "revision_recommended")}
          className={`rounded-2xl border p-4 space-y-1 transition cursor-pointer ${
            statusFilter === "revision_recommended"
              ? "border-amber-400 bg-amber-100/60 ring-2 ring-amber-400"
              : "border-amber-200 bg-amber-50/50 hover:bg-amber-50"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
              Revision Recommended
            </span>
            <Clock size={15} className="text-amber-700" />
          </div>
          <p className="text-2xl font-bold text-amber-900">{revisionCount} Topics</p>
          <span className="text-[11px] text-amber-800 block">40% - 69% accuracy · Speed drills suggested</span>
        </div>

        <div 
          onClick={() => setStatusFilter(statusFilter === "exam_ready" ? "all" : "exam_ready")}
          className={`rounded-2xl border p-4 space-y-1 transition cursor-pointer ${
            statusFilter === "exam_ready"
              ? "border-emerald-400 bg-emerald-100/60 ring-2 ring-emerald-400"
              : "border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#116149]">
              Examination Ready
            </span>
            <Sparkles size={15} className="text-emerald-700" />
          </div>
          <p className="text-2xl font-bold text-[#092E28]">{readyCount} Topics</p>
          <span className="text-[11px] text-emerald-800 block">&ge;70% accuracy · High retention</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="space-y-3">
        {/* Subject Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {subjects.map((sub) => (
            <button
              key={sub.id}
              type="button"
              onClick={() => setSelectedSubject(sub.id)}
              className={`px-3 py-1.5 rounded-full font-semibold shrink-0 transition cursor-pointer ${
                selectedSubject === sub.id
                  ? "bg-[#116149] text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {sub.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search syllabus topic or concept (e.g. Calculus, Concord, Nomenclature)..."
            className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#116149]"
          />
        </div>
      </div>

      {/* Topic Grid */}
      {loading ? (
        <div className="py-12 text-center space-y-2">
          <Loader2 size={30} className="animate-spin text-[#116149] mx-auto" />
          <p className="text-xs text-slate-500">Aggregating topic mastery metrics...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTopics.map((item) => {
            const isUrgent = item.status === "urgent_remedial";
            const isRevision = item.status === "revision_recommended";
            const isReady = item.status === "exam_ready";

            return (
              <div
                key={item.id}
                className={`rounded-2xl border p-4 space-y-3 bg-white transition hover:shadow-xs ${
                  isUrgent
                    ? "border-red-200 hover:border-red-300"
                    : isRevision
                    ? "border-amber-200 hover:border-amber-300"
                    : "border-emerald-200 hover:border-emerald-300"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                      {item.subject}
                    </span>
                    <h4 className="text-xs font-bold text-slate-900">{item.topic}</h4>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold shrink-0 ${
                      isUrgent
                        ? "bg-red-100 text-red-800"
                        : isRevision
                        ? "bg-amber-100 text-amber-800"
                        : "bg-emerald-100 text-[#116149]"
                    }`}
                  >
                    {item.accuracyRate}% Accuracy
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      isUrgent ? "bg-red-600" : isRevision ? "bg-amber-500" : "bg-[#116149]"
                    }`}
                    style={{ width: `${item.accuracyRate}%` }}
                  />
                </div>

                <div className="rounded-xl bg-slate-50 p-2.5 text-[11px] text-slate-600 border border-slate-100 leading-relaxed">
                  <span className="font-bold text-slate-800">Teacher Action: </span>
                  {item.recommendedAction}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Actionable Weekly Revision Schedule */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="space-y-0.5">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Calendar size={15} className="text-[#116149]" />
              Recommended Weekly Remedial Timetable
            </h3>
            <p className="text-[11px] text-slate-500">
              Generated automatically to help your teaching staff target the highest failure-rate topics first.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
          {timetable.map((slot, idx) => (
            <div key={idx} className="rounded-xl border border-slate-200 bg-[#F8FAF7] p-3 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">{slot.day}</span>
                <span
                  className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold ${
                    slot.priority === "Urgent"
                      ? "bg-red-100 text-red-800"
                      : slot.priority === "Mock"
                      ? "bg-blue-100 text-blue-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {slot.priority}
                </span>
              </div>
              <p className="text-slate-500 text-[11px] flex items-center gap-1">
                <Clock size={12} />
                <span>{slot.time}</span>
              </p>
              <div className="pt-1 font-semibold text-slate-800 text-[11px]">
                {slot.subject}: <span className="text-[#116149] font-normal">{slot.topic}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
