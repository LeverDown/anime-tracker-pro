import { useState, useMemo } from 'react';
import type { BacklogEntry, SortMode } from '@/types/backlog';

export function useBacklogFilter(entries: BacklogEntry[]) {
  const [sortMode,      setSortMode]      = useState<SortMode>('PRIORITY');
  const [activeGenres,  setActiveGenres]  = useState<string[]>(['ALL']);

  // Toggle genre — ALL is exclusive (selecting it deselects others)
  function toggleGenre(genre: string) {
    if (genre === 'ALL') {
      setActiveGenres(['ALL']);
      return;
    }
    setActiveGenres((prev) => {
      const without = prev.filter((g) => g !== 'ALL');
      return without.includes(genre)
        ? without.filter((g) => g !== genre).length === 0
          ? ['ALL']                          // if nothing left, reset to ALL
          : without.filter((g) => g !== genre)
        : [...without, genre];
    });
  }

  // All known genres extracted from the real data
  const allGenres = useMemo(() => {
    const set = new Set<string>();
    entries.forEach((e) => e.genres.forEach((g) => set.add(g)));
    return Array.from(set).sort();
  }, [entries]);

  // Filtered pool (for roulette + filter display)
  const filteredEntries = useMemo(() => {
    const base = activeGenres.includes('ALL')
      ? entries
      : entries.filter((e) =>
          e.genres.some((g) => activeGenres.includes(g))
        );

    return [...base].sort((a, b) => {
      switch (sortMode) {
        case 'EPS_ASC':       return a.episodes - b.episodes;
        case 'EPS_DESC':      return b.episodes - a.episodes;
        case 'ALPHABETICAL':  return a.title.localeCompare(b.title);
        case 'PRIORITY':
        default:              return a.rank - b.rank;
      }
    });
  }, [entries, sortMode, activeGenres]);

  return {
    sortMode,   setSortMode,
    activeGenres, toggleGenre,
    allGenres,
    filteredEntries,
  };
}
