import { Suspense } from "react";
import { StudyWorkspace } from "@/components/study-workspace";
import { StudyClient } from "./study-client";
import StudySkeleton from "@/components/study-skeleton";

export const metadata = {
  title: "Study & Subject Summaries — JAMBPrep",
  description:
    "Master official JAMB syllabus topics, core formulas, key concepts, and exam strategies across your registered examination subjects.",
};

export default function StudyPage() {
  return (
    <StudyWorkspace>
      <Suspense fallback={<StudySkeleton />}>
        <StudyClient />
      </Suspense>
    </StudyWorkspace>
  );
}
