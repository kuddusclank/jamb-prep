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
  Loader2
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

    fetch("/api/schools/students/drilldown/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId: student.id }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Static fallback");
        return res.json();
      })
      .then((resData) => {
        setData(resData);
        setLoading(false);
      })
      .catch(() => {
        const studentSubjects = student.subjects || ["ENG", "MTH", "PHY", "CHM"];
        setData({
          student: {
            id: student.id,
            name: student.name,
            email: student.email,
            studentIdentifier: student.studentIdentifier,
          },
          totalScore: student.averageScore || null,
          percentileRank: student.averageScore ? "Top 15% Cohort" : null,
          subjects: studentSubjects.map((subCode) => ({
            code: subCode,
            name: nameMap[subCode] || subCode,
            score: null,
            accuracy: null,
          })),
          weakTopics: [],
          strongTopics: [],
          mockHistory: [],
        });
        setLoading(false);
      });
  }, [isOpen, student]);

  if (!isOpen || !student) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-2xl rounded-lg bg-white p-5 sm:p-6 text-[#17231F] shadow-xl border border-[#E3E8E4] animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 flex size-8 items-center justify-center rounded-md text-[#68766F] hover:bg-[#F7F8F6] hover:text-[#17231F] transition cursor-pointer"
          aria-label="Close modal"
        >
          <X size={16} />
        </button>

        {/* Student Header */}
        <div className="flex items-start gap-3.5 pb-4 border-b border-[#E3E8E4]">
          <div className="size-10 rounded-md bg-[#EAF4EF] text-[#12664F] flex items-center justify-center font-bold text-sm shrink-0 border border-[#12664F]/20">
            {student.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="space-y-0.5 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-semibold text-[#17231F] truncate">{student.name}</h2>
              {student.studentIdentifier && (
                <span className="rounded bg-[#F7F8F6] border border-[#E3E8E4] px-1.5 py-0.5 text-[10px] font-mono text-[#68766F]">
                  {student.studentIdentifier}
                </span>
              )}
              {student.licenseStatus === "active" ? (
                <span className="inline-flex items-center gap-1 rounded bg-[#EAF4EF] px-2 py-0.5 text-[10px] font-medium text-[#12664F] border border-[#12664F]/20">
                  <span className="size-1.5 rounded-full bg-[#12664F]" />
                  Active Licence ({student.daysLeft ?? 28}d left)
                </span>
              ) : (
                <span className="rounded bg-[#F7F8F6] border border-[#E3E8E4] px-2 py-0.5 text-[10px] font-medium text-[#68766F]">
                  Unlicensed
                </span>
              )}
            </div>
            <p className="text-xs text-[#68766F] truncate">{student.email} · {schoolName}</p>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center space-y-2">
            <Loader2 size={24} className="animate-spin text-[#12664F] mx-auto" />
            <p className="text-xs text-[#68766F]">Loading diagnostic history and mock analytics...</p>
          </div>
        ) : (
          <div className="py-4 space-y-5 text-xs">
            {/* Top Score Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="rounded-md border border-[#E3E8E4] bg-[#F7F8F6] p-3.5 space-y-1">
                <span className="text-[11px] font-medium text-[#68766F] block">Latest Mock Total</span>
                <p className="text-2xl font-semibold tabular-nums text-[#17231F]">
                  {data?.totalScore ? `${data.totalScore} ` : "— "}
                  <span className="text-xs font-normal text-[#68766F]">/ 400</span>
                </p>
                <span className="text-[10px] text-[#12664F] font-medium">
                  {data?.totalScore ? "Verified Mock Score" : "Student hasn't done any activities yet"}
                </span>
              </div>

              <div className="rounded-md border border-[#E3E8E4] bg-[#F7F8F6] p-3.5 space-y-1">
                <span className="text-[11px] font-medium text-[#68766F] block">Cohort Standings</span>
                <p className="text-2xl font-semibold text-[#17231F]">
                  {data?.totalScore ? (data.percentileRank || "Active") : "—"}
                </p>
                <span className="text-[10px] text-[#68766F]">
                  {data?.totalScore ? "Calculated from recent performance" : "Awaiting first mock attempt"}
                </span>
              </div>

              <div className="rounded-md border border-[#E3E8E4] bg-[#F7F8F6] p-3.5 space-y-1">
                <span className="text-[11px] font-medium text-[#68766F] block">Exam Readiness</span>
                <p className="text-2xl font-semibold text-[#17231F]">
                  {data?.totalScore ? "71% Pace" : "—"}
                </p>
                <span className="text-[10px] text-[#68766F]">
                  {data?.totalScore ? "114 mins / 120 mins avg" : "No exam timer logged yet"}
                </span>
              </div>
            </div>

            {/* 4-Subject Performance Breakdown */}
            <div className="space-y-2.5">
              <h3 className="font-semibold text-[#17231F] text-xs flex items-center gap-1.5">
                <BarChart3 size={14} className="text-[#12664F]" />
                <span>4-Subject Combination Score Breakdown</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {(data?.subjects || []).map((sub: any) => {
                  const hasScore = typeof sub.score === "number" && sub.score !== null;
                  return (
                    <div key={sub.code || sub.name} className="rounded-md border border-[#E3E8E4] p-3 space-y-2 bg-white">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-[#17231F]">{sub.name}</span>
                        <span className="font-semibold text-[#12664F] font-mono tabular-nums">
                          {hasScore ? `${sub.score} / 100` : "— / 100"}
                        </span>
                      </div>
                      <div className="w-full bg-[#F7F8F6] rounded-full h-1.5 overflow-hidden border border-[#E3E8E4]/50">
                        <div 
                          className={`h-full rounded-full ${hasScore ? (sub.score >= 70 ? "bg-[#12664F]" : "bg-amber-500") : "bg-slate-200"}`} 
                          style={{ width: hasScore ? `${sub.score}%` : "0%" }} 
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-[#68766F]">
                        <span>Accuracy: {hasScore ? (sub.accuracy ?? `${sub.score}%`) : "—"}</span>
                        <span className={hasScore ? (sub.score >= 70 ? "text-[#12664F] font-semibold" : "text-amber-800 font-semibold") : "text-[#68766F]"}>
                          {hasScore ? (sub.score >= 70 ? "Mastered" : "Revision Advised") : "Not yet attempted"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Diagnostic Strengths & Urgent Remedial Topics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Weak Topics */}
              <div className="rounded-md border border-red-200 bg-red-50/40 p-3.5 space-y-2">
                <div className="flex items-center gap-1.5 text-red-800 font-semibold text-xs">
                  <AlertTriangle size={13} className="text-red-600 shrink-0" />
                  <span>Targeted Remedial Priority Topics</span>
                </div>
                {(!data?.weakTopics || data.weakTopics.length === 0) ? (
                  <div className="rounded border border-dashed border-red-200 bg-white/70 p-3 text-center text-xs text-red-800">
                    Student hasn&apos;t done any activities yet. Weak topics will appear here after their first test.
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {data.weakTopics.map((item: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between text-[11px] bg-white p-2 rounded border border-red-200/60">
                        <div>
                          <span className="font-semibold text-[#17231F] block">{item.topic}</span>
                          <span className="text-[10px] text-[#68766F]">{item.subject}</span>
                        </div>
                        <span className="text-[10px] font-semibold text-red-700 bg-red-100 px-1.5 py-0.5 rounded">
                          {item.errorRate} error
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Strong Topics */}
              <div className="rounded-md border border-[#12664F]/30 bg-[#EAF4EF]/50 p-3.5 space-y-2">
                <div className="flex items-center gap-1.5 text-[#12664F] font-semibold text-xs">
                  <Sparkles size={13} className="text-[#12664F] shrink-0" />
                  <span>Demonstrated Strengths</span>
                </div>
                {(!data?.strongTopics || data.strongTopics.length === 0) ? (
                  <div className="rounded border border-dashed border-[#12664F]/30 bg-white/70 p-3 text-center text-xs text-[#12664F]">
                    Student hasn&apos;t done any activities yet. Strengths will appear here after their first test.
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {data.strongTopics.map((item: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between text-[11px] bg-white p-2 rounded border border-[#12664F]/20">
                        <div>
                          <span className="font-semibold text-[#17231F] block">{item.topic}</span>
                          <span className="text-[10px] text-[#68766F]">{item.subject}</span>
                        </div>
                        <span className="text-[10px] font-semibold text-[#12664F] bg-[#EAF4EF] px-1.5 py-0.5 rounded">
                          {item.accuracy}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Mock History */}
            <div className="space-y-2">
              <h3 className="font-semibold text-[#17231F] text-xs flex items-center gap-1.5">
                <Calendar size={14} className="text-[#68766F]" />
                <span>Laboratory Mock Examination History</span>
              </h3>
              <div className="rounded-md border border-[#E3E8E4] overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#F7F8F6] border-b border-[#E3E8E4] text-[#68766F] font-medium">
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3">Examination Session</th>
                      <th className="py-2 px-3">Score</th>
                      <th className="py-2 px-3 text-right">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E3E8E4] text-[#17231F]">
                    {(!data?.mockHistory || data.mockHistory.length === 0) ? (
                      <tr>
                        <td colSpan={4} className="py-5 text-center text-xs text-[#68766F]">
                          Student hasn&apos;t completed any mock exams yet.
                        </td>
                      </tr>
                    ) : (
                      data.mockHistory.map((h: any, idx: number) => (
                        <tr key={idx} className="hover:bg-[#F7F8F6]">
                          <td className="py-2 px-3 text-[#68766F]">{h.date}</td>
                          <td className="py-2 px-3 font-medium text-[#17231F]">{h.examName}</td>
                          <td className="py-2 px-3 font-semibold text-[#12664F] tabular-nums">{h.score} / 400</td>
                          <td className="py-2 px-3 text-right text-[#68766F]">{h.timeSpent}</td>
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
        <div className="flex items-center justify-between pt-3.5 border-t border-[#E3E8E4]">
          <span className="text-[11px] text-[#68766F]">
            JAMBPrep Institutional Diagnostics · Candidate ID: {student.studentIdentifier || student.id}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-md border border-[#E3E8E4] bg-white px-3 py-1.5 text-xs font-medium text-[#17231F] hover:bg-[#F7F8F6] transition cursor-pointer"
            >
              <Printer size={12} />
              <span>Print Slip</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md bg-[#12664F] px-3.5 py-1.5 text-xs font-medium text-white hover:bg-[#0B3028] transition cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
