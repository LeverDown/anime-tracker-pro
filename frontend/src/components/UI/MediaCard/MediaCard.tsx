"use client";
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Users, Info } from 'lucide-react';
import { MediaCardProps, InteractionStatus } from './MediaCard.types';
import styles from './MediaCard.module.css';

/**
 * RONIN_MEDIA_CARD_MOTION_ENGINE
 * Replicates AniList's timing feel while maintaining RDS tactical visual distinction.
 */
const MediaCardVariants = {
  idle: {
    scale: 1,
    y: 0,
    borderColor: 'var(--glass-border)',
    transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] }
  },
  hover: {
    scale: 1.02,
    y: -4,
    borderColor: 'var(--primary-color)',
    transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] }
  },
  loading: {
    opacity: 0.8,
    transition: { duration: 0.2 }
  },
  success: {
    scale: [1, 1.05, 1],
    transition: { duration: 0.4 }
  },
  error: {
    x: [-2, 2, -2, 2, 0],
    transition: { duration: 0.3 }
  }
};

export const MediaCard = ({
  title,
  subtitle,
  imageUrl,
  status: initialStatus = 'idle',
  score,
  popularity,
  studio,
  synopsis,
  onClick,
  className
}: MediaCardProps) => {
  const [currentStatus, setCurrentStatus] = useState<InteractionStatus>(initialStatus);

  const handleMouseEnter = () => {
    if (currentStatus === 'idle') setCurrentStatus('hover');
  };

  const handleMouseLeave = () => {
    if (currentStatus === 'hover') setCurrentStatus('idle');
  };

  return (
    <motion.div
      className={`${styles.cardContainer} ${currentStatus === 'hover' ? 'rds-glow-active' : ''} ${className || ''}`}
      variants={MediaCardVariants}
      initial="idle"
      animate={currentStatus}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
    >
      <AnimatePresence mode="wait">
        {currentStatus === 'loading' && (
          <motion.div 
            key="loading-bar"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={styles.loadingBar} 
          />
        )}
      </AnimatePresence>

      {/* Status Indicators */}
      {currentStatus !== 'idle' && currentStatus !== 'hover' && (
        <div className={`${styles.statusIndicator} ${styles[`status${currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1)}`]}`} />
      )}

      <img src={imageUrl} alt={title} className={styles.poster} />

      <div className={styles.overlay}>
        <div className={styles.content}>
          {studio && <div className={styles.studio}>{studio}</div>}
          <h3 className={styles.title}>{title}</h3>
          
          <div className={styles.meta}>
            {score !== undefined && (
              <div className={styles.stat}>
                <Star size={12} color="var(--warning)" fill="var(--warning)" />
                <span>{score}%</span>
              </div>
            )}
            {popularity !== undefined && (
              <div className={styles.stat}>
                <Users size={12} color="var(--primary-color)" />
                <span>#{popularity}</span>
              </div>
            )}
          </div>

          {synopsis && <p className={styles.synopsis}>{synopsis}</p>}
        </div>
      </div>
    </motion.div>
  );
};

export default MediaCard;
