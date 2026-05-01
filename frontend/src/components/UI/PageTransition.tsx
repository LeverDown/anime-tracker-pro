"use client";

import React from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';

interface PageTransitionProps {
  children: React.ReactNode;
  transitionKey: string;
  variant?: 'slide' | 'fade' | 'tactical';
  direction?: 1 | -1;
  className?: string;
}

const slideVariants: Variants = {
  initial: (direction: number) => ({
    x: direction > 0 ? 80 : -80,
    opacity: 0,
    filter: 'blur(4px)',
  }),
  animate: {
    x: 0,
    opacity: 1,
    filter: 'blur(0px)',
    transition: {
      duration: 0.35,
      ease: [0.16, 1, 0.3, 1],
    },
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 80 : -80,
    opacity: 0,
    filter: 'blur(4px)',
    transition: {
      duration: 0.25,
      ease: [0.16, 1, 0.3, 1],
    },
  }),
};

const fadeVariants: Variants = {
  initial: {
    opacity: 0,
    y: 12,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0.16, 1, 0.3, 1],
    },
  },
  exit: {
    opacity: 0,
    y: -12,
    transition: {
      duration: 0.2,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

const tactialVariants: Variants = {
  initial: {
    opacity: 0,
    scale: 0.98,
    clipPath: 'inset(0 100% 0 0)',
  },
  animate: {
    opacity: 1,
    scale: 1,
    clipPath: 'inset(0 0% 0 0)',
    transition: {
      duration: 0.4,
      ease: [0.16, 1, 0.3, 1],
      clipPath: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
    },
  },
  exit: {
    opacity: 0,
    scale: 1.02,
    clipPath: 'inset(0 0 0 100%)',
    transition: {
      duration: 0.3,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

const variantMap = {
  slide: slideVariants,
  fade: fadeVariants,
  tactical: tactialVariants,
};

export const PageTransition: React.FC<PageTransitionProps> = ({
  children,
  transitionKey,
  variant = 'slide',
  direction = 1,
  className,
}) => {
  const variants = variantMap[variant];

  return (
    <AnimatePresence mode="wait" custom={direction}>
      <motion.div
        key={transitionKey}
        custom={direction}
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
        className={className}
        style={{ width: '100%', minHeight: '100%' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

export default PageTransition;
