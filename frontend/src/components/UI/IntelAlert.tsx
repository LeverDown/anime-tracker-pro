"use client";
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';
import { AiringEpisode } from '@/context/IntelContext';

interface IntelAlertProps {
  episodes: AiringEpisode[];
  onDismiss: (id: number) => void;
}

export const IntelAlert: React.FC<IntelAlertProps> = ({ episodes, onDismiss }) => {
  return (
    <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 10000, display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <AnimatePresence>
        {episodes.map((ep) => (
          <AiringCard key={ep.id} episode={ep} onDismiss={() => onDismiss(ep.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
};

const AiringCard = ({ episode, onDismiss }: { episode: AiringEpisode; onDismiss: () => void }) => {
  const [timeLeft, setTimeLeft] = useState(episode.airingAt - Math.floor(Date.now() / 1000));
  const phase = timeLeft > 0 ? 'IMMINENT' : 'AIRING_NOW';

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(episode.airingAt - Math.floor(Date.now() / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [episode.airingAt]);

  useEffect(() => {
    if (timeLeft <= 0) {
      const autoDismiss = setTimeout(onDismiss, 30000);
      return () => clearTimeout(autoDismiss);
    }
  }, [timeLeft <= 0, onDismiss]);

  const mins = Math.max(0, Math.floor(timeLeft / 60));
  const progress = Math.max(0, Math.min(100, (1 - timeLeft / 900) * 100));

  return (
    <motion.div
      initial={{ x: 350, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 350, opacity: 0 }}
      className="glass-panel rds-scan-lines"
      style={{ 
        width: '320px', 
        background: 'rgba(11, 10, 20, 0.95)', 
        border: `1px solid ${phase === 'IMMINENT' ? 'var(--primary-color)' : '#ef4444'}`, 
        padding: '16px', 
        display: 'flex', 
        gap: '16px', 
        position: 'relative' 
      }}
    >
      <div style={{ width: '60px', height: '60px', background: 'var(--hud-thumb-bg)', flexShrink: 0 }}>
        <img src={episode.thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: phase === 'IMMINENT' ? 'var(--primary-color)' : '#ef4444', fontSize: '10px', fontWeight: 900, fontFamily: 'var(--font-mono)' }}>
          <AlertTriangle size={12} />
          AIRING_ALERTS // {phase}
        </div>
        <div style={{ color: 'white', fontSize: '13px', fontWeight: 800, marginTop: '4px', textTransform: 'uppercase' }}>{episode.title}</div>
        <div style={{ color: 'var(--text-dim)', fontSize: '10px', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
          {phase === 'IMMINENT' ? `EPISODE ${episode.episode} // AIRING_IN_${mins}_MINS` : `EPISODE ${episode.episode} // AIRING_NOW`}
        </div>
        <div style={{ width: '100%', height: '2px', background: 'rgba(255,255,255,0.1)', marginTop: '8px', position: 'relative' }}>
          <motion.div 
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.8, ease: 'linear' }}
            style={{ position: 'absolute', top: 0, left: 0, height: '100%', background: phase === 'IMMINENT' ? 'var(--primary-color)' : '#ef4444' }} 
          />
        </div>
      </div>
      <button onClick={onDismiss} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', position: 'absolute', top: '12px', right: '12px' }}>
        <X size={16} />
      </button>
    </motion.div>
  );
};
