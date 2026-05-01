"use client";

import React from 'react';
import { motion } from 'framer-motion';
import styles from './Skeleton.module.css';

export const SkeletonHUD: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(5, 5, 8, 0.8)',
        zIndex: 20,
        gap: '20px'
      }}
    >
      <motion.div
        animate={{
          rotate: 360,
          opacity: [1, 0.3, 1],
        }}
        transition={{
          rotate: { duration: 1, repeat: Infinity, ease: "linear" },
          opacity: { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
        }}
        style={{
          width: '40px',
          height: '40px',
          border: '2px solid var(--glow-full)',
          borderTopColor: 'transparent',
          borderRadius: '50%',
        }}
      />
      <motion.div
        animate={{ opacity: [1, 0.5, 1] }}
        transition={{ duration: 1.5, repeat: Infinity }}
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '10px',
          color: 'var(--glow-full)',
          letterSpacing: '0.2em',
        }}
      >
        FETCHING TEMPORAL DATA...
      </motion.div>
    </motion.div>
  );
};

export default SkeletonHUD;
