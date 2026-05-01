"use client";

import React from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { chronosVariants } from '@/animations/motions';

interface BroadcastSliderProps {
  activeDay: string;
  onDayChange: (day: string) => void;
  direction?: 1 | -1;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const BroadcastSlider: React.FC<BroadcastSliderProps> = ({
  activeDay,
  onDayChange,
  direction = 1
}) => {
  const reduced = useReducedMotion();
  const dur = (n: number) => reduced ? 0 : n;

  const variants = {
    ...chronosVariants,
    center: {
      ...chronosVariants.center,
      transition: { ...(chronosVariants.center as any)?.transition, duration: dur(0.26) }
    },
    exit: (dir: number) => {
      const baseExit = typeof chronosVariants.exit === 'function' ? (chronosVariants.exit as any)(dir, {}, {}) : chronosVariants.exit;
      return {
        ...(baseExit as any),
        transition: { duration: dur(0.16) }
      };
    }
  };

  return (
    <div style={{
      background: 'var(--hud-topbar-bg)',
      borderBottom: 'var(--sector-border)',
      padding: '10px 14px',
      display: 'flex',
      gap: '4px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={activeDay}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          style={{
            display: 'flex',
            width: '100%',
            gap: '4px'
          }}
        >
          {DAYS.map((day) => {
            const isActive = day === activeDay;
            const shortName = day.substring(0, 3).toUpperCase();
            
            return (
              <div
                key={day}
                onClick={() => onDayChange(day)}
                style={{
                  flex: 1,
                  padding: '9px 4px',
                  textAlign: 'center',
                  border: '1px solid transparent',
                  borderRadius: 0,
                  cursor: 'pointer',
                  transition: 'all 150ms',
                  background: isActive ? 'var(--sector-active-bg)' : 'hsla(var(--primary-hsl) / 0)',
                  borderColor: isActive ? 'var(--sector-active-border)' : 'hsla(var(--primary-hsl) / 0)',
                  position: 'relative'
                }}
              >
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '13px',
                  fontWeight: 950,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: isActive ? 'var(--sector-label-active)' : 'var(--sector-label-inactive)',
                  display: 'block'
                }}>
                  {day.toUpperCase()}
                </span>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 950,
                  display: 'block',
                  marginTop: '2px',
                  color: isActive ? 'var(--sector-year-active)' : 'var(--sector-year-inactive)',
                  letterSpacing: '0.1em'
                }}>
                  {shortName} // SECTOR
                </span>
                {isActive && (
                  <motion.div
                    layoutId="dayIndicator"
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: '1px',
                      background: 'var(--sector-indicator)'
                    }}
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ duration: dur(0.2), ease: 'easeOut' }}
                  />
                )}
              </div>
            );
          })}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
