import styles from "./study-loading.module.css";

export default function StudyLoading() {
  return (
    <main className={styles.screen} aria-busy="true">
      <div role="status" aria-live="polite" aria-label="Loading your study space">
        <img src="/lecterniq-mark.svg" width={104} height={104} className={styles.logo} alt="" aria-hidden="true" />
      </div>
    </main>
  );
}
