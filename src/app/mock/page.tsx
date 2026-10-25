"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { StudyWorkspace } from "@/components/study-workspace";
import {
  AlertTriangle,
  Award,
  CheckCircle2,
  Clock,
  Keyboard,
  ShieldAlert,
  WifiOff,
  ArrowRight,
  Building2,
  Loader2,
} from "lucide-react";
import { MockStartButton } from "./mock-start-button";
import { useNetworkStatus, isNetworkOrTimeoutError } from "@/lib/offline/network-state";
import Link from "@/components/pending-link";
import { useApiResource, ResourceStatus } from "@/lib/api/use-api-resource";
import { createClient } from "@/lib/supabase/client";

function SchoolLabSessionEntry({
  onVerifiedSessionChange,
}: {
  onVerifiedSessionChange?: (session: any | null) => void;
}) {
  const [labCode, setLabCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifiedSession, setVerifiedSession] = useState<any | null>(null);
  const [labError, setLabError] = useState<string | null>(null);

  const handleJoinLabSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setLabError(null);
    const cleanCode = labCode.trim().toUpperCase();
    if (!cleanCode) {
      setLabError("Enter the LAB-SCH-XXXX session code from your computer lab whiteboard.");
      return;
    }

    setIsVerifying(true);
    try {
      const apiBase =
        process.env.NEXT_PUBLIC_API_BASE_URL ||
        "https://jambprep-api-foundation.abdulquddus-akanbi.workers.dev";
      const supabase = createClient();
      const sessionRes = await supabase.auth.getSession();
      const token = sessionRes?.data?.session?.access_token;

      const res = await fetch(`${apiBase}/api/v1/schools/mocks/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ labSessionCode: cleanCode }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.valid) {
        const msg =
          (typeof data?.error === "string" && data.error) ||
          data?.error?.message ||
          data?.message ||
          "Lab session code was not found. Please check the code on the whiteboard.";
        throw new Error(msg);
      }

      setVerifiedSession(data.session);
      onVerifiedSessionChange?.(data.session);
    } catch (err: unknown) {
      setLabError(err instanceof Error ? err.message : "Could not verify lab session code.");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="mt-7 rounded-2xl border border-emerald-950/15 bg-[#F6F8F5] p-4 sm:p-5 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Building2 size={16} className="text-[#116149] shrink-0" />
          <span className="text-xs font-bold uppercase tracking-wider text-[#092E28]">
            School CBT Lab Session Code (Optional)
          </span>
        </div>
        {verifiedSession && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-[#116149]">
            <CheckCircle2 size={12} /> Synchronized: {verifiedSession.labSessionCode}
          </span>
        )}
      </div>

      {verifiedSession ? (
        <div className="rounded-xl border border-emerald-200 bg-white p-3.5 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <strong className="text-[#092E28] block">{verifiedSession.title || "Proctored School Lab Mock"}</strong>
            <span className="text-slate-600">
              {verifiedSession.schoolName ? `${verifiedSession.schoolName} · ` : ""}
              120-minute synchronized session verified. Click &ldquo;Start Official Mock&rdquo; below when instructed by your invigilator.
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setVerifiedSession(null);
              setLabCode("");
              onVerifiedSessionChange?.(null);
            }}
            className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 underline shrink-0 cursor-pointer"
          >
            Change Code
          </button>
        </div>
      ) : (
        <form onSubmit={handleJoinLabSession} className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={labCode}
            onChange={(e) => setLabCode(e.target.value.toUpperCase())}
            placeholder="Enter whiteboard code (e.g. LAB-SCH-4F9A)"
            className="flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-mono uppercase text-[#092E28] placeholder:font-sans placeholder:normal-case placeholder:text-slate-400 focus:border-[#116149] focus:outline-hidden focus:ring-1 focus:ring-[#116149]"
          />
          <button
            type="submit"
            disabled={isVerifying || !labCode.trim()}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#092E28] px-4 py-2 text-xs font-bold text-white hover:bg-[#116149] transition cursor-pointer disabled:opacity-50"
          >
            {isVerifying ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                <span>Verifying...</span>
              </>
            ) : (
              <span>Verify Lab Code</span>
            )}
          </button>
        </form>
      )}

      {labError && (
        <p className="text-xs text-red-700 font-medium flex items-center gap-1.5">
          <AlertTriangle size={13} className="shrink-0" />
          <span>{labError}</span>
        </p>
      )}
    </div>
  );
}
interface MockReadiness {
  ready: boolean;
  isPremium: boolean;
  activeAttemptId: string | null;
  message: string;
  subjects: {
    code: string;
    name: string;
    isCompulsory: boolean;
    required: number;
    available: number;
    ready: boolean;
    message: string;
  }[];
  schoolMock?: {
    id: string;
    title: string;
    schoolName: string;
    schoolCode: string;
    scheduledStart: string;
    durationMinutes: number;
    windowStatus: 'scheduled' | 'open' | 'expired';
    hasCompleted: boolean;
    activeAttemptId: string | null;
    previousResult: {
      totalScore: number;
      englishScore: number;
      subject2Score: number;
      subject3Score: number;
      subject4Score: number;
      completedAt: string;
    } | null;
  } | null;
}

function MockRedirectNotice() {
  const searchParams = useSearchParams();
  const errorCode = searchParams.get("error");
  if (!errorCode) {
    return null;
  }

  const message =
    errorCode === "missing" || errorCode === "missing_attempt"
      ? "No mock exam attempt ID was specified in that link. Start or resume a mock session below."
      : "The exam or result link contained an invalid attempt identifier. Please start or resume a valid mock session below.";

  return (
    <div
      role="alert"
      className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900 flex items-start gap-2.5"
    >
      <AlertTriangle size={16} className="shrink-0 mt-0.5 text-amber-700" />
      <span>{message}</span>
    </div>
  );
}

export default function MockLobbyPage() {
  const resource = useApiResource<MockReadiness>("/api/v1/mock/readiness");
  const { isOffline, isOnline } = useNetworkStatus();
  const [verifiedLabSession, setVerifiedLabSession] = useState<any | null>(null);

  const isNetworkFailure = resource.error ? isNetworkOrTimeoutError(resource.error) : false;

  if (isOffline || (isNetworkFailure && !resource.data)) {
    return (
      <StudyWorkspace>
        <main className="shell section-space">
          <div className="max-w-2xl mx-auto rounded-3xl border border-slate-200 bg-white p-6 sm:p-10 shadow-sm text-center space-y-6">
            <div className="flex flex-col items-center gap-3">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-700 border border-amber-200">
                <WifiOff size={26} />
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase bg-amber-100 text-amber-900">
                <Clock size={12} className="text-amber-700" />
                Connection Needed for Official Mock
              </span>
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-[#092E28]">
                UTME Mock Requires Server Connection
              </h1>
              <p className="text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
                Full-length 4-subject CBT simulations require a secure server connection to authenticate test conditions and store official scores.
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 text-xs text-emerald-950 flex items-center justify-between gap-3 text-left">
              <div>
                <strong className="block font-semibold">Weekly Offline Practice is Ready</strong>
                <span className="text-slate-600">You can practice your 250 offline questions right now without waiting.</span>
              </div>
              <Link
                href="/practice"
                className="shrink-0 inline-flex items-center gap-1 px-4 py-2 rounded-full bg-[#116149] text-white text-xs font-bold hover:bg-[#0e523e] transition"
              >
                Go to Practice <ArrowRight size={13} />
              </Link>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link
                href="/dashboard"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
              >
                Return to Dashboard
              </Link>
              <button
                type="button"
                onClick={() => resource.retry()}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition cursor-pointer"
              >
                Retry Connection
              </button>
            </div>
          </div>
        </main>
      </StudyWorkspace>
    );
  }

  if (!resource.data) return <StudyWorkspace><ResourceStatus error={resource.error} retry={resource.retry}/></StudyWorkspace>;
  const enrolledSubjects = resource.data.subjects;
  const schoolMock = resource.data.schoolMock;

  // 1. DEDICATED INSTITUTIONAL SCHOOL MOCK VIEW (Zero code entry, automatic binding)
  if (schoolMock) {
    return (
      <StudyWorkspace>
        <main className="shell section-space">
          <div className="max-w-3xl mx-auto space-y-6">
            <Suspense fallback={null}>
              <MockRedirectNotice />
            </Suspense>

            <div className="rounded-3xl border border-emerald-950/15 bg-white p-6 sm:p-10 shadow-sm space-y-7">
              {/* Institutional Header & Badges */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-5">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-[#116149] border border-emerald-200">
                    <Building2 size={20} />
                  </div>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-[#116149] block">
                      {schoolMock.schoolName}
                    </span>
                    <strong className="text-lg sm:text-xl text-[#092E28] block">
                      {schoolMock.title}
                    </strong>
                  </div>
                </div>

                {schoolMock.hasCompleted ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-[#116149] text-xs font-bold">
                    <CheckCircle2 size={13} /> Exam Completed & Graded
                  </span>
                ) : schoolMock.windowStatus === "open" ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-[#116149] text-xs font-bold animate-pulse">
                    <span className="size-2 rounded-full bg-[#116149]" /> Lab Window Open
                  </span>
                ) : schoolMock.windowStatus === "scheduled" ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold">
                    <Clock size={13} /> Scheduled Lab Hour
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">
                    <Clock size={13} /> Lab Window Closed
                  </span>
                )}
              </div>

              {/* State A: Student has already completed this school mock */}
              {schoolMock.hasCompleted && schoolMock.previousResult ? (
                <div className="space-y-6">
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-6 text-center space-y-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#116149] block">
                      Official Mock Score
                    </span>
                    <strong className="text-4xl sm:text-5xl font-black text-[#092E28] block">
                      {schoolMock.previousResult.totalScore}
                      <span className="text-xl text-slate-500 font-medium"> / 400</span>
                    </strong>
                    <p className="text-xs text-slate-600 max-w-md mx-auto">
                      Your examination score has been synchronized to your school dashboard. Only your school administrator has access to class rankings.
                    </p>
                  </div>

                  {/* 4-Subject Score Breakdown */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Subject Score Breakdown
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                        <span className="text-[11px] font-bold text-slate-500 uppercase block">English</span>
                        <strong className="text-lg text-[#092E28] block mt-1">
                          {schoolMock.previousResult.englishScore}
                        </strong>
                        <span className="text-[10px] text-slate-400">/ 100</span>
                      </div>
                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                        <span className="text-[11px] font-bold text-slate-500 uppercase block">Subject 2</span>
                        <strong className="text-lg text-[#092E28] block mt-1">
                          {schoolMock.previousResult.subject2Score}
                        </strong>
                        <span className="text-[10px] text-slate-400">/ 100</span>
                      </div>
                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                        <span className="text-[11px] font-bold text-slate-500 uppercase block">Subject 3</span>
                        <strong className="text-lg text-[#092E28] block mt-1">
                          {schoolMock.previousResult.subject3Score}
                        </strong>
                        <span className="text-[10px] text-slate-400">/ 100</span>
                      </div>
                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                        <span className="text-[11px] font-bold text-slate-500 uppercase block">Subject 4</span>
                        <strong className="text-lg text-[#092E28] block mt-1">
                          {schoolMock.previousResult.subject4Score}
                        </strong>
                        <span className="text-[10px] text-slate-400">/ 100</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* State B: Mock is not completed yet */
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-[#092E28]">
                      Laboratory Examination Instructions
                    </h2>
                    <p className="mt-1 text-xs sm:text-sm text-slate-600 leading-relaxed">
                      You are taking the official timed mock examination for <strong>{schoolMock.schoolName}</strong>. 
                      Standard UTME examination blueprints apply across your 4 registered subjects. No session code is required.
                    </p>
                  </div>

                  {/* Registered Subjects */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                      Your Examination Subjects (180 Questions Total)
                    </span>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {enrolledSubjects.map((sub) => (
                        <div
                          key={sub.code}
                          className="flex items-center justify-between p-3 rounded-xl bg-[#F6F8F5] border border-slate-200/80 text-xs"
                        >
                          <span className="font-semibold text-[#092E28]">{sub.name}</span>
                          <span className="font-mono font-bold text-[#116149]">
                            {sub.code === "ENG" ? "60 Qs" : "40 Qs"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Exam Conditions Callout */}
                  <div className="grid gap-3 sm:grid-cols-3 p-4 rounded-2xl bg-[#EDF2E9]/70 border border-emerald-950/10 text-xs">
                    <div className="flex items-start gap-2.5">
                      <Clock size={16} className="text-[#116149] shrink-0 mt-0.5" />
                      <div>
                        <strong className="block font-bold text-[#092E28]">120 Minutes</strong>
                        <span className="text-slate-600 text-[11px]">Strict countdown</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <Keyboard size={16} className="text-[#116149] shrink-0 mt-0.5" />
                      <div>
                        <strong className="block font-bold text-[#092E28]">8-Key Mode</strong>
                        <span className="text-slate-600 text-[11px]">A, B, C, D, P, N, S, R</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <Award size={16} className="text-[#116149] shrink-0 mt-0.5" />
                      <div>
                        <strong className="block font-bold text-[#092E28]">400-Point Scale</strong>
                        <span className="text-slate-600 text-[11px]">Direct school sync</span>
                      </div>
                    </div>
                  </div>

                  {/* Window Status Banner */}
                  {schoolMock.windowStatus === "scheduled" && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 flex items-start gap-2.5">
                      <Clock size={16} className="shrink-0 mt-0.5 text-amber-700" />
                      <div>
                        <strong className="block font-semibold">Awaiting Scheduled Start Time</strong>
                        <span>
                          This lab session is scheduled to open at{" "}
                          <strong>
                            {new Date(schoolMock.scheduledStart).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </strong>
                          . Your invigilator will instruct the lab when to click start.
                        </span>
                      </div>
                    </div>
                  )}

                  {schoolMock.windowStatus === "expired" && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-900 flex items-start gap-2.5">
                      <AlertTriangle size={16} className="shrink-0 mt-0.5 text-red-700" />
                      <div>
                        <strong className="block font-semibold">Laboratory Window Closed</strong>
                        <span>
                          The designated examination window for this mock has concluded. Please contact your school administrator.
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Launch CTA */}
                  <div className="pt-2 border-t border-slate-100">
                    <MockStartButton
                      canStart={resource.data.ready && schoolMock.windowStatus === "open"}
                      activeAttemptId={schoolMock.activeAttemptId || resource.data.activeAttemptId}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </StudyWorkspace>
    );
  }

  // 2. STANDARD INDIVIDUAL CANDIDATE MOCK VIEW (Fallback for independent students)
  return (
    <StudyWorkspace>
      <main className="shell section-space">
        <div className="max-w-3xl mx-auto">
          <Suspense fallback={null}>
            <MockRedirectNotice />
          </Suspense>

          <div className="rounded-3xl border border-emerald-950/10 bg-white p-6 sm:p-10 shadow-sm">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold uppercase tracking-wider">
              <Clock size={13} /> Your CBT mock briefing
            </span>

            <h1 className="mt-4 text-2xl sm:text-4xl font-semibold tracking-tight text-[#092E28]">
              Full 4-Subject <span className="serif-accent text-[#116149]">UTME Simulation</span>
            </h1>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Practise with a timed four-subject UTME simulation, keyboard navigation and a 400-point grading scale. JAMBPrep is independent of JAMB.
            </p>

            {/* Subject Breakdown Grid */}
            <div className="mt-7">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                Your Registered Examination Subjects
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {enrolledSubjects.map((sub) => (
                  <div
                    key={sub.code}
                    className="flex items-center justify-between p-4 rounded-2xl bg-[#F6F8F5] border border-slate-200/80"
                  >
                    <div>
                      <span className="font-semibold text-sm text-[#092E28] block">
                        {sub.name}
                      </span>
                      <span className="text-xs text-slate-500">
                        {sub.code === "ENG" ? "60 Questions (Compulsory)" : "40 Questions (Elective)"}
                      </span>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-950/5 font-mono text-xs font-bold text-[#116149]">
                      {sub.code}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Examination Rules & Specifications */}
            <div className="mt-7 grid gap-4 sm:grid-cols-3 p-5 rounded-2xl bg-[#EDF2E9]/70 border border-emerald-950/10">
              <div className="flex items-start gap-3">
                <Clock size={18} className="text-[#116149] shrink-0 mt-0.5" />
                <div>
                  <strong className="text-xs font-bold uppercase tracking-wider block text-[#092E28]">
                    Duration
                  </strong>
                  <span className="text-xs text-slate-600">
                    120 Minutes (2 Hours) strict server-enforced countdown
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Keyboard size={18} className="text-[#116149] shrink-0 mt-0.5" />
                <div>
                  <strong className="text-xs font-bold uppercase tracking-wider block text-[#092E28]">
                    8-Key CBT Controls
                  </strong>
                  <span className="text-xs text-slate-600">
                    Keys A, B, C, D, P (Prev), N (Next), R (Reverse), S (Submit)
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Award size={18} className="text-[#116149] shrink-0 mt-0.5" />
                <div>
                  <strong className="text-xs font-bold uppercase tracking-wider block text-[#092E28]">
                    400-Point Scale
                  </strong>
                  <span className="text-xs text-slate-600">
                    Each subject is scaled to 100 marks for a total of 400
                  </span>
                </div>
              </div>
            </div>

            {/* Important Candidate Instructions */}
            <div className="mt-7 space-y-2.5 text-xs text-slate-600 bg-slate-50 p-5 rounded-2xl border border-slate-200/70">
              <div className="flex items-center gap-2 font-semibold text-slate-800 text-sm mb-1">
                <ShieldAlert size={16} className="text-amber-600" />
                <span>Candidate Instructions</span>
              </div>
              <p className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-[#116149] shrink-0" />
                <span>Your answers are automatically saved to your device and synced in the background.</span>
              </p>
              <p className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-[#116149] shrink-0" />
                <span>If your network drops briefly, keep answering—your outbox will sync once reconnected.</span>
              </p>
              <p className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-[#116149] shrink-0" />
                <span>When the 2-hour timer expires, your examination will be submitted and graded automatically.</span>
              </p>
            </div>

            {!resource.data.ready&&!resource.data.activeAttemptId&&<div role="status" className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950"><p className="font-semibold">{resource.data.message}</p><ul className="mt-3 space-y-2">{resource.data.subjects.filter(s=>!s.ready).map(s=><li key={s.code}>{s.message}</li>)}</ul><a href="/practice/" className="mt-4 inline-block font-semibold underline">Practise a topic instead</a></div>}

            {/* Launch CTA */}
            <div className="mt-8 space-y-6 border-t border-slate-100 pt-6">
              <div className="text-xs text-slate-500">
                Ready? Ensure you have 2 uninterrupted hours before starting.
              </div>
              <MockStartButton
                canStart={resource.data.ready}
                activeAttemptId={resource.data.activeAttemptId}
              />
            </div>
          </div>
        </div>
      </main>
    </StudyWorkspace>
  );
}
