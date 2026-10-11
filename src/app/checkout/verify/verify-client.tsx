"use client";

import { useEffect, useState } from "react";
import { verifyPaystackPaymentAction, VerifyPaymentResult } from "@/lib/client-actions";
import { CheckCircle2, XCircle, Loader2, ArrowRight, BookOpen, ShieldCheck } from "lucide-react";
import Link from "@/components/pending-link";

interface VerifyClientProps {
  reference: string;
}

export function VerifyClient({ reference }: VerifyClientProps) {
  const [result, setResult] = useState<VerifyPaymentResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function verify() {
      try {
        const res = await verifyPaystackPaymentAction(reference);
        if (isMounted) {
          setResult(res);
          setLoading(false);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || "Failed to verify transaction.");
          setLoading(false);
        }
      }
    }

    if (reference) {
      verify();
    } else {
      setError("No transaction reference provided.");
      setLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [reference]);

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 sm:p-12 text-center max-w-lg mx-auto shadow-sm">
        <Loader2 size={36} className="animate-spin text-[#116149] mx-auto mb-4" />
        <h2 className="text-xl font-bold text-[#092E28]">Confirming your payment...</h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-2">
          Verifying transaction reference <span className="font-mono text-slate-700">{reference}</span> with Paystack. Please do not close this window.
        </p>
      </div>
    );
  }

  if (error || (result && !result.success)) {
    return (
      <div className="rounded-3xl border border-red-200 bg-white p-8 sm:p-12 text-center max-w-lg mx-auto shadow-sm">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-red-100 text-red-600 mx-auto mb-4">
          <XCircle size={28} />
        </span>
        <h2 className="text-xl font-bold text-[#092E28]">Payment Verification Issue</h2>
        <p className="text-xs sm:text-sm text-slate-600 mt-2">
          {error || result?.message || "We were unable to verify your payment session."}
        </p>
        <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
          <Link
            href="/pricing"
            className="px-6 py-2.5 rounded-full bg-[#116149] text-white text-xs font-semibold hover:bg-[#0b4936]"
          >
            Return to Checkout
          </Link>
          <Link
            href="/dashboard"
            className="px-6 py-2.5 rounded-full border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const formattedExpiry = result?.expiresAt
    ? new Date(result.expiresAt).toLocaleDateString("en-NG", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "30 days from today";

  return (
    <div className="rounded-3xl border border-emerald-200 bg-white p-8 sm:p-12 text-center max-w-xl mx-auto shadow-lg shadow-[#116149]/10">
      <span className="flex size-16 items-center justify-center rounded-2xl bg-emerald-100 text-[#116149] mx-auto mb-5">
        <CheckCircle2 size={36} />
      </span>

      {result?.message && <p className="mb-4 text-sm text-slate-600">{result.message}</p>}
      <span className="inline-block px-3 py-1 rounded-full bg-emerald-100 text-[#116149] text-xs font-bold uppercase tracking-wider mb-2">
        PAYMENT CONFIRMED
      </span>

      <h2 className="text-2xl sm:text-3xl font-bold text-[#092E28] tracking-tight">
        Premium Study Coach Activated! 🎉
      </h2>

      <p className="text-xs sm:text-sm text-slate-600 mt-3 leading-relaxed max-w-md mx-auto">
        Your account now has <strong>unlimited access</strong> to authentic 180-question UTME CBT simulations, KaTeX step-by-step solutions, and daily practice until <strong>{formattedExpiry}</strong>.
      </p>

      <div className="my-6 p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-500 max-w-md mx-auto flex items-center justify-between">
        <span>Transaction Reference:</span>
        <span className="font-mono font-semibold text-slate-800">{reference}</span>
      </div>

      <div className="flex flex-col sm:flex-row justify-center gap-3">
        <Link
          href="/mock"
          className="min-h-12 inline-flex items-center justify-center gap-2 rounded-full bg-[#116149] px-7 text-sm font-semibold text-white hover:bg-[#0b4936] shadow-md shadow-[#116149]/20"
        >
          Start CBT Mock Simulation <ArrowRight size={16} />
        </Link>
        <Link
          href="/dashboard"
          className="min-h-12 inline-flex items-center justify-center rounded-full border border-slate-200 px-6 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          View Dashboard
        </Link>
      </div>

      <div className="mt-6 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
        <ShieldCheck size={14} className="text-emerald-700" />
        <span>Authoritative Entitlement Synchronized • Instant Activation</span>
      </div>
    </div>
  );
}
