/**
 * RDS_MOTIONS_PROTOCOL
 * Centralized Framer Motion variants for standardized HUD animations.
 */

import { Variants, BezierDefinition } from 'framer-motion';

// Common Easing Functions
export const RDS_EASE_EXPO: BezierDefinition = [0.16, 1, 0.3, 1];
export const RDS_EASE_QUART: BezierDefinition = [0.25, 1, 0.5, 1];

/**
 * Global Transition Defaults
 */
export const RDS_TRANSITION_DEFAULT = {
  duration: 0.2,
  ease: RDS_EASE_EXPO
};

/**
 * Chronos Slider Variants (from ChronosSlider.tsx)
 */
export const chronosVariants: Variants = {
  enter: (dir: number) => ({
    x: dir > 0 ? 48 : -48,
    opacity: 0
  }),
  center: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.26, ease: RDS_EASE_EXPO }
  },
  exit: (dir: number) => ({
    x: dir < 0 ? 48 : -48,
    opacity: 0,
    transition: { duration: 0.16 }
  })
};

/**
 * Data Packet Grid Variants (from DataPacket.tsx)
 */
export const dataGridVariants: Variants = {
  hidden: { opacity: 0, y: 5 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2, ease: RDS_EASE_EXPO }
  }
};

/**
 * Generic HUD Fade Variants
 */
export const hudFadeVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { duration: 0.4, ease: RDS_EASE_QUART }
  }
};

/**
 * Glitch Scale Variants
 */
export const glitchScaleVariants: Variants = {
  idle: { scale: 1 },
  hover: { 
    scale: 1.02,
    transition: { duration: 0.1, ease: 'easeOut' }
  },
  active: { 
    scale: 0.98,
    transition: { duration: 0.05 }
  }
};

/**
 * Media Card Interaction Variants (from MediaCard.tsx)
 */
export const mediaCardVariants: Variants = {
  idle: {
    scale: 1,
    y: 0,
    borderColor: 'var(--glass-border)',
    transition: { duration: 0.3, ease: RDS_EASE_EXPO }
  },
  hover: {
    scale: 1.02,
    y: -4,
    borderColor: 'var(--primary-color)',
    transition: { duration: 0.3, ease: RDS_EASE_EXPO }
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

/**
 * Seasonal Grid Animation Variants (from SeasonalClient.tsx)
 */
export const seasonalGridVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { 
      staggerChildren: 0.04, 
      delayChildren: 0.08,
      opacity: { duration: 0.5, ease: "linear" }
    } 
  }
};
