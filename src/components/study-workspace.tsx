import { BrowserAccountBoundary } from "./browser-account-boundary";
import type { ReactNode } from "react";
import { StudyWorkspaceClient } from "./study-workspace-client";

export function StudyWorkspace({
  children,
  isPremium = false
}: {
  children: ReactNode;
  isPremium?: boolean;
}) {
  return <BrowserAccountBoundary><StudyWorkspaceClient isPremium={isPremium}>
    {children}
  </StudyWorkspaceClient></BrowserAccountBoundary>;
}
