"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  X, 
  Upload, 
  Download, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ArrowRight
} from "lucide-react";

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (newStudents: any[]) => void;
  schoolCode: string;
}

interface ParsedStudent {
  firstName: string;
  lastName: string;
  email: string;
  studentIdentifier: string;
  phone: string;
  isValid: boolean;
  errorReason?: string;
}

export function CsvImportModal({ isOpen, onClose, onImportComplete, schoolCode }: CsvImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedStudent[]>([]);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<any | null>(null);

  if (!isOpen) return null;

  const downloadSampleTemplate = () => {
    const csvContent = 
`first_name,last_name,email,student_id,phone,target_year
Chinedu,Okonkwo,c.okonkwo@school.edu.ng,ST-101,08012345678,2026
Amina,Bello,a.bello@school.edu.ng,ST-102,08023456789,2026
David,Adeleke,d.adeleke@school.edu.ng,ST-103,08034567890,2026
Fatima,Danjuma,f.danjuma@school.edu.ng,ST-104,08045678901,2026`;

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "jambprep_student_roster_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setError(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        if (!text) throw new Error("Empty file uploaded");

        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
        if (lines.length < 2) throw new Error("CSV file must contain a header row and at least one student.");

        const headerLine = lines[0].toLowerCase();
        const headers = headerLine.split(",").map((h) => h.trim().replace(/^["']|["']$/g, ""));

        const fnIdx = headers.findIndex((h) => h.includes("first") || h === "fname" || h === "first_name");
        const lnIdx = headers.findIndex((h) => h.includes("last") || h.includes("surname") || h === "last_name");
        const emIdx = headers.findIndex((h) => h.includes("email") || h === "mail");
        const idIdx = headers.findIndex((h) => h.includes("id") || h.includes("reg") || h.includes("admission"));
        const phIdx = headers.findIndex((h) => h.includes("phone") || h.includes("mobile"));

        if (fnIdx === -1 || lnIdx === -1 || emIdx === -1) {
          throw new Error("CSV must include columns for First Name, Last Name / Surname, and Email address.");
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const seenEmails = new Set<string>();

        const parsed: ParsedStudent[] = lines.slice(1).map((line, idx) => {
          const parts = line.split(",").map((p) => p.trim().replace(/^["']|["']$/g, ""));
          const firstName = parts[fnIdx] || "";
          const lastName = parts[lnIdx] || "";
          const email = parts[emIdx] || "";
          const studentIdentifier = idIdx !== -1 ? (parts[idIdx] || "") : "";
          const phone = phIdx !== -1 ? (parts[phIdx] || "") : "";

          let isValid = true;
          let errorReason = "";

          if (!firstName || !lastName) {
            isValid = false;
            errorReason = "Missing name";
          } else if (!email || !emailRegex.test(email)) {
            isValid = false;
            errorReason = "Invalid email format";
          } else if (seenEmails.has(email.toLowerCase())) {
            isValid = false;
            errorReason = "Duplicate email in CSV";
          } else {
            seenEmails.add(email.toLowerCase());
          }

          return {
            firstName,
            lastName,
            email,
            studentIdentifier,
            phone,
            isValid,
            errorReason,
          };
        });

        setParsedRows(parsed);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to parse CSV file.");
        setParsedRows([]);
      }
    };
    reader.readAsText(file);
  };

  const handleCommitImport = async () => {
    const validRows = parsedRows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      setError("No valid candidates found in CSV file.");
      return;
    }

    setIsPending(true);
    setError(null);

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "https://jambprep-api-foundation.abdulquddus-akanbi.workers.dev";
      const supabase = createClient();
      const sessionRes = await supabase.auth.getSession();
      const token = sessionRes?.data?.session?.access_token;

      if (!token) {
        throw new Error("Your administrator session has expired. Please sign in again to import candidates.");
      }

      const res = await fetch(`${apiBase}/api/v1/schools/students`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          students: validRows.map((r) => ({
            firstName: r.firstName,
            lastName: r.lastName,
            email: r.email,
            studentIdentifier: r.studentIdentifier || null,
            phone: r.phone || null,
          })),
          ingestionMethod: "csv",
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          (typeof data?.error === "string" && data.error) ||
          data?.error?.message ||
          data?.message ||
          "Could not complete batch candidate ingestion. Please verify your CSV rows and try again.";
        throw new Error(msg);
      }

      const roster = Array.isArray(data?.roster) ? data.roster : Array.isArray(data?.students) ? data.students : [];
      const skipped = Array.isArray(data?.skipped) ? data.skipped : [];
      const result = {
        success: true,
        totalReceived: validRows.length,
        importedCount: data?.count ?? roster.length,
        skippedCount: data?.skippedCount ?? skipped.length,
        skipped,
        roster,
      };

      setImportResult(result);
      if (roster.length > 0) {
        onImportComplete(roster);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "A network error occurred during import.");
    } finally {
      setIsPending(false);
    }
  };

  const downloadClassroomHandout = () => {
    if (!importResult?.roster) return;

    let csv = "Student Name,Login Email,Default Password,Student ID,Instructions\n";
    for (const student of importResult.roster) {
      const safeName = `"${student.name.replace(/"/g, '""')}"`;
      const instructions = `"Log in at https://jambprep.com/login using your email and default password. Choose your 4 UTME subjects to start CBT practice."`;
      csv += `${safeName},${student.email},${student.defaultPassword},${student.studentIdentifier || ""},${instructions}\n`;
    }

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${schoolCode}_Classroom_Credential_Handout.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const validCount = parsedRows.filter((r) => r.isValid).length;
  const invalidCount = parsedRows.length - validCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-lg rounded-2xl bg-white p-6 sm:p-7 text-slate-900 border border-slate-200 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 flex size-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
          aria-label="Close modal"
        >
          <X size={16} />
        </button>

        {importResult ? (
          <div className="space-y-6 text-center py-2">
            <div className="size-12 rounded-xl bg-[#EAF4EF] text-[#12664F] flex items-center justify-center mx-auto border border-[#12664F]/15">
              <CheckCircle2 size={24} />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base sm:text-lg font-semibold text-slate-900">Batch Ingestion Completed</h3>
              <p className="text-xs text-slate-500 font-normal">
                <span className="font-medium text-slate-800">{importResult.importedCount}</span> student accounts provisioned under school code <span className="font-mono font-medium text-[#12664F]">{schoolCode}</span>.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/75 p-4 text-left space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between font-sans">
                <span className="text-slate-500 text-xs">Roster Summary:</span>
                <span className="text-[#12664F] font-mono font-medium bg-[#EAF4EF] px-2 py-0.5 rounded border border-[#12664F]/20 text-[11px]">{importResult.importedCount} accounts ready</span>
              </div>
              {importResult.skippedCount > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-[11px] text-amber-900 space-y-1 font-sans">
                  <p className="font-medium">
                    {importResult.skippedCount} row(s) skipped due to conflicts:
                  </p>
                  {Array.isArray(importResult.skipped) &&
                    importResult.skipped.slice(0, 5).map((item: { email: string; reason: string }, idx: number) => (
                      <p key={idx} className="font-mono text-[10px] text-amber-800">
                        • {item.email}: {item.reason}
                      </p>
                    ))}
                </div>
              )}
              <p className="text-xs text-slate-500 font-sans font-normal leading-relaxed">
                Default passwords have been set to each candidate&apos;s uppercase surname. Download the printable classroom handout below to distribute credentials to students in the lab.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <button
                type="button"
                onClick={downloadClassroomHandout}
                className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-[#12664F] px-4 text-xs font-medium text-white hover:bg-[#0B3028] transition cursor-pointer"
              >
                <Download size={14} />
                <span>Download Lab Handout (.csv)</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                <span>Return to Portal</span>
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3.5">
                <div className="size-10 rounded-xl bg-[#EAF4EF] text-[#12664F] flex items-center justify-center border border-[#12664F]/15">
                  <FileSpreadsheet size={18} />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-semibold tracking-tight text-slate-900">Bulk CSV Ingestion</h2>
                  <p className="text-xs text-slate-500 font-normal">Upload cohort roster under {schoolCode}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={downloadSampleTemplate}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                title="Download formatted CSV template"
              >
                <Download size={13} />
                <span className="hidden sm:inline">CSV Template</span>
              </button>
            </div>

            {error && (
              <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50/70 p-3 text-xs text-red-800 flex items-start gap-2.5">
                <AlertCircle size={15} className="shrink-0 mt-0.5 text-red-600" />
                <span>{error}</span>
              </div>
            )}

            {/* Upload Drag & Drop Area */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="cursor-pointer rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/60 p-7 text-center hover:border-[#12664F] hover:bg-[#EAF4EF]/25 transition-all"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className="size-10 rounded-xl bg-white border border-slate-200 text-slate-500 flex items-center justify-center mx-auto mb-3">
                <Upload size={18} />
              </div>
              <p className="text-xs font-semibold text-slate-800">
                {fileName ? fileName : "Click to select or drop student CSV file"}
              </p>
              <p className="mt-1 text-[11px] text-slate-400 font-normal">
                Supports standard .csv format with headers: first_name, last_name, email
              </p>
            </div>

            {/* Preflight Analysis Results */}
            {parsedRows.length > 0 && (
              <div className="mt-5 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-800">Preflight Validation:</span>
                  <div className="flex gap-2 text-[11px]">
                    <span className="font-medium text-[#12664F] bg-[#EAF4EF] px-2.5 py-0.5 rounded-md border border-[#12664F]/20">
                      {validCount} Ready
                    </span>
                    {invalidCount > 0 && (
                      <span className="font-medium text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200">
                        {invalidCount} Skipped
                      </span>
                    )}
                  </div>
                </div>

                <div className="max-h-36 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2.5 text-xs divide-y divide-slate-100 font-mono">
                  {parsedRows.slice(0, 10).map((row, idx) => (
                    <div key={idx} className="py-1.5 px-2 flex items-center justify-between text-[11px]">
                      <span className="truncate max-w-[220px] text-slate-800 font-sans">
                        {row.firstName} {row.lastName} ({row.email})
                      </span>
                      {row.isValid ? (
                        <span className="text-[#12664F] font-semibold text-[10px]">PASS</span>
                      ) : (
                        <span className="text-red-600 font-medium text-[10px]">{row.errorReason}</span>
                      )}
                    </div>
                  ))}
                  {parsedRows.length > 10 && (
                    <div className="py-1.5 px-2 text-[10px] text-slate-400 italic text-center font-sans">
                      + {parsedRows.length - 10} additional candidates
                    </div>
                  )}
                </div>

                {/* Password Rule Notice */}
                <p className="text-[11px] text-slate-500 font-normal">
                  Note: Default password for every candidate will be set to their uppercase surname (e.g. OKONKWO).
                </p>
              </div>
            )}

            <div className="mt-6 flex gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="min-h-10 flex-1 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-600 hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending || validCount === 0}
                onClick={handleCommitImport}
                className="min-h-10 flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#12664F] text-xs font-medium text-white hover:bg-[#0B3028] disabled:opacity-40 transition cursor-pointer"
              >
                {isPending ? (
                  <>
                    <Loader2 size={14} className="animate-spin text-white" />
                    <span>Processing {validCount} Accounts...</span>
                  </>
                ) : (
                  <>
                    <span>Import {validCount > 0 ? `${validCount} Students` : "Roster"}</span>
                    <ArrowRight size={13} />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
