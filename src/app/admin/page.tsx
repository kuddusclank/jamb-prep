"use client";

import Link from "next/link";
import { useApiResource, ResourceStatus } from "@/lib/api/use-api-resource";
import { AdminNav } from "./admin-nav";

interface SubjectSummary {
  code: string;
  name: string;
  is_compulsory: boolean;
  published_count: number;
  draft_count: number;
  total_count: number;
}

interface AdminOverviewData {
  adminUserId: string;
  metrics: {
    total_students: number;
    total_published_questions: number;
    total_draft_questions: number;
    total_reviewed_questions: number;
    total_archived_questions: number;
    total_completed_attempts: number;
    pending_reports: number;
    total_questions: number;
  };
  subjects: SubjectSummary[];
}

export default function AdminPage() {
  const overview = useApiResource<AdminOverviewData>("/api/v1/admin/overview");

  if (!overview.data) {
    return (
      <div className="min-h-screen bg-slate-50">
        <AdminNav />
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          <ResourceStatus error={overview.error} retry={overview.retry} />
        </main>
      </div>
    );
  }

  const { metrics, subjects = [] } = overview.data;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <AdminNav />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {/* Header & Quick Action Buttons */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Administration Overview
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              CBT Question Bank, syllabus coverage, import tooling, and student report moderation.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/admin/questions/edit/"
              className="inline-flex items-center rounded-xl bg-[#116149] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#0e4e3b]"
            >
              + New Question
            </Link>
            <Link
              href="/admin/import/"
              className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Import CSV
            </Link>
          </div>
        </div>

        {/* Metric Cards Grid */}
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Published Questions
            </p>
            <p className="mt-2 text-3xl font-extrabold text-[#116149]">
              {metrics.total_published_questions.toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Active in mock & practice bank
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Draft / In-Review
            </p>
            <p className="mt-2 text-3xl font-extrabold text-amber-600">
              {((metrics.total_draft_questions || 0) + (metrics.total_reviewed_questions || 0)).toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {metrics.total_draft_questions || 0} drafts · {metrics.total_reviewed_questions || 0} reviewed
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Registered Students
            </p>
            <p className="mt-2 text-3xl font-extrabold text-blue-600">
              {metrics.total_students.toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {metrics.total_completed_attempts.toLocaleString()} completed mocks
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Pending Reports
            </p>
            <div className="mt-2 flex items-baseline gap-2">
              <p
                className={`text-3xl font-extrabold ${
                  (metrics.pending_reports || 0) > 0 ? "text-rose-600" : "text-slate-700"
                }`}
              >
                {metrics.pending_reports || 0}
              </p>
              {(metrics.pending_reports || 0) > 0 && (
                <Link
                  href="/admin/reports/"
                  className="text-xs font-semibold text-rose-600 underline hover:text-rose-700"
                >
                  Review queue →
                </Link>
              )}
            </div>
            <p className="mt-1 text-xs text-slate-400">Student flagged issues</p>
          </div>
        </div>

        {/* Quick Navigation Cards */}
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <Link
            href="/admin/questions/"
            className="group block rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-[#116149] hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold text-slate-900 group-hover:text-[#116149]">
                Question Library
              </span>
              <span className="text-slate-400 group-hover:translate-x-1 transition-transform">
                →
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Browse, filter by subject & topic, search question stems, inspect explanations, edit or duplicate.
            </p>
          </Link>

          <Link
            href="/admin/curriculum/"
            className="group block rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-[#116149] hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold text-slate-900 group-hover:text-[#116149]">
                Curriculum Research
              </span>
              <span className="text-slate-400 group-hover:translate-x-1 transition-transform">
                →
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Inspect official 25-subject JAMB IBASS syllabus research documents, topics breakdown, and coverage.
            </p>
          </Link>

          <Link
            href="/admin/import/"
            className="group block rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-[#116149] hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold text-slate-900 group-hover:text-[#116149]">
                CSV Bulk Import
              </span>
              <span className="text-slate-400 group-hover:translate-x-1 transition-transform">
                →
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Download standard RFC CSV templates, validate multiline passages and LaTeX math, dry-run, and batch import.
            </p>
          </Link>
        </div>

        {/* Subject Coverage & Readiness Table / Grid */}
        <section className="mt-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Subject Bank Coverage & Readiness
              </h2>
              <p className="text-xs text-slate-500">
                Minimum requirements: 60 questions for Use of English; 40 questions per elective.
              </p>
            </div>
            <Link
              href="/admin/curriculum/"
              className="text-xs font-semibold text-[#116149] underline"
            >
              View full curriculum →
            </Link>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {subjects.map((sub) => {
              const reqMin = sub.is_compulsory ? 60 : 40;
              const isReady = sub.published_count >= reqMin;

              return (
                <div
                  key={sub.code}
                  className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-xs"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-600">
                          {sub.code}
                        </span>
                        {sub.is_compulsory && (
                          <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800">
                            Compulsory
                          </span>
                        )}
                      </div>
                      <h3 className="mt-1 font-semibold text-slate-900">
                        {sub.name}
                      </h3>
                    </div>

                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        isReady
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}
                    >
                      {isReady ? "Ready" : `${sub.published_count}/${reqMin}`}
                    </span>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                    <span className="text-slate-500">
                      <strong>{sub.published_count}</strong> published ·{" "}
                      <strong>{sub.draft_count}</strong> draft
                    </span>
                    <Link
                      href={`/admin/questions/?subject=${sub.code}`}
                      className="font-medium text-[#116149] hover:underline"
                    >
                      Browse →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
