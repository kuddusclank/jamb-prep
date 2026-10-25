"use client";

import { useState, useMemo } from "react";
import { 
  X, 
  CreditCard, 
  CheckSquare, 
  Square, 
  CheckCircle2, 
  AlertCircle, 
  Users, 
  ArrowRight,
  Search
} from "lucide-react";

interface StudentItem {
  id: string;
  name: string;
  email: string;
  studentIdentifier?: string | null;
  defaultPassword?: string;
  subjects?: string[];
  licenseStatus: "active" | "inactive" | "expired";
  daysLeft?: number;
  lastActive?: string;
  averageScore?: number | null;
  practiceAccuracy?: number | null;
  totalPracticeQuestions?: number;
  enrolmentMethod?: string;
}

interface CohortCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: StudentItem[];
  schoolName: string;
  onProceed: (selectedIds: string[]) => void;
}

export function CohortCheckoutModal({
  isOpen,
  onClose,
  students,
  schoolName,
  onProceed,
}: CohortCheckoutModalProps) {
  // Default selection: all unlicensed students, or all students if all already licensed
  const defaultSelected = useMemo(() => {
    const unlicensed = students.filter((s) => s.licenseStatus !== "active").map((s) => s.id);
    return unlicensed.length > 0 ? unlicensed : students.map((s) => s.id);
  }, [students]);

  const [selectedIds, setSelectedIds] = useState<string[]>(defaultSelected);
  const [searchQuery, setSearchQuery] = useState("");

  if (!isOpen) return null;

  const unlicensedCount = students.filter((s) => s.licenseStatus !== "active").length;

  const filteredStudents = students.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      (s.studentIdentifier && s.studentIdentifier.toLowerCase().includes(q))
    );
  });

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllUnlicensed = () => {
    const unlicensedIds = students.filter((s) => s.licenseStatus !== "active").map((s) => s.id);
    setSelectedIds(unlicensedIds.length > 0 ? unlicensedIds : students.map((s) => s.id));
  };

  const handleSelectAll = () => {
    setSelectedIds(students.map((s) => s.id));
  };

  const handleClear = () => {
    setSelectedIds([]);
  };

  const totalNaira = selectedIds.length * 1500;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-xl rounded-2xl bg-white p-6 sm:p-7 text-slate-900 border border-slate-200 animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col"
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

        {/* Modal Header */}
        <div className="pb-4 mb-4 border-b border-slate-100 space-y-1.5">
          <div className="inline-flex items-center gap-1.5 rounded-md bg-[#EAF4EF] border border-[#12664F]/20 px-2 py-0.5 text-[11px] font-medium text-[#12664F]">
            <CreditCard size={12} />
            <span>Cohort Licensing & Checkout</span>
          </div>
          <h2 className="text-lg font-semibold text-slate-900">Select Candidates to Licence</h2>
          <p className="text-xs text-slate-500 font-normal">
            Choose candidates to activate institutional licences for {schoolName}.
          </p>
        </div>

        {/* Quick Selection Presets */}
        <div className="py-2.5 flex items-center justify-between gap-2 border-b border-slate-100 flex-wrap text-xs">
          <div className="flex items-center gap-2">
            {unlicensedCount > 0 && (
              <button
                type="button"
                onClick={handleSelectAllUnlicensed}
                className="rounded-xl border border-[#12664F]/30 bg-[#EAF4EF] text-[#12664F] px-3 py-1.5 text-xs font-medium hover:bg-[#12664F] hover:text-white transition cursor-pointer"
              >
                Select {unlicensedCount} Unlicensed
              </button>
            )}
            <button
              type="button"
              onClick={handleSelectAll}
              className="rounded-xl border border-slate-200 bg-white text-slate-700 px-3 py-1.5 text-xs font-medium hover:bg-slate-50 transition cursor-pointer"
            >
              Select All ({students.length})
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="text-slate-500 hover:text-slate-800 text-xs px-2 py-1.5 cursor-pointer"
            >
              Clear
            </button>
          </div>

          <span className="text-xs font-medium text-[#12664F] bg-[#EAF4EF] px-2.5 py-1 rounded-lg border border-[#12664F]/20">
            {selectedIds.length} candidate{selectedIds.length === 1 ? "" : "s"} selected
          </span>
        </div>

        {/* Search Bar */}
        <div className="py-3">
          <div className="relative">
            <Search size={14} className="absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search candidate name, email, or ID..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-9 pr-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#12664F]/20 focus:border-[#12664F] focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Candidate List (Scrollable) */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl max-h-[300px]">
          {filteredStudents.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 font-normal">
              No candidates match your search query.
            </div>
          ) : (
            filteredStudents.map((std) => {
              const isSelected = selectedIds.includes(std.id);
              const isUnlicensed = std.licenseStatus !== "active";
              const subList = Array.isArray(std.subjects) ? std.subjects : [];

              return (
                <div
                  key={std.id}
                  onClick={() => toggleSelect(std.id)}
                  className={`flex items-center justify-between p-3 text-xs transition cursor-pointer select-none ${
                    isSelected ? "bg-[#EAF4EF]/40" : "hover:bg-slate-50/70"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelect(std.id);
                      }}
                      className="text-[#12664F] cursor-pointer"
                    >
                      {isSelected ? (
                        <CheckSquare size={17} className="text-[#12664F]" />
                      ) : (
                        <Square size={17} className="text-slate-400" />
                      )}
                    </button>
                    <div className="truncate space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900 truncate">{std.name}</span>
                        {std.studentIdentifier && (
                          <span className="rounded-md bg-slate-100 border border-slate-200 px-1.5 py-0.2 text-[9px] font-mono text-slate-500">
                            {std.studentIdentifier}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-400 truncate">{std.email}</span>
                        {subList.length > 0 && (
                          <div className="hidden sm:flex items-center gap-1">
                            {subList.map((code) => {
                              const cleanCode = code === "ENG" ? "EN" : code;
                              return (
                                <span
                                  key={code}
                                  className={`rounded px-1 py-0.2 font-mono text-[9px] ${
                                    cleanCode === "EN"
                                      ? "bg-[#12664F]/10 text-[#12664F] font-semibold"
                                      : "bg-slate-100 text-slate-600"
                                  }`}
                                >
                                  {cleanCode}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isUnlicensed ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-medium text-amber-800">
                        <AlertCircle size={11} className="text-amber-600" />
                        <span>Unlicensed</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-md bg-[#EAF4EF] border border-[#12664F]/20 px-2 py-0.5 text-[10px] font-medium text-[#12664F]">
                        <CheckCircle2 size={11} />
                        <span>Active ({std.daysLeft ?? 28}d)</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Live Cost Summary Bar */}
        <div className="mt-4 rounded-xl bg-slate-50/80 border border-slate-200 p-4 flex items-center justify-between text-xs">
          <div>
            <span className="text-[11px] text-slate-500 font-normal block">Monthly Investment</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-base font-semibold text-slate-900 tabular-nums">
                ₦{totalNaira.toLocaleString()}
              </span>
              <span className="text-[11px] text-slate-400 font-normal">
                ({selectedIds.length} × ₦1,500/mo)
              </span>
            </div>
          </div>
          <span className="text-[11px] text-slate-500 font-normal text-right">
            Prepaid checkout · Non-recurring
          </span>
        </div>

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-between pt-4 mt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={selectedIds.length === 0}
            onClick={() => onProceed(selectedIds)}
            className="inline-flex items-center gap-2 rounded-xl bg-[#12664F] px-5 py-2.5 text-xs font-medium text-white hover:bg-[#0B3028] transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <CreditCard size={14} />
            <span>Proceed to Checkout ({selectedIds.length} Licences)</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
