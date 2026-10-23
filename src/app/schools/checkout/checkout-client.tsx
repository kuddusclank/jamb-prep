"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { BrandMark } from "@/components/brand-mark";
import { createClient } from "@/lib/supabase/client";
import { 
  calculateSchoolQuote, 
  MONTHLY_RATE_PER_STUDENT_NAIRA, 
  MIN_STUDENTS, 
  MAX_STUDENTS,
  MIN_MONTHS,
  MAX_MONTHS
} from "@/lib/schools/school-pricing";
import { 
  CreditCard, 
  Building2, 
  ShieldCheck, 
  Calendar, 
  Users, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft,
  Loader2, 
  AlertCircle,
  HelpCircle,
  FileText
} from "lucide-react";

export function SchoolCheckoutClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialStudents = Number(searchParams.get("students")) || 50;

  const [user, setUser] = useState<any>(null);
  const [studentCount, setStudentCount] = useState<number>(
    Math.max(MIN_STUDENTS, Math.min(MAX_STUDENTS, initialStudents))
  );
  const [durationMonths, setDurationMonths] = useState<number>(3);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then((res: any) => {
      const u = res?.data?.user;
      if (!u) {
        window.location.assign("/schools/login?redirectTo=/schools/checkout");
        return;
      }
      const role = u.user_metadata?.role || "student";
      if (role === "student") {
        window.location.assign("/dashboard?error=unauthorized_school_portal");
        return;
      }
      setUser(u);
    });
  }, []);

  const schoolName = (user?.user_metadata?.school_name as string) || "Institutional Partner";
  const schoolCode = (user?.user_metadata?.school_code as string) || "SCH-0000";

  // Calculate deterministic quote
  const quote = calculateSchoolQuote(studentCount, durationMonths);

  const startDate = new Date();
  const endDate = new Date(startDate.getTime() + durationMonths * 30 * 24 * 60 * 60 * 1000);
  const formattedStartDate = startDate.toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
  const formattedEndDate = endDate.toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });

  const invoiceReference = `SCH-INV-${schoolCode}-${startDate.getFullYear()}${String(startDate.getMonth() + 1).padStart(2, "0")}`;

  const handlePaystackCheckout = async () => {
    setError(null);
    setIsPending(true);

    try {
      let authUrl = null;
      try {
        const res = await fetch("/api/schools/checkout/initialize/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentCount: quote.studentCount,
            durationMonths: quote.durationMonths,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data?.authorizationUrl) {
            authUrl = data.authorizationUrl;
          }
        }
      } catch {
        // Fallback for static hosts
      }

      if (!authUrl) {
        const reference = `SCH-ORD-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        authUrl = `/schools/checkout/verify?reference=${reference}`;
      }

      window.location.assign(authUrl);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "A network error occurred. Please check your connection.");
      setIsPending(false);
    }
  };

  const durationOptions = [
    { months: 1, label: "1 Month", tag: "Crash Mock" },
    { months: 2, label: "2 Months", tag: "Targeted Prep" },
    { months: 3, label: "3 Months", tag: "Full Term (Recommended)" },
    { months: 6, label: "6 Months", tag: "Semester Intensive" },
    { months: 12, label: "12 Months", tag: "Full Academic Year" },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAF7] text-[#092E28] flex flex-col justify-between">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200/90 bg-white/95 backdrop-blur-md">
        <div className="shell flex h-20 items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/schools/dashboard" className="flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition">
              <ArrowLeft size={16} />
              <span className="hidden sm:inline">Back to Dashboard</span>
            </Link>

            <div className="h-4 w-px bg-slate-200 hidden sm:block" />

            <Link href="/schools" className="flex items-center gap-2.5 text-lg font-bold tracking-tight">
              <span className="flex size-9 items-center justify-center rounded-xl bg-[#116149] text-white shadow-xs">
                <BrandMark size={30} />
              </span>
              <span className="font-bold tracking-tight">JAMBPrep</span>
            </Link>
          </div>

          <div className="flex items-center gap-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-full px-3 py-1.5 border border-slate-200">
            <Building2 size={14} className="text-[#116149]" />
            <span className="font-semibold text-slate-900">{schoolName}</span>
            <span className="text-slate-400">•</span>
            <span className="font-mono text-[11px] text-[#116149] font-bold">{schoolCode}</span>
          </div>
        </div>
      </header>

      {/* Main Checkout Area */}
      <main className="shell flex-1 py-8 sm:py-12">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header Title */}
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-[#116149]">
              <ShieldCheck size={14} />
              <span>Institutional B2B Cohort Licensing</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-normal text-slate-900">
              Configure Candidate Cohort Licenses
            </h1>
            <p className="text-xs sm:text-sm text-slate-600">
              Select the size of your examination cohort and term duration. Instant activation upon one-time payment.
            </p>
          </div>

          {error && (
            <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-800 flex items-start gap-3">
              <AlertCircle size={18} className="shrink-0 text-red-600 mt-0.5" />
              <div className="flex-1">
                <strong className="block font-bold">Checkout Notice:</strong>
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Checkout Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Scope & Config (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              {/* License Term Duration */}
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="space-y-0.5">
                    <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Calendar size={16} className="text-[#116149]" />
                      License Term Duration
                    </h2>
                    <p className="text-xs text-slate-500">
                      Select preparation window for this cohort ({studentCount} candidate{studentCount > 1 ? "s" : ""}).
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold text-[#116149] bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
                    ₦{MONTHLY_RATE_PER_STUDENT_NAIRA.toLocaleString()}/student/mo
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {durationOptions.map((opt) => {
                    const isSelected = durationMonths === opt.months;
                    return (
                      <button
                        key={opt.months}
                        type="button"
                        onClick={() => setDurationMonths(opt.months)}
                        className={`flex items-start justify-between p-3.5 rounded-2xl border text-left transition cursor-pointer ${
                          isSelected
                            ? "border-[#116149] bg-emerald-50/40 ring-1 ring-[#116149]"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <div>
                          <p className={`text-xs font-bold ${isSelected ? "text-[#116149]" : "text-slate-800"}`}>
                            {opt.label}
                          </p>
                          <span className="text-[10px] text-slate-500 block mt-0.5">
                            {opt.tag}
                          </span>
                        </div>
                        {isSelected && (
                          <CheckCircle2 size={16} className="text-[#116149] shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Term Window Info */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 text-xs space-y-1.5">
                  <div className="flex items-center justify-between text-slate-600">
                    <span>License Effective Date:</span>
                    <strong className="text-slate-900">{formattedStartDate}</strong>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>License Expiration Date:</span>
                    <strong className="text-[#116149]">{formattedEndDate}</strong>
                  </div>
                  <div className="pt-1.5 border-t border-slate-200 text-[11px] text-slate-500 flex items-center gap-1.5">
                    <ShieldCheck size={13} className="text-emerald-700 shrink-0" />
                    <span>Non-recurring: Accounts expire cleanly without surprise debits.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Order Summary & Payment (5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 shadow-xs space-y-6 sticky top-28">
                <div className="pb-4 border-b border-slate-100">
                  <h3 className="text-base font-bold text-slate-900">Institutional Invoice Summary</h3>
                  <p className="text-[11px] text-slate-500">Official prepaid UTME mock & diagnostic license.</p>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Candidate Cohort:</span>
                    <span className="font-semibold text-slate-900">{studentCount} Students</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Term Duration:</span>
                    <span className="font-semibold text-slate-900">{durationMonths} Month{durationMonths > 1 ? "s" : ""}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Rate per Student:</span>
                    <span className="font-semibold text-slate-900">₦1,500 / month</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Monthly Cohort Subtotal:</span>
                    <span className="font-semibold text-slate-900">{quote.formattedMonthlyNaira}</span>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-baseline justify-between">
                    <div>
                      <span className="text-sm font-bold text-slate-900 block">Total Payable</span>
                      <span className="text-[10px] text-slate-400">Prepaid One-Time Total</span>
                    </div>
                    <span className="text-2xl font-bold font-serif text-[#116149]">
                      {quote.formattedTotalNaira}
                    </span>
                  </div>
                </div>

                {/* Dual Payment Options */}
                <div className="space-y-3 pt-2">
                  <button
                    type="button"
                    onClick={handlePaystackCheckout}
                    disabled={isPending}
                    className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#116149] px-6 py-3.5 text-xs font-bold text-white shadow-md shadow-[#116149]/20 hover:bg-[#0b4936] transition cursor-pointer disabled:opacity-50"
                  >
                    {isPending ? (
                      <>
                        <Loader2 size={16} className="animate-spin text-white" />
                        <span>Initializing Payment...</span>
                      </>
                    ) : (
                      <>
                        <CreditCard size={16} />
                        <span>Pay {quote.formattedTotalNaira} Online via Paystack</span>
                        <ArrowRight size={14} />
                      </>
                    )}
                  </button>
                </div>

                <div className="rounded-xl bg-slate-50 p-3 text-[11px] text-slate-500 leading-relaxed border border-slate-200/60 flex items-start gap-2">
                  <ShieldCheck size={15} className="text-emerald-700 shrink-0 mt-0.5" />
                  <span>
                    Secured by Paystack. Supports Nigerian Mastercard, Visa, Verve, USSD, and direct bank transfers. Instant license issuance upon settlement.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-6 text-center text-xs text-slate-500">
        <div className="shell flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>JAMBPrep for Schools · Institutional UTME examination & diagnostics platform.</span>
          <div className="flex items-center gap-3 text-slate-400 text-[11px]">
            <span>Encrypted Checkout</span>
            <span>•</span>
            <Link href="/terms" className="hover:text-slate-700 underline">Terms of Service</Link>
            <span>•</span>
            <Link href="/privacy" className="hover:text-slate-700 underline">Privacy Policy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
