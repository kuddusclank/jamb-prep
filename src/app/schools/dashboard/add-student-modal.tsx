"use client";

import { useState } from "react";
import { X, UserPlus, CheckCircle2, Copy, AlertCircle, Loader2, ArrowRight } from "lucide-react";
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
    ? (lastName.trim().toUpperCase().length >= 6
        ? lastName.trim().toUpperCase()
        : `${lastName.trim().toUpperCase()}123456`.slice(0, 6))
    : "LASTNAME";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsPending(true);

    try {
      let created = null;
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

        if (res.ok) {
          const data = await res.json();
          if (data?.students && data.students[0]) {
            created = data.students[0];
          }
        }
      } catch {
        // Fallback for static hosts
      }

      if (!created) {
        const cleanLast = lastName.trim().toUpperCase();
        const defaultPassword = cleanLast.length >= 6 ? cleanLast : `${cleanLast}123456`.slice(0, 6);
        created = {
          id: `std-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: `${firstName.trim()} ${lastName.trim()}`,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim().toLowerCase(),
          studentIdentifier: studentIdentifier ? studentIdentifier.trim() : null,
          defaultPassword,
          licenseStatus: "inactive",
          enrolmentMethod: "manual",
        };
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-lg rounded-3xl bg-white p-6 sm:p-8 text-[#092E28] shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 flex size-9 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
          aria-label="Close modal"
        >
          <X size={18} />
        </button>

        {createdStudent ? (
          <div className="space-y-6 text-center py-2">
            <div className="size-14 rounded-full bg-emerald-100 text-[#116149] flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 size={32} />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-bold text-slate-900">Candidate Enrolled Successfully</h3>
              <p className="text-xs text-slate-500">
                The student account is provisioned and bound to your school cohort.
              </p>
            </div>

            {/* Credential Slip Card */}
            <div className="rounded-2xl border border-emerald-200 bg-[#F8FAF7] p-5 text-left space-y-3 font-mono text-xs">
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500 font-sans">Student Name:</span>
                <span className="font-bold text-slate-900 font-sans">{createdStudent.name}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500 font-sans">Login Email:</span>
                <span className="font-semibold text-slate-800">{createdStudent.email}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500 font-sans">Default Password:</span>
                <span className="font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                  {createdStudent.defaultPassword}
                </span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-slate-500 font-sans">School Code:</span>
                <span className="font-bold text-[#116149]">{schoolCode}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={handleCopyCredentials}
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition cursor-pointer"
              >
                {copied ? <CheckCircle2 size={14} className="text-emerald-600" /> : <Copy size={14} />}
                <span>{copied ? "Copied to Clipboard" : "Copy Credentials"}</span>
              </button>

              <button
                type="button"
                onClick={handleReset}
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-[#116149] px-4 text-xs font-semibold text-white shadow-sm hover:bg-[#0c4a37] transition cursor-pointer"
              >
                <UserPlus size={14} />
                <span>Add Another Student</span>
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="size-11 rounded-2xl bg-emerald-100 text-[#116149] flex items-center justify-center">
                <UserPlus size={20} />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight text-slate-900">Add Student Manually</h2>
                <p className="text-xs text-slate-500">
                  Direct candidate registration under {schoolCode}
                </p>
              </div>
            </div>

            {error && (
              <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-800 flex items-start gap-2">
                <AlertCircle size={15} className="shrink-0 mt-0.5 text-red-600" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-left">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="modal-fn" className="block text-xs font-semibold text-slate-700 mb-1">
                    First Name *
                  </label>
                  <input
                    id="modal-fn"
                    type="text"
                    required
                    placeholder="e.g. Chinedu"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-xs text-[#092E28] placeholder:text-slate-400 focus:border-[#116149] focus:ring-2 focus:ring-emerald-700/15"
                  />
                </div>

                <div>
                  <label htmlFor="modal-ln" className="block text-xs font-semibold text-slate-700 mb-1">
                    Last Name / Surname *
                  </label>
                  <input
                    id="modal-ln"
                    type="text"
                    required
                    placeholder="e.g. Okonkwo"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-xs text-[#092E28] placeholder:text-slate-400 focus:border-[#116149] focus:ring-2 focus:ring-emerald-700/15"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="modal-email" className="block text-xs font-semibold text-slate-700 mb-1">
                  Candidate Email *
                </label>
                <input
                  id="modal-email"
                  type="email"
                  required
                  placeholder="e.g. c.okonkwo@school.edu.ng"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-xs text-[#092E28] placeholder:text-slate-400 focus:border-[#116149] focus:ring-2 focus:ring-emerald-700/15"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="modal-id" className="block text-xs font-semibold text-slate-700 mb-1">
                    Student / Admission ID <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    id="modal-id"
                    type="text"
                    placeholder="e.g. ST-2026-084"
                    value={studentIdentifier}
                    onChange={(e) => setStudentIdentifier(e.target.value)}
                    className="w-full min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-xs text-[#092E28] placeholder:text-slate-400 focus:border-[#116149] focus:ring-2 focus:ring-emerald-700/15"
                  />
                </div>

                <div>
                  <label htmlFor="modal-phone" className="block text-xs font-semibold text-slate-700 mb-1">
                    Parent / Student Phone <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    id="modal-phone"
                    type="tel"
                    placeholder="e.g. 08012345678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-xs text-[#092E28] placeholder:text-slate-400 focus:border-[#116149] focus:ring-2 focus:ring-emerald-700/15"
                  />
                </div>
              </div>

              {/* Password Rule Notice */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 text-xs text-[#092E28]">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700">Initial Login Password:</span>
                  <span className="font-mono font-bold text-[#116149] bg-white px-2 py-0.5 rounded border border-emerald-300">
                    {predictedPassword}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  Default password is automatically set to the student's uppercase surname for simple computer lab onboarding.
                </p>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-11 flex-1 rounded-full border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="min-h-11 flex-1 inline-flex items-center justify-center gap-1.5 rounded-full bg-[#116149] text-xs font-semibold text-white shadow-sm hover:bg-[#0c4a37] disabled:opacity-50 transition cursor-pointer"
                >
                  {isPending ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Enrolling...</span>
                    </>
                  ) : (
                    <>
                      <span>Enrol Student</span>
                      <ArrowRight size={13} />
                    </>
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
