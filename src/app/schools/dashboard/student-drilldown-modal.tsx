"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  X, 
  BarChart3, 
  CheckCircle2, 
  AlertTriangle, 
  CheckCheck, 
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
    licenseStatus: "active" | "inactive" | "expired";
    daysLeft?: number;
    averageScore?: number | null;
  } | null;
  schoolName: string;
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

export function StudentDrilldownModal({ isOpen, onClose, student, schoolName }: StudentDrilldownModalProps) {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Print slip handler ensuring the modal prints as a clean, single-page document
  const handlePrint = () => {
    document.body.classList.add("printing-student-drilldown");
    window.print();
  };

  useEffect(() => {
    const handleAfterPrint = () => {
      document.body.classList.remove("printing-student-drilldown");
    };
    window.addEventListener("afterprint", handleAfterPrint);
    return () => {
      window.removeEventListener("afterprint", handleAfterPrint);
      document.body.classList.remove("printing-student-drilldown");
    };
  }, []);

  useEffect(() => {
    if (!isOpen || !student) {
      setData(null);
      return;
    }

    setLoading(true);
    let active = true;

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

    const loadDrilldown = async () => {
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

      let resData: any = null;

      // Query authoritative Worker API endpoint
      try {
        const res = await fetch(`${apiBase}/api/v1/schools/students/drilldown`, {
          method: "POST",
          headers,
          body: JSON.stringify({ studentId: student.id }),
        });
        if (res.ok) {
          resData = await res.json();
        }
      } catch {
        // Fall through to local roster summary
      }

      if (!active) return;

      if (resData) {
        const payload = resData.drilldown || resData;
        setData(payload);
        setLoading(false);
        return;
      }

      const studentSubjects = parseSubjectsArray(student.subjects);
      setData({
        student: {
          id: student.id,
          name: student.name,
          email: student.email,
          studentIdentifier: student.studentIdentifier,
        },
        totalScore: student.averageScore || null,
        percentileRank: student.averageScore ? (student.averageScore >= 250 ? "Top 15% Cohort" : "Active Cohort") : null,
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
    };

    void loadDrilldown();

    return () => {
      active = false;
    };
  }, [isOpen, student]);

  if (!isOpen || !student) return null;

  return (
    <div 
      data-print-target="student-drilldown"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200 print:static print:p-0 print:bg-white print:backdrop-blur-none print:z-auto print:block print:w-full print:h-auto"
    >
      <div 
        data-print-dialog="true"
        className="relative w-full max-w-2xl rounded-2xl bg-white p-6 sm:p-7 text-slate-900 border border-slate-200 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto print:max-h-none print:overflow-visible print:p-0 print:border-none print:shadow-none print:max-w-none print:w-full"
        role="dialog"
        aria-modal="true"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 flex size-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer print:hidden"
          aria-label="Close modal"
        >
          <X size={16} />
        </button>

        {/* Official Printable Slip Header */}
        <div className="hidden print:flex items-center justify-between pb-3 mb-3 border-b-2 border-[#12664F]">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider font-semibold text-[#12664F]">JAMBPrep for Schools</span>
              <span className="text-slate-300">|</span>
              <span className="text-xs font-medium text-slate-600">{schoolName}</span>
            </div>
            <h1 className="text-base font-semibold text-slate-900 mt-0.5">Student Diagnostic & Mock Examination Slip</h1>
          </div>
          <div className="text-right text-[10px] text-slate-500">
            <p className="font-mono font-medium text-slate-800">Candidate ID: {student.studentIdentifier || student.id}</p>
            <p>Printed: {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</p>
          </div>
        </div>

        {/* Student Header */}
        <div className="flex items-start gap-4 pb-5 border-b border-slate-100 print:pb-2.5 print-avoid-break">
          <div className="size-11 rounded-xl bg-[#EAF4EF] text-[#12664F] flex items-center justify-center font-semibold text-sm shrink-0 border border-[#12664F]/20">
            {student.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="space-y-1 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-semibold text-slate-900 truncate">{student.name}</h2>
              {student.studentIdentifier && (
                <span className="rounded-md bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-mono text-slate-600">
                  {student.studentIdentifier}
                </span>
              )}
              {student.licenseStatus === "active" ? (
                <span className="inline-flex items-center gap-1.5 rounded-md bg-[#EAF4EF] px-2.5 py-0.5 text-[10px] font-medium text-[#12664F] border border-[#12664F]/20">
                  <span className="size-1.5 rounded-full bg-[#12664F]" />
                  Active Licence ({student.daysLeft ?? 28}d left)
                </span>
              ) : (
                <span className="rounded-md bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                  Unlicensed
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-normal truncate">{student.email} · {schoolName}</p>
          </div>
        </div>

        {loading ? (
          <div className="py-14 text-center space-y-2.5">
            <Loader2 size={26} className="animate-spin text-[#12664F] mx-auto" />
            <p className="text-xs text-slate-500 font-normal">Loading diagnostic history and mock analytics...</p>
          </div>
        ) : (
          <div className="py-5 space-y-6 text-xs print:py-2.5 print:space-y-3 print:text-[11px]">
            {/* Top Score & Practice Summary Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-4 print:grid-cols-4 gap-3 print:gap-2 print-avoid-break">
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 print:p-2.5 space-y-1">
                <span className="text-[11px] font-medium text-slate-500 block">Latest Mock Total</span>
                <p className="text-2xl font-semibold tabular-nums text-slate-900">
                  {data?.totalScore ? `${data.totalScore} ` : "— "}
                  <span className="text-xs font-normal text-slate-400">/ 400</span>
                </p>
                <span className="text-[10px] text-[#12664F] font-medium">
                  {data?.totalScore ? "Verified Mock Score" : "Awaiting first mock attempt"}
                </span>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 print:p-2.5 space-y-1">
                <span className="text-[11px] font-medium text-slate-500 block">Practice Accuracy</span>
                <p className="text-2xl font-semibold tabular-nums text-slate-900">
                  {typeof data?.practiceSummary?.overallPracticeAccuracy === "number"
                    ? `${data.practiceSummary.overallPracticeAccuracy}%`
                    : "—"}
                </p>
                <span className="text-[10px] text-slate-500 font-normal">
                  {data?.practiceSummary?.totalQuestionsAttempted
                    ? `${data.practiceSummary.totalQuestionsAttempted} questions attempted`
                    : "No practice questions yet"}
                </span>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 print:p-2.5 space-y-1">
                <span className="text-[11px] font-medium text-slate-500 block">Syllabus Coverage</span>
                <p className="text-2xl font-semibold tabular-nums text-slate-900">
                  {data?.practiceSummary?.topicsPracticed ? `${data.practiceSummary.topicsPracticed} ` : "0 "}
                  <span className="text-xs font-normal text-slate-400">Topics</span>
                </p>
                <span className="text-[10px] text-slate-500 font-normal">
                  {data?.practiceSummary?.practiceSessionsCount
                    ? `${data.practiceSummary.practiceSessionsCount} study sessions logged`
                    : "Practice streak pending"}
                </span>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 print:p-2.5 space-y-1">
                <span className="text-[11px] font-medium text-slate-500 block">Cohort Standings</span>
                <p className="text-2xl font-semibold text-slate-900">
                  {data?.percentileRank || (data?.totalScore ? "Active" : "—")}
                </p>
                <span className="text-[10px] text-slate-500 font-normal">
                  {data?.totalScore ? "Calculated from recent performance" : "Standings unranked"}
                </span>
              </div>
            </div>

            {/* 4-Subject Performance Breakdown with Subject Key Tags */}
            <div className="space-y-3 print:space-y-1.5 print-avoid-break">
              <h3 className="font-semibold text-slate-900 text-xs flex items-center gap-2">
                <BarChart3 size={15} className="text-[#12664F]" />
                <span>4-Subject Combination Score Breakdown</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-3 print:gap-2">
                {(data?.subjects || []).length > 0 ? (
                  data.subjects.map((sub: any) => {
                    const hasScore = typeof sub.score === "number" && sub.score !== null;
                    const subCode = sub.code || (sub.name?.toUpperCase().includes("ENG") ? "EN" : sub.name?.slice(0, 3).toUpperCase());
                    const cleanCode = subCode === "ENG" ? "EN" : subCode;

                    return (
                      <div key={sub.code || sub.name} className="rounded-xl border border-slate-200 p-3.5 print:p-2 space-y-2.5 print:space-y-1 bg-white">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 truncate">
                            <span className="font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#EAF4EF] text-[#12664F] border border-[#12664F]/20">
                              {cleanCode}
                            </span>
                            <span className="font-medium text-slate-900 truncate">{sub.name}</span>
                          </div>
                          <span className="font-medium text-[#12664F] font-mono tabular-nums text-xs">
                            {hasScore ? `${sub.score} / 100` : "— / 100"}
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden border border-slate-200/50">
                          <div 
                            className={`h-full rounded-full transition-all duration-300 ${hasScore ? (sub.score >= 70 ? "bg-[#12664F]" : "bg-amber-500") : "bg-slate-200"}`} 
                            style={{ width: hasScore ? `${sub.score}%` : "0%" }} 
                          />
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-500 font-normal">
                          <span>Accuracy: {hasScore ? (sub.accuracy ?? `${sub.score}%`) : "—"}</span>
                          <span className={hasScore ? (sub.score >= 70 ? "text-[#12664F] font-medium" : "text-amber-800 font-medium") : "text-slate-400"}>
                            {hasScore ? (sub.score >= 70 ? "Mastered" : "Revision Advised") : "Not yet attempted"}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="col-span-full rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-5 text-center text-xs text-slate-500 font-normal">
                    Candidate has not selected their 4 UTME subjects yet. They will select them upon their first sign-in.
                  </div>
                )}
              </div>
            </div>

            {/* Diagnostic Strengths & Urgent Remedial Topics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-3.5 print:gap-2 print-avoid-break">
              {/* Weak Topics */}
              <div className="rounded-xl border border-red-200 bg-red-50/40 p-4 print:p-2.5 space-y-2.5 print:space-y-1.5">
                <div className="flex items-center gap-1.5 text-red-900 font-semibold text-xs">
                  <AlertTriangle size={14} className="text-red-600 shrink-0" />
                  <span>Targeted Remedial Priority Topics</span>
                </div>
                {(!data?.weakTopics || data.weakTopics.length === 0) ? (
                  <div className="rounded-xl border border-dashed border-red-200 bg-white/70 p-3.5 text-center text-xs text-red-800 font-normal">
                    Student hasn&apos;t done any activities yet. Weak topics will appear here after their first test.
                  </div>
                ) : (
                  <div className="space-y-2 print:space-y-1">
                    {data.weakTopics.map((item: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between text-[11px] bg-white p-2.5 print:p-1.5 rounded-xl border border-red-200/60">
                        <div>
                          <span className="font-medium text-slate-900 block">{item.topic}</span>
                          <span className="text-[10px] text-slate-500">{item.subject}</span>
                        </div>
                        <span className="text-[10px] font-medium text-red-700 bg-red-100 px-2 py-0.5 rounded-md">
                          {item.errorRate} error
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Strong Topics */}
              <div className="rounded-xl border border-[#12664F]/30 bg-[#EAF4EF]/40 p-4 print:p-2.5 space-y-2.5 print:space-y-1.5">
                <div className="flex items-center gap-1.5 text-[#12664F] font-semibold text-xs">
                  <CheckCheck size={15} className="text-[#12664F] shrink-0" />
                  <span>Demonstrated Strengths</span>
                </div>
                {(!data?.strongTopics || data.strongTopics.length === 0) ? (
                  <div className="rounded-xl border border-dashed border-[#12664F]/30 bg-white/70 p-3.5 text-center text-xs text-[#12664F] font-normal">
                    Student hasn&apos;t done any activities yet. Strengths will appear here after their first test.
                  </div>
                ) : (
                  <div className="space-y-2 print:space-y-1">
                    {data.strongTopics.map((item: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between text-[11px] bg-white p-2.5 print:p-1.5 rounded-xl border border-[#12664F]/20">
                        <div>
                          <span className="font-medium text-slate-900 block">{item.topic}</span>
                          <span className="text-[10px] text-slate-500">{item.subject}</span>
                        </div>
                        <span className="text-[10px] font-medium text-[#12664F] bg-[#EAF4EF] px-2 py-0.5 rounded-md">
                          {item.accuracy}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Mock History */}
            <div className="space-y-2.5 print:space-y-1.5 print-avoid-break">
              <h3 className="font-semibold text-slate-900 text-xs flex items-center gap-2">
                <Calendar size={14} className="text-slate-500" />
                <span>Laboratory Mock Examination History</span>
              </h3>
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-medium">
                      <th className="py-2.5 px-3.5 print:py-1 print:px-2">Date</th>
                      <th className="py-2.5 px-3.5 print:py-1 print:px-2">Examination Session</th>
                      <th className="py-2.5 px-3.5 print:py-1 print:px-2">Score</th>
                      <th className="py-2.5 px-3.5 print:py-1 print:px-2 text-right">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {(!data?.mockHistory || data.mockHistory.length === 0) ? (
                      <tr>
                        <td colSpan={4} className="py-6 print:py-2 text-center text-xs text-slate-400 font-normal">
                          Student hasn&apos;t completed any mock exams yet.
                        </td>
                      </tr>
                    ) : (
                      data.mockHistory.map((h: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50/60 transition">
                          <td className="py-2.5 px-3.5 print:py-1.5 print:px-2 text-slate-500">{h.date}</td>
                          <td className="py-2.5 px-3.5 print:py-1.5 print:px-2 font-medium text-slate-900">{h.examName}</td>
                          <td className="py-2.5 px-3.5 print:py-1.5 print:px-2 font-medium text-[#12664F] tabular-nums">{h.score} / 400</td>
                          <td className="py-2.5 px-3.5 print:py-1.5 print:px-2 text-right text-slate-500">{h.timeSpent}</td>
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
        <div className="flex items-center justify-between pt-4 border-t border-slate-100 print:pt-2 print:mt-2">
          <span className="text-[11px] text-slate-400 font-normal print:text-[10px]">
            JAMBPrep Institutional Diagnostics · Candidate ID: {student.studentIdentifier || student.id} · Official Verification Copy
          </span>
          <div className="flex gap-2.5 print:hidden">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            >
              <Printer size={13} />
              <span>Print Slip</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-[#12664F] px-4 py-2 text-xs font-medium text-white hover:bg-[#0B3028] transition cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
