"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Lock, ArrowRight, CheckCircle2, Sparkles, BookOpen } from "lucide-react";
import { useApiResource } from "@/lib/api/use-api-resource";
import type { ProfileData } from "@/lib/api/app-dtos";
import { StudyWorkspace } from "@/components/study-workspace";
import StudyLoading from "@/components/study-loading";

interface ProFeatureGateProps {
  title?: string;
  description?: string;
  children: ReactNode;
}

export function ProFeatureGate({
  title = "UTME Dictionary & Word Games",
  description = "Master Use of English with authentic past questions vocabulary, British IPA phonetics, syllable stress drills, silent letters, and rhyme rush games.",
  children,
}: ProFeatureGateProps) {
  const profile = useApiResource<ProfileData>("/api/v1/profile");

  if (!profile.data && !profile.error) {
    return (
      <StudyWorkspace>
        <StudyLoading />
      </StudyWorkspace>
    );
  }

  const isPremium = profile.data?.subscription.isPremium ?? false;

  if (!isPremium) {
    return (
      <StudyWorkspace>
        <main className="shell section-space">
          <div className="mx-auto max-w-3xl rounded-3xl border-2 border-emerald-900/20 bg-white p-8 sm:p-12 shadow-sm text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 text-amber-900 px-3 py-1 text-xs font-bold uppercase tracking-wide border border-amber-300">
              <Lock size={12} /> PRO FEATURE
            </span>

            <h1 className="mt-4 text-3xl sm:text-4xl font-extrabold text-[#092E28]">
              {title}
            </h1>

            <p className="mt-3 text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
              {description}
            </p>

            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 text-left max-w-xl mx-auto">
              <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100">
                <span className="font-bold text-sm text-emerald-950 flex items-center gap-1.5">
                  <CheckCircle2 size={16} className="text-[#116149]" /> High-Yield Lexicon
                </span>
                <p className="text-xs text-slate-600 mt-1">
                  Authentic UTME past questions vocabulary, irregular verb tables & silent letter traps.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100">
                <span className="font-bold text-sm text-emerald-950 flex items-center gap-1.5">
                  <CheckCircle2 size={16} className="text-[#116149]" /> 4 Interactive Games
                </span>
                <p className="text-xs text-slate-600 mt-1">
                  Stress Master, Sound Match, Silent Hunter & Synonym/Antonym Blitz.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100">
                <span className="font-bold text-sm text-emerald-950 flex items-center gap-1.5">
                  <CheckCircle2 size={16} className="text-[#116149]" /> Oral English Phonetics
                </span>
                <p className="text-xs text-slate-600 mt-1">
                  British English speech pronunciation and vowel/consonant IPA matching.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100">
                <span className="font-bold text-sm text-emerald-950 flex items-center gap-1.5">
                  <CheckCircle2 size={16} className="text-[#116149]" /> Tap-to-Define in Passages
                </span>
                <p className="text-xs text-slate-600 mt-1">
                  Instant definition sheet inside practice sessions without interrupting questions.
                </p>
              </div>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/pricing"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-[#116149] px-8 py-3.5 text-sm font-bold text-white shadow-md hover:bg-[#0e523e] transition-all cursor-pointer"
              >
                Upgrade to Pro to Unlock (₦1,000/mo) <ArrowRight size={16} />
              </Link>
              <Link
                href="/dashboard"
                className="w-full sm:w-auto inline-flex items-center justify-center rounded-full border border-slate-200 px-6 py-3.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                Return to Dashboard
              </Link>
            </div>
          </div>
        </main>
      </StudyWorkspace>
    );
  }

  return <>{children}</>;
}
