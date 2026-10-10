"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { startMockAttempt } from "@/app/actions/exam";
import { ArrowRight, Loader2 } from "lucide-react";

export function MockStartButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleStart = () => {
    startTransition(async () => {
      try {
        const payload = await startMockAttempt();
        router.push(`/mock/${payload.attemptId}`);
      } catch (err: any) {
        console.error("Failed to start mock attempt:", err);
      }
    });
  };

  return (
    <button
      type="button"
      onClick={handleStart}
      disabled={isPending}
      className="w-full flex items-center justify-center gap-2 rounded-full bg-[#116149] px-8 py-4 text-sm font-semibold text-white shadow-lg shadow-[#116149]/20 hover:bg-[#0e523e] transition-all cursor-pointer disabled:opacity-50"
    >
      {isPending ? (
        <>
          <Loader2 size={18} className="animate-spin" /> Preparing 180-Question Hall...
        </>
      ) : (
        <>
          Enter Exam Hall & Start Timer <ArrowRight size={18} />
        </>
      )}
    </button>
  );
}
