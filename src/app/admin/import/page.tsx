"use client";

import { Suspense, useState, useRef } from "react";
import Link from "next/link";
import { getAccountCoordinator } from "@/lib/auth/account-coordinator";
import { AdminNav } from "../admin-nav";

// RFC 4180 CSV Parser
function parseRfcCsv(text: string): string[][] {
  const clean = text.replace(/^\uFEFF/, ""); // Remove UTF-8 BOM if present
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let inQuotes = false;

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    const nextChar = clean[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote: ""
          currentCell += '"';
          i++;
        } else {
          // Closing quote
          inQuotes = false;
        }
      } else {
        currentCell += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        currentRow.push(currentCell);
        currentCell = "";
      } else if (char === "\r") {
        if (nextChar === "\n") i++;
        currentRow.push(currentCell);
        rows.push(currentRow);
        currentRow = [];
        currentCell = "";
      } else if (char === "\n") {
        currentRow.push(currentCell);
        rows.push(currentRow);
        currentRow = [];
        currentCell = "";
      } else {
        currentCell += char;
      }
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell);
    rows.push(currentRow);
  }

  return rows.filter((r) => r.length > 0 && r.some((c) => c.trim().length > 0));
}

// Sanitize cell to prevent spreadsheet formula injection (=, +, -, @)
function sanitizeCell(value: string): string {
  const trimmed = value.trim();
  if (/^[=+\-@]/.test(trimmed)) {
    return trimmed.slice(1).trim();
  }
  return trimmed;
}

const CSV_HEADER = [
  "template_version",
  "external_reference",
  "subject_code",
  "topic_slug",
  "subtopic_slug",
  "stem",
  "option_a",
  "option_b",
  "option_c",
  "option_d",
  "correct_option",
  "explanation",
  "difficulty",
  "exam_year",
  "source_type",
  "source_reference",
  "rights_note",
  "passage_reference",
  "passage_title",
  "passage_content",
  "image_url",
  "image_alt",
  "tags",
].join(",");

const SAMPLE_CSV_ROWS = [
  CSV_HEADER,
  'v1,ENG-2024-001,ENG,"Comprehension",,"According to the passage, why did the author describe the migration as unusual?","The animals traveled during the daytime","The herd changed their usual migratory path","Predators were accompanying the herd","The journey was delayed by severe floods",B,"The author explicitly notes that the herd deviated from their standard southern trail due to unusual weather patterns.",medium,2024,past_question,"JAMB 2024 Paper",,,PASS-01,"The Serengeti Crossing","Each dry season, millions of wildebeest and zebras embark on an epic circular journey across the Mara River. However, this season presented an unexpected obstacle as unusual rainfall forced the herds to alter their ancestral path.",,,',
  'v1,MTH-2024-002,MTH,"Calculus",,"If $y = 3x^3 - 5x^2 + 4x - 7$, evaluate $\\frac{dy}{dx}$ at $x = 2$.","16","18","20","24",C,"Differentiating $y$ with respect to $x$: $\\frac{dy}{dx} = 9x^2 - 10x + 4$. At $x = 2$: $9(4) - 10(2) + 4 = 36 - 20 + 4 = 20$.",easy,2024,past_question,"JAMB 2024 Paper",,,,,,,',
  'v1,CHM-2024-003,CHM,"Separation of Mixtures",,"Which of the following methods is most suitable for separating a mixture of kerosene and water?","Fractional distillation","Paper chromatography","Using a separating funnel","Sublimation",C,"Kerosene and water are immiscible liquids with different densities; a separating funnel is used to separate them cleanly.",easy,2023,past_question,"JAMB 2023 Paper",,,,,,,',
].join("\n");

interface ParsedQuestion {
  subjectCode: string;
  topicTitle: string;
  stem: string;
  options: { A: string; B: string; C: string; D: string };
  correctOption: "A" | "B" | "C" | "D";
  explanation: string;
  difficulty?: "easy" | "medium" | "hard";
  examYear?: number | null;
  passageTitle?: string | null;
  passageContent?: string | null;
  imageUrl?: string | null;
}

interface ValidationRow {
  row: number;
  subjectCode: string;
  topicTitle: string;
  stemSnippet: string;
  valid: boolean;
  errors: string[];
}

function ImportContent() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rawText, setRawText] = useState("");
  const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestion[]>([]);
  const [parseError, setParseError] = useState("");
  const [validationResults, setValidationResults] = useState<ValidationRow[] | null>(null);

  const [busy, setBusy] = useState(false);
  const [progressMsg, setProgressMsg] = useState("");
  const [receiptMsg, setReceiptMsg] = useState("");

  function downloadCsvFile(filename: string, content: string) {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = (event.target?.result as string) || "";
      setRawText(content);
      parseCsvData(content);
    };
    reader.readAsText(file);
  }

  function parseCsvData(text: string) {
    setParseError("");
    setValidationResults(null);
    setReceiptMsg("");

    try {
      const rows = parseRfcCsv(text);
      if (rows.length < 2) {
        throw new Error("CSV must include a header row and at least one question row.");
      }

      const header = rows[0].map((h) => h.trim().toLowerCase());
      const subIdx = header.indexOf("subject_code");
      const topIdx = header.indexOf("topic_slug");
      const stemIdx = header.indexOf("stem");
      const aIdx = header.indexOf("option_a");
      const bIdx = header.indexOf("option_b");
      const cIdx = header.indexOf("option_c");
      const dIdx = header.indexOf("option_d");
      const correctIdx = header.indexOf("correct_option");
      const expIdx = header.indexOf("explanation");
      const diffIdx = header.indexOf("difficulty");
      const yearIdx = header.indexOf("exam_year");
      const pTitleIdx = header.indexOf("passage_title");
      const pContentIdx = header.indexOf("passage_content");
      const imgIdx = header.indexOf("image_url");

      if (
        subIdx === -1 ||
        topIdx === -1 ||
        stemIdx === -1 ||
        aIdx === -1 ||
        bIdx === -1 ||
        cIdx === -1 ||
        dIdx === -1 ||
        correctIdx === -1 ||
        expIdx === -1
      ) {
        throw new Error(
          "Missing required headers. CSV must have: subject_code, topic_slug, stem, option_a, option_b, option_c, option_d, correct_option, explanation."
        );
      }

      const questions: ParsedQuestion[] = [];
      for (let r = 1; r < rows.length; r++) {
        const row = rows[r];
        const subjectCode = sanitizeCell(row[subIdx] || "").toUpperCase();
        const topicTitle = sanitizeCell(row[topIdx] || "");
        const stem = sanitizeCell(row[stemIdx] || "");
        const optionA = sanitizeCell(row[aIdx] || "");
        const optionB = sanitizeCell(row[bIdx] || "");
        const optionC = sanitizeCell(row[cIdx] || "");
        const optionD = sanitizeCell(row[dIdx] || "");
        const correctRaw = sanitizeCell(row[correctIdx] || "").toUpperCase();
        const explanation = sanitizeCell(row[expIdx] || "");
        const diffRaw = diffIdx !== -1 ? sanitizeCell(row[diffIdx] || "").toLowerCase() : "medium";
        const yearRaw = yearIdx !== -1 ? sanitizeCell(row[yearIdx] || "") : "";
        const passageTitle = pTitleIdx !== -1 ? sanitizeCell(row[pTitleIdx] || "") : "";
        const passageContent = pContentIdx !== -1 ? sanitizeCell(row[pContentIdx] || "") : "";
        const imageUrl = imgIdx !== -1 ? sanitizeCell(row[imgIdx] || "") : "";

        const correctOption = (["A", "B", "C", "D"].includes(correctRaw) ? correctRaw : "A") as "A" | "B" | "C" | "D";
        const difficulty = (["easy", "medium", "hard"].includes(diffRaw) ? diffRaw : "medium") as "easy" | "medium" | "hard";
        const examYear = yearRaw ? parseInt(yearRaw, 10) || null : null;

        questions.push({
          subjectCode,
          topicTitle: topicTitle || "General",
          stem,
          options: { A: optionA, B: optionB, C: optionC, D: optionD },
          correctOption,
          explanation,
          difficulty,
          examYear,
          passageTitle: passageTitle || null,
          passageContent: passageContent || null,
          imageUrl: imageUrl || null,
        });
      }

      setParsedQuestions(questions);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "Failed to parse CSV.");
      setParsedQuestions([]);
    }
  }

  async function handleDryRunValidation() {
    if (parsedQuestions.length === 0) return;
    setBusy(true);
    setProgressMsg("Running preflight validation checks…");

    try {
      // Validate first batch of up to 10
      const checkSlice = parsedQuestions.slice(0, 10);
      const res = await getAccountCoordinator().mutate<{
        totalRows: number;
        validCount: number;
        invalidCount: number;
        rows: ValidationRow[];
      }>("/api/v1/admin/questions/import/dry-run", checkSlice, "POST");

      setValidationResults(res.rows);
      setProgressMsg(
        `Preflight check complete: ${res.validCount} valid of ${res.totalRows} tested.`
      );
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "Validation request failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleBatchImport() {
    if (parsedQuestions.length === 0) return;
    setBusy(true);
    setReceiptMsg("");

    const batchSize = 10;
    const totalBatches = Math.ceil(parsedQuestions.length / batchSize);
    let totalImported = 0;

    try {
      for (let i = 0; i < totalBatches; i++) {
        const batch = parsedQuestions.slice(i * batchSize, (i + 1) * batchSize);
        setProgressMsg(
          `Importing batch ${i + 1} of ${totalBatches} (${Math.round(
            (i / totalBatches) * 100
          )}%)...`
        );

        const res = await getAccountCoordinator().mutate<{ importedCount: number }>(
          "/api/v1/admin/questions/import",
          batch,
          "POST"
        );
        totalImported += res.importedCount || batch.length;
      }

      setReceiptMsg(
        `🎉 Successfully published ${totalImported} questions across ${totalBatches} batches into the question bank!`
      );
      setProgressMsg("");
      setParsedQuestions([]);
      setRawText("");
    } catch (err) {
      setParseError(
        err instanceof Error ? err.message : "Batch import failed midway. Partial records retained."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      <AdminNav />

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            CSV Template & Bulk Import Tool
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Download standard RFC 4180 templates, inspect LaTeX math syntax, preview row validation, and safely batch-import questions.
          </p>
        </div>

        {/* Section 1: Template Downloads */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <h2 className="font-bold text-slate-900">1. Blank Template CSV</h2>
            <p className="mt-1 text-xs text-slate-500">
              Download the standard UTF-8 header template with columns for stem, choices, correct key, passage, and year.
            </p>
            <button
              type="button"
              onClick={() => downloadCsvFile("jambprep_question_template.csv", CSV_HEADER)}
              className="mt-4 inline-flex items-center rounded-xl bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-200"
            >
              📥 Download Blank Template
            </button>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <h2 className="font-bold text-slate-900">2. Sample Pre-Filled CSV</h2>
            <p className="mt-1 text-xs text-slate-500">
              Download 3 example questions (English comprehension with passage, Mathematics with KaTeX formulas, and Chemistry).
            </p>
            <button
              type="button"
              onClick={() => downloadCsvFile("jambprep_sample_questions.csv", SAMPLE_CSV_ROWS)}
              className="mt-4 inline-flex items-center rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-2 text-xs font-semibold text-[#116149] hover:bg-emerald-100"
            >
              📥 Download Sample CSV
            </button>
          </div>
        </div>

        {/* Section 2: Upload or Paste CSV */}
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          <h2 className="text-base font-bold text-slate-900">3. Select or Paste CSV File</h2>
          <p className="mt-1 text-xs text-slate-500">
            Supports multi-line stems with quotes and embedded commas. Batches commit in serialized chunks of up to 10 rows.
          </p>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              type="file"
              ref={fileInputRef}
              accept=".csv,text/csv"
              onChange={handleFileSelected}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-700 hover:bg-slate-100 text-center"
            >
              📁 Choose .CSV File from Device
            </button>

            <span className="text-xs text-slate-400 text-center sm:text-left">
              or paste CSV text directly into the area below:
            </span>
          </div>

          <textarea
            rows={8}
            placeholder="Paste your CSV content here..."
            value={rawText}
            onChange={(e) => {
              setRawText(e.target.value);
              parseCsvData(e.target.value);
            }}
            className="mt-3 w-full rounded-xl border border-slate-200 p-3 font-mono text-xs text-slate-800 focus:border-[#116149] focus:outline-hidden"
          />

          {parseError && (
            <div role="alert" className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
              <strong>Parse Error:</strong> {parseError}
            </div>
          )}

          {receiptMsg && (
            <div role="status" className="mt-4 rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900">
              {receiptMsg}
            </div>
          )}
        </div>

        {/* Section 3: Parsed Rows Preview & Validation */}
        {parsedQuestions.length > 0 && (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  4. Parsed Questions ({parsedQuestions.length} Rows)
                </h2>
                <p className="text-xs text-slate-500">
                  Preview before committing. Running preflight checks ensures subjects and options are valid.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleDryRunValidation()}
                  className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Run Preflight Check
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleBatchImport()}
                  className="rounded-xl bg-[#116149] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0e4e3b] disabled:opacity-50"
                >
                  {busy ? "Importing…" : `Commit & Publish ${parsedQuestions.length} Questions`}
                </button>
              </div>
            </div>

            {progressMsg && (
              <div className="mt-3 text-xs font-semibold text-[#116149]">
                {progressMsg}
              </div>
            )}

            {/* Preview Table */}
            <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600">
                  <tr>
                    <th className="px-3 py-2">#</th>
                    <th className="px-3 py-2">Subject</th>
                    <th className="px-3 py-2">Topic</th>
                    <th className="px-3 py-2">Stem Excerpt</th>
                    <th className="px-3 py-2">Key</th>
                    <th className="px-3 py-2">Diff</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {parsedQuestions.slice(0, 10).map((q, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="px-3 py-2 font-mono text-slate-400">{idx + 1}</td>
                      <td className="px-3 py-2 font-mono font-bold text-[#116149]">{q.subjectCode}</td>
                      <td className="px-3 py-2">{q.topicTitle}</td>
                      <td className="px-3 py-2 max-w-xs truncate">{q.stem}</td>
                      <td className="px-3 py-2 font-bold text-emerald-700">{q.correctOption}</td>
                      <td className="px-3 py-2 capitalize">{q.difficulty || "medium"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {parsedQuestions.length > 10 && (
              <p className="mt-2 text-center text-xs text-slate-400">
                Showing first 10 of {parsedQuestions.length} questions. All rows will commit sequentially.
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default function ImportPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50">
          <AdminNav />
          <div className="mx-auto max-w-7xl p-8 text-center text-sm text-slate-500">
            Loading CSV Import Tool…
          </div>
        </div>
      }
    >
      <ImportContent />
    </Suspense>
  );
}
