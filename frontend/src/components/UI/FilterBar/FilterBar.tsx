"use client";

import React from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { SortMode, ViewMode } from '@/types/seasonal';

export const useSeasonalFilters = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const genre = searchParams.get('genre') || 'ALL';
  const sortBy = (searchParams.get('sort') as SortMode) || 'SCORE';
  const viewMode = (searchParams.get('view') as ViewMode) || 'GRID';

  const setFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === 'ALL' || !value) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return {
    genre,
    sortBy,
    viewMode,
    setGenre: (g: string) => setFilter('genre', g),
    setSortBy: (s: SortMode) => setFilter('sort', s),
    setViewMode: (v: ViewMode) => setFilter('view', v),
  };
};

const GENRES = ['ALL', 'ACTION', 'ADVENTURE', 'COMEDY', 'DRAMA', 'FANTASY', 'ROMANCE', 'SCI-FI'];
const SORTS: SortMode[] = ['SCORE', 'POPULARITY', 'AIRTIME'];
const VIEWS: ViewMode[] = ['GRID', 'LIST'];

export const FilterBar: React.FC = () => {
  const { genre, sortBy, viewMode, setGenre, setSortBy, setViewMode } = useSeasonalFilters();

  const chipStyle = (active: boolean): React.CSSProperties => ({
    fontSize: '9px',
    padding: '3px 9px',
    border: '1px solid',
    borderRadius: 0,
    cursor: 'pointer',
    transition: 'all 100ms',
    letterSpacing: '0.05em',
    fontFamily: 'var(--font-mono)',
    color: active ? 'var(--chip-active-color)' : 'var(--chip-color)',
    borderColor: active ? 'var(--chip-active-border)' : 'var(--chip-border)',
    background: active ? 'var(--chip-active-bg)' : 'transparent',
    boxShadow: active ? '0 0 12px var(--glow-border)' : 'none',
    textTransform: 'uppercase'
  });

  const categoryLabelStyle: React.CSSProperties = {
    fontSize: '8px',
    color: 'var(--chip-category-color)',
    fontFamily: 'var(--font-mono)',
    letterSpacing: '0.1em',
    textTransform: 'uppercase'
  };

  const separatorStyle: React.CSSProperties = {
    width: '1px',
    height: '14px',
    background: 'var(--chip-border)',
    margin: '0 4px'
  };

  return (
    <div style={{
      padding: '7px 14px',
      borderBottom: '1px solid var(--hud-footer-border)',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      flexWrap: 'wrap',
      background: 'var(--packet-bg)'
    }}>
      <span style={categoryLabelStyle}>FILTER//</span>
      {GENRES.map(g => (
        <div 
          key={g} 
          onClick={() => setGenre(g)} 
          style={chipStyle(genre === g)}
        >
          {g}
        </div>
      ))}

      <div style={separatorStyle} />

      <span style={categoryLabelStyle}>SORT//</span>
      {SORTS.map(s => (
        <div 
          key={s} 
          onClick={() => setSortBy(s)} 
          style={chipStyle(sortBy === s)}
        >
          {s}
        </div>
      ))}

      <div style={separatorStyle} />

      <span style={categoryLabelStyle}>VIEW//</span>
      {VIEWS.map(v => (
        <div 
          key={v} 
          onClick={() => setViewMode(v)} 
          style={chipStyle(viewMode === v)}
        >
          {v}
        </div>
      ))}
    </div>
  );
};
