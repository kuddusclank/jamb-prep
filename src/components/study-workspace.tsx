import { BrowserAccountBoundary } from "./browser-account-boundary";
import type { ReactNode } from "react";
import { StudyWorkspaceClient } from "./study-workspace-client";
import { WorkspaceFocusProvider } from "./study-workspace-context";

export function StudyWorkspace({ children }: { children: ReactNode }) {
  return (
    <BrowserAccountBoundary>
      <WorkspaceFocusProvider>
        <StudyWorkspaceClient>{children}</StudyWorkspaceClient>
      </WorkspaceFocusProvider>
    </BrowserAccountBoundary>
  );
}
