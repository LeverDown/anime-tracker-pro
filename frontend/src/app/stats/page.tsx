"use client";
import React, { useState, useEffect, useContext, JSX, useMemo } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, Clock, Zap, Star, Activity, PieChart } from 'lucide-react';
import { AuthContext } from '../AuthContext';
import api from '../../api/client';
import { Button, Card } from '../../components/UI';
import styles from './stats.module.css';

/* eslint-disable react-hooks/set-state-in-effect */

/**
 * StatsPage Protocol — v2.0 (Neural Analytics)
 * Enforces synchronized backend-to-frontend metric mapping and RDS aesthetics.
 */
export default function StatsPage(): JSX.Element {
  const auth = useContext(AuthContext);
  const user = auth?.user;
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!user || !mounted) return;
    
    setLoading(true);
    api.get(`/user/stats/${user}`)
      .then(r => {
        setStats(r.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user, mounted]);

  const genreData = useMemo(() => {
    if (!stats?.genre_counts) return [];
    return Object.entries(stats.genre_counts)
      .sort(([, a]: any, [, b]: any) => b - a)
      .slice(0, 10);
  }, [stats]);

  const handleGenerateReport = () => {
    if (!stats) return;
    const report = `
// RONINHUB_NEURAL_ANALYTICS_REPORT
// GENERATED: ${new Date().toLocaleString()}
// USER: ${user}

--------------------------------------------------
[METRIC_SUMMARY]
> TITLES_SYNCED: ${stats.total_anime}
> EPISODES_WATCHED: ${stats.total_episodes}
> MEAN_SCORE: ${stats.mean_score?.toFixed(2) || '0.00'}
> TIME_INVESTED: ${Math.floor((stats.total_episodes || 0) * 23 / 60)}h

[GENRE_DNA_DISTRIBUTION]
${genreData.map(([genre, count]: any) => `> ${genre.padEnd(20)} | ${count} TITLES (${((count / (stats?.total_anime || 1)) * 100).toFixed(1)}%)`).join('\n')}

--------------------------------------------------
// END_OF_TRANSMISSION
    `.trim();

    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `neural_report_${user}_${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!mounted) return <div className={styles.skeletonCard} />;
  if (!user) return <div className={styles.emptyState}><p className={styles.emptyText}>PLEASE INITIALIZE SESSION TO VIEW ANALYTICS.</p></div>;

  return (
    <div className={`${styles.container} rds-hatch`}>
      <header className={styles.header}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h1 className={styles.title}>
            <span className={styles.titlePrefix}>{"//"}</span> NEURAL_ANALYTICS
          </h1>
          <div style={{ display: 'flex', gap: '16px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-dim)', letterSpacing: '0.1em' }}>
            <span><Zap size={14} color="var(--primary-color)" /> SYS // METRICS_ACTIVE</span>
            <span><Activity size={14} /> SECTOR // COGNITIVE_ANALYSIS</span>
          </div>
        </div>

        <div className={styles.reportCard}>
          <div className={styles.reportLabel}>
            INTEL_REPORT // READY
          </div>
          <div style={{ flex: 1 }} />
          <Button 
            variant="primary" 
            icon={<Star size={16} />} 
            onClick={handleGenerateReport}
            style={{ borderRadius: 0, fontSize: '10px', fontWeight: 900, fontFamily: 'var(--font-mono)', letterSpacing: '2px' }}
          >
            GENERATE_REPORT //
          </Button>
        </div>
      </header>

      {loading ? (
        <div className={styles.metricsGrid}>
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className={styles.skeletonCard} />)}
        </div>
      ) : (
        <>
          <div className={styles.metricsGrid}>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <div className={styles.metricCard}>
                <div className={styles.metricIcon} style={{ color: 'var(--primary-color)' }}><BarChart3 size={24} /></div>
                <h2 className={styles.metricValue}>{stats?.total_anime || 0}</h2>
                <p className={styles.metricLabel}>TITLES_SYNCED</p>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <div className={styles.metricCard}>
                <div className={styles.metricIcon} style={{ color: 'var(--accent-cyan)' }}><Clock size={24} /></div>
                <h2 className={styles.metricValue}>{stats?.total_episodes || 0}</h2>
                <p className={styles.metricLabel}>EPISODES_WATCHED</p>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <div className={styles.metricCard}>
                <div className={styles.metricIcon} style={{ color: 'var(--warning)' }}><TrendingUp size={24} /></div>
                <h2 className={styles.metricValue}>{stats?.mean_score?.toFixed(2) || '0.00'}</h2>
                <p className={styles.metricLabel}>MEAN_SCORE</p>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <div className={styles.metricCard}>
                <div className={styles.metricIcon} style={{ color: 'var(--success)' }}><Activity size={24} /></div>
                <h2 className={styles.metricValue}>{Math.floor((stats?.total_episodes || 0) * 23 / 60)}h</h2>
                <p className={styles.metricLabel}>TIME_INVESTED</p>
              </div>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div className={styles.genreCard}>
              <h3 className={styles.genreTitle}>
                <PieChart size={18} color="var(--primary-color)" />
                GENRE_DISTRIBUTION_ANALYSIS //
              </h3>
              
              {genreData.length === 0 ? (
                <div className={styles.emptyState}>NO_GENRE_DATA_SYNCED</div>
              ) : (
                <div className={styles.genreList}>
                  {genreData.map(([genre, count]: any) => (
                    <div key={genre} className={styles.genreItem}>
                      <div className={styles.genreInfo}>
                        <span className={styles.genreName}>{genre}</span>
                        <span className={styles.genreCount}>{count} TITLES</span>
                      </div>
                      <div className={styles.barTrack}>
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${(count / (stats?.total_anime || 1)) * 100}%` }}
                          transition={{ duration: 1, ease: "easeOut" }}
                          className={styles.barFill}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
}
