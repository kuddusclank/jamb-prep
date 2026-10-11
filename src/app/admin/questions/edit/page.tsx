"use client";

import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useApiResource } from "@/lib/api/use-api-resource";
import { getAccountCoordinator } from "@/lib/auth/account-coordinator";
import { MathRenderer } from "@/components/math-renderer";
import { AdminNav } from "../../admin-nav";

interface SubjectItem {
  id: string;
  code: string;
  name: string;
  topics: Array<{ id: string; title: string; slug: string }>;
}

interface CurriculumResponse {
  activeSubjects: SubjectItem[];
}

interface QuestionDetailResponse {
  question: {
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
    passage_id: string | null;
    passage_title: string | null;
    passage_content: string | null;
    options: Array<{ id: string; label: string; content: string; is_correct: boolean }>;
    explanation: string | null;
  };
}

function QuestionEditorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const questionId = searchParams.get("questionId");
  const duplicateId = searchParams.get("duplicateId");
  const targetId = questionId || duplicateId;

  const curriculumRes = useApiResource<CurriculumResponse>("/api/v1/admin/curriculum");
  const existingRes = useApiResource<QuestionDetailResponse>(
    targetId ? `/api/v1/admin/questions/${targetId}` : ""
  );

  const [subjectCode, setSubjectCode] = useState("ENG");
  const [topicMode, setTopicMode] = useState<"existing" | "custom">("existing");
  const [topicTitle, setTopicTitle] = useState("");
  const [stem, setStem] = useState("");
  const [optionA, setOptionA] = useState("");
  const [optionB, setOptionB] = useState("");
  const [optionC, setOptionC] = useState("");
  const [optionD, setOptionD] = useState("");
  const [correctOption, setCorrectOption] = useState<"A" | "B" | "C" | "D">("A");
  const [explanation, setExplanation] = useState("");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [examYear, setExamYear] = useState<string>("");
  const [imageUrl, setImageUrl] = useState("");
  const [hasPassage, setHasPassage] = useState(false);
  const [passageTitle, setPassageTitle] = useState("");
  const [passageContent, setPassageContent] = useState("");

  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Populate from existing question if editing or duplicating
  useEffect(() => {
    if (existingRes.data?.question) {
      const q = existingRes.data.question;
      setSubjectCode(q.subject_code);
      setTopicTitle(q.topic_title);
      setTopicMode("custom"); // Preload topic title safely
      setStem(q.stem);

      const a = q.options.find((o) => o.label === "A");
      const b = q.options.find((o) => o.label === "B");
      const c = q.options.find((o) => o.label === "C");
      const d = q.options.find((o) => o.label === "D");

      if (a) setOptionA(a.content);
      if (b) setOptionB(b.content);
      if (c) setOptionC(c.content);
      if (d) setOptionD(d.content);

      const correct = q.options.find((o) => o.is_correct);
      if (correct && ["A", "B", "C", "D"].includes(correct.label)) {
        setCorrectOption(correct.label as "A" | "B" | "C" | "D");
      }

      setExplanation(q.explanation || "");
      setDifficulty(q.difficulty);
      setExamYear(q.exam_year ? String(q.exam_year) : "");
      setImageUrl(q.image_url || "");

      if (q.passage_content) {
        setHasPassage(true);
        setPassageTitle(q.passage_title || "");
        setPassageContent(q.passage_content || "");
      }
    }
  }, [existingRes.data]);

  const subjects = curriculumRes.data?.activeSubjects || [];
  const activeSubjectObj = subjects.find((s) => s.code === subjectCode);
  const subjectTopics = activeSubjectObj?.topics || [];

  async function handleSave(status: "draft" | "published") {
    setErrorMsg("");
    setSuccessMsg("");

    // Client-side validation
    if (!subjectCode) {
      setErrorMsg("Please select a subject.");
      return;
    }
    const finalTopic = topicTitle.trim();
    if (!finalTopic || finalTopic.length < 2) {
      setErrorMsg("Please provide a valid topic title (at least 2 characters).");
      return;
    }
    if (!stem.trim() || stem.trim().length < 5) {
      setErrorMsg("Question stem must be at least 5 characters.");
      return;
    }
    if (!optionA.trim() || !optionB.trim() || !optionC.trim() || !optionD.trim()) {
      setErrorMsg("All four options (A, B, C, and D) are required.");
      return;
    }
    if (!explanation.trim() || explanation.trim().length < 5) {
      setErrorMsg("A detailed explanation is required (at least 5 characters).");
      return;
    }

    const payload = {
      subjectCode,
      topicTitle: finalTopic,
      stem: stem.trim(),
      options: {
        A: optionA.trim(),
        B: optionB.trim(),
        C: optionC.trim(),
        D: optionD.trim(),
      },
      correctOption,
      explanation: explanation.trim(),
      difficulty,
      examYear: examYear.trim() ? parseInt(examYear.trim(), 10) : null,
      imageUrl: imageUrl.trim() || null,
      passageTitle: hasPassage && passageTitle.trim() ? passageTitle.trim() : null,
      passageContent: hasPassage && passageContent.trim() ? passageContent.trim() : null,
      status,
    };

    setBusy(true);
    try {
      if (questionId) {
        // Update existing question
        await getAccountCoordinator().mutate(
          `/api/v1/admin/questions/${questionId}`,
          payload,
          "PUT"
        );
        setSuccessMsg(`Question updated successfully as ${status}!`);
      } else {
        // Create new question
        const res = await getAccountCoordinator().mutate<{ questionId: string }>(
          "/api/v1/admin/questions",
          payload,
          "POST"
        );
        setSuccessMsg(`Question created successfully as ${status}!`);
        if (status === "published") {
          setTimeout(() => router.push(`/admin/questions/?subject=${subjectCode}`), 1200);
        }
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to save question.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      <AdminNav />

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              {questionId ? "Edit Question" : duplicateId ? "Duplicate Question" : "Create New Question"}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Enter question stem, LaTeX formulas, four choices with correct answer, and explanation.
            </p>
          </div>

          <Link
            href="/admin/questions/"
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50"
          >
            ← Back to Library
          </Link>
        </div>

        {errorMsg && (
          <div role="alert" className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            <strong>Error:</strong> {errorMsg}
          </div>
        )}

        {successMsg && (
          <div role="status" className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            <strong>Success:</strong> {successMsg}
          </div>
        )}

        <form onSubmit={(e) => e.preventDefault()} className="mt-6 space-y-6">
          {/* Section 1: Subject & Topic Hierarchy */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <h2 className="text-base font-bold text-slate-900">1. Curriculum Taxonomy</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="question-subject" className="block text-xs font-semibold uppercase text-slate-500">
                  Subject *
                </label>
                <select
                  id="question-subject"
                  value={subjectCode}
                  onChange={(e) => {
                    setSubjectCode(e.target.value);
                    setTopicTitle("");
                  }}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-[#116149] focus:outline-hidden"
                >
                  {subjects.map((sub) => (
                    <option key={sub.code} value={sub.code}>
                      {sub.code} — {sub.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="question-topic" className="block text-xs font-semibold uppercase text-slate-500">
                    Topic *
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setTopicMode(topicMode === "existing" ? "custom" : "existing");
                      setTopicTitle("");
                    }}
                    className="text-xs text-[#116149] hover:underline"
                  >
                    {topicMode === "existing" ? "+ New Custom Topic" : "Select Existing Topic"}
                  </button>
                </div>

                {topicMode === "existing" && subjectTopics.length > 0 ? (
                  <select
                    id="question-topic"
                    value={topicTitle}
                    onChange={(e) => setTopicTitle(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-[#116149] focus:outline-hidden"
                  >
                    <option value="">-- Choose a Topic --</option>
                    {subjectTopics.map((t) => (
                      <option key={t.id} value={t.title}>
                        {t.title}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    id="question-topic"
                    placeholder="Enter topic title (e.g. Calculus, Periodic Table)..."
                    value={topicTitle}
                    onChange={(e) => setTopicTitle(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-[#116149] focus:outline-hidden"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Optional Reading Passage */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Reading Passage (Optional)</h2>
                <p className="text-xs text-slate-500">
                  Comprehension passages for English, Literature, or context-dependent questions.
                </p>
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={hasPassage}
                  onChange={(e) => setHasPassage(e.target.checked)}
                  className="rounded border-slate-300 text-[#116149] focus:ring-[#116149]"
                />
                Include Passage
              </label>
            </div>

            {hasPassage && (
              <div className="mt-4 space-y-3 border-t border-slate-100 pt-3">
                <div>
                  <label htmlFor="passage-title" className="block text-xs font-medium text-slate-600">
                    Passage Title (Optional)
                  </label>
                  <input
                    type="text"
                    id="passage-title"
                    placeholder="e.g. Passage I: The Impact of Technology"
                    value={passageTitle}
                    onChange={(e) => setPassageTitle(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-[#116149] focus:outline-hidden"
                  />
                </div>
                <div>
                  <label htmlFor="passage-content" className="block text-xs font-medium text-slate-600">
                    Passage Text
                  </label>
                  <textarea
                    id="passage-content"
                    rows={6}
                    placeholder="Paste the full passage text here..."
                    value={passageContent}
                    onChange={(e) => setPassageContent(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-800 leading-relaxed focus:border-[#116149] focus:outline-hidden"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Question Stem with Live KaTeX Preview */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">2. Question Stem *</h2>
              <span className="text-xs text-slate-400">
                Use <code className="rounded bg-slate-100 px-1 font-mono text-[11px]">$math$</code> for formulas
              </span>
            </div>

            <textarea
              rows={4}
              placeholder="Enter the question text. Example: Solve for $x$ in $2x^2 + 5x - 3 = 0$."
              value={stem}
              onChange={(e) => setStem(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-800 leading-relaxed focus:border-[#116149] focus:outline-hidden font-mono"
            />

            {/* Live KaTeX Preview */}
            {stem.trim() && (
              <div className="mt-3 rounded-xl border border-dashed border-emerald-300 bg-emerald-50/40 p-3.5">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                  Live Preview:
                </span>
                <div className="mt-1 text-sm leading-relaxed text-slate-900">
                  <MathRenderer content={stem} />
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Options A-D with Correct Option Selection */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">3. Answer Choices (A–D) *</h2>
              <span className="text-xs font-semibold text-emerald-700">
                Select the radio button for the correct key
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {[
                { label: "A" as const, val: optionA, setVal: setOptionA },
                { label: "B" as const, val: optionB, setVal: setOptionB },
                { label: "C" as const, val: optionC, setVal: setOptionC },
                { label: "D" as const, val: optionD, setVal: setOptionD },
              ].map(({ label, val, setVal }) => {
                const isSelected = correctOption === label;
                return (
                  <div
                    key={label}
                    className={`rounded-xl border p-3 transition ${
                      isSelected
                        ? "border-emerald-400 bg-emerald-50/60 shadow-xs"
                        : "border-slate-200 bg-slate-50/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <label className="flex cursor-pointer items-center gap-2">
                        <input
                          type="radio"
                          name="correct-option"
                          checked={isSelected}
                          onChange={() => setCorrectOption(label)}
                          className="h-4 w-4 text-emerald-600 focus:ring-emerald-500"
                        />
                        <span
                          className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                            isSelected
                              ? "bg-emerald-600 text-white"
                              : "bg-slate-200 text-slate-700"
                          }`}
                        >
                          {label}
                        </span>
                      </label>

                      <input
                        type="text"
                        placeholder={`Option ${label} text (LaTeX supported: $...$)`}
                        value={val}
                        onChange={(e) => setVal(e.target.value)}
                        className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800 focus:border-[#116149] focus:outline-hidden"
                      />

                      {isSelected && (
                        <span className="text-xs font-bold text-emerald-700">
                          ✓ Correct Key
                        </span>
                      )}
                    </div>

                    {/* Mini live preview of option formula if $ present */}
                    {val.includes("$") && (
                      <div className="mt-2 pl-9 text-xs text-slate-700">
                        <span className="text-[10px] text-slate-400">Preview: </span>
                        <MathRenderer content={val} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 4: Detailed Explanation */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <h2 className="text-base font-bold text-slate-900">4. Detailed Solution & Explanation *</h2>
            <p className="mt-1 text-xs text-slate-500">
              Shown to candidates during review and practice mode. Explain why the correct option is right.
            </p>

            <textarea
              rows={4}
              placeholder="Step-by-step solution, formula derivation, or grammatical explanation..."
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-800 leading-relaxed focus:border-[#116149] focus:outline-hidden font-mono"
            />

            {explanation.trim() && (
              <div className="mt-3 rounded-xl border border-dashed border-emerald-300 bg-emerald-50/40 p-3.5">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                  Explanation Preview:
                </span>
                <div className="mt-1 text-xs leading-relaxed text-slate-800">
                  <MathRenderer content={explanation} />
                </div>
              </div>
            )}
          </div>

          {/* Section 5: Metadata (Difficulty, Year, Image URL) */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <h2 className="text-base font-bold text-slate-900">5. Question Metadata</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div>
                <label htmlFor="meta-difficulty" className="block text-xs font-semibold uppercase text-slate-500">
                  Difficulty Level
                </label>
                <select
                  id="meta-difficulty"
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as "easy" | "medium" | "hard")}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>

              <div>
                <label htmlFor="meta-year" className="block text-xs font-semibold uppercase text-slate-500">
                  JAMB Exam Year (Optional)
                </label>
                <input
                  type="number"
                  id="meta-year"
                  placeholder="e.g. 2024"
                  min="1978"
                  max="2030"
                  value={examYear}
                  onChange={(e) => setExamYear(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-[#116149] focus:outline-hidden"
                />
              </div>

              <div>
                <label htmlFor="meta-image" className="block text-xs font-semibold uppercase text-slate-500">
                  Diagram Image URL (Optional)
                </label>
                <input
                  type="url"
                  id="meta-image"
                  placeholder="https://..."
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-[#116149] focus:outline-hidden"
                />
              </div>
            </div>

            {imageUrl && (
              <div className="mt-4 border-t border-slate-100 pt-3">
                <span className="text-xs text-slate-500">Image Preview:</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt="Question Diagram Preview"
                  className="mt-1 max-h-48 rounded-xl border border-slate-200 object-contain"
                />
              </div>
            )}
          </div>

          {/* Form Actions Footer */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-6">
            <Link
              href="/admin/questions/"
              className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </Link>

            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleSave("draft")}
                className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-xs hover:bg-slate-50 disabled:opacity-50"
              >
                {busy ? "Saving…" : "Save as Draft"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleSave("published")}
                className="rounded-xl bg-[#116149] px-6 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-[#0e4e3b] disabled:opacity-50"
              >
                {busy ? "Publishing…" : "Publish Question"}
              </button>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}

export default function QuestionEditorPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50">
          <AdminNav />
          <div className="mx-auto max-w-7xl p-8 text-center text-sm text-slate-500">
            Loading Question Editor…
          </div>
        </div>
      }
    >
      <QuestionEditorContent />
    </Suspense>
  );
}
