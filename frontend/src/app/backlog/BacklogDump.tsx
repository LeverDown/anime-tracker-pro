'use client';

import React from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import styles from './backlog.module.css';
import { BacklogEntry, SortMode } from '@/types/backlog';

interface BacklogDumpProps {
  entries: BacklogEntry[];
  sortMode: SortMode;
  onSortChange: (mode: SortMode) => void;
  activeGenres: string[];
  onGenreToggle: (genre: string) => void;
  allGenres: string[];
  onStart: (id: number) => void;
  onIntel: (id: number) => void;
}

export const BacklogDump: React.FC<BacklogDumpProps> = ({
  entries,
  sortMode,
  onSortChange,
  activeGenres,
  onGenreToggle,
  allGenres,
  onStart,
  onIntel
}) => {
  const reduced = useReducedMotion();
  const dur = (n: number) => reduced ? 0 : n;

  return (
    <div className={styles.sectorShell}>
      <div className={styles.sh}>
        <div className={styles.shLeft}>
          <div className={styles.amberSquare} />
          <span className={styles.shTitle}>FULL_BACKLOG_DUMP //</span>
        </div>
        <div className={styles.shStatus}>{entries.length} NODES IN QUEUE</div>
      </div>

      <div className={styles.sortFilterBar}>
        <span className={styles.barLabel}>SORT //</span>
        {(['PRIORITY', 'EPS_ASC', 'EPS_DESC', 'ALPHABETICAL'] as SortMode[]).map(mode => (
          <button 
            key={mode}
            className={`${styles.chip} ${sortMode === mode ? styles.chipActive : ''}`}
            onClick={() => onSortChange(mode)}
          >
            {mode}
          </button>
        ))}

        <div className={styles.separator} />

        <span className={styles.barLabel}>FILTER //</span>
        <button 
          className={`${styles.chip} ${activeGenres.includes('ALL') ? styles.chipActive : ''}`}
          onClick={() => onGenreToggle('ALL')}
        >
          ALL
        </button>
        {allGenres.map(g => (
          <button 
            key={g}
            className={`${styles.chip} ${activeGenres.includes(g) ? styles.chipActive : ''}`}
            onClick={() => onGenreToggle(g)}
          >
            {g}
          </button>
        ))}
      </div>

      <div className={styles.colHeaderRow}>
        <div>#</div>
        <div></div>
        <div>SERIES_INTEL</div>
        <div>ACTIONS</div>
      </div>

      <div className={styles.backlogList}>
        <AnimatePresence mode="popLayout">
          {entries.length === 0 ? (
            <div key="empty" className={styles.loadingText} style={{ padding: '40px', borderTop: '1px dashed var(--border)' }}>
              BACKLOG_CLEAR // NO NODES IN QUEUE
            </div>
          ) : (
            entries.map((entry, index) => (
              <motion.div 
                layout 
                layoutId={`backlog-${entry.id}`}
                key={entry.id} 
                className={styles.pqRow}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: dur(0.18), ease: [0.16, 1, 0.3, 1] }}
              >
                <div className={styles.colNum}>{String(index + 1).padStart(3, '0')}</div>
                <div className={styles.colThumb}>
                  <img src={entry.coverImage || '/placeholder.png'} className={styles.colThumb} alt={entry.title} />
                </div>
                <div className={styles.colInfo}>
                  <div className={styles.rowTitle}>{entry.title}</div>
                  <div className={styles.metaRow}>
                    <span>UNITS // {entry.episodes} EPS</span>
                    <span>FORMAT // {entry.format}</span>
                    {entry.genres.slice(0, 3).map(g => (
                      <span key={g} className={styles.genreTag}>{g}</span>
                    ))}
                  </div>
                  <div className={styles.progressBar}>
                    <div 
                      className={styles.progressFill} 
                      style={{ width: `${(entry.watchedEpisodes / (entry.episodes || 1)) * 100}%` }} 
                    />
                  </div>
                </div>
                <div className={styles.colActions}>
                  <button className={styles.btnStart} onClick={() => onStart(entry.id)}>START //</button>
                  <button className={styles.btnIntel} onClick={() => onIntel(entry.id)}>INTEL //</button>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
