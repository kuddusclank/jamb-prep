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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-lg bg-white p-5 sm:p-6 text-[#17231F] shadow-xl border border-[#E3E8E4] animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-candidate-title"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 flex size-8 items-center justify-center rounded-md text-[#68766F] hover:bg-[#F7F8F6] hover:text-[#17231F] transition cursor-pointer"
          aria-label="Close modal"
        >
          <X size={16} />
        </button>

        <div className="flex items-center gap-3 mb-5 pb-3 border-b border-[#E3E8E4]">
          <div className="size-9 rounded-lg bg-[#EAF4EF] text-[#12664F] flex items-center justify-center">
            <Pencil size={17} />
          </div>
          <div>
            <h2 id="edit-candidate-title" className="text-base sm:text-lg font-semibold tracking-tight text-[#17231F]">
              Edit Candidate Record
            </h2>
            <p className="text-xs text-[#68766F]">
              Update candidate identity, UTME subject combination, or reset surname password.
            </p>
          </div>
        </div>

        {error && (
          <div role="alert" className="mb-4 rounded-md border border-red-200 bg-red-50 p-2.5 text-xs text-red-800 flex items-start gap-2">
            <AlertCircle size={14} className="shrink-0 mt-0.5 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="edit-fn" className="block text-xs font-medium text-[#17231F] mb-1">
                First Name *
              </label>
              <input
                id="edit-fn"
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full rounded-md border border-[#E3E8E4] bg-white px-3 py-2 text-xs text-[#17231F] focus:outline-none focus:ring-1 focus:ring-[#12664F] focus:border-[#12664F]"
              />
            </div>

            <div>
              <label htmlFor="edit-ln" className="block text-xs font-medium text-[#17231F] mb-1">
                Last Name / Surname *
              </label>
              <input
                id="edit-ln"
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full rounded-md border border-[#E3E8E4] bg-white px-3 py-2 text-xs text-[#17231F] focus:outline-none focus:ring-1 focus:ring-[#12664F] focus:border-[#12664F]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="edit-email" className="block text-xs font-medium text-[#17231F] mb-1">
                Candidate Email *
              </label>
              <input
                id="edit-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-[#E3E8E4] bg-white px-3 py-2 text-xs text-[#17231F] focus:outline-none focus:ring-1 focus:ring-[#12664F] focus:border-[#12664F]"
              />
            </div>

            <div>
              <label htmlFor="edit-id" className="block text-xs font-medium text-[#17231F] mb-1">
                Candidate / Admission ID
              </label>
              <input
                id="edit-id"
                type="text"
                placeholder="e.g. ST-2026-001"
                value={studentIdentifier}
                onChange={(e) => setStudentIdentifier(e.target.value)}
                className="w-full rounded-md border border-[#E3E8E4] bg-white px-3 py-2 text-xs text-[#17231F] focus:outline-none focus:ring-1 focus:ring-[#12664F] focus:border-[#12664F]"
              />
            </div>
          </div>

          {/* 4-Subject UTME Combination Selector */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-medium text-[#17231F]">
                UTME 4-Subject Combination <span className="text-[#68766F] font-normal">(ENG + 3 Electives)</span>
              </label>
              <span className="text-[11px] font-mono font-semibold text-[#12664F]">
                {selectedElectives.length}/3 electives
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              <div className="flex items-center justify-between rounded border border-[#12664F]/30 bg-[#EAF4EF]/60 px-2.5 py-1.5 text-[11px] font-semibold text-[#12664F]">
                <span>ENG (Compulsory)</span>
                <CheckCircle2 size={12} />
              </div>
              {UTME_ELECTIVE_SUBJECTS.map((sub) => {
                const isPicked = selectedElectives.includes(sub.code);
                return (
                  <button
                    key={sub.code}
                    type="button"
                    onClick={() => toggleElective(sub.code)}
                    className={`flex items-center justify-between rounded border px-2.5 py-1.5 text-[11px] font-medium transition cursor-pointer ${
                      isPicked
                        ? "border-[#12664F] bg-[#EAF4EF] text-[#12664F] font-semibold"
                        : "border-[#E3E8E4] bg-white text-[#68766F] hover:text-[#17231F]"
                    }`}
                    title={sub.name}
                  >
                    <span className="truncate">{sub.code} · {sub.name.split(" ")[0]}</span>
                    {isPicked && <CheckCircle2 size={11} className="shrink-0 ml-1" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Reset Password to Surname Option */}
          <label className="flex items-start gap-2.5 rounded-md border border-[#E3E8E4] bg-[#F7F8F6] p-3 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={resetPasswordToSurname}
              onChange={(e) => setResetPasswordToSurname(e.target.checked)}
              className="mt-0.5 rounded border-[#E3E8E4] text-[#12664F] focus:ring-[#12664F]"
            />
            <div className="space-y-0.5">
              <span className="font-semibold text-[#17231F] flex items-center gap-1.5">
                <KeyRound size={12} className="text-[#12664F]" />
                <span>Reset candidate login password to uppercase surname</span>
              </span>
              <p className="text-[11px] text-[#68766F]">
                Sets the candidate&apos;s password to <code className="font-mono font-bold text-[#12664F]">{predictedSurnamePassword}</code> so they can sign in immediately in the CBT lab.
              </p>
            </div>
          </label>

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#E3E8E4]">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-[#E3E8E4] bg-white px-3.5 py-2 text-xs font-medium text-[#68766F] hover:bg-[#F7F8F6] hover:text-[#17231F] transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-1.5 rounded-md bg-[#12664F] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#0B3028] transition cursor-pointer disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
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
