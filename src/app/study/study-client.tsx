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
  FileText,
  CheckCircle2,
  Bookmark,
  Layers,
  ChevronRight,
  GraduationCap,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { StudyPageHeader } from "@/components/study/study-page-header";
import { StudyContentRenderer } from "@/components/study/study-content-renderer";
import {
  getAllStudySubjects,
  getStudySubject,
  getStudyTopic,
  searchStudyTopics,
} from "@/lib/study/study-registry";
import type { StudySubject, StudyTopic } from "@/lib/study/types";
import { useApiResource } from "@/lib/api/use-api-resource";
import type { PracticeCatalogue } from "@/lib/api/practice-dtos";
import { useBrowserAccount } from "@/components/browser-account-boundary";
import { getOfflineProfile } from "@/lib/offline/offline-profile-cache";

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
    if (catalogue.data?.subjects && catalogue.data.subjects.length > 0) {
      return catalogue.data.subjects.map((s) => s.code.toUpperCase());
    }
    if (offlineProfile?.enrolledSubjects && offlineProfile.enrolledSubjects.length > 0) {
      return offlineProfile.enrolledSubjects.map((s) => s.code.toUpperCase());
    }
    // Fallback default launch combination if no profile enrolled yet
    return ["ENG", "MTH", "PHY", "CHM"];
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
                className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors cursor-pointer"
              >
                Study
              </button>
              <span>/</span>
              <button
                type="button"
                onClick={handleBackToTopics}
                className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors cursor-pointer"
              >
                {activeSubject.name}
              </button>
              <span>/</span>
              <span className="font-semibold text-zinc-900 dark:text-zinc-100 truncate max-w-[200px] sm:max-w-none">
                {activeTopic.title}
              </span>
            </div>
          }
          badge={`TOPIC ${activeTopic.order} OF ${activeSubject.totalTopics}`}
          badgeIcon={<BookOpen size={13} className="text-emerald-700" />}
          title={activeTopic.title}
          subtitle={`${activeSubject.name} (${activeSubject.code}) • ~${activeTopic.readingTimeMinutes} min read • Comprehensive UTME Study Note`}
          rightElement={
            <Link
              href={`/practice?subject=${encodeURIComponent(activeSubject.code)}`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#092E28] text-white hover:bg-[#116149] text-xs sm:text-sm font-semibold transition shadow-sm"
            >
              <Layers size={15} />
              <span>Practice CBT</span>
            </Link>
          }
        />

        {/* Quick Topic Subheadings Pills */}
        {activeTopic.subtopics.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none text-xs">
            <span className="font-semibold text-zinc-500 uppercase tracking-wider text-[11px] shrink-0">
              Key Sections:
            </span>
            {activeTopic.subtopics.map((st, i) => (
              <span
                key={i}
                className="shrink-0 px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium border border-zinc-200 dark:border-zinc-700/60"
              >
                {st}
              </span>
            ))}
          </div>
        )}

        {/* Main Content Article */}
        <article className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 sm:p-10 shadow-none">
          <StudyContentRenderer content={activeTopic.content} />
        </article>

        {/* Bottom Navigation & Practice Action */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
          <div>
            {prevTopic ? (
              <button
                type="button"
                onClick={() => handleSelectTopic(activeSubject.code, prevTopic.slug)}
                className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:text-emerald-700 dark:hover:text-emerald-400 transition cursor-pointer"
              >
                <ArrowLeft size={16} />
                <span className="truncate max-w-[200px]">Previous: {prevTopic.title}</span>
              </button>
            ) : (
              <div />
            )}
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={`/practice?subject=${encodeURIComponent(activeSubject.code)}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-bold transition shadow-sm"
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
                className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:text-emerald-700 dark:hover:text-emerald-400 transition cursor-pointer"
              >
                <span className="truncate max-w-[200px]">Next: {nextTopic.title}</span>
                <ArrowRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleBackToTopics}
                className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:text-emerald-700 dark:hover:text-emerald-400 transition cursor-pointer"
              >
                <span>Back to All Topics</span>
                <ArrowRight size={16} />
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
                className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors cursor-pointer"
              >
                Study
              </button>
              <span>/</span>
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                {activeSubject.name}
              </span>
            </div>
          }
          badge={`${activeSubject.code} • ${activeSubject.questionCount} UTME QUESTIONS`}
          badgeIcon={<GraduationCap size={13} className="text-emerald-700" />}
          title={activeSubject.name}
          subtitle={`Master all ${activeSubject.totalTopics} syllabus topics for ${activeSubject.name}. Includes key formulas, definitions, and high-yield exam distinction notes.`}
          rightElement={
            <Link
              href={`/practice?subject=${encodeURIComponent(activeSubject.code)}`}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#092E28] text-white hover:bg-[#116149] text-xs sm:text-sm font-semibold transition shadow-sm"
            >
              <Layers size={15} />
              <span>Practice CBT Mode</span>
            </Link>
          }
        />

        {/* Subject Overview Card */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-xs font-mono font-bold text-zinc-800 dark:text-zinc-200">
                {activeSubject.code}
              </span>
              <span className="text-xs font-semibold text-zinc-500">
                Target Timing: {activeSubject.timeTargetMinutes} Minutes in UTME
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsStrategiesOpen(!isStrategiesOpen)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-400 hover:underline cursor-pointer"
            >
              <ShieldCheck size={14} />
              <span>
                {isStrategiesOpen ? "Hide 10 Golden Strategies" : "View 10 Golden Exam Strategies"}
              </span>
              {isStrategiesOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>

          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
            {activeSubject.overview.replace(/^## Overview[^\n]*\n+/i, "").slice(0, 340)}...
          </p>

          {/* Collapsible 10 Golden Strategies */}
          {isStrategiesOpen && activeSubject.strategies.length > 0 && (
            <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 space-y-3">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                10 Golden Exam Strategies for {activeSubject.name}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {activeSubject.strategies.map((strat) => (
                  <div
                    key={strat.number}
                    className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 space-y-1"
                  >
                    <div className="flex items-center gap-2">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold">
                        {strat.number}
                      </span>
                      <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                        {strat.title}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-normal pl-7">
                      {strat.description}
                    </p>
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
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
            />
            <input
              type="text"
              placeholder={`Search topics in ${activeSubject.name}...`}
              value={topicSearchQuery}
              onChange={(e) => setTopicSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 py-2.5 pl-10 pr-4 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            />
          </div>
          {topicSearchQuery && (
            <button
              type="button"
              onClick={() => setTopicSearchQuery("")}
              className="text-xs text-zinc-500 hover:text-zinc-800 font-medium px-2 py-1"
            >
              Clear
            </button>
          )}
        </div>

        {/* Topics List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-zinc-500 font-semibold px-1">
            <span>OFFICIAL SYLLABUS TOPICS ({filteredTopics.length})</span>
            <span>READING TIME</span>
          </div>

          <div className="space-y-2.5">
            {filteredTopics.map((topic) => (
              <div
                key={topic.id}
                onClick={() => handleSelectTopic(activeSubject.code, topic.slug)}
                className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-emerald-600 dark:hover:border-emerald-500 transition-colors cursor-pointer shadow-none"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2.5">
                    <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-xs font-mono font-bold text-zinc-700 dark:text-zinc-300">
                      {String(topic.order).padStart(2, "0")}
                    </span>
                    <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-emerald-800 dark:group-hover:text-emerald-400 transition-colors">
                      {topic.title}
                    </h3>
                  </div>

                  {topic.subtopics.length > 0 && (
                    <p className="text-xs text-zinc-500 line-clamp-1 pl-8">
                      {topic.subtopics.slice(0, 4).join(" • ")}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-4 self-end sm:self-auto shrink-0 pl-8 sm:pl-0">
                  <span className="text-xs font-medium text-zinc-500 flex items-center gap-1">
                    <Clock size={13} />
                    <span>~{topic.readingTimeMinutes} min</span>
                  </span>

                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 dark:text-emerald-400 group-hover:translate-x-0.5 transition-transform">
                    <span>Read Topic</span>
                    <ChevronRight size={14} />
                  </span>
                </div>
              </div>
            ))}

            {filteredTopics.length === 0 && (
              <div className="p-8 text-center rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-2">
                <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                  No topics matching "{topicSearchQuery}"
                </p>
                <p className="text-xs text-zinc-500">
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
        badge="📚 UTME SYLLABUS & REVISION COACH"
        title="Study & Subject Summaries"
        subtitle="Master official JAMB syllabus topics, core formulas, key concepts, and exam strategies across your registered examination subjects."
        rightElement={
          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-bold text-[#092E28] dark:text-zinc-200">
              {enrolledSubjectCodes.length} Registered Subjects
            </span>
          </div>
        }
      />

      {/* Global Search Bar */}
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
        />
        <input
          type="text"
          placeholder="Search any syllabus topic, formula, or concept across all UTME subjects..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 py-3 pl-10 pr-4 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-emerald-600 shadow-none"
        />
      </div>

      {/* Search Results (if searching) */}
      {searchQuery.trim() && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-zinc-500 font-semibold px-1">
            <span>SEARCH RESULTS ({searchResults.length})</span>
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="text-emerald-700 hover:underline cursor-pointer"
            >
              Clear Search
            </button>
          </div>

          <div className="space-y-2">
            {searchResults.slice(0, 15).map(({ subject, topic }) => (
              <div
                key={topic.id}
                onClick={() => handleSelectTopic(subject.code, topic.slug)}
                className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-emerald-600 transition-colors cursor-pointer flex items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                      {subject.code}
                    </span>
                    <span className="text-xs text-zinc-500 font-medium">
                      {subject.name}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    {topic.title}
                  </h4>
                  {topic.subtopics.length > 0 && (
                    <p className="text-xs text-zinc-500 mt-1 line-clamp-1">
                      {topic.subtopics.join(" • ")}
                    </p>
                  )}
                </div>

                <ChevronRight size={16} className="text-zinc-400 shrink-0" />
              </div>
            ))}

            {searchResults.length === 0 && (
              <div className="p-8 text-center rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm text-zinc-500">
                No syllabus topics found matching "{searchQuery}".
              </div>
            )}
          </div>
        </div>
      )}

      {/* Subject Segmented Tab Switcher */}
      {!searchQuery.trim() && (
        <div className="space-y-5">
          <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("enrolled")}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer ${
                  activeTab === "enrolled"
                    ? "bg-[#092E28] text-white"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200"
                }`}
              >
                My Registered Subjects ({enrolledSubjectCodes.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("all")}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer ${
                  activeTab === "all"
                    ? "bg-[#092E28] text-white"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200"
                }`}
              >
                All 25 UTME Subjects
              </button>
            </div>

            <span className="text-xs text-zinc-500 hidden sm:inline-block">
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
                className="group relative flex flex-col justify-between p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-emerald-700 dark:hover:border-emerald-500 transition-all cursor-pointer shadow-none space-y-4"
              >
                {/* Header row */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 font-mono text-xs font-bold text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700/60">
                      {subj.code}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {subj.isCompulsory ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 text-[10.5px] font-bold">
                          Compulsory
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 text-[10.5px] font-semibold">
                          Elective
                        </span>
                      )}
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-emerald-800 dark:group-hover:text-emerald-400 transition-colors">
                    {subj.name}
                  </h3>

                  <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                    {subj.overview.replace(/^## Overview[^\n]*\n+/i, "").slice(0, 160)}...
                  </p>
                </div>

                {/* Footer row */}
                <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3 text-zinc-500 font-medium">
                    <span className="flex items-center gap-1">
                      <BookOpen size={13} />
                      <span>{subj.totalTopics} Topics</span>
                    </span>
                    <span>•</span>
                    <span>{subj.questionCount} Questions</span>
                  </div>

                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 dark:text-emerald-400 group-hover:translate-x-0.5 transition-transform">
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
