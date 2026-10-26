"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useApiResource, ResourceStatus } from "@/lib/api/use-api-resource";
import {
  Building2,
  Users,
  ShieldCheck,
  AlertCircle,
  Clock,
  Search,
  X,
  GraduationCap,
  ChevronRight,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Mail,
  MapPin,
} from "lucide-react";

interface SchoolSummaryMetrics {
  totalSchools: number;
  totalStudents: number;
  activeLicenses: number;
  expiredLicenses: number;
  inactiveLicenses: number;
}

interface SchoolItem {
  id: string;
  name: string;
  code: string;
  slug: string;
  type: string;
  state: string;
  contactEmail: string | null;
  contactPhone: string | null;
  isActive: boolean;
  createdAt: string;
  adminName: string | null;
  adminEmail: string | null;
  totalStudents: number;
  activeLicenses: number;
  expiredLicenses: number;
  inactiveLicenses: number;
  lastOrderAmountKobo: number | null;
  lastOrderStatus: string | null;
  lastOrderSettledAt: string | null;
}

interface AdminSchoolsResponse {
  page: number;
  summary: SchoolSummaryMetrics;
  schools: SchoolItem[];
}

interface StudentItem {
  id: string;
  studentUserId: string;
  identifier: string | null;
  ingestionMethod: string;
  licenseStatus: "active" | "expired" | "inactive";
  licenseExpiresAt: string | null;
  createdAt: string;
  displayName: string;
  email: string;
  mockAvgScore: number | null;
  totalPractice: number;
}

interface SchoolStudentsResponse {
  school: {
    id: string;
    name: string;
    code: string;
    type: string;
    state: string;
  };
  students: StudentItem[];
}

function SchoolStudentsModal({
  schoolId,
  schoolName,
  schoolCode,
  onClose,
}: {
  schoolId: string;
  schoolName: string;
  schoolCode: string;
  onClose: () => void;
}) {
  const resource = useApiResource<SchoolStudentsResponse>(
    `/api/v1/admin/schools/${schoolId}/students`
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs"
    >
      <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col rounded-3xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-emerald-50 px-2 py-0.5 font-mono text-xs font-bold text-[#116149]">
                {schoolCode}
              </span>
              <h2
                id="modal-title"
                className="text-lg font-bold text-slate-900 sm:text-xl"
              >
                {schoolName}
              </h2>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Attached candidates and individual subscription licensing standing.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {!resource.data ? (
            <ResourceStatus error={resource.error} retry={resource.retry} />
          ) : resource.data.students.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
              No student candidates currently attached to this school.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="pb-3 font-semibold">Candidate</th>
                    <th className="pb-3 font-semibold">Student ID</th>
                    <th className="pb-3 font-semibold">Licensing Status</th>
                    <th className="pb-3 font-semibold">License Validity</th>
                    <th className="pb-3 font-semibold">Method</th>
                    <th className="pb-3 font-semibold">Activity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {resource.data.students.map((st) => {
                    const isLicensed = st.licenseStatus === "active";
                    const isExpired = st.licenseStatus === "expired";
                    return (
                      <tr key={st.id} className="hover:bg-slate-50/80">
                        <td className="py-3 pr-3">
                          <div className="font-semibold text-slate-900">
                            {st.displayName}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {st.email}
                          </div>
                        </td>
                        <td className="py-3 pr-3 font-mono text-slate-600">
                          {st.identifier || "—"}
                        </td>
                        <td className="py-3 pr-3">
                          {isLicensed ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-[#116149]">
                              <CheckCircle2 size={12} /> Active Pro
                            </span>
                          ) : isExpired ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                              <AlertCircle size={12} /> Expired
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                              <XCircle size={12} /> Inactive
                            </span>
                          )}
                        </td>
                        <td className="py-3 pr-3 text-slate-600">
                          {st.licenseExpiresAt
                            ? new Date(st.licenseExpiresAt).toLocaleDateString(
                                "en-NG",
                                {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                }
                              )
                            : "—"}
                        </td>
                        <td className="py-3 pr-3 capitalize text-slate-500">
                          {st.ingestionMethod}
                        </td>
                        <td className="py-3 text-slate-600">
                          {st.mockAvgScore !== null
                            ? `Mock Avg: ${st.mockAvgScore}/400`
                            : st.totalPractice > 0
                            ? `${st.totalPractice} practice Qs`
                            : "Not started"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-4 rounded-b-3xl text-xs text-slate-500">
          <span>
            Total Candidates:{" "}
            <strong>{resource.data?.students.length ?? 0}</strong>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function AdminSchoolsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentSearch = searchParams.get("search") || "";
  const currentStatus = searchParams.get("status") || "";
  const currentPage = parseInt(searchParams.get("page") || "1", 10) || 1;

  const [searchInput, setSearchInput] = useState(currentSearch);
  const [activeModalSchool, setActiveModalSchool] = useState<{
    id: string;
    name: string;
    code: string;
  } | null>(null);

  const queryParts = [
    `page=${currentPage}`,
    currentSearch ? `search=${encodeURIComponent(currentSearch)}` : "",
    currentStatus ? `status=${encodeURIComponent(currentStatus)}` : "",
  ].filter(Boolean);

  const resource = useApiResource<AdminSchoolsResponse>(
    `/api/v1/admin/schools?${queryParts.join("&")}`
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
    router.push(`/admin/schools/?${params.toString()}`);
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateQuery({ search: searchInput });
  }

  if (!resource.data) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <ResourceStatus error={resource.error} retry={resource.retry} />
      </main>
    );
  }

  const { summary, schools = [] } = resource.data;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {/* Page Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-[#116149]">
                B2B Institutions
              </span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Registered Schools & Licensing
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Audit participating secondary schools, tutorial centres, candidate rosters, and cohort licensing standing.
            </p>
          </div>
        </div>

        {/* Global Summary Cards */}
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
            <div className="flex items-center gap-2 text-slate-500">
              <Building2 size={16} />
              <p className="text-xs font-semibold uppercase tracking-wider">
                Total Schools
              </p>
            </div>
            <p className="mt-2 text-3xl font-extrabold text-[#116149]">
              {summary.totalSchools.toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Registered partner institutions
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
            <div className="flex items-center gap-2 text-slate-500">
              <Users size={16} />
              <p className="text-xs font-semibold uppercase tracking-wider">
                Attached Students
              </p>
            </div>
            <p className="mt-2 text-3xl font-extrabold text-slate-900">
              {summary.totalStudents.toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Linked across all cohorts
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
            <div className="flex items-center gap-2 text-emerald-700">
              <ShieldCheck size={16} />
              <p className="text-xs font-semibold uppercase tracking-wider">
                Active Pro Licenses
              </p>
            </div>
            <p className="mt-2 text-3xl font-extrabold text-[#116149]">
              {summary.activeLicenses.toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Full CBT mock & explanation access
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
            <div className="flex items-center gap-2 text-amber-700">
              <Clock size={16} />
              <p className="text-xs font-semibold uppercase tracking-wider">
                Expired / Inactive
              </p>
            </div>
            <p className="mt-2 text-3xl font-extrabold text-amber-700">
              {(
                summary.expiredLicenses + summary.inactiveLicenses
              ).toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {summary.expiredLicenses} expired · {summary.inactiveLicenses} unactivated
            </p>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Status Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { label: "All Schools", value: "" },
              { label: "Active Licenses", value: "active" },
              { label: "Expired", value: "expired" },
              { label: "Unlicensed / Inactive", value: "unlicensed" },
            ].map((f) => {
              const active = currentStatus === f.value;
              return (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => updateQuery({ status: f.value })}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                    active
                      ? "bg-[#116149] text-white shadow-2xs"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>

          {/* Search Form */}
          <form
            onSubmit={handleSearchSubmit}
            className="flex items-center gap-2 sm:w-80"
          >
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Search school name, code, state..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full rounded-full border border-slate-200 bg-white pl-9 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-[#116149] focus:outline-hidden"
              />
            </div>
            {currentSearch && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput("");
                  updateQuery({ search: null });
                }}
                className="rounded-full border border-slate-200 bg-white p-2 text-slate-400 hover:text-slate-600"
                title="Clear search"
              >
                <X size={14} />
              </button>
            )}
            <button
              type="submit"
              className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
            >
              Search
            </button>
          </form>
        </div>

        {/* Schools Table */}
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
          {schools.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-500">
              No registered schools found matching the current criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50/70 text-slate-500">
                  <tr>
                    <th className="px-6 py-3.5 font-semibold">School & Code</th>
                    <th className="px-6 py-3.5 font-semibold">Type & State</th>
                    <th className="px-6 py-3.5 font-semibold">Administrator Contact</th>
                    <th className="px-6 py-3.5 font-semibold">Attached Candidates</th>
                    <th className="px-6 py-3.5 font-semibold">Licensing Health</th>
                    <th className="px-6 py-3.5 font-semibold">Latest Order</th>
                    <th className="px-6 py-3.5 text-right font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {schools.map((school) => {
                    const hasActive = school.activeLicenses > 0;
                    return (
                      <tr
                        key={school.id}
                        className="transition hover:bg-slate-50/60"
                      >
                        {/* School Name & Code */}
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-900">
                            {school.name}
                          </div>
                          <div className="mt-0.5 flex items-center gap-1.5 font-mono text-[11px] text-[#116149]">
                            <span className="rounded-md bg-emerald-50 px-1.5 py-0.2 border border-emerald-100 font-semibold">
                              {school.code}
                            </span>
                          </div>
                        </td>

                        {/* Type & State */}
                        <td className="px-6 py-4">
                          <div className="capitalize text-slate-800">
                            {school.type.replace(/_/g, " ")}
                          </div>
                          <div className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-500">
                            <MapPin size={11} /> {school.state} State
                          </div>
                        </td>

                        {/* Admin Contact */}
                        <td className="px-6 py-4">
                          <div className="font-medium text-slate-900">
                            {school.adminName || "Administrator"}
                          </div>
                          <div className="mt-0.5 text-[11px] text-slate-500">
                            {school.contactEmail || school.adminEmail || "—"}
                          </div>
                        </td>

                        {/* Attached Candidates */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                            <GraduationCap size={15} className="text-slate-400" />
                            {school.totalStudents} candidate{school.totalStudents === 1 ? "" : "s"}
                          </div>
                        </td>

                        {/* Licensing Health */}
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {hasActive && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-[#116149]">
                                <span className="size-1.5 rounded-full bg-[#116149]" />
                                {school.activeLicenses} Active
                              </span>
                            )}
                            {school.expiredLicenses > 0 && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                                <span className="size-1.5 rounded-full bg-amber-600" />
                                {school.expiredLicenses} Expired
                              </span>
                            )}
                            {school.inactiveLicenses > 0 && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                                {school.inactiveLicenses} Inactive
                              </span>
                            )}
                            {school.totalStudents === 0 && (
                              <span className="text-[11px] text-slate-400">
                                No students yet
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Latest Order */}
                        <td className="px-6 py-4 text-slate-600">
                          {school.lastOrderAmountKobo ? (
                            <div>
                              <div className="font-medium text-slate-900">
                                ₦{(school.lastOrderAmountKobo / 100).toLocaleString()}
                              </div>
                              <div className="text-[11px] text-slate-400">
                                {school.lastOrderSettledAt
                                  ? new Date(
                                      school.lastOrderSettledAt
                                    ).toLocaleDateString("en-NG", {
                                      month: "short",
                                      day: "numeric",
                                    })
                                  : "Pending"}
                              </div>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400">
                              None
                            </span>
                          )}
                        </td>

                        {/* Action Drilldown */}
                        <td className="px-6 py-4 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              setActiveModalSchool({
                                id: school.id,
                                name: school.name,
                                code: school.code,
                              })
                            }
                            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition hover:border-[#116149] hover:text-[#116149]"
                          >
                            View Candidates <ChevronRight size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Drilldown */}
        {activeModalSchool && (
          <SchoolStudentsModal
            schoolId={activeModalSchool.id}
            schoolName={activeModalSchool.name}
            schoolCode={activeModalSchool.code}
            onClose={() => setActiveModalSchool(null)}
          />
        )}
      </main>
    </div>
  );
}

export default function AdminSchoolsPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          <div className="p-8 text-center text-sm text-slate-500">
            Loading registered schools...
          </div>
        </main>
      }
    >
      <AdminSchoolsContent />
    </Suspense>
  );
}
