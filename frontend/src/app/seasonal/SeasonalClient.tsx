"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { ChronosSlider } from '@/components/UI/TemporalSector/ChronosSlider';
import { DataPacket } from '@/components/UI/DataPacket/DataPacket';
import { FilterBar, useSeasonalFilters } from '@/components/UI/FilterBar/FilterBar';
import { SeasonalAnimeEntry, Season } from '@/types/seasonal';
import { useSeasonalAnime } from '@/hooks/queries/useAnime';
import styles from './seasonal.module.css';
import { seasonalGridVariants, scrollRevealVariants, RDS_VIEWPORT_OPTIONS } from '@/animations/motions';
import { SkeletonHUD } from '../../components/UI';

interface SeasonalClientProps {
  initialData: SeasonalAnimeEntry[];
  initialSeason: Season;
  initialYear: number;
}

export const SeasonalClient: React.FC<SeasonalClientProps> = ({
  initialData,
  initialSeason,
  initialYear,
}) => {
  const [activeSeason, setActiveSeason] = useState<Season>(initialSeason);
  const [activeYear, setActiveYear] = useState<number>(initialYear);
  const [direction, setDirection] = useState<1 | -1>(1);

  const { genre, sortBy, viewMode } = useSeasonalFilters();

  const { data: seasonalData, isPending: loading } = useSeasonalAnime(activeYear, activeSeason, 1);
  
  // Use initialData if we are on the initial season/year and have no fetched data yet
  const data = seasonalData?.data || (activeSeason === initialSeason && activeYear === initialYear ? initialData : []);

  // Handle season/year changes
  const handleTemporalChange = (s: Season, y: number) => {
    const seasons: Season[] = ['WINTER', 'SPRING', 'SUMMER', 'FALL'];
    const oldIndex = seasons.indexOf(activeSeason);
    const newIndex = seasons.indexOf(s);

    let dir: 1 | -1 = 1;
    if (y > activeYear) dir = 1;
    else if (y < activeYear) dir = -1;
    else dir = newIndex > oldIndex ? 1 : -1;

    setDirection(dir);
    setActiveSeason(s);
    setActiveYear(y);
  };

  // Filter and Sort logic
  const filteredData = data.filter((item: any) => {
    const genres = item.genres || [];
    if (genre !== 'ALL' && !genres.map((g: any) => (typeof g === 'string' ? g : g.name).toUpperCase()).includes(genre)) return false;
    return true;
  }).sort((a: any, b: any) => {
    const aScore = a.averageScore ?? a.average_score ?? 0;
    const bScore = b.averageScore ?? b.average_score ?? 0;
    const aPop = a.popularity ?? 0;
    const bPop = b.popularity ?? 0;
    
    if (sortBy === 'SCORE') return bScore - aScore;
    if (sortBy === 'POPULARITY') return bPop - aPop;
    if (sortBy === 'AIRTIME') {
      const aTime = a.nextAiringEpisode?.airingAt || a.airing_at || Infinity;
      const bTime = b.nextAiringEpisode?.airingAt || b.airing_at || Infinity;
      return aTime - bTime;
    }
    return 0;
  });

  return (
    <div style={{ background: 'var(--hud-root-bg)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* HUD Topbar */}
      <motion.header
        variants={scrollRevealVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        style={{
          background: 'var(--hud-topbar-bg)',
          borderBottom: 'var(--sector-border)',
          padding: '7px 14px',
          fontFamily: 'var(--font-mono)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 10
        }}
      >
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          style={{ fontSize: '12px', letterSpacing: '0.1em', color: 'var(--spec-title-color)', fontWeight: 900 }}
        >
          RONINHUB // SEASONAL INTEL // TEMPORAL SECTOR ACTIVE
        </motion.div>
        <div style={{ fontSize: '12px', color: 'var(--spec-val-color)', display: 'flex', alignItems: 'center', fontWeight: 900 }}>
          SYS: <span style={{ color: 'var(--spec-val-color)', marginLeft: '4px', fontWeight: 900 }}>NOMINAL</span>
          <motion.div
            animate={{ opacity: [1, 1, 0, 0, 1] }}
            transition={{ duration: 1.5, repeat: Infinity, times: [0, 0.45, 0.5, 0.95, 1], ease: "linear" }}
            style={{
              marginLeft: '8px',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: 'var(--spec-val-color)',
              boxShadow: '0 0 8px var(--spec-val-color)'
            }}
          />
          <motion.span
            animate={{ opacity: [1, 1, 0, 0] }}
            transition={{ duration: 0.8, repeat: Infinity, times: [0, 0.5, 0.5, 1], ease: "linear" }}
            style={{ marginLeft: '6px', width: '2px', height: '12px', background: 'currentColor' }}
          />
        </div>
      </motion.header>

      <motion.div
        variants={scrollRevealVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
      >
        <ChronosSlider
          activeSector={activeSeason}
          activeYear={activeYear}
          onSectorChange={handleTemporalChange}
          direction={direction}
        />
      </motion.div>

      <motion.div
        variants={scrollRevealVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
      >
        <FilterBar />
      </motion.div>

      {/* Main Content Grid */}
      <main style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <AnimatePresence mode="wait">
          {loading ? (
            <SkeletonHUD />
          ) : (
            <motion.div
              key={`${activeSeason}-${activeYear}-${genre}-${sortBy}`}
              initial="hidden"
              animate="visible"
              variants={seasonalGridVariants}
              style={{
                display: 'grid',
                gridTemplateColumns: viewMode === 'LIST' ? '1fr' : 'repeat(6, 1fr)',
                gap: '1px',
                background: 'var(--glow-grid-gap)',
                minHeight: '100%'
              }}
            >
              {filteredData.map((item: any, idx: number) => (
                <DataPacket
                  key={item.id_mal || item.id}
                  {...item}
                  index={idx}
                  horizontal={viewMode === 'LIST'}
                />
              ))}
              {filteredData.length === 0 && (
                <div style={{ gridColumn: viewMode === 'LIST' ? '1' : 'span 6', padding: '100px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
                  NO INTEL FOUND FOR THIS SECTOR.
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* HUD Footer */}
      <footer style={{
        padding: '6px 14px',
        borderTop: '1px solid var(--hud-footer-border)',
        display: 'flex',
        justifyContent: 'space-between',
        background: 'var(--hud-root-bg)',
        zIndex: 10
      }}>
        <div style={{
          color: 'var(--hud-footer-left)',
          fontSize: '9px',
          fontFamily: 'var(--font-mono)',
          letterSpacing: '0.08em'
        }}>
          PACKETS LOADED: {filteredData.length} / {data.length} — SECTOR: {activeSeason}_{activeYear}
        </div>
        <div style={{
          color: 'var(--hud-footer-right)',
          fontSize: '9px',
          fontFamily: 'var(--font-mono)',
          letterSpacing: '0.08em'
        }}>
          {data[0]?.source_provider === 'jikan' ? 'Jikan REST' : 'AniList GQL'} // HYBRID CACHE ACTIVE
        </div>
      </footer>
    </div>
  );
};
