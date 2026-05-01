"use client";

import React, { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import styles from './DataPacket.module.css';
import { SeasonalAnimeEntry } from '@/types/seasonal';
import { dataGridVariants } from '@/animations/motions';

interface DataPacketProps extends SeasonalAnimeEntry {
  index: number;
  horizontal?: boolean;
  onSelect?: (id: number) => void;
  airtimeOverride?: string;
  showSpecs?: boolean;
  children?: React.ReactNode;
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
  airtimeOverride,
  showSpecs = true,
  children
}) => {
  const [hasError, setHasError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const reduced = useReducedMotion();

  // Calculate animation delay for the scan-line (Synchronized for 6-column HUD density)
  const row = Math.floor(index / 6);
  const scanDelay = `${(row * 0.2) + (index % 6) * 0.08}s`;

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
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        ['--scan-delay' as string]: reduced ? '0s' : scanDelay,
        animationDelay: 'var(--scan-delay)'
      } as React.CSSProperties}
    >
      <div className={`${styles.thumb} rds-scan-lines`} style={{ position: 'relative' }}>
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
              display: hasError ? 'none' : 'block',
              transition: 'transform 0.3s ease',
              transform: isHovered ? 'scale(1.05)' : 'scale(1)'
            }}
          />
        )}
        <div className={styles.hatchOverlay} style={{ zIndex: 3 }} />

        {isHovered && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: '-100%',
            width: '50%',
            height: '100%',
            background: 'linear-gradient(90deg, hsla(var(--primary-hsl) / 0), hsla(var(--primary-hsl) / 0.2), hsla(var(--primary-hsl) / 0))',
            zIndex: 4,
            animation: 'scanSweep 0.6s ease-in-out forwards',
          }} />
        )}

        {averageScore !== null && (
          <motion.div
            className={styles.scoreBadge}
            initial={{ scale: 0.8, opacity: 0.5 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            {averageScore}
          </motion.div>
        )}

        {(airtimeOverride || nextAiringEpisode) && (
          <div className={styles.airtimeStrip}>
            {airtimeOverride || (nextAiringEpisode && formatAirtime(nextAiringEpisode.airingAt))}
          </div>
        )}

        {children}
      </div>

      <div className={styles.title} title={title.english || title.romaji}>
        {title.english || title.romaji}
      </div>

      {showSpecs && (
        <>
          <div className={styles.specRow} style={{ marginTop: '6px' }}>
            <span className={styles.specKey} style={{ color: 'var(--spec-key-color)', fontWeight: 800 }}>EP//</span>
            <span className={styles.specVal} style={{ color: 'var(--spec-val-color)', fontWeight: 'bold' }}>{currentEp || 0} / {episodes || '??'}</span>
          </div>

          <div className={styles.specRow} style={{ marginTop: '2px' }}>
            <span className={styles.specKey} style={{ color: 'var(--spec-key-color)', fontWeight: 800 }}>STATUS//</span>
            <span className={styles.specVal} style={{ color: 'var(--spec-val-color)', fontWeight: 'bold' }}>{status}</span>
          </div>

          <div className={styles.progressTrack}>
            <motion.div
              className={styles.progressFill}
              initial={{ width: '0%' }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
        </>
      )}
    </motion.div>
  );
};
