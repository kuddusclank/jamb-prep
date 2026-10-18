"use client";

import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useApiResource, ResourceStatus } from "@/lib/api/use-api-resource";
import { getAccountCoordinator } from "@/lib/auth/account-coordinator";
import { MathRenderer } from "@/components/math-renderer";
import { isArabicText } from "@/lib/utils";

interface QuestionOption {
  id: string;
  label: string;
  content: string;
  is_correct: boolean;
}

interface QuestionItem {
  id: string;
  subject_code: string;
  subject_name: string;
  topic_id: string;
  topic_title: string;
  stem: string;
  image_url: string | null;
  difficulty: "easy" | "medium" | "hard";
  status: "draft" | "reviewed" | "published" | "archived";
  exam_year: number | null;
  created_at: string;
  options: QuestionOption[];
  explanation: string | null;
}

interface QuestionsResponse {
  questions: QuestionItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface SubjectsResponse {
  activeSubjects: Array<{
    id: string;
    code: string;
    name: string;
    topics: Array<{ id: string; title: string; slug: string }>;
  }>;
}

function QuestionsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentSubject = searchParams.get("subject") || "";
  const currentTopic = searchParams.get("topic") || "";
  const currentStatus = searchParams.get("status") || "";
  const currentDifficulty = searchParams.get("difficulty") || "";
  const currentYear = searchParams.get("year") || "";
  const currentSearch = searchParams.get("search") || "";
  const currentPage = parseInt(searchParams.get("page") || "1", 10) || 1;

  const [expandedExplanations, setExpandedExplanations] = useState<Record<string, boolean>>({});
  const [actionError, setActionError] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState<Record<string, boolean>>({});

  // Build query string
  const queryParts = [
    `page=${currentPage}`,
    `limit=20`,
    currentSubject ? `subject=${encodeURIComponent(currentSubject)}` : "",
    currentTopic ? `topic=${encodeURIComponent(currentTopic)}` : "",
    currentStatus ? `status=${encodeURIComponent(currentStatus)}` : "",
    currentDifficulty ? `difficulty=${encodeURIComponent(currentDifficulty)}` : "",
    currentYear ? `year=${encodeURIComponent(currentYear)}` : "",
    currentSearch ? `search=${encodeURIComponent(currentSearch)}` : "",
  ].filter(Boolean);

  const queryPath = `/api/v1/admin/questions?${queryParts.join("&")}`;
  const questionsRes = useApiResource<QuestionsResponse>(queryPath);
  const curriculumRes = useApiResource<SubjectsResponse>("/api/v1/admin/curriculum");

  function updateQuery(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, val] of Object.entries(updates)) {
      if (val === null || val === "") {
        params.delete(key);
      } else {
        params.set(key, val);
      }
    }
    // Reset to page 1 on filter changes unless page is explicitly updated
    if (!("page" in updates)) {
      params.delete("page");
    }
    router.push(`/admin/questions/?${params.toString()}`);
  }

  async function handleStatusChange(questionId: string, nextStatus: QuestionItem["status"]) {
    setActionError(null);
    setStatusUpdating((prev) => ({ ...prev, [questionId]: true }));
    try {
      await getAccountCoordinator().mutate(
        `/api/v1/admin/questions/${questionId}/status`,
        { status: nextStatus },
        "PATCH"
      );
      questionsRes.retry();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to update question status.");
    } finally {
      setStatusUpdating((prev) => ({ ...prev, [questionId]: false }));
    }
  }

  const subjects = curriculumRes.data?.activeSubjects || [];
  const selectedSubjectObj = subjects.find((s) => s.code === currentSubject);
  const topicsForSubject = selectedSubjectObj?.topics || [];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">


      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {actionError && <p role="alert" className="mb-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{actionError}</p>}
        {/* Title bar */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Question Library
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Browse, search, edit and manage CBT questions across all subjects and topics.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/questions/edit/"
              className="inline-flex items-center rounded-xl bg-[#116149] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#0e4e3b]"
            >
              + Create Question
            </Link>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {/* Subject selector */}
            <div>
              <label htmlFor="filter-subject" className="block text-xs font-semibold uppercase text-slate-500">
                Subject
              </label>
              <select
                id="filter-subject"
                value={currentSubject}
                onChange={(e) => updateQuery({ subject: e.target.value || null, topic: null })}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
              >
                <option value="">All Subjects</option>
                {subjects.map((sub) => (
                  <option key={sub.code} value={sub.code}>
                    {sub.code} — {sub.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Topic selector (if subject chosen) */}
            <div>
              <label htmlFor="filter-topic" className="block text-xs font-semibold uppercase text-slate-500">
                Topic
              </label>
              <select
                id="filter-topic"
                disabled={!currentSubject || topicsForSubject.length === 0}
                value={currentTopic}
                onChange={(e) => updateQuery({ topic: e.target.value || null })}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 disabled:opacity-50"
              >
                <option value="">All Topics</option>
                {topicsForSubject.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Status selector */}
            <div>
              <label htmlFor="filter-status" className="block text-xs font-semibold uppercase text-slate-500">
                Status
              </label>
              <select
                id="filter-status"
                value={currentStatus}
                onChange={(e) => updateQuery({ status: e.target.value || null })}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
              >
                <option value="">All Statuses</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="reviewed">Reviewed</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            {/* Difficulty selector */}
            <div>
              <label htmlFor="filter-difficulty" className="block text-xs font-semibold uppercase text-slate-500">
                Difficulty
              </label>
              <select
                id="filter-difficulty"
                value={currentDifficulty}
                onChange={(e) => updateQuery({ difficulty: e.target.value || null })}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
              >
                <option value="">All Difficulties</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>

          {/* Search bar & year filter */}
          <div className="mt-3 flex flex-col gap-3 pt-3 border-t border-slate-100 sm:flex-row sm:items-center">
            <div className="flex-1">
              <input
                type="text"
                aria-label="Search questions; press Enter to apply"
                key={`search-${currentSearch}`}
                placeholder="Search questions — press Enter"
                defaultValue={currentSearch}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    updateQuery({ search: (e.target as HTMLInputElement).value.trim() || null });
                  }
                }}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-[#116149] focus:outline-hidden"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="number"
                aria-label="Filter by examination year"
                key={`year-${currentYear}`}
                placeholder="Year (e.g. 2024)"
                defaultValue={currentYear}
                onBlur={(e) => { if (e.target.value !== currentYear) updateQuery({ year: e.target.value || null }); }}
                className="w-28 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-[#116149] focus:outline-hidden"
              />

              {(currentSubject || currentTopic || currentStatus || currentDifficulty || currentYear || currentSearch) && (
                <button
                  type="button"
                  onClick={() => router.push("/admin/questions/")}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Content & List */}
        {!questionsRes.data ? (
          <div className="mt-6">
            <ResourceStatus error={questionsRes.error} retry={questionsRes.retry} />
          </div>
        ) : (
          <div className="mt-6">
            {/* Pagination stats header */}
            <div className="flex items-center justify-between pb-3 text-xs text-slate-500">
              <p>
                Showing{" "}
                <strong>
                  {questionsRes.data.pagination.total === 0
                    ? 0
                    : (currentPage - 1) * questionsRes.data.pagination.limit + 1}
                  –
                  {Math.min(
                    currentPage * questionsRes.data.pagination.limit,
                    questionsRes.data.pagination.total
                  )}
                </strong>{" "}
                of <strong>{questionsRes.data.pagination.total}</strong> questions
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
                  Page {currentPage} of {questionsRes.data.pagination.totalPages || 1}
                </span>
                <button
                  disabled={currentPage >= questionsRes.data.pagination.totalPages}
                  onClick={() => updateQuery({ page: String(currentPage + 1) })}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>

            {/* Questions Empty State */}
            {questionsRes.data.questions.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
                <p className="text-base font-semibold text-slate-700">No questions found</p>
                <p className="mt-1 text-sm text-slate-400">
                  Try clearing your filters or create a new question for this subject.
                </p>
                <Link
                  href="/admin/questions/edit/"
                  className="mt-4 inline-flex items-center rounded-xl bg-[#116149] px-4 py-2 text-sm font-semibold text-white"
                >
                  Create New Question
                </Link>
              </div>
            ) : (
              /* Questions Cards */
              <div className="space-y-4">
                {questionsRes.data.questions.map((q) => {
                  const isExpOpen = expandedExplanations[q.id] ?? false;
                  const isUpdating = statusUpdating[q.id] ?? false;

                  return (
                    <article
                      key={q.id}
                      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-slate-300"
                    >
                      {/* Meta badges top bar */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-mono font-bold text-[#116149] bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                            {q.subject_code}
                          </span>
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-slate-700">
                            {q.topic_title}
                          </span>
                          <span
                            className={`rounded-md px-2 py-0.5 font-medium ${
                              q.difficulty === "easy"
                                ? "bg-emerald-50 text-emerald-700"
                                : q.difficulty === "hard"
                                ? "bg-rose-50 text-rose-700"
                                : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {q.difficulty}
                          </span>
                          {q.exam_year && (
                            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-slate-600">
                              {q.exam_year}
                            </span>
                          )}
                        </div>

                        {/* Status badge */}
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              q.status === "published"
                                ? "bg-emerald-100 text-emerald-800"
                                : q.status === "draft"
                                ? "bg-amber-100 text-amber-800"
                                : q.status === "reviewed"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {q.status}
                          </span>
                          <span className="font-mono text-[10px] text-slate-400">
                            {q.id.slice(0, 8)}
                          </span>
                        </div>
                      </div>

                      {/* Stem Text */}
                      {(() => {
                        const isQArabic =
                          q.subject_code === 'ARB' ||
                          isArabicText(q.stem) ||
                          q.options.some((o) => isArabicText(o.content));

                        return (
                          <>
                            <div
                              dir={isQArabic ? "rtl" : undefined}
                              className={`mt-4 text-base font-medium leading-relaxed text-slate-900 ${
                                isQArabic ? "text-right [direction:rtl]" : ""
                              }`}
                            >
                              <MathRenderer content={q.stem} />
                            </div>

                            {/* Image Preview if present */}
                            {q.image_url && (
                              <div className="mt-3">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={q.image_url}
                                  alt="Question diagram"
                                  className="max-h-60 rounded-xl border border-slate-200 object-contain"
                                />
                              </div>
                            )}

                            {/* Options Grid */}
                            <div className="mt-4 grid gap-2 sm:grid-cols-2">
                              {q.options.map((opt) => {
                                const isOptArabic = isQArabic || isArabicText(opt.content);
                                return (
                                  <div
                                    key={opt.label}
                                    dir={isOptArabic ? "rtl" : undefined}
                                    className={`flex items-start gap-2.5 rounded-xl border p-3 text-sm ${
                                      isOptArabic ? "text-right [direction:rtl]" : ""
                                    } ${
                                      opt.is_correct
                                        ? "border-emerald-300 bg-emerald-50/70 font-semibold text-emerald-950"
                                        : "border-slate-100 bg-slate-50 text-slate-700"
                                    }`}
                                  >
                                    <span
                                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                                        opt.is_correct
                                          ? "bg-emerald-600 text-white"
                                          : "bg-slate-200 text-slate-600"
                                      }`}
                                    >
                                      {opt.label}
                                    </span>
                                    <div className="flex-1">
                                      <MathRenderer content={opt.content} />
                                    </div>
                                    {opt.is_correct && (
                                      <span className="shrink-0 text-xs font-bold text-emerald-700">
                                        ✓ Correct
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        );
                      })()}

                      {/* Explanation Collapsible */}
                      {q.explanation && (
                        <div className="mt-4 border-t border-slate-100 pt-3">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedExplanations((prev) => ({
                                ...prev,
                                [q.id]: !isExpOpen,
                              }))
                            }
                            className="text-xs font-semibold text-[#116149] hover:underline"
                          >
                            {isExpOpen ? "▼ Hide Explanation" : "▶ View Explanation"}
                          </button>
                          {isExpOpen && (
                            <div
                              dir={isArabicText(q.explanation) ? "rtl" : undefined}
                              className={`mt-2 rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-700 ${
                                isArabicText(q.explanation) ? "text-right [direction:rtl]" : ""
                              }`}
                            >
                              <MathRenderer content={q.explanation} />
                            </div>
                          )}
                        </div>
                      )}

                      {/* Card Actions Footer */}
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3 text-xs">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/admin/questions/edit/?questionId=${q.id}`}
                            className="font-semibold text-[#116149] hover:underline"
                          >
                            Edit Question
                          </Link>
                          <span className="text-slate-300">·</span>
                          <Link
                            href={`/admin/questions/edit/?duplicateId=${q.id}`}
                            className="text-slate-600 hover:text-slate-900"
                          >
                            Duplicate as Draft
                          </Link>
                        </div>

                        {/* Lifecycle buttons */}
                        <div className="flex items-center gap-1.5">
                          {q.status !== "published" && (
                            <button
                              disabled={isUpdating}
                              onClick={() => void handleStatusChange(q.id, "published")}
                              className="rounded-lg bg-emerald-600 px-2.5 py-1 font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                            >
                              Publish
                            </button>
                          )}
                          {q.status !== "draft" && (
                            <button
                              disabled={isUpdating}
                              onClick={() => void handleStatusChange(q.id, "draft")}
                              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                            >
                              Move to Draft
                            </button>
                          )}
                          {q.status !== "archived" && (
                            <button
                              disabled={isUpdating}
                              onClick={() => void handleStatusChange(q.id, "archived")}
                              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50"
                            >
                              Archive
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
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

export default function QuestionsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50">

          <div className="mx-auto max-w-7xl p-8 text-center text-sm text-slate-500">
            Loading Question Library…
          </div>
        </div>
      }
    >
      <QuestionsContent />
    </Suspense>
  );
}
