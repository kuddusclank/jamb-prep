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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-xl rounded-lg bg-white p-5 sm:p-6 text-[#17231F] shadow-xl border border-[#E3E8E4] animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col"
        role="dialog"
        aria-modal="true"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 flex size-8 items-center justify-center rounded-md text-[#68766F] hover:bg-[#F7F8F6] hover:text-[#17231F] transition cursor-pointer"
          aria-label="Close modal"
        >
          <X size={16} />
        </button>

        {/* Modal Header */}
        <div className="pb-3 border-b border-[#E3E8E4] space-y-1">
          <div className="inline-flex items-center gap-1.5 rounded bg-[#EAF4EF] border border-[#12664F]/20 px-2 py-0.5 text-[10px] font-semibold text-[#12664F]">
            <CreditCard size={11} />
            <span>Cohort Licensing & Checkout</span>
          </div>
          <h2 className="text-lg font-semibold text-[#17231F]">Select Candidates to Licence</h2>
          <p className="text-xs text-[#68766F]">
            Choose candidates to activate institutional licences for {schoolName}.
          </p>
        </div>

        {/* Quick Selection Presets */}
        <div className="py-3 flex items-center justify-between gap-2 border-b border-[#E3E8E4] flex-wrap text-xs">
          <div className="flex items-center gap-1.5">
            {unlicensedCount > 0 && (
              <button
                type="button"
                onClick={handleSelectAllUnlicensed}
                className="rounded-md border border-[#12664F]/30 bg-[#EAF4EF] text-[#12664F] px-2.5 py-1 text-[11px] font-semibold hover:bg-[#12664F] hover:text-white transition cursor-pointer"
              >
                Select {unlicensedCount} Unlicensed
              </button>
            )}
            <button
              type="button"
              onClick={handleSelectAll}
              className="rounded-md border border-[#E3E8E4] bg-white text-[#17231F] px-2.5 py-1 text-[11px] font-medium hover:bg-[#F7F8F6] transition cursor-pointer"
            >
              Select All ({students.length})
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="text-[#68766F] hover:text-[#17231F] text-[11px] px-1.5 py-1 cursor-pointer"
            >
              Clear
            </button>
          </div>

          <span className="text-[11px] font-semibold text-[#12664F]">
            {selectedIds.length} candidate{selectedIds.length === 1 ? "" : "s"} selected
          </span>
        </div>

        {/* Search Bar */}
        <div className="py-2.5">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-2.5 text-[#68766F]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search candidate name or email..."
              className="w-full rounded-md border border-[#E3E8E4] bg-[#F7F8F6] pl-8 pr-3 py-1.5 text-xs text-[#17231F] placeholder:text-[#68766F] focus:outline-hidden focus:border-[#12664F] focus:bg-white transition"
            />
          </div>
        </div>

        {/* Candidate List (Scrollable) */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#E3E8E4] border border-[#E3E8E4] rounded-md max-h-[320px]">
          {filteredStudents.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#68766F]">
              No candidates match your search query.
            </div>
          ) : (
            filteredStudents.map((std) => {
              const isSelected = selectedIds.includes(std.id);
              const isUnlicensed = std.licenseStatus !== "active";

              return (
                <div
                  key={std.id}
                  onClick={() => toggleSelect(std.id)}
                  className={`flex items-center justify-between p-2.5 text-xs transition cursor-pointer select-none ${
                    isSelected ? "bg-[#EAF4EF]/50" : "hover:bg-[#F7F8F6]"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelect(std.id);
                      }}
                      className="text-[#12664F] cursor-pointer"
                    >
                      {isSelected ? (
                        <CheckSquare size={16} className="text-[#12664F]" />
                      ) : (
                        <Square size={16} className="text-[#68766F]" />
                      )}
                    </button>
                    <div className="truncate">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-[#17231F] truncate">{std.name}</span>
                        {std.studentIdentifier && (
                          <span className="rounded bg-[#F7F8F6] border border-[#E3E8E4] px-1 py-0.2 text-[9px] font-mono text-[#68766F]">
                            {std.studentIdentifier}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-[#68766F] block truncate">{std.email}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isUnlicensed ? (
                      <span className="inline-flex items-center gap-1 rounded bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-[10px] font-medium text-amber-900">
                        <AlertCircle size={10} className="text-amber-700" />
                        <span>Unlicensed</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded bg-[#EAF4EF] border border-[#12664F]/20 px-1.5 py-0.5 text-[10px] font-medium text-[#12664F]">
                        <CheckCircle2 size={10} />
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
        <div className="mt-3 rounded-md bg-[#F7F8F6] border border-[#E3E8E4] p-3 flex items-center justify-between text-xs">
          <div>
            <span className="text-[11px] text-[#68766F] block">Monthly Investment</span>
            <div className="flex items-baseline gap-1">
              <span className="text-base font-bold text-[#17231F] tabular-nums">
                ₦{totalNaira.toLocaleString()}
              </span>
              <span className="text-[10px] text-[#68766F]">
                ({selectedIds.length} × ₦1,500/mo)
              </span>
            </div>
          </div>
          <span className="text-[10px] text-[#68766F] text-right">
            Prepaid checkout · Non-recurring
          </span>
        </div>

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-between pt-3.5 mt-2 border-t border-[#E3E8E4]">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-[#E3E8E4] bg-white px-3.5 py-1.5 text-xs font-medium text-[#17231F] hover:bg-[#F7F8F6] transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={selectedIds.length === 0}
            onClick={() => onProceed(selectedIds)}
            className="inline-flex items-center gap-1.5 rounded-md bg-[#12664F] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#0B3028] transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <CreditCard size={13} />
            <span>Proceed to Checkout ({selectedIds.length} Licences)</span>
            <ArrowRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
