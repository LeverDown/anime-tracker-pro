'use client';

import React from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import styles from './backlog.module.css';
import { BacklogEntry } from '@/types/backlog';

interface NeuralRouletteProps {
  pool: BacklogEntry[];
  allGenres: string[];
  activeGenres: string[];
  onGenreToggle: (genre: string) => void;
  isSpinning: boolean;
  result: BacklogEntry | null;
  diceFace: string;
  onSpin: () => void;
  onInitializeUplink: () => void;
  onRespin: () => void;
}

export const NeuralRoulette: React.FC<NeuralRouletteProps> = ({
  pool,
  allGenres,
  activeGenres,
  onGenreToggle,
  isSpinning,
  result,
  diceFace,
  onSpin,
  onInitializeUplink,
  onRespin
}) => {
  const reduced = useReducedMotion();
  const dur = (n: number) => reduced ? 0 : n;

  const minEps = pool.length > 0 ? Math.min(...pool.map(e => e.episodes)) : 0;
  const maxEps = pool.length > 0 ? Math.max(...pool.map(e => e.episodes)) : 0;

  return (
    <div className={styles.sectorShell}>
      <div className={styles.sh}>
        <div className={styles.shLeft}>
          <div className={styles.amberSquare} />
          <span className={styles.shTitle}>NEURAL_ROULETTE // SECTOR_ROLL</span>
        </div>
        <div className={styles.shStatus}>
          {isSpinning ? 'SPINNING...' : result ? 'NODE SELECTED' : 'STANDBY'}
        </div>
      </div>

      <div className={styles.rouletteBody}>
        <div className={styles.genreFilter}>
          <div className={styles.barLabel} style={{ marginBottom: '8px' }}>FILTER_PROTOCOL // GENRE_SCAN</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            <button
              className={`${styles.chip} ${activeGenres.includes('ALL') ? styles.chipActive : ''}`}
              onClick={() => onGenreToggle('ALL')}
            >
              ALL
            </button>
            {allGenres.slice(0, 8).map(g => (
              <button
                key={g}
                className={`${styles.chip} ${activeGenres.includes(g) ? styles.chipActive : ''}`}
                onClick={() => onGenreToggle(g)}
              >
                {g}
              </button>
            ))}
          </div>
          <div className={styles.poolCount}>CANDIDATES_IN_POOL // {pool.length}</div>
        </div>

        <div className={styles.miniStatsRow}>
          <div className={styles.miniCell}>
            <div className={styles.miniKey}>POOL_DEPTH //</div>
            <div className={styles.miniValue}>{pool.length}</div>
          </div>
          <div className={styles.miniCell}>
            <div className={styles.miniKey}>SHORTEST //</div>
            <div className={styles.miniValue}>{minEps} EP</div>
          </div>
          <div className={styles.miniCell}>
            <div className={styles.miniKey}>LONGEST //</div>
            <div className={styles.miniValue}>{maxEps} EP</div>
          </div>
        </div>

        <div className={styles.rouletteArena}>
          <AnimatePresence mode="wait">
            {!isSpinning && !result && (
              <motion.div 
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={styles.awaitingText}
              >
                <div className={styles.pulseDot} style={{ margin: '0 auto 12px' }} />
                SYSTEM_READY // AWAITING_SPIN
              </motion.div>
            )}

            {isSpinning && (
              <motion.div 
                key="spinning"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.2 }}
                className={styles.diceElement}
              >
                {diceFace}
              </motion.div>
            )}

            {!isSpinning && result && (
              <motion.div 
                key={result.id}
                initial={{ opacity: 0, scale: 0.95, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: dur(0.24), ease: [0.16, 1, 0.3, 1] }}
                className={styles.resultContainer}
              >
                <div className={styles.resultCover}>
                  <img src={result.coverImage || '/placeholder.png'} className={styles.resultCover} alt={result.title} />
                </div>
                <div className={styles.resultInfo}>
                  <div className={styles.selectedBadge}>SELECTED_NODE //</div>
                  <div className={styles.resultTitle}>{result.title}</div>
                  <div className={styles.resultMeta}>
                    {result.episodes} DATA_UNITS // EPISODES · {result.genres.join(', ')}
                  </div>
                  <div className={styles.resultActions}>
                    <button className={styles.btnStart} onClick={onInitializeUplink}>INITIALIZE_UPLINK //</button>
                    <button className={styles.btnIntel} onClick={onRespin}>RESPIN //</button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button 
          className={`${styles.spinBtn} ${isSpinning ? styles.spinBtnDisabled : ''}`}
          onClick={onSpin}
          disabled={isSpinning || pool.length === 0}
        >
          {isSpinning ? 'EXECUTING_SPIN //' : '⚄  EXECUTE_ROULETTE_SPIN //'}
        </button>
      </div>
    </div>
  );
};
