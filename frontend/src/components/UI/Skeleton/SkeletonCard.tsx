"use client";

import React from 'react';
import styles from './Skeleton.module.css';

interface SkeletonCardProps {
  layout?: 'vertical' | 'horizontal';
  count?: number;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({
  layout = 'vertical',
  count = 1
}) => {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`${styles.skeletonCard} ${layout === 'horizontal' ? styles.horizontal : ''}`}>
          <div className={styles.shimmer} />
          <div className={styles.thumb} />
          <div className={styles.content}>
            <div className={styles.titleLine} />
            <div className={styles.metaLine} />
            <div className={styles.metaLine} />
          </div>
        </div>
      ))}
    </>
  );
};

export default SkeletonCard;
