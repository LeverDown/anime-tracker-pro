import { useMemo } from 'react';
import type { BacklogEntry, BacklogStats } from '@/types/backlog';

export function useBacklogStats(
  entries: BacklogEntry[],
  watchRatePerDay: number
): BacklogStats {
  return useMemo(() => {
    const nodeCount     = entries.length;
    const totalEpisodes = entries.reduce((s, e) => s + (e.episodes - e.watchedEpisodes), 0);
    const totalDays     = watchRatePerDay > 0
      ? totalEpisodes / watchRatePerDay
      : 0;
    const totalWeeks    = parseFloat((totalDays / 7).toFixed(1));
    const solarYears    = parseFloat((totalDays / 365).toFixed(2));
    const avgDaysPerSeries = nodeCount > 0
      ? parseFloat((totalDays / nodeCount).toFixed(1))
      : 0;
    const nextNode      = entries.length > 0 ? entries[0] : null;

    // Threat level based on total weeks
    const threatLevel: BacklogStats['threatLevel'] =
      totalWeeks < 4  ? 'LOW'      :
      totalWeeks < 12 ? 'MEDIUM'   :
      totalWeeks < 26 ? 'HIGH'     : 'CRITICAL';

    return {
      nodeCount,
      totalEpisodes,
      totalWeeks,
      solarYears,
      avgDaysPerSeries,
      nextNode,
      threatLevel,
    };
  }, [entries, watchRatePerDay]);
}
