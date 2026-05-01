"use client";
import React, { JSX } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';

/**
 * RDS_BUTTON_PROTOCOL
 * Enforces strict token synchronization and atomic boundaries.
 */
interface ButtonProps extends Omit<HTMLMotionProps<"button">, 'children'> {
  children?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'tactical';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  fullWidth?: boolean;
  glow?: boolean;
}

export const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  icon, 
  fullWidth = false, 
  glow = true,
  className,
  style,
  ...props 
}: ButtonProps): JSX.Element => {
  const getVariantStyles = (): React.CSSProperties => {
    switch (variant) {
      case 'primary':
        return {
          background: 'var(--primary-color)',
          color: '#fff',
          border: 'none',
          boxShadow: glow ? '0 0 var(--space-5) var(--primary-glow)' : 'none',
        };
      case 'secondary':
        return {
          background: 'var(--bg-panel)',
          color: 'var(--text-main)',
          border: '1px solid var(--hud-footer-border)',
        };
      case 'ghost':
        return {
          background: 'rgba(31, 41, 56, 0)', // Fix: Explicit RGBA for Framer Motion animation
          color: 'var(--text-dim)',
          border: 'none',
        };
      case 'danger':
        return {
          background: 'var(--danger)',
          color: '#fff',
          border: 'none',
          boxShadow: '0 0 var(--space-5) var(--danger)',
        };
      case 'tactical':
        return {
          background: 'rgba(21, 31, 46, 0)', // Matching --glass-bg base
          color: 'var(--text-main)',
          border: '1px solid var(--hud-footer-border)',
          backdropFilter: 'blur(12px)',
        };
      default:
        return {};
    }
  };

  const getSizeStyles = (): React.CSSProperties => {
    switch (size) {
      case 'sm': return { padding: 'var(--space-2) var(--space-4)', fontSize: '10px' };
      case 'lg': return { padding: 'var(--space-4) var(--space-8)', fontSize: '13px' };
      default: return { padding: 'var(--space-3) var(--space-6)', fontSize: '11px' };
    }
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02, x: 2, backgroundColor: variant === 'ghost' ? 'var(--bg-panel)' : undefined }}
      whileTap={{ scale: 0.98 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--space-3)',
        borderRadius: 0,
        fontWeight: 900,
        fontFamily: 'var(--font-mono)',
        cursor: 'pointer',
        transition: 'var(--transition-fast)',
        width: fullWidth ? '100%' : 'auto',
        textTransform: 'uppercase',
        letterSpacing: '0.15em',
        ...getVariantStyles(),
        ...getSizeStyles(),
        ...style
      }}
      className={className}
      {...props}
    >
      {icon && <span style={{ display: 'flex' }}>{icon}</span>}
      {children}
    </motion.button>
  );
};

/**
 * RDS_CARD_PROTOCOL
 */
interface CardProps {
  children?: React.ReactNode;
  hover?: boolean;
  className?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export const Card = ({ 
  children, 
  hover = true, 
  className, 
  onClick,
  style
}: CardProps): JSX.Element => {
  return (
    <motion.div
      onClick={onClick}
      whileHover={hover ? { y: -2, borderColor: 'var(--primary-color)', backgroundColor: 'var(--glow-active-bg)' } : {}}
      className={`glass-panel ${className || ''}`}
      style={{
        borderRadius: 0,
        padding: 'var(--space-6)',
        cursor: onClick ? 'pointer' : 'default',
        border: '1px solid var(--hud-footer-border)',
        ...style
      }}
    >
      {children}
    </motion.div>
  );
};

/**
 * RDS_INPUT_PROTOCOL
 */
interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'style'> {
  icon?: React.ReactNode;
  style?: React.CSSProperties;
}

export const Input = ({ icon, className, style, ...props }: InputProps): JSX.Element => {
  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {icon && (
        <div style={{ 
          position: 'absolute', 
          left: 'var(--space-4)', 
          top: '50%', 
          transform: 'translateY(-50%)', 
          color: 'var(--text-dark)', 
          pointerEvents: 'none' 
        }}>
          {icon}
        </div>
      )}
      <input
        className={className}
        style={{
          width: '100%',
          padding: icon ? 'var(--space-3) var(--space-3) var(--space-3) var(--space-10)' : 'var(--space-3) var(--space-4)',
          borderRadius: 0,
          background: 'var(--bg-deep)',
          border: '1px solid var(--hud-footer-border)',
          color: 'var(--text-main)',
          fontSize: '11px',
          fontFamily: 'var(--font-mono)',
          outline: 'none',
          ...style
        }}
        {...props}
      />
    </div>
  );
};

export * from './HUDToggle/HUDToggle';
export * from './SpecRow/SpecRow';
export { MediaCard } from './MediaCard';
export * from './MediaCard/MediaCard.types';
export * from './TemporalSector/ChronosSlider';
export * from './TemporalSector/BroadcastSlider';
export * from './DataPacket/DataPacket';
export { PageTransition } from './PageTransition';
export * from './Skeleton';
export { Particles } from './Particles';
