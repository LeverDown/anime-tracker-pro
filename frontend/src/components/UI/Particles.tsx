"use client";

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

interface ParticlesProps {
  count?: number;
  color?: string;
  minSize?: number;
  maxSize?: number;
  className?: string;
}

export const Particles: React.FC<ParticlesProps> = ({
  count = 20,
  color = 'var(--primary-color)',
  minSize = 2,
  maxSize = 6,
  className = ''
}) => {
  const particles = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      size: Math.random() * (maxSize - minSize) + minSize,
      left: Math.random() * 100,
      top: Math.random() * 100,
      duration: Math.random() * 20 + 10,
      delay: Math.random() * 20,
      opacity: Math.random() * 0.3 + 0.1,
    }));
  }, [count, minSize, maxSize]);

  return (
    <div className={className} style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {particles.map(p => (
        <motion.div
          key={p.id}
          initial={{
            x: `${p.left}%`,
            y: `${p.top}%`,
            opacity: 0,
          }}
          animate={{
            y: [`${p.top}%`, `${p.top - 30}%`, `${p.top}%`],
            opacity: [0, p.opacity, 0],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: "linear",
          }}
          style={{
            position: 'absolute',
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            background: color,
            filter: `blur(${p.size > 4 ? 1 : 0}px)`,
          }}
        />
      ))}
    </div>
  );
};

export default Particles;
