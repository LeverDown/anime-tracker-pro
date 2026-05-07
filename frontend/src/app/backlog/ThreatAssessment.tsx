'use client';

import React from 'react';
import { motion } from 'framer-motion';
import styles from './backlog.module.css';
import type { BacklogStats, BacklogEntry } from '@/types/backlog';

interface ThreatAssessmentProps {
  stats: BacklogStats;
  entries: BacklogEntry[];
}

export const ThreatAssessment: React.FC<ThreatAssessmentProps> = ({
  stats,
  entries
}) => {
  // Max values for bar widths (calibrated for RoninHub metrics)
  const maxNodes = 50;
  const maxEps = 500;
  const maxWeeks = 52;

  const nodeFill = Math.min((stats.nodeCount / maxNodes) * 100, 100);
  const epsFill = Math.min((stats.totalEpisodes / maxEps) * 100, 100);
  const timeFill = Math.min((stats.totalWeeks / maxWeeks) * 100, 100);

  const anyShortItems = entries.some(e => e.episodes === 1 || (e.episodes <= 3 && e.format !== 'TV'));

  const threatColor = 
    stats.threatLevel === 'CRITICAL' ? 'var(--danger)' :
    stats.threatLevel === 'HIGH'     ? 'var(--warning)' :
    stats.threatLevel === 'MEDIUM'   ? 'hsl(var(--primary-hsl))' : 'var(--success)';

  return (
    <div className={styles.sectorShell}>
      <div className={styles.sh}>
        <div className={styles.shLeft}>
          <div className={styles.amberSquare} />
          <span className={styles.shTitle}>THREAT_ASSESSMENT //</span>
        </div>
        <div className={styles.shStatus}>AUTO_CALCULATED</div>
      </div>

      <div className={styles.rouletteBody}>
        <div className={styles.threatGroup}>
          <div className={styles.threatLabelRow}>
            <span className={styles.threatKey}>BACKLOG_MASS //</span>
            <span className={styles.threatVal} style={{ color: 'hsl(var(--primary-hsl))' }}>
              LEVEL {Math.ceil(nodeFill / 10)} / 10
            </span>
          </div>
          <div className={styles.threatBarLarge}>
            <motion.div 
              className={styles.threatBarFill} 
              initial={{ width: 0 }}
              animate={{ width: `${nodeFill}%` }}
              style={{ backgroundColor: 'hsl(var(--primary-hsl))' }} 
            />
          </div>
        </div>

        <div className={styles.threatGroup}>
          <div className={styles.threatLabelRow}>
            <span className={styles.threatKey}>EPISODE_DENSITY //</span>
            <span className={styles.threatVal} style={{ color: 'hsl(var(--primary-hsl))' }}>
              {stats.totalEpisodes} UNITS
            </span>
          </div>
          <div className={styles.threatBarLarge}>
            <motion.div 
              className={styles.threatBarFill} 
              initial={{ width: 0 }}
              animate={{ width: `${epsFill}%` }}
              style={{ backgroundColor: 'hsl(var(--primary-hsl))' }} 
            />
          </div>
        </div>

        <div className={styles.threatGroup}>
          <div className={styles.threatLabelRow}>
            <span className={styles.threatKey}>TIME_DEBT //</span>
            <span className={styles.threatVal} style={{ color: threatColor }}>
              {stats.totalWeeks} WEEKS
            </span>
          </div>
          <div className={styles.threatBarLarge}>
            <motion.div 
              className={styles.threatBarFill} 
              initial={{ width: 0 }}
              animate={{ width: `${timeFill}%` }}
              style={{ backgroundColor: threatColor }} 
            />
          </div>
        </div>

        <div className={styles.assessmentBottom}>
          <div className={styles.recLabel}>RECOMMENDED_ACTION //</div>
          <div className={styles.recText}>
            {anyShortItems ? 'START SHORT-FORM NODES FIRST' : 'PRIORITIZE BY SCORE // FILTER BY GENRE'}
          </div>
          <div className={styles.recSub}>
            {anyShortItems ? 'CLEAR LOW-RESISTANCE TARGETS TO BUILD MOMENTUM' : 'FOCUS ON HIGH-QUALITY DATA PACKETS'}
          </div>
        </div>
      </div>
    </div>
  );
};
