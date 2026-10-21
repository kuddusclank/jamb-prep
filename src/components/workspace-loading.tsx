import { StudyWorkspace } from "@/components/study-workspace";
import StudySkeleton from "@/components/study-skeleton";

export default function WorkspaceLoading() {
  return (
    <StudyWorkspace>
      <main className="shell section-space">
        <StudySkeleton />
      </main>
    </StudyWorkspace>
  );
}
