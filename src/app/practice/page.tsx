"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { StudyWorkspace } from "@/components/study-workspace";
import { PracticeClient } from "./practice-client";

import { useApiResource, ResourceStatus } from "@/lib/api/use-api-resource";
import type { PracticeCatalogue } from "@/lib/api/practice-dtos";

function PracticePageContent() {
  const searchParams = useSearchParams();
  const catalogue=useApiResource<PracticeCatalogue>("/api/v1/practice/catalogue");
  if(!catalogue.data) return <ResourceStatus error={catalogue.error} retry={catalogue.retry}/>;
  const initialSubjectCode = searchParams.get("subject") || undefined;
  const initialTopicSlug = searchParams.get("topic") || undefined;

  return (
    <PracticeClient
      enrolledSubjects={catalogue.data.subjects}
      dailySessionUsed={catalogue.data.dailySessionUsed}
      activeSessionId={catalogue.data.activeSessionId}
      initialSessionId={searchParams.get("session")??undefined}
      refreshCatalogue={catalogue.retry}
      initialSubjectCode={initialSubjectCode}
      initialTopicSlug={initialTopicSlug}
      isPremium={catalogue.data.isPremium}
    />
  );
}

export default function PracticePage() {
  return (
    <StudyWorkspace>
      <main className="shell section-space">
        <Suspense
          fallback={
            <div className="rounded-3xl border border-emerald-950/10 bg-white p-8 text-center text-xs text-slate-500 max-w-2xl mx-auto">
              Loading practice workspace...
            </div>
          }
        >
          <PracticePageContent />
        </Suspense>
      </main>
    </StudyWorkspace>
  );
}
