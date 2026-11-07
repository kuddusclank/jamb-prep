import { BrowserAccountBoundary } from "./browser-account-boundary";
import type { ReactNode } from "react";
import { StudyWorkspaceClient } from "./study-workspace-client";
import { WorkspaceFocusProvider } from "./study-workspace-context";
import StudySkeleton from "./study-skeleton";
import styles from "./study-workspace.module.css";
import { BrandMark } from "./brand-mark";

export function StudyWorkspace({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  const workspaceFallback = fallback ?? (
    <div className={styles.workspace}>
      <header className={styles.header}>
        <span className={styles.brand}><BrandMark size={32}/> JAMBPrep</span>
        <span className={styles.context}>Your study space</span>
      </header>
      <div id="study-content" tabIndex={-1} className={styles.content}>
        <StudySkeleton />
      </div>
    </div>
  );

  return (
    <BrowserAccountBoundary fallback={workspaceFallback}>
      <WorkspaceFocusProvider>
        <StudyWorkspaceClient>{children}</StudyWorkspaceClient>
      </WorkspaceFocusProvider>
    </BrowserAccountBoundary>
  );
}
