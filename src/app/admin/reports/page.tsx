"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useApiResource, ResourceStatus } from "@/lib/api/use-api-resource";
import { getAccountCoordinator } from "@/lib/auth/account-coordinator";
import { MathRenderer } from "@/components/math-renderer";

interface ReportItem {
  id: string;
  questionId: string;
  reason: string;
  comment: string | null;
  status: "open" | "investigating" | "resolved" | "dismissed";
  adminNotes: string | null;
  createdAt: string;
  stem: string;
  subjectCode: string;
  subjectName: string;
  topicTitle: string;
  reporterEmail: string;
  reporterDisplayName: string;
}

interface ReportsResponse {
  reports: ReportItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

const REASON_LABELS: Record<string, string> = {
  wrong_key: "Wrong Answer Key",
  ambiguous_wording: "Ambiguous Wording",
  multiple_or_no_correct: "Multiple / No Correct Options",
  faulty_explanation: "Faulty Explanation",
  bad_media: "Bad Media / Broken Diagram",
  wrong_topic: "Misclassified Topic",
  duplication: "Duplicate Question",
  other: "Other Issue",
};

function ReportsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentStatus = searchParams.get("status") || "";
  const currentSubject = searchParams.get("subject") || "";
  const currentPage = parseInt(searchParams.get("page") || "1", 10) || 1;

  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});
  const [updating, setUpdating] = useState<Record<string, boolean>>({});

  const queryParts = [
    `page=${currentPage}`,
    `limit=20`,
    currentStatus ? `status=${encodeURIComponent(currentStatus)}` : "",
    currentSubject ? `subject=${encodeURIComponent(currentSubject)}` : "",
  ].filter(Boolean);

  const reportsRes = useApiResource<ReportsResponse>(
    `/api/v1/admin/reports?${queryParts.join("&")}`
  );

  function updateQuery(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, val] of Object.entries(updates)) {
      if (val === null || val === "") {
        params.delete(key);
      } else {
        params.set(key, val);
      }
    }
    if (!("page" in updates)) {
      params.delete("page");
    }
    router.push(`/admin/reports/?${params.toString()}`);
  }

  async function handleUpdateReport(
    reportId: string,
    nextStatus: ReportItem["status"],
    adminNotes?: string
  ) {
    setUpdating((prev) => ({ ...prev, [reportId]: true }));
    try {
      await getAccountCoordinator().mutate(
        `/api/v1/admin/reports/${reportId}`,
        {
          status: nextStatus,
          adminNotes: adminNotes ?? notesDraft[reportId] ?? null,
        },
        "PATCH"
      );
      reportsRes.retry();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update report.");
    } finally {
      setUpdating((prev) => ({ ...prev, [reportId]: false }));
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">


      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Student Question Reports Queue
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Review, investigate, resolve, or dismiss questions flagged by students during CBT practice and exams.
            </p>
          </div>
        </div>

        {/* Filter bar */}
        <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold uppercase text-slate-500 mr-1">
              Status:
            </span>
            {["", "open", "investigating", "resolved", "dismissed"].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => updateQuery({ status: st || null })}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition ${
                  currentStatus === st
                    ? "bg-[#116149] text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {st || "All"}
              </button>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <input
              type="text"
              placeholder="Filter by subject code (e.g. ENG)..."
              defaultValue={currentSubject}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  updateQuery({ subject: (e.target as HTMLInputElement).value.trim().toUpperCase() || null });
                }
              }}
              className="w-48 rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-slate-800 focus:border-[#116149] focus:outline-hidden"
            />
            {currentSubject && (
              <button
                type="button"
                onClick={() => updateQuery({ subject: null })}
                className="text-xs text-slate-500 hover:underline"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Reports list */}
        {!reportsRes.data ? (
          <div className="mt-6">
            <ResourceStatus error={reportsRes.error} retry={reportsRes.retry} />
          </div>
        ) : (
          <div className="mt-6">
            <div className="flex items-center justify-between pb-3 text-xs text-slate-500">
              <p>
                Showing <strong>{reportsRes.data.reports.length}</strong> of{" "}
                <strong>{reportsRes.data.pagination.total}</strong> reports
              </p>

              <div className="flex items-center gap-1">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => updateQuery({ page: String(currentPage - 1) })}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="px-2">
                  Page {currentPage} of {reportsRes.data.pagination.totalPages || 1}
                </span>
                <button
                  disabled={currentPage >= reportsRes.data.pagination.totalPages}
                  onClick={() => updateQuery({ page: String(currentPage + 1) })}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>

            {reportsRes.data.reports.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
                <p className="text-base font-semibold text-slate-700">No reports in this queue</p>
                <p className="mt-1 text-xs text-slate-400">
                  All student-reported issues have been moderated or filtered out.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {reportsRes.data.reports.map((rep) => {
                  const isBusy = updating[rep.id] ?? false;

                  return (
                    <div
                      key={rep.id}
                      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs"
                    >
                      {/* Top meta row */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                              rep.status === "open"
                                ? "bg-rose-100 text-rose-800"
                                : rep.status === "investigating"
                                ? "bg-amber-100 text-amber-800"
                                : rep.status === "resolved"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {rep.status.toUpperCase()}
                          </span>

                          <span className="rounded-md bg-rose-50 border border-rose-200 px-2 py-0.5 text-xs font-semibold text-rose-800">
                            {REASON_LABELS[rep.reason] || rep.reason}
                          </span>

                          <span className="font-mono text-xs font-bold text-[#116149]">
                            {rep.subjectCode} · {rep.topicTitle}
                          </span>
                        </div>

                        <div className="text-xs text-slate-400">
                          Reported by {rep.reporterEmail} ({new Date(rep.createdAt).toLocaleDateString()})
                        </div>
                      </div>

                      {/* Question Stem preview */}
                      <div className="mt-3 text-sm text-slate-900 leading-relaxed">
                        <span className="font-semibold text-xs text-slate-400 uppercase tracking-wider block">
                          Question Stem:
                        </span>
                        <div className="mt-1">
                          <MathRenderer content={rep.stem} />
                        </div>
                      </div>

                      {/* Student comment if given */}
                      {rep.comment && (
                        <div className="mt-3 rounded-xl bg-amber-50/70 border border-amber-200 p-3 text-xs text-amber-900 leading-relaxed">
                          <strong>Student Note:</strong> {rep.comment}
                        </div>
                      )}

                      {/* Admin Notes & Actions */}
                      <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex-1 max-w-lg">
                          <input
                            type="text"
                            placeholder="Add admin resolution notes (e.g. Fixed option C stem)..."
                            defaultValue={rep.adminNotes || ""}
                            onChange={(e) =>
                              setNotesDraft((prev) => ({
                                ...prev,
                                [rep.id]: e.target.value,
                              }))
                            }
                            className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-[#116149] focus:outline-hidden"
                          />
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/admin/questions/edit/?questionId=${rep.questionId}`}
                            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            Edit Question ↗
                          </Link>

                          {rep.status !== "investigating" && (
                            <button
                              disabled={isBusy}
                              onClick={() => void handleUpdateReport(rep.id, "investigating")}
                              className="rounded-xl bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-200 disabled:opacity-50"
                            >
                              Investigate
                            </button>
                          )}

                          {rep.status !== "resolved" && (
                            <button
                              disabled={isBusy}
                              onClick={() => void handleUpdateReport(rep.id, "resolved")}
                              className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                            >
                              Resolve
                            </button>
                          )}

                          {rep.status !== "dismissed" && (
                            <button
                              disabled={isBusy}
                              onClick={() => void handleUpdateReport(rep.id, "dismissed")}
                              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 disabled:opacity-50"
                            >
                              Dismiss
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50">

          <div className="mx-auto max-w-7xl p-8 text-center text-sm text-slate-500">
            Loading Reports Queue…
          </div>
        </div>
      }
    >
      <ReportsContent />
    </Suspense>
  );
}
