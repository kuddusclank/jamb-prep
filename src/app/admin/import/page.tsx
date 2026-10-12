"use client";

import { Suspense, useState, useRef } from "react";
import Link from "next/link";
import { getAccountCoordinator } from "@/lib/auth/account-coordinator";

import { parseRfcCsv, sanitizeCell } from "@/lib/admin-csv";

const CSV_HEADER = "subject_code,topic_slug,stem,option_a,option_b,option_c,option_d,correct_option,explanation,difficulty,exam_year,passage_title,passage_content,image_url";
const SAMPLE_CSV_ROWS = [CSV_HEADER,'ENG,comprehension,"What is the opposite of hot?",Cold,Warm,Boiling,Heated,A,"Cold is the opposite of hot.",easy,,,,'].join("\r\n");

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
  const completedBatches = useRef(0);
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
    setParsedQuestions([]);
    completedBatches.current = 0;
    setValidationResults(null);
    setReceiptMsg("");

    try {
      if (new TextEncoder().encode(text).length > 1048576) throw new Error("CSV must be smaller than 1 MB.");
      const rows = parseRfcCsv(text);
      if (rows.length > 1001) throw new Error("Import up to 1,000 rows at a time.");
      if (rows.length < 2) {
        throw new Error("CSV must include a header row and at least one question row.");
      }

      const header = rows[0].map((h) => h.trim().toLowerCase());
      if (new Set(header).size !== header.length) throw new Error("CSV contains duplicate headers.");
      if (header.some(h => !CSV_HEADER.split(",").includes(h))) throw new Error("CSV contains unsupported headers. Download the current template.");
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
        if (row.length !== header.length) throw new Error(`Row ${r + 1}: incorrect number of columns.`);
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

        if (!["A", "B", "C", "D"].includes(correctRaw)) throw new Error(`Row ${r + 1}: correct_option must be A, B, C or D.`);
        if (diffRaw && !["easy", "medium", "hard"].includes(diffRaw)) throw new Error(`Row ${r + 1}: invalid difficulty.`);
        if (yearRaw && !/^\d{4}$/.test(yearRaw)) throw new Error(`Row ${r + 1}: exam_year must be a four-digit year.`);
        if (!topicTitle || !stem || !optionA || !optionB || !optionC || !optionD || !explanation) throw new Error(`Row ${r + 1}: complete all required question fields.`);
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
      const allRows: ValidationRow[] = [];
      for (let offset = 0; offset < parsedQuestions.length; offset += 10) {
        const res = await getAccountCoordinator().mutate<{rows:ValidationRow[]}>("/api/v1/admin/questions/import/dry-run", parsedQuestions.slice(offset, offset + 10), "POST");
        allRows.push(...res.rows.map(row => ({...row,row:row.row + offset})));
      }
      setValidationResults(allRows);
      setProgressMsg(`Checked all ${allRows.length} rows: ${allRows.filter(row=>row.valid).length} valid.`);
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
    let totalImported = Math.min(completedBatches.current * batchSize, parsedQuestions.length);

    try {
      for (let i = completedBatches.current; i < totalBatches; i++) {
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
        totalImported += res.importedCount ?? batch.length;
        completedBatches.current = i + 1;
      }

      setReceiptMsg(
        `Successfully imported draft ${totalImported} questions across ${totalBatches} batches into the question bank!`
      );
      setProgressMsg("");
      setParsedQuestions([]);
      setRawText("");
    } catch (err) {
      setParseError(
        `${totalImported} rows committed. Retry resumes at the next unfinished batch. ${err instanceof Error ? err.message : "Import failed."}`
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">


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
              disabled={busy}
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

          <textarea disabled={busy}
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
                  disabled={busy || !validationResults || validationResults.length !== parsedQuestions.length || validationResults.some(row => !row.valid)}
                  onClick={() => void handleBatchImport()}
                  className="rounded-xl bg-[#116149] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0e4e3b] disabled:opacity-50"
                >
                  {busy ? "Importing…" : `Import as Draft ${parsedQuestions.length} Questions`}
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
