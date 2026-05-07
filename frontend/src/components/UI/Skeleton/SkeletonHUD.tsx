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
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 20,
        gap: '24px',
        width: '100%',
        padding: '100px 0'
      }}
    >
      <motion.div
        animate={{
          rotate: 360,
          opacity: [1, 0.5, 1],
        }}
        transition={{
          rotate: { duration: 0.8, repeat: Infinity, ease: "linear" },
          opacity: { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
        }}
        style={{
          width: '44px',
          height: '44px',
          border: '3px solid var(--primary-color)',
          borderTopColor: 'transparent',
          borderRadius: '50%',
          boxShadow: '0 0 20px hsl(var(--primary-glow))'
        }}
      />
      <motion.div
        animate={{ opacity: [1, 0.4, 1] }}
        transition={{ duration: 1.5, repeat: Infinity }}
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          color: 'var(--primary-color)',
          letterSpacing: '0.25em',
          fontWeight: 900,
          textShadow: '0 0 10px var(--primary-glow)'
        }}
      >
        FETCHING_TEMPORAL_DATA //
      </motion.div>
    </motion.div>
  );
};

export default SkeletonHUD;
