"use client";
import React, { useState, useEffect, useContext, useCallback, JSX } from 'react';
import { AuthContext } from '../AuthContext';
import api from '../../api/client';
import { Button, Card } from '../../components/UI';
import { CollectionEntry, BacklogMeta } from '../../types/anime';
import { motion, AnimatePresence } from 'framer-motion';
import { Dices } from 'lucide-react';
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
  const [backlog, setBacklog] = useState<CollectionEntry[]>([]);
  const [meta, setMeta] = useState<BacklogMeta | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [mounted, setMounted] = useState<boolean>(false);
  const [rouletteAnim, setRouletteAnim] = useState<boolean>(false);
  const [currentPick, setCurrentPick] = useState<BacklogMeta['roulette_pick']>(null);
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

  const spinRoulette = async (): Promise<void> => {
    setRouletteAnim(true);
    setShowResult(false);
    setTimeout(async () => {
      try {
        const res = await api.get<BacklogMeta>('/collection/backlog', { params: { username: user } });
        setCurrentPick(res.data.roulette_pick);
        setRouletteAnim(false);
        setShowResult(true);
      } catch (error) {
        console.error("Roulette spin error", error);
        setRouletteAnim(false);
      }
    }, 2000); // Increased time for animation
  };

  if (!mounted || loading) return <div className={styles.container}><p className={styles.emptyState}>LOADING_BACKLOG_DATA...</p></div>;

  const weeks = meta?.estimated_weeks_to_clear ?? 0;
  const years = (weeks / 52).toFixed(1);

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>
        🗂️ BACKLOG_MANAGER
      </h1>
      <p className={styles.subtitle}>CONFRONT_YOUR_SHAME. CONQUER_YOUR_BACKLOG.</p>

      {/* Stats Grid */}
      <div className={styles.statsGrid}>
        <Card className={styles.statCard}>
          <div className={`${styles.statValue} ${styles.statPrimary}`}>{backlog.length}</div>
          <div className={styles.statLabel}>SHOWS_IN_BACKLOG</div>
        </Card>
        <Card className={styles.statCard}>
          <div className={`${styles.statValue} ${styles.statWarning}`}>{meta?.total_unwatched_episodes ?? 0}</div>
          <div className={styles.statLabel}>UNWATCHED_EPISODES</div>
        </Card>
        <Card className={`${styles.statCard} ${styles.timeToClear}`}>
          <div className={styles.statLabel} style={{ textTransform: 'uppercase', letterSpacing: 'var(--tracking-wider)', marginBottom: 'var(--space-2)' }}>TIME_TO_CLEAR</div>
          <div className={`${styles.statValue} ${styles.statDanger}`}>
            {weeks.toFixed(1)} <span style={{ fontSize: 'var(--font-size-base)' }}>WEEKS</span>
          </div>
          <div className={styles.statLabel}>
            ESTIMATED <span className={styles.statWarning}>{years} YEARS</span> AT CURRENT PACE
          </div>
        </Card>
      </div>

      {/* Roulette */}
      <Card className={styles.rouletteSection}>
        <h2 className={styles.rouletteTitle}>
          🎲 BACKLOG_ROULETTE
        </h2>
        <AnimatePresence mode="wait">
          {rouletteAnim ? (
            <motion.div 
              key="dice-anim"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className={styles.diceContainer}
            >
              <div className={styles.dice}>
                <div className={styles.face} style={{ transform: 'rotateY(0deg) translateZ(30px)' }}><Dices size={30} /></div>
                <div className={styles.face} style={{ transform: 'rotateY(90deg) translateZ(30px)' }}><Dices size={30} /></div>
                <div className={styles.face} style={{ transform: 'rotateY(180deg) translateZ(30px)' }}><Dices size={30} /></div>
                <div className={styles.face} style={{ transform: 'rotateY(-90deg) translateZ(30px)' }}><Dices size={30} /></div>
                <div className={styles.face} style={{ transform: 'rotateX(90deg) translateZ(30px)' }}><Dices size={30} /></div>
                <div className={styles.face} style={{ transform: 'rotateX(-90deg) translateZ(30px)' }}><Dices size={30} /></div>
              </div>
              <p className={styles.spinningText}>CRUNCHING_METRICS...</p>
            </motion.div>
          ) : currentPick ? (
            <motion.div 
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={styles.rouletteContent}
            >
              {showResult && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={styles.congratsMessage}
                >
                  <span className={styles.congratsPrefix}>CONGRATULATIONS!</span>
                  <p>YOU_HAVE_ROLLED <span className={styles.rolledTitle}>{currentPick.title}</span></p>
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
                  <div className={styles.rouletteAnimeSubtitle}>{currentPick.episodes ?? '?'} EPISODES</div>
                  
                  <div className={styles.genreTags}>
                    {currentPick.genres?.split(',').map((g, idx) => (
                      <span key={idx} className={styles.genreTag}>{g.trim()}</span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <p className={styles.emptyState}>NO_DATA_IN_PLAN_TO_WATCH_LIST</p>
          )}
        </AnimatePresence>
        <Button
          onClick={spinRoulette}
          disabled={rouletteAnim || backlog.length === 0}
          variant={rouletteAnim ? 'secondary' : 'primary'}
          icon={<span>🎲</span>}
        >
          {rouletteAnim ? 'SPINNING...' : 'SPIN_ROULETTE'}
        </Button>
      </Card>

      {/* Backlog List */}
      <h2 className={styles.listHeader}>
        FULL_BACKLOG ({backlog.length})
      </h2>
      <div className={styles.backlogList}>
        {backlog.map((entry: CollectionEntry, i: number) => (
          <Card key={entry.anime_id} className={styles.backlogItem} hover={true}>
            <div className={styles.itemIndex}>{i + 1}</div>
            <img src={entry.image_url} alt={entry.title} className={styles.itemImage} />
            <div className={styles.itemContent}>
              <div className={styles.itemTitle}>{entry.title}</div>
              <div className={styles.itemMeta}>{entry.episodes ?? '?'} EPS &nbsp;·&nbsp; {entry.genres?.split(',')[0] ?? 'UNKNOWN'}</div>
            </div>
            <Button size="sm" variant="tactical" onClick={() => window.location.href = '/discover'}>
              INITIALIZE
            </Button>
          </Card>
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
