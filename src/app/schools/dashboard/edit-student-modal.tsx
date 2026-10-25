"use client";

import { useState, useEffect } from "react";
import { X, Pencil, CheckCircle2, AlertCircle, Loader2, KeyRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const UTME_ELECTIVE_SUBJECTS = [
  { code: "MTH", name: "Mathematics" },
  { code: "PHY", name: "Physics" },
  { code: "CHM", name: "Chemistry" },
  { code: "BIO", name: "Biology" },
  { code: "ECN", name: "Economics" },
  { code: "GOV", name: "Government" },
  { code: "LIT", name: "Literature in English" },
  { code: "CRS", name: "Christian Religious Studies" },
  { code: "IRS", name: "Islamic Religious Studies" },
  { code: "GEO", name: "Geography" },
  { code: "COM", name: "Commerce" },
  { code: "ACC", name: "Principles of Accounts" },
];

export interface EditableStudentItem {
  id: string;
  name: string;
  email: string;
  studentIdentifier?: string | null;
  defaultPassword?: string | null;
  subjects?: string[];
  licenseStatus: "active" | "inactive" | "expired";
  enrolmentMethod?: string;
}

interface EditStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: EditableStudentItem | null;
  onStudentUpdated: (updated: any) => void;
}

export function EditStudentModal({
  isOpen,
  onClose,
  student,
  onStudentUpdated,
}: EditStudentModalProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [studentIdentifier, setStudentIdentifier] = useState("");
  const [selectedElectives, setSelectedElectives] = useState<string[]>([]);
  const [resetPasswordToSurname, setResetPasswordToSurname] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !student) return;
    const parts = (student.name || "").trim().split(/\s+/);
    if (parts.length > 1) {
      setFirstName(parts.slice(0, -1).join(" "));
      setLastName(parts[parts.length - 1]);
    } else {
      setFirstName(parts[0] || "");
      setLastName("");
    }
    setEmail(student.email || "");
    setStudentIdentifier(student.studentIdentifier || "");
    const existingCodes = Array.isArray(student.subjects)
      ? student.subjects.map((s) => s.trim().toUpperCase()).filter((s) => s && s !== "ENG")
      : [];
    setSelectedElectives(existingCodes.slice(0, 3));
    setResetPasswordToSurname(false);
    setError(null);
  }, [isOpen, student]);

  if (!isOpen || !student) return null;

  const predictedSurnamePassword = (lastName.trim() || firstName.trim() || "STUDENT").toUpperCase();

  const toggleElective = (code: string) => {
    setSelectedElectives((prev) => {
      if (prev.includes(code)) {
        return prev.filter((item) => item !== code);
      }
      if (prev.length >= 3) {
        return prev;
      }
      return [...prev, code];
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!firstName.trim() || !lastName.trim()) {
      setError("Please enter both first name and surname.");
      return;
    }

    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid candidate email address.");
      return;
    }

    if (selectedElectives.length > 0 && selectedElectives.length !== 3) {
      setError("Please select exactly 3 elective subjects (alongside Use of English) or leave electives empty.");
      return;
    }

    setIsPending(true);
    try {
      const apiBase =
        process.env.NEXT_PUBLIC_API_BASE_URL ||
        "https://jambprep-api-foundation.abdulquddus-akanbi.workers.dev";
      const supabase = createClient();
      const sessionRes = await supabase.auth.getSession();
      const token = sessionRes?.data?.session?.access_token;

      const subjectsPayload =
        selectedElectives.length === 3 ? ["ENG", ...selectedElectives] : undefined;

      const res = await fetch(`${apiBase}/api/v1/schools/students`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          studentId: student.id,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim().toLowerCase(),
          studentIdentifier: studentIdentifier.trim() || null,
          subjects: subjectsPayload,
          resetPasswordToSurname,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          (typeof data?.error === "string" && data.error) ||
          data?.error?.message ||
          data?.message ||
          "Failed to update candidate record.";
        throw new Error(msg);
      }

      if (data?.student) {
        onStudentUpdated(data.student);
      }
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "A network error occurred.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 sm:p-7 text-slate-900 border border-slate-200 animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-candidate-title"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 flex size-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
          aria-label="Close modal"
        >
          <X size={16} />
        </button>

        <div className="flex items-center gap-3.5 mb-6 pb-4 border-b border-slate-100">
          <div className="size-10 rounded-xl bg-[#EAF4EF] text-[#12664F] flex items-center justify-center border border-[#12664F]/15">
            <Pencil size={18} />
          </div>
          <div>
            <h2 id="edit-candidate-title" className="text-base sm:text-lg font-semibold tracking-tight text-slate-900">
              Edit Candidate Record
            </h2>
            <p className="text-xs text-slate-500 font-normal">
              Update candidate identity, UTME subject combination, or reset surname password.
            </p>
          </div>
        </div>

        {error && (
          <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50/70 p-3 text-xs text-red-800 flex items-start gap-2.5">
            <AlertCircle size={15} className="shrink-0 mt-0.5 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label htmlFor="edit-fn" className="block text-xs font-medium text-slate-700 mb-1.5">
                First Name *
              </label>
              <input
                id="edit-fn"
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#12664F]/20 focus:border-[#12664F] transition-all"
              />
            </div>

            <div>
              <label htmlFor="edit-ln" className="block text-xs font-medium text-slate-700 mb-1.5">
                Last Name / Surname *
              </label>
              <input
                id="edit-ln"
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#12664F]/20 focus:border-[#12664F] transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label htmlFor="edit-email" className="block text-xs font-medium text-slate-700 mb-1.5">
                Candidate Email *
              </label>
              <input
                id="edit-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#12664F]/20 focus:border-[#12664F] transition-all"
              />
            </div>

            <div>
              <label htmlFor="edit-id" className="block text-xs font-medium text-slate-700 mb-1.5">
                Candidate / Admission ID
              </label>
              <input
                id="edit-id"
                type="text"
                placeholder="e.g. ST-2026-001"
                value={studentIdentifier}
                onChange={(e) => setStudentIdentifier(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#12664F]/20 focus:border-[#12664F] transition-all"
              />
            </div>
          </div>

          {/* 4-Subject UTME Combination Selector with Subject Key Tags */}
          <div className="space-y-2.5 pt-1">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-medium text-slate-700">
                UTME 4-Subject Combination <span className="text-slate-400 font-normal">(EN + 3 Electives)</span>
              </label>
              <span className="text-[11px] font-mono font-medium text-[#12664F] bg-[#EAF4EF] px-2 py-0.5 rounded-md border border-[#12664F]/20">
                {selectedElectives.length}/3 electives chosen
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="flex items-center justify-between rounded-xl border border-[#12664F]/25 bg-[#EAF4EF]/70 px-2.5 py-2 text-[11px] font-medium text-[#12664F]">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="font-mono font-semibold px-1 py-0.2 rounded bg-[#12664F]/10 text-[10px]">EN</span>
                  <span className="truncate">English (Compulsory)</span>
                </div>
                <CheckCircle2 size={13} className="shrink-0 ml-1 text-[#12664F]" />
              </div>
              {UTME_ELECTIVE_SUBJECTS.map((sub) => {
                const isPicked = selectedElectives.includes(sub.code);
                return (
                  <button
                    key={sub.code}
                    type="button"
                    onClick={() => toggleElective(sub.code)}
                    className={`flex items-center justify-between rounded-xl border px-2.5 py-2 text-[11px] font-medium transition cursor-pointer text-left ${
                      isPicked
                        ? "border-[#12664F] bg-[#EAF4EF] text-[#12664F]"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900 hover:bg-slate-50/50"
                    }`}
                    title={sub.name}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span className={`font-mono text-[10px] px-1 py-0.2 rounded ${
                        isPicked ? "bg-[#12664F]/10 font-semibold" : "bg-slate-100 text-slate-500 font-medium"
                      }`}>
                        {sub.code}
                      </span>
                      <span className="truncate">{sub.name.split(" ")[0]}</span>
                    </div>
                    {isPicked && <CheckCircle2 size={12} className="shrink-0 ml-1 text-[#12664F]" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Reset Password to Surname Option */}
          <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 text-xs cursor-pointer hover:bg-slate-50 transition">
            <input
              type="checkbox"
              checked={resetPasswordToSurname}
              onChange={(e) => setResetPasswordToSurname(e.target.checked)}
              className="mt-0.5 rounded border-slate-300 text-[#12664F] focus:ring-[#12664F]"
            />
            <div className="space-y-1">
              <span className="font-medium text-slate-900 flex items-center gap-1.5">
                <KeyRound size={13} className="text-[#12664F]" />
                <span>Reset candidate login password to uppercase surname</span>
              </span>
              <p className="text-[11px] text-slate-500 font-normal leading-relaxed">
                Sets the candidate&apos;s password to <code className="font-mono font-medium text-[#12664F] bg-white px-1.5 py-0.5 rounded border border-slate-200">{predictedSurnamePassword}</code> so they can sign in immediately in the CBT lab.
              </p>
            </div>
          </label>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-2 rounded-xl bg-[#12664F] px-5 py-2.5 text-xs font-medium text-white hover:bg-[#0B3028] transition cursor-pointer disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Loader2 size={14} className="animate-spin text-white" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <span>Save Candidate Changes</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
