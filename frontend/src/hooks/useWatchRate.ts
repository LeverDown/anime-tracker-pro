import { useState, useEffect, useCallback } from 'react';
import { useUpdateWatchRate } from '@/hooks/useBacklog';

const STORAGE_KEY = 'ronin-watch-rate';
const DEFAULT_RATE = 3;

export function useWatchRate(serverRate?: number) {
  const [watchRate, setWatchRateLocal] = useState<number>(
    () => {
      if (typeof window === 'undefined') return serverRate ?? DEFAULT_RATE;
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? parseInt(stored, 10) : (serverRate ?? DEFAULT_RATE);
    }
  );

  const { mutate: syncToServer } = useUpdateWatchRate();

  // Sync server value to local if it arrives after hydration
  useEffect(() => {
    if (serverRate !== undefined && !localStorage.getItem(STORAGE_KEY)) {
      setWatchRateLocal(serverRate);
    }
  }, [serverRate]);

  const setWatchRate = useCallback((rate: number) => {
    const clamped = Math.max(1, Math.min(50, rate));
    setWatchRateLocal(clamped);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, String(clamped));  // optimistic local
    }
    syncToServer(clamped);                                // async server sync
  }, [syncToServer]);

  return { watchRate, setWatchRate };
}
