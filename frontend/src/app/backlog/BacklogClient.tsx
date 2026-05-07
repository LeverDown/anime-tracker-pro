'use client';

import { useRouter } from 'next/navigation';
import { useBacklogList, useUserPreferences, useUpdateAnimeStatus } from '@/hooks/useBacklog';
import { useBacklogStats } from '@/hooks/useBacklogStats';
import { useBacklogFilter } from '@/hooks/useBacklogFilter';
import { useRoulette } from '@/hooks/useRoulette';
import { useWatchRate } from '@/hooks/useWatchRate';
import { StatCluster } from './StatCluster';
import { BacklogDump } from './BacklogDump';
import { NeuralRoulette } from './NeuralRoulette';
import { ThreatAssessment } from './ThreatAssessment';
import { BacklogSkeleton } from './BacklogSkeleton';
import { BacklogError } from './BacklogError';
import styles from './backlog.module.css';

export function BacklogClient() {
  const router = useRouter();

  // ── Data fetching ──────────────────────────────────────
  const { data: entries = [], isLoading, isError } = useBacklogList();
  const { data: prefs } = useUserPreferences();
  const { mutate: updateStatus } = useUpdateAnimeStatus();

  // ── Local interactive state ────────────────────────────
  const { watchRate, setWatchRate } = useWatchRate(prefs?.watchRatePerDay);
  const stats = useBacklogStats(entries, watchRate);
  const {
    sortMode, setSortMode,
    activeGenres, toggleGenre,
    allGenres, filteredEntries,
  } = useBacklogFilter(entries);

  // Roulette uses the GENRE-filtered pool (not the sort-filtered one)
  const roulettePool = filteredEntries;
  const { isSpinning, result, diceFace, spin, reset } = useRoulette(roulettePool);

  // ── Actions ────────────────────────────────────────────
  function handleStart(id: number) {
    updateStatus({ id, status: 'WATCHING' });
  }

  function handleInitializeUplink() {
    if (!result) return;
    updateStatus({ id: result.id, status: 'WATCHING' });
    reset();
  }

  function handleIntel(id: number) {
    // Navigate to anime details - using malId or id as per app routing logic
    // Assuming /anime/[id] exists
    router.push(`/anime/${id}`);
  }

  // ── Loading & Error states ─────────────────────────────
  if (isLoading) return <BacklogSkeleton />;
  if (isError)   return <BacklogError />;

  return (
    <div className={styles.backlogPage}>
      <StatCluster
        stats={stats}
        watchRate={watchRate}
        onWatchRateChange={setWatchRate}
      />
      
      <div className={styles.layout}>
        <div className={styles.leftCol}>
          <BacklogDump
            entries={filteredEntries}
            sortMode={sortMode}
            onSortChange={setSortMode}
            activeGenres={activeGenres}
            onGenreToggle={toggleGenre}
            allGenres={allGenres}
            onStart={handleStart}
            onIntel={handleIntel}
          />
        </div>
        
        <div className={styles.rightCol}>
          <NeuralRoulette
            pool={roulettePool}
            allGenres={allGenres}
            activeGenres={activeGenres}
            onGenreToggle={toggleGenre}
            isSpinning={isSpinning}
            result={result}
            diceFace={diceFace}
            onSpin={spin}
            onInitializeUplink={handleInitializeUplink}
            onRespin={spin}
          />
          <ThreatAssessment
            stats={stats}
            entries={entries}
          />
        </div>
      </div>
    </div>
  );
}
