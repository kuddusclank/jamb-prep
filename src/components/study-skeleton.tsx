import styles from './study-skeleton.module.css';

export default function StudySkeleton() {
  return <section className={styles.screen} role="status" aria-label="Loading your study data" aria-busy="true">
    <div className={styles.content} aria-hidden="true">
      <div className={`${styles.block} ${styles.heading}`} />
      <div className={`${styles.block} ${styles.subtitle}`} />
      <div className={styles.cards}>{[0, 1, 2].map(key => <div key={key} className={`${styles.block} ${styles.card}`} />)}</div>
      <div className={`${styles.block} ${styles.panel}`} />
    </div>
  </section>;
}
