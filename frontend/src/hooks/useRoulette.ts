import { useState, useCallback, useRef } from 'react';
import type { BacklogEntry } from '@/types/backlog';

const DICE_FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'] as const;
const SPIN_DURATION_MS = 2200;
const DICE_INTERVAL_MS = 80;

export function useRoulette(pool: BacklogEntry[]) {
  const [isSpinning,  setIsSpinning]  = useState(false);
  const [result,      setResult]      = useState<BacklogEntry | null>(null);
  const [diceFace,    setDiceFace]    = useState<string>('⚄');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const spin = useCallback(() => {
    if (isSpinning || pool.length === 0) return;

    setIsSpinning(true);
    setResult(null);

    let i = 0;
    intervalRef.current = setInterval(() => {
      setDiceFace(DICE_FACES[i % DICE_FACES.length]);
      i++;
    }, DICE_INTERVAL_MS);

    setTimeout(() => {
      if (intervalRef.current) clearInterval(intervalRef.current);

      // Pick a random entry from the current filtered pool
      const chosen = pool[Math.floor(Math.random() * pool.length)];
      setResult(chosen);
      setDiceFace('⚅');
      setIsSpinning(false);
    }, SPIN_DURATION_MS);
  }, [isSpinning, pool]);

  const reset = useCallback(() => {
    setResult(null);
    setDiceFace('⚄');
  }, []);

  return { isSpinning, result, diceFace, spin, reset };
}
