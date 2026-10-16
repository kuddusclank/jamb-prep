"use client";

import { useState } from "react";
import { ResourceStatus, useApiResource } from "@/lib/api/use-api-resource";

interface AppRating {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  attempt_id: string;
  student_name: string;
  student_email: string;
}

interface AppRatingsResponse {
  summary: { total: number; averageRating: number | null; distribution: { rating: number; count: number }[] };
  ratings: AppRating[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export default function AppRatingsPage() {
  const [page, setPage] = useState(1);
  const resource = useApiResource<AppRatingsResponse>(`/api/v1/admin/app-ratings?page=${page}&limit=50`);
  if (!resource.data) return <ResourceStatus error={resource.error} retry={resource.retry} />;
  const { summary, ratings } = resource.data;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-800">Student voice</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">App ratings</h1>
            <p className="mt-2 text-sm text-slate-600">Ratings students leave after completing a mock exam.</p>
          </div>
          <button type="button" onClick={resource.retry} className="min-h-10 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold hover:bg-slate-100">Refresh</button>
        </div>

        <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="Rating summary">
          <div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">Average rating</p><p className="mt-2 text-3xl font-semibold">{summary.averageRating?.toFixed(1) ?? "—"}<span className="ml-1 text-base text-slate-400">/ 5</span></p></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">Responses</p><p className="mt-2 text-3xl font-semibold">{summary.total}</p></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:col-span-2 lg:col-span-1"><p className="text-sm text-slate-500">Rating breakdown</p><div className="mt-3 flex flex-wrap gap-2">{summary.distribution.map((item) => <span key={item.rating} className="rounded-full bg-slate-100 px-3 py-1 text-sm">{item.rating}★ <strong>{item.count}</strong></span>)}</div></div>
        </section>

        <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-5 py-4"><h2 className="font-semibold">Latest responses</h2></div>
          {ratings.length === 0 ? <p className="p-6 text-sm text-slate-600">No ratings have been submitted yet.</p> : (
            <ul className="divide-y divide-slate-100">
              {ratings.map((item) => (
                <li key={item.id} className="grid gap-3 px-5 py-4 sm:grid-cols-[1fr_auto]">
                  <div>
                    <p className="font-medium">{item.student_name || "Student"} <span className="font-normal text-slate-500">· {item.student_email}</span></p>
                    <p className="mt-1 text-amber-600" aria-label={`${item.rating} out of 5 stars`}>{"★".repeat(item.rating)}<span className="text-slate-200">{"★".repeat(5 - item.rating)}</span></p>
                    <p className="mt-2 text-sm leading-relaxed text-slate-700">{item.comment || <span className="text-slate-400">No written feedback</span>}</p>
                    <p className="mt-2 break-all text-xs text-slate-400">Mock {item.attempt_id}</p>
                  </div>
                  <time className="text-xs text-slate-500 sm:text-right" dateTime={item.created_at}>{new Date(item.created_at).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}</time>
                </li>
              ))}
            </ul>
          )}
          {resource.data.pagination.totalPages > 1 && <div className="flex items-center justify-between border-t border-slate-200 px-5 py-4 text-sm"><span className="text-slate-500">Page {page} of {resource.data.pagination.totalPages}</span><div className="flex gap-2"><button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="min-h-10 rounded-full border border-slate-200 px-4 font-medium disabled:opacity-40">Previous</button><button type="button" disabled={page >= resource.data.pagination.totalPages} onClick={() => setPage((value) => value + 1)} className="min-h-10 rounded-full border border-slate-200 px-4 font-medium disabled:opacity-40">Next</button></div></div>}
        </section>
      </div>
    </main>
  );
}
