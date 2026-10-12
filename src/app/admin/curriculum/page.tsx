"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useApiResource, ResourceStatus } from "@/lib/api/use-api-resource";
import type { OfficialJambSubject } from "@/lib/curriculum/jamb-syllabus-data";

interface TopicItem {
  id: string;
  title: string;
  slug: string;
  total_questions: number;
  published_questions: number;
  draft_questions: number;
}

interface ActiveSubjectItem {
  id: string;
  code: string;
  name: string;
  is_compulsory: boolean;
  is_active: boolean;
  display_order: number;
  topics: TopicItem[];
  total_questions: number;
  published_questions: number;
}

interface CurriculumResponse {
  activeSubjects: ActiveSubjectItem[];
  officialCatalogue: OfficialJambSubject[];
}

function CurriculumContent() {
  const curriculumRes = useApiResource<CurriculumResponse>("/api/v1/admin/curriculum");
  const [activeTab, setActiveTab] = useState<"bank" | "official">("bank");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedSubjectCode, setExpandedSubjectCode] = useState<string | null>("ENG");

  if (!curriculumRes.data) {
    return (
      <div className="min-h-screen bg-slate-50">

        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          <ResourceStatus error={curriculumRes.error} retry={curriculumRes.retry} />
        </main>
      </div>
    );
  }

  const { activeSubjects = [], officialCatalogue = [] } = curriculumRes.data;

  // Filtered lists
  const filteredActive = activeSubjects.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.topics.some((t) => t.title.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredOfficial = officialCatalogue.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.topicsSummary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.code && s.code.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">


      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Curriculum & Syllabus Research
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Taxonomy, topic readiness across the 15 active bank subjects, and official IBASS e-syllabus research repository.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/admin/questions/edit/"
              className="rounded-xl bg-[#116149] px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-[#0e4e3b]"
            >
              + Add Question
            </Link>
          </div>
        </div>

        {/* Tab Switcher & Search Bar */}
        <div className="mt-6 flex flex-col justify-between gap-4 border-b border-slate-200 pb-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("bank")}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                activeTab === "bank"
                  ? "bg-[#116149] text-white shadow-xs"
                  : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              Question Bank Coverage ({activeSubjects.length} Subjects)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("official")}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                activeTab === "official"
                  ? "bg-[#116149] text-white shadow-xs"
                  : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              Official JAMB Syllabus Research ({officialCatalogue.length} Subjects)
            </button>
          </div>

          <div className="w-full sm:w-72">
            <input
              type="text"
              placeholder="Search subjects or topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-[#116149] focus:outline-hidden"
            />
          </div>
        </div>

        {/* Tab 1: Question Bank Coverage */}
        {activeTab === "bank" && (
          <div className="mt-6 space-y-4">
            {filteredActive.map((sub) => {
              const reqMin = sub.is_compulsory ? 60 : 40;
              const isReady = sub.published_questions >= reqMin;
              const isExpanded = expandedSubjectCode === sub.code;

              return (
                <div
                  key={sub.code}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition"
                >
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-12 items-center justify-center rounded-xl bg-emerald-50 font-mono text-sm font-bold text-[#116149] border border-emerald-200">
                        {sub.code}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-base font-bold text-slate-900">{sub.name}</h2>
                          {sub.is_compulsory && (
                            <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800">
                              Compulsory
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">
                          {sub.topics.length} topics mapped · {sub.total_questions} total questions in bank
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          isReady
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {isReady
                          ? `Count target met (${sub.published_questions} published)`
                          : `Coverage low: ${sub.published_questions}/${reqMin} published`}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          setExpandedSubjectCode(isExpanded ? null : sub.code)
                        }
                        className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                      >
                        {isExpanded ? "Hide Topics ▲" : "View Topics ▼"}
                      </button>
                    </div>
                  </div>

                  {/* Expandable Topic Breakdown */}
                  {isExpanded && (
                    <div className="mt-4 border-t border-slate-100 pt-4">
                      <div className="flex items-center justify-between pb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        <span>Topic / Module</span>
                        <span>Questions Breakdown</span>
                      </div>

                      {sub.topics.length === 0 ? (
                        <p className="py-4 text-center text-xs text-slate-400">
                          No topics added for this subject yet. Topics are auto-mapped during authoring or import.
                        </p>
                      ) : (
                        <ul className="divide-y divide-slate-100">
                          {sub.topics.map((t) => (
                            <li
                              key={t.id}
                              className="flex items-center justify-between py-2 text-sm hover:bg-slate-50 rounded-lg px-2"
                            >
                              <div>
                                <span className="font-medium text-slate-800">{t.title}</span>
                                <span className="block font-mono text-[10px] text-slate-400">
                                  {t.slug}
                                </span>
                              </div>

                              <div className="flex items-center gap-3 text-xs">
                                <span className="text-emerald-700 font-semibold">
                                  {t.published_questions} published
                                </span>
                                {t.draft_questions > 0 && (
                                  <span className="text-amber-700 font-semibold">
                                    {t.draft_questions} draft
                                  </span>
                                )}
                                <Link
                                  href={`/admin/questions/?subject=${sub.code}&topic=${t.id}`}
                                  className="text-xs text-[#116149] underline"
                                >
                                  View →
                                </Link>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}

                      <div className="mt-3 flex justify-end">
                        <Link
                          href={`/admin/questions/edit/?subject=${sub.code}`}
                          className="text-xs font-semibold text-[#116149] hover:underline"
                        >
                          + Add Question to {sub.code}
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Tab 2: Official JAMB Syllabus Research Catalogue */}
        {activeTab === "official" && (
          <div className="mt-6">
            <div className="mb-4 rounded-xl bg-blue-50 border border-blue-200 p-4 text-xs text-blue-900 leading-relaxed">
              <strong>Source-Backed Inventory:</strong> All 25 subjects below were inspected from the official{" "}
              <a
                href="https://ibass.jamb.gov.ng/e-syllabus"
                target="_blank"
                rel="noreferrer"
                className="underline font-semibold"
              >
                JAMB IBASS e-syllabus portal
              </a>
              . Active bank subjects are mapped directly to our CBT engine.
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredOfficial.map((subj) => (
                <div
                  key={subj.name}
                  className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <h2 className="text-base font-bold text-slate-900">{subj.name}</h2>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          subj.isActiveInBank
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {subj.isActiveInBank ? "Active in Bank" : "Research Archive"}
                      </span>
                    </div>

                    <p className="mt-2 text-xs leading-relaxed text-slate-600">
                      {subj.topicsSummary}
                    </p>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                    <span className="text-slate-400">{subj.pages} pages PDF</span>
                    <a
                      href={subj.officialPdfUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-[#116149] hover:underline"
                    >
                      Official PDF ↗
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function CurriculumPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50">

          <div className="mx-auto max-w-7xl p-8 text-center text-sm text-slate-500">
            Loading Curriculum Research…
          </div>
        </div>
      }
    >
      <CurriculumContent />
    </Suspense>
  );
}
