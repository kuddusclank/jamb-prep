"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  BookOpen,
  ArrowLeft,
  ArrowRight,
  Search,
  Clock,
  CheckCircle2,
  Layers,
  ChevronRight,
  GraduationCap,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { StudyPageHeader } from "@/components/study/study-page-header";
import { StudyContentRenderer } from "@/components/study/study-content-renderer";
import { MathRenderer } from "@/components/math-renderer";
import {
  getAllStudySubjects,
  getStudySubject,
  getStudyTopic,
  searchStudyTopics,
} from "@/lib/study/study-registry";
import { useApiResource } from "@/lib/api/use-api-resource";
import type { PracticeCatalogue } from "@/lib/api/practice-dtos";
import { useBrowserAccount } from "@/components/browser-account-boundary";
import { getOfflineProfile } from "@/lib/offline/offline-profile-cache";

function getCleanSubjectSnippet(overview?: string | null): string {
  if (typeof overview !== "string" || !overview.trim()) {
    return "Official JAMB UTME syllabus revision and topic mastery.";
  }
  let text = overview;
  if (text.includes("---")) {
    text = text.split("---")[1] || "";
  }
  text = text.replace(/^#+[^\n]*\n+/gm, "");
  const paragraphs = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const firstParagraph = paragraphs.find((p) => !p.startsWith("#") && !p.startsWith(">")) || "";

  let clean = firstParagraph
    .replace(/[*_`$#]/g, "")
    .replace(/>\s*\[!.*\]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!clean) {
    return "Official JAMB UTME syllabus revision and topic mastery.";
  }

  if (clean.length > 150) {
    const cut = clean.slice(0, 145);
    const lastSpace = cut.lastIndexOf(" ");
    clean = (lastSpace > 100 ? cut.slice(0, lastSpace) : cut).trim() + "…";
  }

  return clean;
}

function getCleanSubjectOverview(overview?: string | null): string {
  if (typeof overview !== "string" || !overview.trim()) {
    return "Official JAMB UTME syllabus overview and exam preparation structure.";
  }
  let text = overview;
  if (text.includes("---")) {
    // Strip everything before the first divider (which is the metadata block)
    text = text.split("---").slice(1).join("---");
  }
  // Strip main section headings like ## Overview & How JAMB Tests...
  text = text.replace(/^#+[^\n]*\n+/gm, "");
  // Strip trailing horizontal rules
  text = text.replace(/^[-*_]{3,}\s*$/gm, "");
  // Extract the primary overview paragraphs before any deep topic subdivisions
  const paragraphs = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const cleanParagraphs = paragraphs.filter((p) => !p.startsWith("#")).slice(0, 2);
  return cleanParagraphs.join("\n\n") || "Official JAMB UTME syllabus overview and exam preparation structure.";
}

export function StudyClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const account = useBrowserAccount();
  const userId = account.identity?.user?.id || account.session.user?.id;
  const offlineProfile = getOfflineProfile(userId);

  // Active query parameters
  const currentSubjectCode = searchParams.get("subject")?.toUpperCase() || null;
  const currentTopicSlug = searchParams.get("topic")?.toLowerCase() || null;

  // Enrolled subjects from practice catalogue or offline cache
  const catalogue = useApiResource<PracticeCatalogue>("/api/v1/practice/catalogue");
  const enrolledSubjectCodes = useMemo(() => {
    const codes: string[] = [];
    if (catalogue.data?.subjects && Array.isArray(catalogue.data.subjects)) {
      for (const s of catalogue.data.subjects) {
        if (typeof s === "string") {
          codes.push((s as string).toUpperCase());
        } else if (s && typeof s === "object" && "code" in s && typeof s.code === "string") {
          codes.push(s.code.toUpperCase());
        }
      }
    }
    if (codes.length === 0 && offlineProfile?.enrolledSubjects && Array.isArray(offlineProfile.enrolledSubjects)) {
      for (const s of offlineProfile.enrolledSubjects) {
        if (typeof s === "string") {
          codes.push((s as string).toUpperCase());
        } else if (s && typeof s === "object" && "code" in s && typeof s.code === "string") {
          codes.push(s.code.toUpperCase());
        }
      }
    }
    return codes.length > 0 ? codes : ["ENG", "MTH", "PHY", "CHM"];
  }, [catalogue.data?.subjects, offlineProfile?.enrolledSubjects]);

  // Tab: "enrolled" vs "all"
  const [activeTab, setActiveTab] = useState<"enrolled" | "all">("enrolled");
  const [searchQuery, setSearchQuery] = useState("");
  const [topicSearchQuery, setTopicSearchQuery] = useState("");
  const [isStrategiesOpen, setIsStrategiesOpen] = useState(false);

  // Active Subject & Topic
  const activeSubject = useMemo(() => {
    return getStudySubject(currentSubjectCode);
  }, [currentSubjectCode]);

  const activeTopic = useMemo(() => {
    if (!activeSubject || !currentTopicSlug) return null;
    return getStudyTopic(activeSubject.code, currentTopicSlug);
  }, [activeSubject, currentTopicSlug]);

  const allSubjects = useMemo(() => getAllStudySubjects(), []);

  const displayedSubjects = useMemo(() => {
    if (activeTab === "enrolled") {
      const enrolled = allSubjects.filter((s) =>
        enrolledSubjectCodes.includes(s.code.toUpperCase())
      );
      return enrolled.length > 0 ? enrolled : allSubjects.slice(0, 4);
    }
    return allSubjects;
  }, [activeTab, allSubjects, enrolledSubjectCodes]);

  // Global search results across topics
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return searchStudyTopics(searchQuery);
  }, [searchQuery]);

  // Filtered topics within active subject
  const filteredTopics = useMemo(() => {
    if (!activeSubject) return [];
    if (!topicSearchQuery.trim()) return activeSubject.topics;
    const q = topicSearchQuery.toLowerCase().trim();
    return activeSubject.topics.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.subtopics.some((st) => st.toLowerCase().includes(q)) ||
        t.content.toLowerCase().includes(q)
    );
  }, [activeSubject, topicSearchQuery]);

  // Navigation handlers
  const handleSelectSubject = (code: string) => {
    setTopicSearchQuery("");
    setIsStrategiesOpen(false);
    router.push(`/study?subject=${encodeURIComponent(code)}`);
  };

  const handleSelectTopic = (subjectCode: string, topicSlug: string) => {
    router.push(
      `/study?subject=${encodeURIComponent(subjectCode)}&topic=${encodeURIComponent(topicSlug)}`
    );
  };

  const handleBackToSubjects = () => {
    router.push("/study");
  };

  const handleBackToTopics = () => {
    if (activeSubject) {
      router.push(`/study?subject=${encodeURIComponent(activeSubject.code)}`);
    } else {
      router.push("/study");
    }
  };

  // Determine previous and next topics for reading view
  const { prevTopic, nextTopic } = useMemo(() => {
    if (!activeSubject || !activeTopic) return { prevTopic: null, nextTopic: null };
    const currentIndex = activeSubject.topics.findIndex((t) => t.id === activeTopic.id);
    const prev = currentIndex > 0 ? activeSubject.topics[currentIndex - 1] : null;
    const next =
      currentIndex < activeSubject.topics.length - 1
        ? activeSubject.topics[currentIndex + 1]
        : null;
    return { prevTopic: prev, nextTopic: next };
  }, [activeSubject, activeTopic]);

  // Scroll to top when topic changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [currentTopicSlug, currentSubjectCode]);

  // ==========================================
  // VIEW 3: TOPIC SUMMARY READER
  // ==========================================
  if (activeSubject && activeTopic) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto pb-16">
        <StudyPageHeader
          breadcrumbs={
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={handleBackToSubjects}
                className="hover:text-[#092E28] transition-colors cursor-pointer"
              >
                Study
              </button>
              <span>/</span>
              <button
                type="button"
                onClick={handleBackToTopics}
                className="hover:text-[#092E28] transition-colors cursor-pointer"
              >
                {activeSubject.name}
              </button>
              <span>/</span>
              <span className="font-semibold text-slate-900 truncate max-w-[200px] sm:max-w-none">
                {activeTopic.title}
              </span>
            </div>
          }
          badge={`TOPIC ${activeTopic.order} OF ${activeSubject.totalTopics}`}
          badgeIcon={<BookOpen size={13} className="text-[#116149]" />}
          title={activeTopic.title}
          subtitle={`${activeSubject.name} (${activeSubject.code}) • ~${activeTopic.readingTimeMinutes} min read • Comprehensive UTME Study Note`}
          rightElement={
            <Link
              href={`/practice?subject=${encodeURIComponent(activeSubject.code)}`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#092E28] text-white hover:bg-[#116149] text-xs sm:text-sm font-semibold transition shadow-xs"
            >
              <Layers size={15} />
              <span>Practice CBT</span>
            </Link>
          }
        />

        {/* Quick Topic Subheadings Pills */}
        {activeTopic.subtopics.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none text-xs">
            <span className="font-semibold text-slate-500 uppercase tracking-wider text-[11px] shrink-0">
              Key Sections:
            </span>
            {activeTopic.subtopics.map((st, i) => (
              <span
                key={i}
                className="shrink-0 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-medium border border-slate-200"
              >
                {st}
              </span>
            ))}
          </div>
        )}

        {/* Main Content Article */}
        <article className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-10 shadow-xs">
          <StudyContentRenderer content={activeTopic.content} />
        </article>

        {/* Bottom Navigation & Practice Action */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200">
          <div>
            {prevTopic ? (
              <button
                type="button"
                onClick={() => handleSelectTopic(activeSubject.code, prevTopic.slug)}
                className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-700 hover:text-[#116149] transition cursor-pointer"
              >
                <ArrowLeft size={16} className="shrink-0" />
                <span>Previous: {prevTopic.title}</span>
              </button>
            ) : (
              <div />
            )}
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={`/practice?subject=${encodeURIComponent(activeSubject.code)}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#116149] hover:bg-[#092E28] text-white text-xs sm:text-sm font-bold transition shadow-xs"
            >
              <CheckCircle2 size={16} />
              <span>Practice Questions for this Topic</span>
            </Link>
          </div>

          <div>
            {nextTopic ? (
              <button
                type="button"
                onClick={() => handleSelectTopic(activeSubject.code, nextTopic.slug)}
                className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-700 hover:text-[#116149] transition cursor-pointer text-right"
              >
                <span>Next: {nextTopic.title}</span>
                <ArrowRight size={16} className="shrink-0" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleBackToTopics}
                className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-700 hover:text-[#116149] transition cursor-pointer"
              >
                <span>Back to All Topics</span>
                <ArrowRight size={16} className="shrink-0" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 2: SUBJECT TOPIC LIST
  // ==========================================
  if (activeSubject) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto pb-16">
        <StudyPageHeader
          breadcrumbs={
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleBackToSubjects}
                className="hover:text-[#092E28] transition-colors cursor-pointer"
              >
                Study
              </button>
              <span>/</span>
              <span className="font-semibold text-slate-900">
                {activeSubject.name}
              </span>
            </div>
          }
          badge={`${activeSubject.code} • ${activeSubject.questionCount} UTME QUESTIONS`}
          badgeIcon={<GraduationCap size={13} className="text-[#116149]" />}
          title={activeSubject.name}
          subtitle={`Master all ${activeSubject.totalTopics} syllabus topics for ${activeSubject.name}. Includes key formulas, definitions, and high-yield exam distinction notes.`}
          rightElement={
            <Link
              href={`/practice?subject=${encodeURIComponent(activeSubject.code)}`}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#092E28] text-white hover:bg-[#116149] text-xs sm:text-sm font-semibold transition shadow-xs"
            >
              <Layers size={15} />
              <span>Practice CBT Mode</span>
            </Link>
          }
        />

        {/* Subject Overview Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 space-y-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-1 rounded-md bg-slate-100 font-mono text-xs font-bold text-slate-700 border border-slate-200">
                {activeSubject.code}
              </span>
              <span className="text-xs font-semibold text-slate-500">
                Target Timing: {activeSubject.timeTargetMinutes} Minutes in UTME
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsStrategiesOpen(!isStrategiesOpen)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#116149] hover:underline cursor-pointer"
            >
              <ShieldCheck size={14} />
              <span>
                {isStrategiesOpen ? "Hide 10 Golden Strategies" : "View 10 Golden Exam Strategies"}
              </span>
              {isStrategiesOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>

          <div className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            <MathRenderer content={getCleanSubjectOverview(activeSubject.overview)} />
          </div>

          {/* Collapsible 10 Golden Strategies */}
          {isStrategiesOpen && activeSubject.strategies.length > 0 && (
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                10 Golden Exam Strategies for {activeSubject.name}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {activeSubject.strategies.map((strat) => (
                  <div
                    key={strat.number}
                    className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-1.5"
                  >
                    <div className="flex items-center gap-2">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold shrink-0">
                        {strat.number}
                      </span>
                      <span className="text-xs font-bold text-slate-900">
                        {strat.title}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 leading-relaxed pl-7">
                      <MathRenderer content={strat.description} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Topic Search Filter */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder={`Search topics in ${activeSubject.name}...`}
              value={topicSearchQuery}
              onChange={(e) => setTopicSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#116149] focus:ring-1 focus:ring-[#116149] shadow-xs"
            />
          </div>
          {topicSearchQuery && (
            <button
              type="button"
              onClick={() => setTopicSearchQuery("")}
              className="text-xs text-slate-500 hover:text-slate-800 font-medium px-2 py-1 cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        {/* Topics List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold px-1">
            <span>OFFICIAL SYLLABUS TOPICS ({filteredTopics.length})</span>
            <span>READING TIME</span>
          </div>

          <div className="space-y-2.5">
            {filteredTopics.map((topic) => (
              <div
                key={topic.id}
                onClick={() => handleSelectTopic(activeSubject.code, topic.slug)}
                className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-slate-200 bg-white hover:border-[#116149] hover:shadow-xs transition-all cursor-pointer"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2.5">
                    <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-slate-100 text-xs font-mono font-bold text-slate-700">
                      {String(topic.order).padStart(2, "0")}
                    </span>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-[#116149] transition-colors">
                      <MathRenderer content={topic.title} />
                    </h3>
                  </div>

                  {topic.subtopics.length > 0 && (
                    <p className="text-xs text-slate-500 line-clamp-1 pl-8">
                      {topic.subtopics.slice(0, 4).join(" • ")}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-4 self-end sm:self-auto shrink-0 pl-8 sm:pl-0">
                  <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                    <Clock size={13} />
                    <span>~{topic.readingTimeMinutes} min</span>
                  </span>

                  <span className="inline-flex items-center gap-1 text-xs font-bold text-[#116149] group-hover:translate-x-0.5 transition-transform">
                    <span>Read Topic</span>
                    <ChevronRight size={14} />
                  </span>
                </div>
              </div>
            ))}

            {filteredTopics.length === 0 && (
              <div className="p-8 text-center rounded-xl border border-slate-200 bg-white space-y-2">
                <p className="text-sm font-semibold text-slate-800">
                  No topics matching "{topicSearchQuery}"
                </p>
                <p className="text-xs text-slate-500">
                  Try searching for another keyword or clear the search filter.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 1: REGISTERED SUBJECT CARDS (TIER 1)
  // ==========================================
  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      <StudyPageHeader
        badge="UTME SYLLABUS & REVISION COACH"
        badgeIcon={<BookOpen size={13} className="text-[#116149]" />}
        title="Study & Subject Summaries"
        subtitle="Master official JAMB syllabus topics, core formulas, key concepts, and exam strategies across your registered examination subjects."
        rightElement={
          <div className="flex items-center gap-2">
            <span className="px-3.5 py-1.5 rounded-full border border-slate-200 bg-white text-xs font-bold text-[#092E28] shadow-xs">
              {enrolledSubjectCodes.length} Registered Subjects
            </span>
          </div>
        }
      />

      {/* Global Search Bar */}
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          type="text"
          placeholder="Search any syllabus topic, formula, or concept across all UTME subjects..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#116149] focus:ring-1 focus:ring-[#116149] shadow-xs"
        />
      </div>

      {/* Search Results (if searching) */}
      {searchQuery.trim() && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold px-1">
            <span>SEARCH RESULTS ({searchResults.length})</span>
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="text-[#116149] hover:underline cursor-pointer"
            >
              Clear Search
            </button>
          </div>

          <div className="space-y-2">
            {searchResults.slice(0, 15).map(({ subject, topic }) => (
              <div
                key={topic.id}
                onClick={() => handleSelectTopic(subject.code, topic.slug)}
                className="p-4 rounded-xl border border-slate-200 bg-white hover:border-[#116149] hover:shadow-xs transition-all cursor-pointer flex items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700">
                      {subject.code}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      {subject.name}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">
                    {topic.title}
                  </h4>
                  {topic.subtopics.length > 0 && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                      {topic.subtopics.join(" • ")}
                    </p>
                  )}
                </div>

                <ChevronRight size={16} className="text-slate-400 shrink-0" />
              </div>
            ))}

            {searchResults.length === 0 && (
              <div className="p-8 text-center rounded-xl border border-slate-200 bg-white text-sm text-slate-500">
                No syllabus topics found matching "{searchQuery}".
              </div>
            )}
          </div>
        </div>
      )}

      {/* Subject Segmented Tab Switcher */}
      {!searchQuery.trim() && (
        <div className="space-y-5">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("enrolled")}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm transition-all cursor-pointer ${
                  activeTab === "enrolled"
                    ? "bg-[#092E28] text-white font-bold shadow-xs"
                    : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold"
                }`}
              >
                My Registered Subjects ({enrolledSubjectCodes.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("all")}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm transition-all cursor-pointer ${
                  activeTab === "all"
                    ? "bg-[#092E28] text-white font-bold shadow-xs"
                    : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold"
                }`}
              >
                All 25 UTME Subjects
              </button>
            </div>

            <span className="text-xs text-slate-500 hidden sm:inline-block font-medium">
              {activeTab === "enrolled"
                ? "Your 4 examination course subjects"
                : "Full official JAMB IBASS catalog"}
            </span>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {displayedSubjects.map((subj) => (
              <div
                key={subj.code}
                onClick={() => handleSelectSubject(subj.code)}
                className="group relative flex flex-col justify-between p-5 rounded-2xl border border-slate-200/90 bg-white hover:border-[#116149] hover:shadow-xs transition-all cursor-pointer space-y-4"
              >
                {/* Header row */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-1 rounded-md bg-slate-100 font-mono text-xs font-bold text-slate-700 border border-slate-200">
                      {subj.code}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {subj.isCompulsory ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-[#116149] border border-emerald-200 text-[10.5px] font-bold">
                          Compulsory
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-50 text-slate-600 border border-slate-200 text-[10.5px] font-semibold">
                          Elective
                        </span>
                      )}
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-[#092E28] group-hover:text-[#116149] transition-colors">
                    {subj.name}
                  </h3>

                  <p className="text-xs sm:text-sm text-slate-600 line-clamp-3 leading-relaxed">
                    {getCleanSubjectSnippet(subj.overview)}
                  </p>
                </div>

                {/* Footer row */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3 text-slate-500 font-medium">
                    <span className="flex items-center gap-1">
                      <BookOpen size={13} />
                      <span>{subj.totalTopics} Topics</span>
                    </span>
                    <span>•</span>
                    <span>{subj.questionCount} Questions</span>
                  </div>

                  <span className="inline-flex items-center gap-1 text-xs font-bold text-[#116149] group-hover:translate-x-0.5 transition-transform">
                    <span>Explore Topics</span>
                    <ArrowRight size={14} />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
