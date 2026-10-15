"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { StudyWorkspace } from "@/components/study-workspace";
import {
  AlertTriangle,
  Award,
  CheckCircle2,
  Clock,
  Keyboard,
  ShieldAlert,
} from "lucide-react";
import { MockStartButton } from "./mock-start-button";

import { useApiResource, ResourceStatus } from "@/lib/api/use-api-resource";
interface MockReadiness {ready:boolean;isPremium:boolean;activeAttemptId:string|null;message:string;subjects:{code:string;name:string;isCompulsory:boolean;required:number;available:number;ready:boolean;message:string}[];}

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
  const resource=useApiResource<MockReadiness>("/api/v1/mock/readiness");
  if(!resource.data) return <StudyWorkspace><ResourceStatus error={resource.error} retry={resource.retry}/></StudyWorkspace>;
  const enrolledSubjects=resource.data.subjects;
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
              <MockStartButton canStart={resource.data.ready} activeAttemptId={resource.data.activeAttemptId} />
            </div>
          </div>
        </div>
      </main>
    </StudyWorkspace>
  );
}
