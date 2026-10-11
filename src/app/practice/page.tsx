"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { StudyWorkspace } from "@/components/study-workspace";
import { PracticeClient } from "./practice-client";

import { useApiResource, ResourceStatus } from "@/lib/api/use-api-resource";
import type { EnrolledData, DashboardData } from "@/lib/api/app-dtos";

function PracticePageContent() {
  const searchParams = useSearchParams();
  const enrollment=useApiResource<EnrolledData>("/api/v1/practice/subjects");
  const dashboard=useApiResource<DashboardData>("/api/v1/dashboard");
  if(!enrollment.data||!dashboard.data) return <ResourceStatus error={enrollment.error??dashboard.error} retry={()=>{enrollment.retry();dashboard.retry();}}/>;
  const initialSubjectCode = searchParams.get("subject") || undefined;
  const initialTopicSlug = searchParams.get("topic") || undefined;

  return (
    <PracticeClient
      enrolledSubjects={enrollment.data.subjects.map((subject)=>({code:subject.subject_code,name:subject.subject_name,isCompulsory:subject.is_compulsory}))}
      initialSubjectCode={initialSubjectCode}
      initialTopicSlug={initialTopicSlug}
      isPremium={dashboard.data.subscription.isPremium}
    />
  );
}

export default function PracticePage() {
  return (
    <StudyWorkspace isPremium={false}>
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
