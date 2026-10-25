"use client";

import { useState, useEffect } from "react";
import { X, UserMinus, AlertCircle, Loader2, ShieldAlert, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export interface DisconnectStudentTarget {
  id: string;
  name: string;
  email: string;
}

interface DisconnectStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  targets: DisconnectStudentTarget[];
  schoolName: string;
  onDisconnected: (disconnectedIds: string[]) => void;
}

export function DisconnectStudentModal({
  isOpen,
  onClose,
  targets,
  schoolName,
  onDisconnected,
}: DisconnectStudentModalProps) {
  const [adminPassword, setAdminPassword] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setAdminPassword("");
      setError(null);
    }
  }, [isOpen, targets]);

  if (!isOpen || targets.length === 0) return null;

  const isBatch = targets.length > 1;

  const handleConfirmDisconnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!adminPassword.trim()) {
      setError("Please enter your administrator password to confirm disconnecting.");
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

      const targetIds = targets.map((t) => t.id);

      const res = await fetch(`${apiBase}/api/v1/schools/students/disconnect`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          studentIds: targetIds,
          adminPassword,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          (typeof data?.error === "string" && data.error) ||
          data?.error?.message ||
          data?.message ||
          "Could not disconnect candidate(s). Please verify your password and try again.";
        throw new Error(msg);
      }

      const disconnectedIds: string[] = Array.isArray(data?.disconnectedIds)
        ? data.disconnectedIds
        : targetIds;

      onDisconnected(disconnectedIds);
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
        className="relative w-full max-w-md rounded-lg bg-white p-5 sm:p-6 text-[#17231F] shadow-xl border border-[#E3E8E4] animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="disconnect-modal-title"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 flex size-8 items-center justify-center rounded-md text-[#68766F] hover:bg-[#F7F8F6] hover:text-[#17231F] transition cursor-pointer"
          aria-label="Close modal"
        >
          <X size={16} />
        </button>

        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-[#E3E8E4]">
          <div className="size-9 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
            <UserMinus size={18} />
          </div>
          <div>
            <h2 id="disconnect-modal-title" className="text-base sm:text-lg font-semibold tracking-tight text-[#17231F]">
              {isBatch
                ? `Disconnect ${targets.length} Candidates from School`
                : "Disconnect Candidate from School"}
            </h2>
            <p className="text-xs text-[#68766F]">
              Unlink from {schoolName} and switch to individual subscription
            </p>
          </div>
        </div>

        <div className="rounded-md border border-amber-200 bg-amber-50/70 p-3.5 text-xs text-amber-950 space-y-2 mb-4">
          <div className="flex items-start gap-2">
            <ShieldAlert size={15} className="shrink-0 mt-0.5 text-amber-700" />
            <div className="space-y-1 leading-relaxed">
              <p className="font-semibold">
                {isBatch
                  ? `${targets.length} selected candidates will be disconnected from ${schoolName}.`
                  : `${targets[0].name} (${targets[0].email}) will be disconnected from ${schoolName}.`}
              </p>
              <p className="text-[11px] text-amber-900/90">
                Their student account and study progress will <strong>not</strong> be deleted. Their subscription will switch to <strong>Individual Student Mode</strong> (any remaining active days stay intact, and future renewals are managed individually by the student).
              </p>
            </div>
          </div>

          {isBatch && (
            <div className="max-h-24 overflow-y-auto rounded bg-white/80 border border-amber-200/70 p-2 text-[11px] space-y-1">
              {targets.map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-2 truncate">
                  <span className="font-medium text-[#17231F] truncate">{t.name}</span>
                  <span className="text-[#68766F] font-mono text-[10px] truncate">{t.email}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div role="alert" className="mb-4 rounded-md border border-red-200 bg-red-50 p-2.5 text-xs text-red-800 flex items-start gap-2">
            <AlertCircle size={14} className="shrink-0 mt-0.5 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleConfirmDisconnect} className="space-y-4">
          <div>
            <label htmlFor="disconnect-admin-pwd" className="block text-xs font-semibold text-[#17231F] mb-1.5 flex items-center gap-1.5">
              <Lock size={12} className="text-[#12664F]" />
              <span>Confirm with Administrator Password *</span>
            </label>
            <input
              id="disconnect-admin-pwd"
              type="password"
              required
              autoComplete="current-password"
              placeholder="Enter your school administrator password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              className="w-full rounded-md border border-[#E3E8E4] bg-white px-3 py-2 text-xs text-[#17231F] placeholder:text-[#68766F]/60 focus:outline-none focus:ring-1 focus:ring-[#12664F] focus:border-[#12664F]"
            />
          </div>

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
              disabled={isPending || !adminPassword.trim()}
              className="inline-flex items-center gap-1.5 rounded-md bg-amber-700 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-amber-800 transition cursor-pointer disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Disconnecting...</span>
                </>
              ) : (
                <>
                  <UserMinus size={13} />
                  <span>{isBatch ? `Disconnect ${targets.length} Candidates` : "Disconnect Candidate"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
