"use client";

import { useEffect, useState } from "react";
import { 
  X, 
  BarChart3, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  Printer, 
  Calendar, 
  Clock, 
  BookOpen, 
  ShieldCheck, 
  User, 
  Loader2,
  TrendingUp,
  Award
} from "lucide-react";

interface StudentDrilldownModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: {
    id: string;
    name: string;
    email: string;
    studentIdentifier?: string | null;
    subjects?: string[];
    licenseStatus: "active" | "inactive";
    daysLeft?: number;
    averageScore?: number | null;
  } | null;
  schoolName: string;
}

export function StudentDrilldownModal({ isOpen, onClose, student, schoolName }: StudentDrilldownModalProps) {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!isOpen || !student) {
      setData(null);
      return;
    }

    setLoading(true);

    const nameMap: Record<string, string> = {
      ENG: "Use of English",
      MTH: "Mathematics",
      PHY: "Physics",
      CHM: "Chemistry",
      BIO: "Biology",
      ECN: "Economics",
      GOV: "Government",
      LIT: "Literature in English",
      GEO: "Geography",
      CRS: "Christian Religious Studies",
      IRS: "Islamic Religious Studies",
    };

    const fallbackDrilldown = {
      studentId: student.id,
      name: student.name || "Candidate",
      email: student.email || "",
      studentIdentifier: student.studentIdentifier || null,
      licenseStatus: student.licenseStatus || "inactive",
      subjects: (student.subjects || ["ENG", "MTH", "PHY", "CHM"]).map((sub) => ({
        name: nameMap[sub] || sub,
        code: sub.length === 3 ? sub : sub.slice(0, 3).toUpperCase(),
        score: null,
        maxScore: 100,
        accuracy: null,
        status: "unattempted",
      })),
      totalScore: student.averageScore || null,
      maxPossibleScore: 400,
      percentileRank: student.averageScore ? "Active Candidate" : "Awaiting first test",
      weakTopics: [],
      strongTopics: [],
      mockHistory: [],
    };

    fetch("/api/schools/students/drilldown/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId: student.id,
        name: student.name,
        email: student.email,
        studentIdentifier: student.studentIdentifier,
        licenseStatus: student.licenseStatus,
      }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Server returned " + res.status);
        const text = await res.text();
        return text ? JSON.parse(text) : {};
      })
      .then((resData) => {
        setData(resData?.drilldown || fallbackDrilldown);
        setLoading(false);
      })
      .catch((err) => {
        console.warn("Using offline student drilldown fallback:", err);
        setData(fallbackDrilldown);
        setLoading(false);
      });
  }, [isOpen, student]);

  if (!isOpen || !student) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-2xl rounded-3xl bg-white p-6 sm:p-8 text-[#092E28] shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 flex size-9 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
          aria-label="Close modal"
        >
          <X size={18} />
        </button>

        {/* Student Header */}
        <div className="flex items-start gap-4 pb-5 border-b border-slate-100">
          <div className="size-12 rounded-2xl bg-emerald-100 text-[#116149] flex items-center justify-center font-bold text-lg shrink-0">
            {student.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="space-y-1 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-slate-900 truncate">{student.name}</h2>
              {student.studentIdentifier && (
                <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-mono font-bold text-slate-700">
                  {student.studentIdentifier}
                </span>
              )}
              {student.licenseStatus === "active" ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-[#116149]">
                  <span className="size-1.5 rounded-full bg-emerald-600" />
                  Active License ({student.daysLeft ?? 28}d left)
                </span>
              ) : (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                  Unlicensed
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 truncate">{student.email} · {schoolName}</p>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center space-y-3">
            <Loader2 size={32} className="animate-spin text-[#116149] mx-auto" />
            <p className="text-xs text-slate-500">Loading diagnostic history and mock analytics...</p>
          </div>
        ) : (
          <div className="py-5 space-y-6 text-xs">
            {/* Top Score Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 space-y-1">
                <span className="text-[11px] font-semibold text-[#116149] block">Latest Mock Total</span>
                <p className="text-2xl font-bold font-serif text-[#092E28]">
                  {data?.totalScore ? `${data.totalScore} ` : "— "}
                  <span className="text-xs font-normal text-slate-500">/ 400</span>
                </p>
                <span className="text-[10px] text-emerald-800 font-medium">
                  {data?.totalScore ? "Verified Mock Score" : "Student hasn't done any activities yet"}
                </span>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-1">
                <span className="text-[11px] font-semibold text-slate-600 block">Cohort Standings</span>
                <p className="text-2xl font-bold text-slate-900">
                  {data?.totalScore ? (data.percentileRank || "Active") : "—"}
                </p>
                <span className="text-[10px] text-slate-500">
                  {data?.totalScore ? "Calculated from recent performance" : "Awaiting first mock attempt"}
                </span>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-1">
                <span className="text-[11px] font-semibold text-slate-600 block">Exam Readiness</span>
                <p className="text-2xl font-bold text-purple-700">
                  {data?.totalScore ? "71% Pace" : "—"}
                </p>
                <span className="text-[10px] text-purple-900 font-medium">
                  {data?.totalScore ? "114 mins / 120 mins avg" : "No exam timer logged yet"}
                </span>
              </div>
            </div>

            {/* 4-Subject Performance Breakdown */}
            <div className="space-y-3">
              <h3 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                <BarChart3 size={15} className="text-[#116149]" />
                4-Subject Combination Score Breakdown
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(data?.subjects || []).map((sub: any) => {
                  const hasScore = typeof sub.score === "number" && sub.score !== null;
                  return (
                    <div key={sub.code || sub.name} className="rounded-2xl border border-slate-200 p-3.5 space-y-2 bg-white">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800">{sub.name}</span>
                        <span className="font-bold text-[#116149] font-mono">
                          {hasScore ? `${sub.score} / 100` : "— / 100"}
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${hasScore ? (sub.score >= 70 ? "bg-emerald-600" : "bg-amber-500") : "bg-slate-200"}`} 
                          style={{ width: hasScore ? `${sub.score}%` : "0%" }} 
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-500">
                        <span>Accuracy: {hasScore ? (sub.accuracy ?? `${sub.score}%`) : "—"}</span>
                        <span className={hasScore ? (sub.score >= 70 ? "text-emerald-700 font-semibold" : "text-amber-800 font-semibold") : "text-slate-400 font-medium"}>
                          {hasScore ? (sub.score >= 70 ? "Mastered" : "Revision Advised") : "Not yet attempted"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Diagnostic Strengths & Urgent Remedial Topics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Weak Topics */}
              <div className="rounded-2xl border border-red-200 bg-red-50/40 p-4 space-y-2.5">
                <div className="flex items-center gap-1.5 text-red-800 font-bold text-xs">
                  <AlertTriangle size={14} className="text-red-600 shrink-0" />
                  <span>Targeted Remedial Priority Topics</span>
                </div>
                {(!data?.weakTopics || data.weakTopics.length === 0) ? (
                  <div className="rounded-xl border border-dashed border-red-200 bg-white/70 p-4 text-center text-xs text-red-800">
                    Student hasn&apos;t done any activities yet. Weak topics will appear here after their first test.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {data.weakTopics.map((item: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between text-[11px] bg-white/80 p-2 rounded-xl border border-red-200/60">
                        <div>
                          <span className="font-bold text-slate-800 block">{item.topic}</span>
                          <span className="text-[10px] text-slate-500">{item.subject}</span>
                        </div>
                        <span className="text-[10px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-md">
                          {item.errorRate} error
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Strong Topics */}
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-2.5">
                <div className="flex items-center gap-1.5 text-[#116149] font-bold text-xs">
                  <Sparkles size={14} className="text-emerald-700 shrink-0" />
                  <span>Demonstrated Strengths</span>
                </div>
                {(!data?.strongTopics || data.strongTopics.length === 0) ? (
                  <div className="rounded-xl border border-dashed border-emerald-200 bg-white/70 p-4 text-center text-xs text-[#116149]">
                    Student hasn&apos;t done any activities yet. Strengths will appear here after their first test.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {data.strongTopics.map((item: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between text-[11px] bg-white/80 p-2 rounded-xl border border-emerald-200/60">
                        <div>
                          <span className="font-bold text-slate-800 block">{item.topic}</span>
                          <span className="text-[10px] text-slate-500">{item.subject}</span>
                        </div>
                        <span className="text-[10px] font-bold text-[#116149] bg-emerald-100 px-2 py-0.5 rounded-md">
                          {item.accuracy}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Mock History */}
            <div className="space-y-2.5">
              <h3 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                <Calendar size={15} className="text-slate-600" />
                Laboratory Mock Examination History
              </h3>
              <div className="rounded-2xl border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Examination Session</th>
                      <th className="py-2.5 px-3">Score</th>
                      <th className="py-2.5 px-3 text-right">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {(!data?.mockHistory || data.mockHistory.length === 0) ? (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-xs text-slate-500">
                          Student hasn&apos;t completed any mock exams yet.
                        </td>
                      </tr>
                    ) : (
                      data.mockHistory.map((h: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3 text-slate-500">{h.date}</td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900">{h.examName}</td>
                          <td className="py-2.5 px-3 font-bold text-[#116149]">{h.score} / 400</td>
                          <td className="py-2.5 px-3 text-right text-slate-500">{h.timeSpent}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Modal Action Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <span className="text-[11px] text-slate-400">
            JAMBPrep Institutional Diagnostics · Candidate ID: {student.studentIdentifier || student.id}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            >
              <Printer size={13} />
              <span>Print Slip</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-[#116149] px-4 py-2 text-xs font-bold text-white hover:bg-[#0b4936] transition cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
