"use client";

import { useState } from "react";
import Link from "next/link";
import { calculateSchoolQuote, formatNaira } from "@/lib/schools/school-pricing";
import { Users, Calendar, ArrowRight, ShieldCheck, Check } from "lucide-react";

export function SchoolCalculatorClient() {
  const [studentCount, setStudentCount] = useState<number>(50);
  const [durationMonths, setDurationMonths] = useState<number>(3);

  const quote = calculateSchoolQuote(studentCount, durationMonths);

  const handleStudentCountChange = (val: number) => {
    const clamped = Math.max(5, Math.min(500, val));
    setStudentCount(clamped);
  };

  return (
    <div id="estimator" className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#116149]">
            Cohort Cost Estimator
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-[#092E28] mt-0.5">
            Calculate your cohort investment
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Flat rate of ₦1,500 / student / month. One-time prepaid checkout, no recurring debit.
          </p>
        </div>
        <div className="sm:text-right shrink-0">
          <span className="text-[11px] uppercase font-bold text-slate-400 block">Total Investment</span>
          <div className="text-3xl font-extrabold text-[#116149] tracking-tight">
            {quote.formattedTotalNaira}
          </div>
          <span className="text-xs text-slate-500 block">
            {quote.studentCount} students for {quote.durationMonths} month{quote.durationMonths > 1 ? "s" : ""}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6">
        {/* Sliders & Duration Pickers */}
        <div className="space-y-6">
          {/* Student Count Slider */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label htmlFor="studentSlider" className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Users size={14} className="text-[#116149]" /> Number of Students
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={5}
                  max={500}
                  value={studentCount}
                  onChange={(e) => handleStudentCountChange(Number(e.target.value))}
                  className="w-20 text-right font-bold text-sm text-[#092E28] px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-[#116149]"
                />
                <span className="text-xs text-slate-500">candidates</span>
              </div>
            </div>

            <input
              type="range"
              id="studentSlider"
              min={5}
              max={250}
              step={5}
              value={studentCount}
              onChange={(e) => handleStudentCountChange(Number(e.target.value))}
              className="w-full accent-[#116149] cursor-pointer h-2 bg-slate-100 rounded-lg"
            />

            <div className="flex justify-between text-[11px] text-slate-400 font-medium mt-1">
              <span>10 students</span>
              <span>50 (Typical SS3)</span>
              <span>100</span>
              <span>250+</span>
            </div>
          </div>

          {/* Duration Selector */}
          <div>
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 mb-2.5">
              <Calendar size={14} className="text-[#116149]" /> Access Duration
            </label>

            <div className="grid grid-cols-4 gap-2">
              {[
                { months: 1, label: "1 Month" },
                { months: 3, label: "3 Months", recommended: true },
                { months: 6, label: "6 Months" },
                { months: 12, label: "12 Months" },
              ].map(({ months, label, recommended }) => {
                const isSelected = durationMonths === months;
                return (
                  <button
                    key={months}
                    type="button"
                    onClick={() => setDurationMonths(months)}
                    className={`py-2 px-1 text-center rounded-xl border text-xs font-semibold transition-colors ${
                      isSelected
                        ? "border-[#116149] bg-emerald-50 text-[#092E28] ring-1 ring-[#116149]"
                        : "border-slate-200 hover:border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span>{label}</span>
                    {recommended && (
                      <span className="block text-[9px] uppercase tracking-wider text-[#116149] font-bold mt-0.5">
                        Popular
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Calculation Summary & Actions */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-2 text-xs text-slate-600">
            <div className="flex justify-between py-1 border-b border-slate-200/60">
              <span>Rate per student:</span>
              <strong className="text-slate-800">₦1,500 / month</strong>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200/60">
              <span>Cohort size:</span>
              <strong className="text-slate-800">{quote.studentCount} students</strong>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200/60">
              <span>Monthly subtotal:</span>
              <strong className="text-slate-800">{quote.formattedMonthlyNaira} / month</strong>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200/60">
              <span>Duration:</span>
              <strong className="text-slate-800">{quote.durationMonths} calendar month{quote.durationMonths > 1 ? "s" : ""}</strong>
            </div>
            <div className="flex justify-between py-1 pt-2 text-sm font-bold text-[#092E28]">
              <span>One-Time Total:</span>
              <span className="text-[#116149]">{quote.formattedTotalNaira}</span>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
            <Link
              href="/schools/register"
              className="inline-flex min-h-11 items-center justify-center gap-1.5 flex-1 rounded-full bg-[#116149] px-5 text-xs font-semibold text-white shadow-sm hover:bg-[#0c4a37] transition"
            >
              Register School & Enroll Cohort <ArrowRight size={14} />
            </Link>
            <Link
              href="/schools/login"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              School Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
