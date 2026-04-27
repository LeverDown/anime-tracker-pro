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
  ...props 
}: ButtonProps): JSX.Element => {
  const getVariantStyles = (): React.CSSProperties => {
    switch (variant) {
      case 'primary':
        return {
          background: 'var(--primary-color)',
          color: 'var(--text-main)',
          border: 'none',
          boxShadow: glow ? '0 0 var(--space-5) var(--primary-glow)' : 'none',
        };
      case 'secondary':
        return {
          background: 'var(--bg-panel)',
          color: 'var(--text-main)',
          border: '1px solid var(--glass-border)',
        };
      case 'ghost':
        return {
          background: 'transparent',
          color: 'var(--text-dim)',
          border: 'none',
        };
      case 'danger':
        return {
          background: 'var(--danger)',
          color: 'var(--text-main)',
          border: 'none',
          boxShadow: '0 0 var(--space-5) var(--danger)',
        };
      case 'tactical':
        return {
          background: 'transparent',
          color: 'var(--text-main)',
          border: '1px solid var(--glass-border)',
          backdropFilter: 'blur(12px)',
        };
      default:
        return {};
    }
  };

  const getSizeStyles = (): React.CSSProperties => {
    switch (size) {
      case 'sm': return { padding: 'var(--space-2) var(--space-4)', fontSize: 'var(--font-size-xs)' };
      case 'lg': return { padding: 'var(--space-4) var(--space-8)', fontSize: 'var(--font-size-base)' };
      default: return { padding: 'var(--space-3) var(--space-6)', fontSize: 'var(--font-size-md)' };
    }
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02, x: 2, background: variant === 'ghost' ? 'var(--bg-panel)' : undefined }}
      whileTap={{ scale: 0.98 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--space-3)',
        borderRadius: 'var(--radius-md)',
        fontWeight: 'var(--font-weight-extrabold)',
        cursor: 'pointer',
        transition: 'var(--transition-fast)',
        width: fullWidth ? '100%' : 'auto',
        textTransform: 'uppercase',
        letterSpacing: 'var(--tracking-wider)',
        ...getVariantStyles(),
        ...getSizeStyles(),
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
      whileHover={hover ? { y: -5, borderColor: 'var(--glass-border-bright)', background: 'var(--glass-shine)' } : {}}
      className={`glass-panel ${className || ''}`}
      style={{
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-6)',
        cursor: onClick ? 'pointer' : 'default',
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
}

export const Input = ({ icon, className, ...props }: InputProps): JSX.Element => {
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
          padding: icon ? 'var(--space-3) var(--space-3) var(--space-3) var(--space-12)' : 'var(--space-3) var(--space-4)',
          borderRadius: 'var(--radius-md)',
          background: 'var(--glass-surface)',
          border: '1px solid var(--glass-border)',
          color: 'var(--text-main)',
          fontSize: 'var(--font-size-md)',
        }}
        {...props}
      />
    </div>
  );
};

export { MediaCard } from './MediaCard';
export * from './MediaCard/MediaCard.types';
