"use client";

import { useEffect, useState } from "react";
import Link from "@/components/pending-link";
import {
  DownloadCloud,
  CheckCircle2,
  ArrowRight,
  Loader2,
  Layers,
  Sparkles,
} from "lucide-react";
import {
  getWeeklyPackFromIdb,
  type StoredWeeklyPack,
} from "@/lib/offline/idb-storage";
import {
  ensureWeeklyPackDownloaded,
  getCurrentWeekKey,
} from "@/lib/offline/weekly-pack-client";

interface WeeklyPracticeCardProps {
  userId: string;
}

export function WeeklyPracticeCard({ userId }: WeeklyPracticeCardProps) {
  const [pack, setPack] = useState<StoredWeeklyPack | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const weekKey = getCurrentWeekKey();
    void getWeeklyPackFromIdb(userId, weekKey)
      .then((cached) => {
        if (active) setPack(cached);
      })
      .catch(() => {
        // Non-blocking
      });
    return () => {
      active = false;
    };
  }, [userId]);

  const handleDownload = async () => {
    setIsDownloading(true);
    setError(null);
    try {
      const downloaded = await ensureWeeklyPackDownloaded(userId, true);
      setPack(downloaded);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to download weekly practice pack. Check your connection."
      );
    } finally {
      setIsDownloading(false);
    }
  };

  const answered = pack?.progress?.answered ?? 0;
  const total = pack?.progress?.total ?? 250;
  const percent = Math.min(100, Math.round((answered / total) * 100));

  return (
    <section className="bg-gradient-to-br from-emerald-900 to-teal-950 text-white rounded-3xl p-6 sm:p-7 shadow-sm border border-emerald-800/40 relative overflow-hidden">
      {/* Decorative background glow */}
      <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
        <div className="space-y-2 max-w-xl">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase bg-emerald-800/60 text-emerald-200 border border-emerald-700/50">
              <Sparkles size={12} className="text-amber-300" />
              WEEKLY OFFLINE PACK
            </span>
            {pack ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <CheckCircle2 size={12} />
                Ready offline
              </span>
            ) : null}
          </div>

          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            This Week’s 250-Question Practice Pack
          </h2>

          <p className="text-sm text-emerald-100/80 leading-relaxed">
            Practice at your own pace without data or internet. 85 English and
            165 elective questions frozen for this week.
          </p>

          {pack && (
            <div className="pt-2">
              <div className="flex items-center justify-between text-xs text-emerald-200 font-medium mb-1.5">
                <span>Overall Completion</span>
                <span>
                  {answered} of {total} answered ({percent}%)
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-emerald-950/60 overflow-hidden border border-emerald-800/50">
                <div
                  className="h-full bg-gradient-to-r from-emerald-400 to-teal-300 transition-all duration-500 rounded-full"
                  style={{ width: `${percent}%` }}
                />
              </div>

              {/* Subject pill badges */}
              <div className="flex flex-wrap gap-2 mt-3">
                {pack.subjects?.map((sub) => {
                  const subProg = pack.progress?.bySubject?.[sub.code];
                  const subAnswered = subProg?.answered ?? 0;
                  const subTotal = subProg?.total ?? sub.questionCount;
                  return (
                    <span
                      key={sub.code}
                      className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-emerald-800/50 text-emerald-200 border border-emerald-700/40"
                    >
                      {sub.code}: {subAnswered}/{subTotal}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {error && <p className="text-xs text-rose-300 font-medium">{error}</p>}
        </div>

        {/* Action Button */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
          {pack ? (
            <Link
              href="/practice/weekly"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-white text-emerald-950 font-bold text-sm shadow-md hover:bg-emerald-50 transition active:scale-95"
            >
              <Layers size={17} />
              <span>Resume Practice</span>
              <ArrowRight size={16} />
            </Link>
          ) : (
            <button
              type="button"
              onClick={handleDownload}
              disabled={isDownloading}
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-emerald-400 text-emerald-950 font-bold text-sm shadow-md hover:bg-emerald-300 transition active:scale-95 disabled:opacity-50"
            >
              {isDownloading ? (
                <>
                  <Loader2 size={17} className="animate-spin" />
                  <span>Downloading (~1.5 MB)...</span>
                </>
              ) : (
                <>
                  <DownloadCloud size={17} />
                  <span>Download Pack (250 Qs)</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
