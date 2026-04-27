"use client";
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Users, Info } from 'lucide-react';
import { MediaCardProps, InteractionStatus } from './MediaCard.types';
import styles from './MediaCard.module.css';
import { mediaCardVariants } from '@/animations/motions';

/**
 * RONIN_MEDIA_CARD_MOTION_ENGINE
 * Replicates AniList's timing feel while maintaining RDS tactical visual distinction.
 */

export const MediaCard = ({
  title,
  subtitle,
  imageUrl,
  status: initialStatus = 'idle',
  score,
  popularity,
  studio,
  synopsis,
  layout = 'vertical',
  overflow = 'hidden',
  showDefaultOverlay = true,
  onClick,
  className,
  children
}: MediaCardProps & { 
  children?: React.ReactNode; 
  overflow?: 'hidden' | 'visible';
  showDefaultOverlay?: boolean;
}) => {
  const [currentStatus, setCurrentStatus] = useState<InteractionStatus>(initialStatus);

  const handleMouseEnter = () => {
    // We only use state for non-hover interaction statuses like loading/success/error
  };

  const handleMouseLeave = () => {
    // Hover is handled by whileHover
  };

  const cardClasses = [
    styles.cardContainer,
    styles[layout],
    currentStatus === 'hover' ? 'rds-glow-active' : '',
    className || ''
  ].join(' ');

  return (
    <motion.div
      className={cardClasses}
      variants={mediaCardVariants}
      initial="idle"
      animate={currentStatus === 'hover' ? 'idle' : currentStatus}
      whileHover="hover"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      style={{ overflow }}
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

      <div className={styles.imageWrapper}>
        <img 
          src={imageUrl || 'https://via.placeholder.com/400x600?text=NO_IMAGE'} 
          alt={title} 
          className={styles.poster}
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x600?text=UPLINK_FAILURE';
          }}
        />
        {layout === 'horizontal' && studio && <div className={styles.studioLabel}>{studio}</div>}
      </div>

      {showDefaultOverlay && (
        <div className={styles.overlay}>
          <div className={styles.content}>
            {layout === 'vertical' && studio && <div className={styles.studio}>{studio}</div>}
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
      )}
      {children}
    </motion.div>
  );
};

export default MediaCard;
