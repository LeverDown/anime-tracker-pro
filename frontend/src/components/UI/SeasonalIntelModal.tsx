"use client";
import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, X, Target, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { SeasonalIntel } from '@/context/IntelContext';

interface SeasonalIntelModalProps {
  intel: SeasonalIntel;
  onClose: () => void;
}

export const SeasonalIntelModal: React.FC<SeasonalIntelModalProps> = ({ intel, onClose }) => {
  const router = useRouter();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 20000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="glass-panel rds-scan-lines"
        style={{ maxWidth: '600px', width: '100%', background: 'var(--hud-root-bg)', border: '1px solid var(--primary-color)', padding: '32px', position: 'relative' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div>
            <div style={{ color: 'var(--primary-color)', fontSize: '11px', fontWeight: 900, fontFamily: 'var(--font-mono)', letterSpacing: '0.2em' }}>
              {"//"} SEASONAL_RECONNAISSANCE_REPORT
            </div>
            <h2 style={{ fontSize: '28px', fontWeight: 900, color: 'white', marginTop: '8px' }}>{intel.season} {intel.year}</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
            <X size={24} />
          </button>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderLeft: '4px solid var(--primary-color)', marginBottom: '24px' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-main)', fontStyle: 'italic', lineHeight: 1.6 }}>"{intel.summary}"</p>
        </div>

        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-dim)', fontSize: '11px', fontWeight: 900, marginBottom: '12px' }}>
            <Target size={14} /> HIGH_PRIORITY_TARGETS
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
            {intel.trendingTargets.map((t) => (
              <button
                key={t}
                onClick={() => { onClose(); router.push('/seasonal'); }}
                style={{
                  padding: '16px',
                  border: '1px solid var(--primary-color)',
                  background: 'hsla(var(--primary-hsl) / 0.1)',
                  fontSize: '12px',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
                className="rds-glow-hover"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Sparkles size={16} color="var(--primary-color)" />
                  <span style={{ fontWeight: 800 }}>{t.toUpperCase()}</span>
                </div>
                <ChevronRight size={16} color="var(--primary-color)" />
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => { onClose(); router.push('/seasonal'); }}
            style={{ flex: 2, padding: '14px', background: 'var(--primary-color)', border: 'none', color: 'white', fontWeight: 900, fontSize: '12px', cursor: 'pointer', letterSpacing: '0.1em' }}
          >
            VIEW FULL REPORT //
          </button>
          <button
            onClick={onClose}
            style={{ flex: 1, padding: '14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-dim)', fontWeight: 800, fontSize: '11px', cursor: 'pointer' }}
          >
            ACKNOWLEDGE
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
