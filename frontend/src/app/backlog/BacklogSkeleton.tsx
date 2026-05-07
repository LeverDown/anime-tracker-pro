'use client';

import styles from './backlog.module.css';

export function BacklogSkeleton() {
  return (
    <div className={styles.backlogPage}>
      {/* Stat Cluster Skeleton */}
      <div className={styles.statCluster}>
        {[...Array(4)].map((_, i) => (
          <div key={i} className={`${styles.statCell} ${styles.skeletonCell}`}>
            <div style={{ height: '8px', width: '40%', background: 'var(--border)', marginBottom: '8px' }} />
            <div style={{ height: '28px', width: '60%', background: 'var(--border)' }} />
          </div>
        ))}
      </div>

      <div className={styles.layout}>
        <div className={styles.leftCol}>
          <div className={styles.sectorShell}>
            <div className={styles.sh}>
              <div className={styles.shLeft}>
                <div className={styles.amberSquare} style={{ opacity: 0.3 }} />
                <div className={styles.shTitle} style={{ opacity: 0.3 }}>LOADING_SECTOR_DATA //</div>
              </div>
            </div>
            
            <div className={styles.sortFilterBar}>
              {[...Array(5)].map((_, i) => (
                <div key={i} className={styles.skeletonCell} style={{ width: '60px', height: '20px' }} />
              ))}
            </div>

            <div className={styles.backlogDump}>
              {[...Array(8)].map((_, i) => (
                <div key={i} className={styles.pqRow} style={{ borderBottom: '1px solid var(--border)' }}>
                  <div className={styles.skeletonCell} style={{ width: '40px', height: '56px', margin: '10px' }} />
                  <div className={styles.colInfo}>
                    <div className={styles.skeletonCell} style={{ width: '200px', height: '12px', marginBottom: '8px' }} />
                    <div className={styles.skeletonCell} style={{ width: '120px', height: '8px' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.rightCol}>
          <div className={styles.sectorShell} style={{ height: '300px' }}>
            <div className={`${styles.skeletonCell}`} style={{ height: '100%', width: '100%' }} />
          </div>
          <div className={styles.sectorShell} style={{ height: '200px' }}>
            <div className={`${styles.skeletonCell}`} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
      </div>
      
      <div className={styles.loadingText}>
        LOADING_SECTOR_DATA //
      </div>
    </div>
  );
}
