import { BrowserAccountBoundary } from "./browser-account-boundary";
import type { ReactNode } from "react";
import { StudyWorkspaceClient } from "./study-workspace-client";

export function StudyWorkspace({children}:{children:ReactNode}) {
  return <BrowserAccountBoundary><StudyWorkspaceClient>{children}</StudyWorkspaceClient></BrowserAccountBoundary>;
}
