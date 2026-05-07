'use client';

import styles from './backlog.module.css';

interface HUDFooterProps {
  section?: string;
  count?: number;
}

export function HUDFooter({ section = 'BACKLOG', count = 0 }: HUDFooterProps) {
  return (
    <footer className={styles.hudFooter}>
      <div className={styles.footerLeft}>
        {section}_SESSION // ACTIVE {count > 0 ? `— ${count} NODES LOADED` : ''}
      </div>
      <div className={styles.footerRight}>
        RONINHUB v2.4.1 // SYS: NOMINAL <span className={styles.blinkCursor}>▋</span>
      </div>
    </footer>
  );
}
