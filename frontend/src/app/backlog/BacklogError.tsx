'use client';

import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import styles from './backlog.module.css';

export function BacklogError() {
  const queryClient = useQueryClient();

  const handleRetry = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.backlog.list('PLAN_TO_WATCH') });
  };

  return (
    <div className={styles.backlogPage} style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div className={styles.sectorShell} style={{ maxWidth: '500px', padding: '40px', textAlign: 'center', borderColor: 'hsl(var(--primary-hsl) / 0.5)' }}>
        <h2 style={{ color: 'hsl(var(--primary-hsl))', marginBottom: '16px', fontSize: '14px' }}>
          SYS: FAULT // DATA_FETCH_FAILED
        </h2>
        <p style={{ color: 'var(--text-lo)', fontSize: '10px', marginBottom: '24px', letterSpacing: '0.05em' }}>
          BACKLOG SECTOR UNREACHABLE — CHECK API CONNECTION
        </p>
        <button 
          onClick={handleRetry}
          className={styles.btnStart}
          style={{ padding: '8px 24px' }}
        >
          RETRY_CONNECTION //
        </button>
      </div>
    </div>
  );
}
