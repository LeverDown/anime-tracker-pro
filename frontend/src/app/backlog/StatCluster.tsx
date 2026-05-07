'use client';

import React from 'react';
import { motion } from 'framer-motion';
import styles from './backlog.module.css';
import type { BacklogStats } from '@/types/backlog';

interface StatClusterProps {
  stats: BacklogStats;
  watchRate: number;
  onWatchRateChange: (val: number) => void;
}

const ThreatBar = ({ severity }: { severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' }) => {
  const widthMap = {
    'LOW': '25%',
    'MEDIUM': '50%',
    'HIGH': '75%',
    'CRITICAL': '100%'
  };
  const colorMap = {
    'LOW': 'var(--success)',
    'MEDIUM': 'hsl(var(--primary-hsl))',
    'HIGH': 'var(--warning)',
    'CRITICAL': 'var(--danger)'
  };
  
  return (
    <div className={styles.threatBarContainer}>
      <motion.div 
        className={styles.threatBarFill} 
        animate={{ width: widthMap[severity], backgroundColor: colorMap[severity] }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      />
    </div>
  );
};

export const StatCluster: React.FC<StatClusterProps> = ({
  stats,
  watchRate,
  onWatchRateChange,
}) => {
  const threatLabels = {
    'LOW': 'THREAT: MANAGEABLE',
    'MEDIUM': 'THREAT: MODERATE',
    'HIGH': 'THREAT: ELEVATED',
    'CRITICAL': 'THREAT: CRITICAL'
  };

  const threatColors = {
    'LOW': 'var(--success)',
    'MEDIUM': 'hsl(var(--primary-hsl))',
    'HIGH': 'var(--warning)',
    'CRITICAL': 'var(--danger)'
  };

  return (
    <div className={styles.statCluster}>
      {/* CELL 1 */}
      <div className={`${styles.statCell} ${styles.scan1}`}>
        <div className={styles.statKey}>BACKLOG_NODES //</div>
        <div className={styles.statValue}>
          {stats.nodeCount}<span className={styles.statUnit}>series</span>
        </div>
        <div className={styles.statSub}>PLAN_TO_WATCH QUEUE DEPTH</div>
        <div className={styles.threatRow}>
          <ThreatBar severity={stats.nodeCount > 30 ? 'HIGH' : stats.nodeCount > 15 ? 'MEDIUM' : 'LOW'} />
          <span className={styles.threatLabel} style={{ color: threatColors[stats.nodeCount > 30 ? 'HIGH' : stats.nodeCount > 15 ? 'MEDIUM' : 'LOW'] }}>
            {stats.nodeCount > 30 ? 'MASSIVE' : stats.nodeCount > 15 ? 'STABLE' : 'OPTIMAL'}
          </span>
        </div>
      </div>

      {/* CELL 2 */}
      <div className={`${styles.statCell} ${styles.scan2}`}>
        <div className={styles.statKey}>PENDING_UNITS //</div>
        <div className={styles.statValue}>
          {stats.totalEpisodes}<span className={styles.statUnit}>eps</span>
        </div>
        <div className={styles.statSub}>TOTAL UNWATCHED EPISODES</div>
        <div className={styles.threatRow}>
          <ThreatBar severity={stats.totalEpisodes > 500 ? 'HIGH' : stats.totalEpisodes > 200 ? 'MEDIUM' : 'LOW'} />
          <span className={styles.threatLabel} style={{ color: threatColors[stats.totalEpisodes > 500 ? 'HIGH' : stats.totalEpisodes > 200 ? 'MEDIUM' : 'LOW'] }}>
            {stats.totalEpisodes > 500 ? 'DENSE' : 'MODERATE'}
          </span>
        </div>
      </div>

      {/* CELL 3 */}
      <div className={`${styles.statCell} ${styles.scan3}`}>
        <div className={styles.statKey}>TEMPORAL_RESOLUTION //</div>
        <div className={styles.statValue} style={{ color: threatColors[stats.threatLevel] }}>
          {stats.totalWeeks}<span className={styles.statUnit}>weeks</span>
        </div>
        <div className={styles.statSub}>≈ {stats.solarYears} SOLAR_YEARS AT CURRENT FREQUENCY</div>
        <div className={styles.watchRateRow}>
          <span className={styles.watchRateLabel}>WATCH_RATE //</span>
          <input
            type="number"
            min={1}
            max={50}
            value={watchRate}
            onChange={(e) => onWatchRateChange(parseInt(e.target.value) || 1)}
            className={styles.watchRateInput}
          />
          <span className={styles.watchRateUnit}>eps/day</span>
        </div>
      </div>

      {/* CELL 4 */}
      <div className={`${styles.statCell} ${styles.scan4}`}>
        <div className={styles.statKey}>COMPLETION_VELOCITY //</div>
        <div className={styles.statValue}>
          {stats.avgDaysPerSeries}<span className={styles.statUnit}>days/series</span>
        </div>
        <div className={styles.statSub}>AVG TIME PER BACKLOG NODE</div>
        <div className={styles.nextItem}>NEXT: {stats.nextNode?.title ?? 'NONE'}</div>
      </div>
    </div>
  );
};
