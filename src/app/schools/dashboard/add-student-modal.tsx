"use client";

import { useState } from "react";
import { X, UserPlus, CheckCircle2, Copy, AlertCircle, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStudentAdded: (student: any) => void;
  schoolCode: string;
}

export function AddStudentModal({ isOpen, onClose, onStudentAdded, schoolCode }: AddStudentModalProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [studentIdentifier, setStudentIdentifier] = useState("");
  const [phone, setPhone] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdStudent, setCreatedStudent] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const predictedPassword = lastName.trim()
    ? lastName.trim().toUpperCase()
    : "LASTNAME";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsPending(true);

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "https://jambprep-api-foundation.abdulquddus-akanbi.workers.dev";
      const supabase = createClient();
      const sessionRes = await supabase.auth.getSession();
      const token = sessionRes?.data?.session?.access_token;

      const res = await fetch(`${apiBase}/api/v1/schools/students`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          studentIdentifier: studentIdentifier || null,
          phone: phone || null,
          ingestionMethod: "manual",
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error || errData?.message || "Failed to create candidate account.");
      }

      const data = await res.json();
      const created = data?.students?.[0];
      if (!created) {
        throw new Error("Candidate record could not be saved.");
      }

      setCreatedStudent(created);
      onStudentAdded(created);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "A network error occurred.");
    } finally {
      setIsPending(false);
    }
  };

  const handleCopyCredentials = () => {
    if (!createdStudent) return;
    const text = `JAMBPrep Student Account\nName: ${createdStudent.name}\nEmail: ${createdStudent.email}\nDefault Password: ${createdStudent.defaultPassword}\nLogin URL: https://jambprep.lecterniq.com/login`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setFirstName("");
    setLastName("");
    setEmail("");
    setStudentIdentifier("");
    setPhone("");
    setError(null);
    setCreatedStudent(null);
    setCopied(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-lg rounded-2xl bg-white p-6 sm:p-7 text-slate-900 border border-slate-200 animate-in zoom-in-95 duration-200"
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

        {createdStudent ? (
          <div className="space-y-6 text-center py-2">
            <div className="size-12 rounded-xl bg-[#EAF4EF] text-[#12664F] flex items-center justify-center mx-auto border border-[#12664F]/15">
              <CheckCircle2 size={24} />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base sm:text-lg font-semibold text-slate-900">Candidate Enrolled Successfully</h3>
              <p className="text-xs text-slate-500 font-normal">
                The student account is provisioned and bound to your school cohort.
              </p>
            </div>

            {/* Credential Slip Card */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-left space-y-3 font-mono text-xs">
              <div className="flex justify-between border-b border-slate-200/80 pb-2.5">
                <span className="text-slate-500 font-sans">Student Name:</span>
                <span className="font-semibold text-slate-900 font-sans">{createdStudent.name}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/80 pb-2.5">
                <span className="text-slate-500 font-sans">Login Email:</span>
                <span className="font-medium text-slate-900">{createdStudent.email}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/80 pb-2.5 items-center">
                <span className="text-slate-500 font-sans">Default Password:</span>
                <span className="font-semibold text-[#12664F] bg-[#EAF4EF] px-2.5 py-0.5 rounded-md border border-[#12664F]/20 font-mono">
                  {createdStudent.defaultPassword}
                </span>
              </div>
              <div className="flex justify-between pt-0.5">
                <span className="text-slate-500 font-sans">School Code:</span>
                <span className="font-semibold text-[#12664F]">{schoolCode}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <button
                type="button"
                onClick={handleCopyCredentials}
                className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                {copied ? <CheckCircle2 size={14} className="text-[#12664F]" /> : <Copy size={14} />}
                <span>{copied ? "Copied to Clipboard" : "Copy Credentials"}</span>
              </button>

              <button
                type="button"
                onClick={handleReset}
                className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-[#12664F] px-4 text-xs font-medium text-white hover:bg-[#0B3028] transition cursor-pointer"
              >
                <UserPlus size={14} />
                <span>Add Another Student</span>
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-3.5 mb-6 pb-4 border-b border-slate-100">
              <div className="size-10 rounded-xl bg-[#EAF4EF] text-[#12664F] flex items-center justify-center border border-[#12664F]/15">
                <UserPlus size={18} />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-semibold tracking-tight text-slate-900">Add Candidate Manually</h2>
                <p className="text-xs text-slate-500 font-normal">
                  Direct candidate registration under {schoolCode}
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
                  <label htmlFor="modal-fn" className="block text-xs font-medium text-slate-700 mb-1.5">
                    First Name *
                  </label>
                  <input
                    id="modal-fn"
                    type="text"
                    required
                    placeholder="e.g. Chinedu"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#12664F]/20 focus:border-[#12664F] transition-all"
                  />
                </div>

                <div>
                  <label htmlFor="modal-ln" className="block text-xs font-medium text-slate-700 mb-1.5">
                    Last Name / Surname *
                  </label>
                  <input
                    id="modal-ln"
                    type="text"
                    required
                    placeholder="e.g. Okonkwo"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#12664F]/20 focus:border-[#12664F] transition-all"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="modal-email" className="block text-xs font-medium text-slate-700 mb-1.5">
                  Candidate Email *
                </label>
                <input
                  id="modal-email"
                  type="email"
                  required
                  placeholder="e.g. c.okonkwo@school.edu.ng"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#12664F]/20 focus:border-[#12664F] transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label htmlFor="modal-id" className="block text-xs font-medium text-slate-700 mb-1.5">
                    Student ID <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    id="modal-id"
                    type="text"
                    placeholder="e.g. ST-2026-001"
                    value={studentIdentifier}
                    onChange={(e) => setStudentIdentifier(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#12664F]/20 focus:border-[#12664F] transition-all"
                  />
                </div>

                <div>
                  <label htmlFor="modal-phone" className="block text-xs font-medium text-slate-700 mb-1.5">
                    Guardian Phone <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    id="modal-phone"
                    type="tel"
                    placeholder="e.g. 08012345678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#12664F]/20 focus:border-[#12664F] transition-all"
                  />
                </div>
              </div>

              {/* Password Rule Notice */}
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 text-xs space-y-1">
                <span className="font-medium text-slate-800 block text-[11px]">
                  Generated Initial Password
                </span>
                <p className="text-[11px] text-slate-500 leading-relaxed font-normal">
                  Calculated automatically: <code className="font-mono font-medium text-[#12664F] bg-white px-2 py-0.5 rounded-md border border-slate-200">{predictedPassword}</code> (Surname in uppercase).
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-600 hover:bg-slate-50 transition cursor-pointer"
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
                      <span>Enrolling Candidate...</span>
                    </>
                  ) : (
                    <span>Enrol Candidate</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
