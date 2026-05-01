"use client";
import React from 'react';

interface SpecRowProps {
  label: string;
  value?: React.ReactNode;
  children?: React.ReactNode;
}

export const SpecRow: React.FC<SpecRowProps> = ({ label, value, children }) => {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '7px 0',
      borderBottom: '1px solid rgba(255,45,85,0.08)'
    }}>
      <span style={{
        fontSize: '11px',
        color: 'var(--s-text-lo)',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        fontWeight: 600
      }}>
        {label} //
      </span>
      <div style={{
        fontSize: '12px',
        color: 'var(--s-text-hi)',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontWeight: 500
      }}>
        {value || children}
      </div>
    </div>
  );
};
