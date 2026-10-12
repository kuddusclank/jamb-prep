"use client";

import { useEffect, useState } from "react";
import styles from "./study-loading.module.css";

export default function StudyLoading() {
  const [showRetry, setShowRetry] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowRetry(true), 10000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <main className={styles.screen} aria-busy="true">
      <div role="status" aria-live="polite" className={styles.content}>
        <span className={styles.brand} aria-hidden="true">LecternIQ</span>
        <span className={styles.track} aria-hidden="true"><span /></span>
        <p className={styles.caption}>Preparing your study space…</p>
      </div>
      {showRetry && (
        <button type="button" onClick={() => window.location.reload()} className={styles.retry}>
          Taking longer than usual? Try again
        </button>
      )}
    </main>
  );
}
