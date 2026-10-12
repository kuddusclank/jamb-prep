"use client";

import { Suspense, useState, useRef } from "react";
import { NativeApiClientError } from "@/lib/api/native-client";
import { useApiResource } from "@/lib/api/use-api-resource";
import Link from "next/link";
import { getAccountCoordinator } from "@/lib/auth/account-coordinator";

import { parseRfcCsv, sanitizeCell, buildImportBatches, escapeCsvCell } from "@/lib/admin-csv";

const CSV_HEADER = "template_version,external_reference,subject_code,topic_slug,subtopic_slug,stem,option_a,option_b,option_c,option_d,correct_option,explanation,difficulty,exam_year,source_type,source_reference,rights_note,passage_reference,passage_title,passage_content,image_url,image_alt,tags";

interface ParsedQuestion {
  templateVersion?:string;
  subtopicSlug?:string;
  passageReference?:string;
  tags?:string[];
  externalReference?:string;
  sourceType?:"original"|"past_question"|"adapted";
  sourceReference?:string;
  rightsNote?:string;
  imageAlt?:string;
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
  const jobs = useApiResource<{jobs:Array<{id:string;status:string;completed_rows:number;total_rows:number}>}>("/api/v1/admin/import-jobs");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rawText, setRawText] = useState("");
  const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestion[]>([]);
  const completedBatches = useRef(0);
  const [parseError, setParseError] = useState("");
  const [validationResults, setValidationResults] = useState<ValidationRow[] | null>(null);

  const [busy, setBusy] = useState(false);
  const [progressMsg, setProgressMsg] = useState("");
  const [receiptMsg, setReceiptMsg] = useState("");

  async function downloadTopicReference(){
    try{const data=await getAccountCoordinator().loadResource<{activeSubjects:Array<{code:string;name:string;is_active:boolean;topics:Array<{slug:string;title:string}>}>}>("/api/v1/admin/curriculum");
    const lines=["subject_code,subject_name,topic_slug,topic_title,student_subject_active"];
    for(const subject of data.activeSubjects)for(const topic of subject.topics)lines.push([subject.code,subject.name,topic.slug,topic.title,subject.is_active].map(escapeCsvCell).join(","));downloadCsvFile("jambprep_topic_reference.csv",lines.join("\r\n"));
    }catch(error){setParseError(error instanceof Error?error.message:"Unable to download topic reference.");}
  }
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

        const sourceType=header.includes("source_type") ? sanitizeCell(row[header.indexOf("source_type")]) || "original" : "original";
        if(!["original","past_question","adapted"].includes(sourceType))throw new Error(`Row ${r+1}: invalid source_type.`);
        const version=header.includes("template_version")?sanitizeCell(row[header.indexOf("template_version")]):undefined;
        if(version!==undefined&&version!=="v1")throw new Error(`Row ${r+1}: template_version must be v1.`);
        if(version&&!sanitizeCell(row[header.indexOf("external_reference")]??""))throw new Error(`Row ${r+1}: v1 needs an external_reference.`);
        questions.push({
          templateVersion:version,
          subtopicSlug:header.includes("subtopic_slug")?sanitizeCell(row[header.indexOf("subtopic_slug")]):"",
          passageReference:header.includes("passage_reference")?sanitizeCell(row[header.indexOf("passage_reference")]):"",
          tags:header.includes("tags")?sanitizeCell(row[header.indexOf("tags")]).split("|").map(t=>t.trim()).filter(Boolean):[],
          externalReference:header.includes("external_reference")?sanitizeCell(row[header.indexOf("external_reference")]):"",
          sourceType:sourceType as "original"|"past_question"|"adapted",
          sourceReference:header.includes("source_reference")?sanitizeCell(row[header.indexOf("source_reference")]):"",
          rightsNote:header.includes("rights_note")?sanitizeCell(row[header.indexOf("rights_note")]):"",
          imageAlt:header.includes("image_alt")?sanitizeCell(row[header.indexOf("image_alt")]):"",
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

  async function mutateWithRetry<T>(
    path: string,
    body: unknown,
    method: "POST" | "PUT" | "PATCH" = "POST",
    headers?: Record<string, string>,
    maxAttempts = 4
  ): Promise<T> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await getAccountCoordinator().mutate<T>(path, body, method, headers);
      } catch (error) {
        const isRetryableHttp =
          error instanceof NativeApiClientError &&
          (error.status === 408 || error.status === 429 || error.status >= 500);
        const isNetworkError = !(error instanceof NativeApiClientError);
        if ((isRetryableHttp || isNetworkError) && attempt < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 600 * attempt));
          continue;
        }
        throw error;
      }
    }
    throw new Error("Request retry limit exceeded.");
  }

  async function handleDryRunValidation() {
    if (parsedQuestions.length === 0) return;
    setBusy(true);
    setParseError("");
    setValidationResults(null);
    setProgressMsg("Running preflight validation checks…");

    try {
      const allRows: ValidationRow[] = [];
      for (const {offset,rows} of buildImportBatches(parsedQuestions)) {
        try {
          const res = await mutateWithRetry<{rows:ValidationRow[]}>("/api/v1/admin/questions/import/dry-run", rows, "POST");
          allRows.push(...res.rows.map(row => ({...row,row:row.row + offset})));
        } catch (error) {
          const details = error instanceof NativeApiClientError ? error.details?.map(detail => {
            const match = /^(\d+)\.(.+)$/.exec(detail.field ?? "");
            return `${match ? `Row ${offset + Number(match[1]) + 1}, ${match[2]}` : detail.field ?? "CSV"}: ${detail.issue}`;
          }).join("; ") : "";
          throw new Error(`Rows ${offset + 1}–${offset + rows.length}: ${details || (error instanceof Error ? error.message : "Validation request failed.")}`);
        }
      }
      setValidationResults(allRows);
      setProgressMsg(`Checked all ${allRows.length} rows: ${allRows.filter(row=>row.valid).length} valid.`);
    } catch (err) {
      setProgressMsg("");
      setParseError(`Preflight failed: ${err instanceof Error ? err.message : "Validation request failed."} No questions were imported.`);
    } finally {
      setBusy(false);
    }
  }

  async function handleBatchImport() {
    if (parsedQuestions.length === 0) return;
    setBusy(true);
    setParseError("");
    setReceiptMsg("");

    const batchSize = 10;
    let totalImported = Math.min(completedBatches.current * batchSize, parsedQuestions.length);

    try {
      const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(rawText.replace(/^\uFEFF/, "").replace(/\r\n/g,"\n").trim())));
      const fileHash = Array.from(bytes, b=>b.toString(16).padStart(2,"0")).join("");
      const job = await mutateWithRetry<{id:string;completed_rows:number;completed_batches:number;status:string}>("/api/v1/admin/import-jobs",{fileHash,totalRows:parsedQuestions.length});
      completedBatches.current = Number(job.completed_batches);
      totalImported = Number(job.completed_rows);
      const pendingBatches=buildImportBatches(parsedQuestions.slice(totalImported));
      const firstBatchIndex=completedBatches.current;
      for (let pendingIndex=0;pendingIndex<pendingBatches.length;pendingIndex++) {
        const i=firstBatchIndex+pendingIndex;
        const batch=pendingBatches[pendingIndex].rows;
        setProgressMsg(
          `Importing batch ${i + 1} (${Math.round(
            (totalImported / parsedQuestions.length) * 100
          )}%)...`
        );

        const res = await mutateWithRetry<{ importedCount: number; processedCount:number;skippedCount:number }>(
          "/api/v1/admin/questions/import",
          batch,
          "POST",
          {"X-Import-Job":job.id,"X-Import-Batch":String(i)}
        );
        totalImported += res.processedCount ?? batch.length;
        completedBatches.current = i + 1;
      }

      jobs.retry();
      setReceiptMsg(
        `Job ${job.id}: successfully imported processed ${totalImported} rows across ${completedBatches.current} batches into the question bank!`
      );
      setProgressMsg("");
      setParsedQuestions([]);
      setRawText("");
    } catch (err) {
      setProgressMsg("");
      jobs.retry();
      setParseError(
        `${totalImported} rows committed. Click "Import as Draft" again (or re-select this same CSV after a reload) to resume from the server receipt. ${err instanceof Error ? err.message : "Import failed."}`
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">


      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <section className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-950"><strong>Imports are recoverable.</strong> Upload the same file on any device signed into your admin account to resume; completed files will not import twice. {jobs.data?.jobs.map(job=><p key={job.id} className="mt-2 text-xs">{job.id.slice(0,8)} · {job.completed_rows}/{job.total_rows} rows · {job.status}</p>)}</section>
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
            <h2 className="font-bold text-slate-900">2. Subject and Topic Reference</h2>
            <p className="mt-1 text-xs text-slate-500">
              Download subject codes and canonical topic slugs from the database to fill in your question template.
            </p>
            <button type="button" onClick={()=>void downloadTopicReference()} className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-emerald-800">Download subject/topic reference</button>
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
              <strong>Import check:</strong> {parseError}
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
