"use client";
import React from 'react';

interface HUDToggleProps {
  value: boolean;
  onChange: (v: boolean) => void;
  accentColor?: string;
}

export const HUDToggle: React.FC<HUDToggleProps> = ({ value, onChange, accentColor }) => {
  const activeColor = accentColor || 'var(--s-accent)';
  
  return (
    <div 
      onClick={() => onChange(!value)}
      style={{
        width: '36px',
        height: '18px',
        background: value ? 'var(--s-accent-dim)' : 'var(--s-bg4)',
        border: `1px solid ${value ? activeColor : 'var(--s-border)'}`,
        position: 'relative',
        cursor: 'pointer',
        transition: 'all 150ms ease',
        display: 'flex',
        alignItems: 'center'
      }}
    >
      <div 
        style={{
          width: '12px',
          height: '12px',
          position: 'absolute',
          top: '2px',
          left: value ? '20px' : '2px',
          background: value ? activeColor : 'var(--s-text-md)',
          transition: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: value ? `0 0 8px ${activeColor}` : 'none'
        }}
      />
    </div>
  );
};
