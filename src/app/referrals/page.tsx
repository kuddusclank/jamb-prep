"use client";
import { StudyWorkspace } from "@/components/study-workspace";
import { useEffect, useState } from "react";
import { Check, Copy, ShieldCheck, Sparkles } from "lucide-react";

import { useApiResource, ResourceStatus } from "@/lib/api/use-api-resource";
import type { ReferralData } from "@/lib/api/app-dtos";
export default function ReferralsPage() {
  const resource = useApiResource<ReferralData>("/api/v1/referrals");
  const [copyState, setCopyState] = useState<'idle' | 'copying' | 'copied' | 'failed'>('idle');
  useEffect(() => {
    setCopyState('idle');
  }, [resource.data?.code]);
  useEffect(() => {
    if (copyState !== 'copied') return;
    const timeout = window.setTimeout(() => setCopyState('idle'), 2500);
    return () => window.clearTimeout(timeout);
  }, [copyState]);
  async function copyInviteLink() {
    if (!resource.data?.code || copyState === 'copying') return;
    setCopyState('copying');
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/register?ref=${encodeURIComponent(resource.data.code)}`);
      setCopyState('copied');
    } catch {
      setCopyState('failed');
    }
  }
  if (!resource.data) return <StudyWorkspace><ResourceStatus error={resource.error} retry={resource.retry} /></StudyWorkspace>;
  const data = resource.data;

  return (
    <StudyWorkspace>
      {/* Header */}


      {/* Main Content */}
      <main className="shell section-space">
        <div className="max-w-3xl mx-auto">
          {/* Hero Banner */}
          <div className="rounded-3xl bg-gradient-to-br from-[#116149] to-[#092E28] text-white p-6 sm:p-10 shadow-2xl relative overflow-hidden">
            <div className="relative z-10 max-w-xl">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 text-[#E7B85A] text-xs font-bold uppercase tracking-wider mb-4">
                <Sparkles size={14} /> REFER-AND-EARN
              </span>
              <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight leading-tight">
                Invite 2 classmates. <br />
                <span className="serif-accent text-[#E7B85A]">Get 50% off your first month.</span>
              </h1>
              <p className="mt-4 text-sm sm:text-base text-emerald-100/90 leading-relaxed">
                UTME prep is better together. Share your personal invite code. Once 2 friends each complete their account onboarding, you unlock your first month of unlimited practice for just <strong>₦500</strong> instead of ₦1,000.
              </p>
            </div>
          </div>

          {/* Interactive Share & Tracker Card */}
          <div className="mt-8 rounded-3xl border border-emerald-950/10 bg-white p-6 sm:p-8 shadow-sm">
            <p className="text-sm">Your invite code</p><p className="mt-2 text-3xl font-bold">{data.code ?? 'Complete account setup to get your code'}</p>{data.code && <>
              <button type="button" disabled={copyState === 'copying'} onClick={() => { void copyInviteLink(); }}
                className={`mt-4 inline-flex min-w-44 items-center justify-center gap-2 rounded-full px-5 py-3 text-white transition-all duration-200 motion-reduce:transition-none disabled:opacity-70 ${copyState === 'copied' ? 'bg-emerald-700 ring-4 ring-emerald-100' : 'bg-[#116149] hover:bg-[#0b4936] active:scale-95 motion-reduce:active:scale-100'}`}>
                {copyState === 'copied' ? <Check size={18} className="motion-safe:animate-[entrance_.2s_ease-out]" aria-hidden="true" /> : <Copy size={18} aria-hidden="true" />}
                <span aria-live="polite">{copyState === 'copied' ? 'Copied!' : copyState === 'copying' ? 'Copying…' : 'Copy invite link'}</span>
              </button>
              {copyState === 'failed' && <p role="alert" className="mt-2 text-sm text-red-700">Couldn’t copy the link. Please try again or allow clipboard access.</p>}
            </>}<p className="mt-5">{data.qualifiedCount} qualified of {data.totalReferred} referrals. {data.rewards.some((reward) => reward.status === 'available') ? 'Your discount is available.' : 'Two qualifying classmates unlock your first-payment discount.'}</p>
          </div>

          {/* Business Rules & Guidance */}
          <div className="mt-8 rounded-2xl bg-[#EDF2E9] border border-emerald-950/10 p-6 text-sm">
            <h3 className="font-semibold text-[#092E28] flex items-center gap-2">
              <ShieldCheck size={18} className="text-[#116149]" /> How referral rewards work
            </h3>
            <ul className="mt-3 space-y-2 text-xs sm:text-sm text-slate-600">
              <li className="flex items-start gap-2">
                <span className="text-[#116149] font-bold">•</span>
                <span><strong>Applies to your first subscription only:</strong> Discounted to ₦500 for month one; subsequent months renew at standard ₦1,000.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#116149] font-bold">•</span>
                <span><strong>Verified registrations:</strong> Each friend must register using your link and complete their account onboarding.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#116149] font-bold">•</span>
                <span><strong>Fair usage:</strong> Self-referrals are rejected. Each distinct account must complete its onboarding; creating another account does not qualify a referral.</span>
              </li>
            </ul>
          </div>
        </div>
      </main>

      {/* Footer */}

    </StudyWorkspace>
  );
}
