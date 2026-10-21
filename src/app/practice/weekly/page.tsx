"use client";

import { Suspense } from "react";
import { StudyWorkspace } from "@/components/study-workspace";
import { WeeklyPracticeClient } from "./weekly-practice-client";
import { BrowserAccountBoundary } from "@/components/browser-account-boundary";
import { Loader2 } from "lucide-react";

export default function WeeklyPracticePage() {
  return (
    <BrowserAccountBoundary>
      <StudyWorkspace>
        <Suspense
          fallback={
            <div className="shell section-space min-h-[50vh] flex flex-col items-center justify-center gap-4">
              <Loader2 size={32} className="text-[#116149] animate-spin" />
              <p className="text-sm font-medium text-slate-500">
                Loading weekly practice...
              </p>
            </div>
          }
        >
          <WeeklyPracticeClient />
        </Suspense>
      </StudyWorkspace>
    </BrowserAccountBoundary>
  );
}
