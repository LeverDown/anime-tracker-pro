'use client';

import styles from './backlog.module.css';

export function BacklogPageHeader() {
  return (
    <header className={styles.pageHeader}>
      <div>
        <h1 className={styles.headerTitle}>RONINHUB // BACKLOG_MANAGER // SECTOR_ACTIVE</h1>
        <p className={styles.headerSub}>CONFRONT_YOUR_SHAME. CONQUER_YOUR_BACKLOG.</p>
      </div>
      <div className={styles.headerRight}>
        <div className={styles.dataDensity}>DATA_DENSITY // 001</div>
        <div className={styles.sysStatus}>
          SYS: NOMINAL
          <div className={styles.pulseDot} />
        </div>
      </div>
    </header>
  );
}
