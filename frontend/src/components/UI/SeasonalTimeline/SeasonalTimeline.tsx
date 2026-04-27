import React, { useEffect, useState } from 'react';
import styles from './SeasonalTimeline.module.css';
import { Clock, Radio } from 'lucide-react';
import { motion } from 'framer-motion';

interface AiringData {
  airingAt: number;
  timeUntilAiring: number;
  episode: number;
}

interface SeasonalTimelineProps {
  airing: AiringData | null;
  status: string;
}

const SeasonalTimeline: React.FC<SeasonalTimelineProps> = ({ airing, status }) => {
  const [timeLeft, setTimeLeft] = useState<number>(airing?.timeUntilAiring || 0);

  useEffect(() => {
    if (!timeLeft || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  if (!airing && status !== 'RELEASING') return null;

  const formatTime = (seconds: number) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    
    if (d > 0) return `${d}D ${h}H ${m}M`;
    return `${h}H ${m}M ${s}S`;
  };

  return (
    <div className={styles.container}>
      <div className={styles.hudHeader}>
        <div className={styles.pulseNode}>
          <Radio size={14} className={styles.pulseIcon} />
        </div>
        <span className={styles.hudTitle}>UPLINK STATUS // AIRING INTEL</span>
      </div>

      <div className={styles.content}>
        {airing ? (
          <div className={styles.intelRow}>
            <div className={styles.intelItem}>
              <span className={styles.label}>TARGET EPISODE</span>
              <span className={styles.value}>EPISODE {airing.episode}</span>
            </div>
            <div className={styles.separator} />
            <div className={styles.intelItem}>
              <span className={styles.label}>T-MINUS</span>
              <span className={styles.valueHighlight}>
                <Clock size={16} />
                {formatTime(timeLeft)}
              </span>
            </div>
          </div>
        ) : (
          <div className={styles.offline}>
            <span className={styles.label}>UPLINK STATUS</span>
            <span className={styles.value}>MISSION COMPLETE // ALL EPISODES AIRED</span>
          </div>
        )}
      </div>

      {/* Decorative HUD Elements */}
      <div className={styles.cornerTR} />
      <div className={styles.cornerBL} />
    </div>
  );
};

export default SeasonalTimeline;
