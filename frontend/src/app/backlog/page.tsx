"use client";
import React, { useState, useEffect, useContext, useCallback, JSX } from 'react';
import { AuthContext } from '../AuthContext';
import api from '../../api/client';
import { Button, Card } from '../../components/UI';
import { CollectionEntry, BacklogMeta } from '../../types/anime';
import { motion, AnimatePresence } from 'framer-motion';
import { Dices } from 'lucide-react';
import { useRouter } from 'next/navigation';
import styles from './backlog.module.css';

/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @next/next/no-img-element */

/**
 * BacklogPage Protocol
 * Enforces strict typing, token synchronization, and RDS atomic boundaries.
 */
export default function BacklogPage(): JSX.Element {
  const auth = useContext(AuthContext);
  const user = auth?.user;
  const router = useRouter();
  const [backlog, setBacklog] = useState<CollectionEntry[]>([]);
  const [meta, setMeta] = useState<BacklogMeta | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [mounted, setMounted] = useState<boolean>(false);
  const [rouletteAnim, setRouletteAnim] = useState<boolean>(false);
  const [currentPick, setCurrentPick] = useState<BacklogMeta['roulette_pick']>(null);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [showResult, setShowResult] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchBacklog = useCallback(async (): Promise<void> => {
    if (!user) return;
    try {
      const [listRes, metaRes] = await Promise.all([
        api.get<{ data: CollectionEntry[] }>('/collection', { params: { username: user, status_filter: 'Plan to Watch' } }),
        api.get<BacklogMeta>('/collection/backlog', { params: { username: user } }),
      ]);
      setBacklog(listRes.data.data);
      setMeta(metaRes.data);
      setCurrentPick(metaRes.data.roulette_pick);
      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch backlog", error);
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { 
    fetchBacklog(); 
  }, [fetchBacklog]);

  const availableGenres = Array.from(new Set(backlog.flatMap(item => item.genres?.split(',').map(g => g.trim()) || []))).sort();

  const candidatePool = selectedGenres.length === 0 
    ? backlog 
    : backlog.filter(item => {
        const itemGenres = item.genres?.split(',').map(g => g.trim()) || [];
        return selectedGenres.some(g => itemGenres.includes(g));
      });

  const spinRoulette = async (): Promise<void> => {
    if (candidatePool.length === 0) return;
    setRouletteAnim(true);
    setShowResult(false);
    
    setTimeout(() => {
      const pick = candidatePool[Math.floor(Math.random() * candidatePool.length)];
      setCurrentPick({
        anime_id: pick.anime_id,
        title: pick.title,
        image_url: pick.image_url,
        episodes: pick.episodes || 0,
        genres: pick.genres
      });
      setRouletteAnim(false);
      setShowResult(true);
    }, 2000);
  };

  const toggleGenre = (genre: string) => {
    setSelectedGenres(prev => 
      prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]
    );
  };

  if (!mounted || loading) return <div className={styles.container}><p className={styles.emptyState}>LOADING_BACKLOG_DATA...</p></div>;

  const weeks = meta?.estimated_weeks_to_clear ?? 0;
  const years = (weeks / 52).toFixed(1);

  return (
    <div className={`${styles.container} animate-fade-in`}>
      <header className={`${styles.header} rds-hatch`} style={{ marginBottom: 'var(--space-10)', paddingBottom: 'var(--space-6)', borderBottom: '1px solid var(--hud-footer-border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 className={styles.title}>
            RONINHUB // BACKLOG_MANAGER // SECTOR_ACTIVE
          </h1>
          <div style={{ fontSize: '10px', color: 'var(--spec-val-color)', display: 'flex', alignItems: 'center', gap: '12px', fontFamily: 'var(--font-mono)' }}>
            <span style={{ opacity: 0.6 }}>DATA_DENSITY // {backlog.length.toString().padStart(3, '0')}</span>
            <div style={{ width: '1px', height: '10px', background: 'var(--hud-footer-border)' }} />
            SYS: <span style={{ color: 'var(--spec-val-color)', marginLeft: '4px', fontWeight: 800 }}>NOMINAL</span>
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
          </div>
        </div>
        <p className={styles.subtitle}>CONFRONT_YOUR_SHAME. CONQUER_YOUR_BACKLOG.</p>
      </header>

      {/* Stats Grid */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={`${styles.statValue} ${styles.statPrimary}`}>{backlog.length}</div>
          <div className={styles.statLabel}>BACKLOG_NODES</div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statValue} ${styles.statWarning}`}>{meta?.total_unwatched_episodes ?? 0}</div>
          <div className={styles.statLabel}>PENDING_UNITS</div>
        </div>
        <div className={`${styles.statCard} ${styles.timeToClear}`}>
          <div className={styles.statLabel} style={{ textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 'var(--space-2)' }}>TEMPORAL_RESOLUTION_ESTIMATE</div>
          <div className={`${styles.statValue} ${styles.statDanger}`}>
            {weeks.toFixed(1)} <span style={{ fontSize: '12px', opacity: 0.6 }}>WEEKS</span>
          </div>
          <div className={styles.statLabel}>
            ESTIMATED <span className={styles.statWarning}>{years} SOLAR_YEARS</span> AT CURRENT FREQUENCY
          </div>
        </div>
      </div>

      {/* Roulette */}
      <div className={styles.rouletteSection}>
        <h2 className={styles.rouletteTitle}>
          <div style={{ width: '12px', height: '12px', background: 'var(--primary-color)' }} />
          NEURAL_ROULETTE // SECTOR_ROLL
        </h2>

        <div className={styles.filterSection}>
          <div className={styles.filterTitle}>
            <div style={{ width: '6px', height: '6px', border: '1px solid var(--text-dark)' }} />
            FILTER_PROTOCOL // GENRE_SCAN
          </div>
          <div className={styles.genreChips}>
            {availableGenres.map(genre => (
              <button
                key={genre}
                className={`${styles.genreChip} ${selectedGenres.includes(genre) ? styles.genreChipActive : ''}`}
                onClick={() => toggleGenre(genre)}
              >
                {genre}
              </button>
            ))}
          </div>
          <div className={styles.candidateCount}>
            CANDIDATES_IN_POOL // {candidatePool.length.toString().padStart(3, '0')}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {rouletteAnim ? (
            <motion.div 
              key="dice-anim"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={styles.diceContainer}
            >
              <div className={styles.dice}>
                <div className={styles.face} style={{ transform: 'rotateY(0deg) translateZ(30px)' }}><Dices size={24} /></div>
                <div className={styles.face} style={{ transform: 'rotateY(90deg) translateZ(30px)' }}><Dices size={24} /></div>
                <div className={styles.face} style={{ transform: 'rotateY(180deg) translateZ(30px)' }}><Dices size={24} /></div>
                <div className={styles.face} style={{ transform: 'rotateY(-90deg) translateZ(30px)' }}><Dices size={24} /></div>
                <div className={styles.face} style={{ transform: 'rotateX(90deg) translateZ(30px)' }}><Dices size={24} /></div>
                <div className={styles.face} style={{ transform: 'rotateX(-90deg) translateZ(30px)' }}><Dices size={24} /></div>
              </div>
              <p className={styles.spinningText}>SYNCING_CANDIDATES...</p>
            </motion.div>
          ) : currentPick ? (
            <motion.div 
              key="result"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={styles.rouletteContent}
            >
              {showResult && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={styles.congratsMessage}
                >
                  <span className={styles.congratsPrefix}>TARGET_LOCKED //</span>
                  <p>ASSIGNED_OBJECTIVE: <span className={styles.rolledTitle}>{currentPick.title}</span></p>
                </motion.div>
              )}
              
              <div className={styles.pickWrapper}>
                <img
                  src={currentPick.image_url}
                  alt={currentPick.title}
                  className={styles.rouletteImage}
                />
                <div className={styles.rouletteInfo}>
                  <div className={styles.rouletteAnimeTitle}>{currentPick.title}</div>
                  <div className={styles.rouletteAnimeSubtitle}>{currentPick.episodes ?? '?'} DATA_UNITS // EPISODES</div>
                  
                  <div className={styles.genreTags}>
                    {currentPick.genres?.split(',').map((g, idx) => (
                      <span key={idx} className={styles.genreTag}>{g.trim()}</span>
                    ))}
                  </div>
                  <div style={{ marginTop: 'var(--space-6)' }}>
                    <Button variant="primary" glow size="sm" onClick={() => router.push(`/anime/${currentPick.anime_id}`)}>
                      INITIALIZE_UPLINK //
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <p className={styles.emptyState}>[ NO_DATA_DETECTED_IN_SECTOR ]</p>
          )}
        </AnimatePresence>
        {!rouletteAnim && (
          <Button
            onClick={spinRoulette}
            disabled={rouletteAnim || candidatePool.length === 0}
            variant="primary"
            glow
            style={{ minWidth: '240px' }}
          >
            EXECUTE_ROULETTE_SPIN //
          </Button>
        )}
      </div>

      {/* Backlog List */}
      <h2 className={styles.listHeader}>
        <div style={{ width: '8px', height: '8px', background: 'var(--primary-color)' }} />
        FULL_BACKLOG_DUMP ({backlog.length})
      </h2>
      <div className={styles.backlogList}>
        {backlog.map((entry: CollectionEntry, i: number) => (
          <div key={entry.anime_id} className={styles.backlogItem}>
            <div className={styles.itemIndex}>{ (i + 1).toString().padStart(3, '0') }</div>
            <img src={entry.image_url} alt={entry.title} className={styles.itemImage} />
            <div className={styles.itemContent}>
              <div className={styles.itemTitle}>{entry.title}</div>
              <div className={styles.itemMeta}>U // {entry.episodes ?? '?'} EPS &nbsp;·&nbsp; G // {entry.genres?.split(',')[0] ?? 'UNKNOWN'}</div>
            </div>
            <Button size="sm" variant="tactical" onClick={() => router.push(`/anime/${entry.anime_id}`)}>
              ACCESS_INTEL
            </Button>
          </div>
        ))}
        {backlog.length === 0 && (
          <p className={styles.emptyState}>
            🎉 BACKLOG_CLEAR. YOU_ARE_A_LEGEND.
          </p>
        )}
      </div>
    </div>
  );
}
