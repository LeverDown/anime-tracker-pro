"use client";

import React from 'react';
import { motion, useReducedMotion, Variants } from 'framer-motion';
import styles from './DataPacket.module.css';
import { SeasonalAnimeEntry } from '@/types/seasonal';
import { dataGridVariants } from '@/animations/motions';

interface DataPacketProps extends SeasonalAnimeEntry {
  index: number;
  horizontal?: boolean;
  onSelect?: (id: number) => void;
  airtimeOverride?: string;
}


export const DataPacket: React.FC<DataPacketProps> = ({
  id,
  title,
  coverImage,
  averageScore,
  episodes,
  nextAiringEpisode,
  status,
  format,
  index,
  horizontal,
  onSelect,
  airtimeOverride
}) => {
  const [hasError, setHasError] = React.useState(false);
  const reduced = useReducedMotion();
  
  // Calculate animation delay for the scan-line
  // "each row offset by 0.3s from row above"
  // Assuming 4 columns, row = Math.floor(index / 4)
  const row = Math.floor(index / 4);
  const scanDelay = `${(row * 0.3) + (index % 4) * 0.1}s`;

  const formatAirtime = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const day = days[date.getUTCDay()];
    const hours = date.getUTCHours().toString().padStart(2, '0');
    const minutes = date.getUTCMinutes().toString().padStart(2, '0');
    return `${day} ${hours}:${minutes} JST`;
  };

  const currentEp = (status === 'FINISHED' 
    ? episodes 
    : nextAiringEpisode 
      ? nextAiringEpisode.episode - 1 
      : 0) || 0;

  const progress = episodes ? (currentEp / episodes) * 100 : 0;

  return (
    <motion.div
      variants={dataGridVariants}
      className={`${styles.dataPacket} ${horizontal ? styles.horizontal : ''}`}
      onClick={() => onSelect?.(id)}
      style={{
        // Using custom property for stagger delay
        ['--scan-delay' as string]: reduced ? '0s' : scanDelay,
        animationDelay: 'var(--scan-delay)'
      } as React.CSSProperties}
    >
      <div className={styles.thumb} style={{ position: 'relative' }}>
        <div className="rds-hatch" style={{ 
          position: 'absolute', 
          inset: 0, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          background: 'var(--hud-thumb-bg)',
          color: 'var(--glow-hatch)',
          fontSize: '8px',
          fontFamily: 'var(--font-mono)',
          textAlign: 'center',
          letterSpacing: '0.2em',
          zIndex: 1
        }}>
          [ NO SIGNAL ]
        </div>
        {!hasError && (
          <img 
            src={coverImage.large} 
            alt={title.romaji} 
            onError={() => setHasError(true)}
            style={{ 
              width: '100%', 
              height: '100%', 
              objectFit: 'cover', 
              position: 'relative', 
              zIndex: 2,
              display: hasError ? 'none' : 'block'
            }} 
          />
        )}
        <div className={styles.hatchOverlay} style={{ zIndex: 3 }} />
        
        {averageScore !== null && (
          <div className={styles.scoreBadge}>
            {averageScore}
          </div>
        )}

        {(airtimeOverride || nextAiringEpisode) && (
          <div className={styles.airtimeStrip}>
            {airtimeOverride || (nextAiringEpisode && formatAirtime(nextAiringEpisode.airingAt))}
          </div>
        )}
      </div>

      <div className={styles.title} title={title.english || title.romaji} style={{ marginTop: '4px', minHeight: '26px' }}>
        {title.romaji}
      </div>

      <div className={styles.specRow} style={{ marginTop: '6px' }}>
        <span className={styles.specKey} style={{ color: 'var(--spec-key-color)', fontWeight: 800 }}>EP//</span>
        <span className={styles.specVal} style={{ color: 'var(--spec-val-color)', fontWeight: 'bold' }}>{currentEp || 0} / {episodes || '??'}</span>
      </div>

      <div className={styles.specRow} style={{ marginTop: '2px' }}>
        <span className={styles.specKey} style={{ color: 'var(--spec-key-color)', fontWeight: 800 }}>STATUS//</span>
        <span className={styles.specVal} style={{ color: 'var(--spec-val-color)', fontWeight: 'bold' }}>{status}</span>
      </div>

      <div className={styles.progressTrack}>
        <div 
          className={styles.progressFill} 
          style={{ width: `${progress}%` }} 
        />
      </div>
    </motion.div>
  );
};
