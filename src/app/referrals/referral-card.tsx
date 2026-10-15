"use client";

import { shareOrCopy } from "@/lib/share";
import { SITE_URL } from "@/lib/seo";
import { useState } from "react";
import Link from "@/components/pending-link";
import { Copy, Check, Share2, Sparkles, ArrowRight, Users } from "lucide-react";

export function ReferralCard({
  code,
  qualifiedCount,
  hasReward,
}: {
  code: string;
  qualifiedCount: number;
  hasReward: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [shareStatus,setShareStatus]=useState("");

  const referralUrl = typeof window !== "undefined"
    ? `${window.location.origin}/register?ref=${code}`
    : `${SITE_URL}/register/?ref=${encodeURIComponent(code)}`;

  const shareText = encodeURIComponent(
    `I’m building my UTME study routine with JAMBPrep. Join me for topic practice, timed mocks and progress insights: ${referralUrl}`
  );

  const copyToClipboard = async () => {
    try {
      const outcome=await shareOrCopy({title:'Study with me on JAMBPrep',text:'Join me for UTME topic practice and timed mocks.',url:referralUrl});
      setCopied(outcome==='copied');setShareStatus(outcome==='copied'?'Invite copied.':outcome==='shared'?'Invite shared.':'');
      setTimeout(()=>setCopied(false),2500);
    } catch {setShareStatus('Unable to copy. Select the invite link or use WhatsApp.');}
  };

  const progressPercentage = Math.min(100, (qualifiedCount / 2) * 100);

  return (
    <div className="space-y-8">
      {/* 1. Share Link & Code */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
          Your Personal Invite Link
        </label>
        <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
          <div className="flex-1 flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 font-mono text-sm text-[#092E28] overflow-hidden">
            <span className="truncate">{referralUrl}</span>
            <span className="shrink-0 text-xs font-bold uppercase px-2 py-0.5 rounded bg-emerald-100 text-[#116149] ml-2">
              Code: {code}
            </span>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={copyToClipboard}
              className="flex-1 sm:flex-none min-h-12 inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 text-sm font-semibold text-[#092E28] hover:border-slate-300 transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check size={16} className="text-[#16A34A]" /> Copied
                </>
              ) : (
                <>
                  <Copy size={16} /> Copy / share
                </>
              )}
            </button>

            <a
              href={`https://api.whatsapp.com/send?text=${shareText}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 sm:flex-none min-h-12 inline-flex items-center justify-center gap-2 rounded-full bg-[#16A34A] px-5 text-sm font-semibold text-white hover:bg-[#13843b] transition-all hover:-translate-y-0.5 cursor-pointer shadow-sm"
            >
              <Share2 size={16} /> WhatsApp
            </a>
          </div>
        </div>
      </div>

      <p role="status" className="text-sm text-slate-600">{shareStatus}</p>
      {/* 2. Progress Tracker */}
      <div className="rounded-2xl border border-slate-100 bg-[#F6F8F5] p-5 sm:p-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Milestone Progress
            </span>
            <h3 className="text-lg font-bold text-[#092E28] mt-0.5">
              {qualifiedCount >= 2 ? "Goal Completed!" : `${qualifiedCount} of 2 Friends Joined`}
            </h3>
          </div>
          <span className="text-2xl font-black text-[#116149]">
            {qualifiedCount}/2
          </span>
        </div>

        {/* Progress Bar */}
        <div className="h-3 rounded-full bg-slate-200 overflow-hidden mb-4">
          <div
            className="h-full rounded-full bg-[#116149] transition-all duration-500"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>

        {/* Milestone Steps */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className={`p-3 rounded-xl border flex items-center gap-2.5 ${
            qualifiedCount >= 1 ? "border-[#116149] bg-emerald-50 text-[#092E28]" : "border-slate-200 bg-white text-slate-500"
          }`}>
            <span className={`flex size-6 shrink-0 items-center justify-center rounded-full ${
              qualifiedCount >= 1 ? "bg-[#116149] text-white" : "bg-slate-100 text-slate-400"
            }`}>
              {qualifiedCount >= 1 ? <Check size={14} /> : "1"}
            </span>
            <span className="font-medium truncate">Friend 1 Registered</span>
          </div>

          <div className={`p-3 rounded-xl border flex items-center gap-2.5 ${
            qualifiedCount >= 2 ? "border-[#116149] bg-emerald-50 text-[#092E28]" : "border-slate-200 bg-white text-slate-500"
          }`}>
            <span className={`flex size-6 shrink-0 items-center justify-center rounded-full ${
              qualifiedCount >= 2 ? "bg-[#116149] text-white" : "bg-slate-100 text-slate-400"
            }`}>
              {qualifiedCount >= 2 ? <Check size={14} /> : "2"}
            </span>
            <span className="font-medium truncate">Friend 2 Registered</span>
          </div>
        </div>
      </div>

      {/* 3. Reward Voucher Card */}
      {hasReward || qualifiedCount >= 2 ? (
        <div className="rounded-2xl border-2 border-amber-400 bg-[#F8F2DF] p-6 text-[#092E28] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-200/60 text-amber-900 text-[11px] font-bold uppercase mb-1">
              <Sparkles size={13} /> Reward Unlocked
            </div>
            <h4 className="text-xl font-bold">50% Off First Month Voucher</h4>
            <p className="mt-1 text-xs text-amber-900/80">
              Pay <strong>₦500</strong> instead of ₦1,000 for your first 30 days of unlimited mock exams.
            </p>
          </div>

          <Link
            href="/checkout"
            className="shrink-0 min-h-12 inline-flex items-center justify-center gap-2 rounded-full bg-[#116149] px-6 text-sm font-semibold text-white hover:bg-[#0b4936] transition-all hover:-translate-y-0.5 shadow-sm"
          >
            Claim ₦500 Access <ArrowRight size={16} />
          </Link>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-xs text-slate-600 flex flex-wrap items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
            <Users size={18} />
          </span>
          <p>
            Invite {2 - qualifiedCount} more friend{2 - qualifiedCount === 1 ? "" : "s"} to unlock your 50% discount voucher before starting your first paid subscription.
          </p>
        </div>
      )}
    </div>
  );
}
