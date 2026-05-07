import React from 'react';
import styles from './UplinkGroup.module.css';
import { ExternalLink, Play } from 'lucide-react';
import { motion } from 'framer-motion';
import { hexToHSLString } from '@/utils/color';

import { ExternalLinkData } from '@/types/anime';

interface UplinkGroupProps {
  links: ExternalLinkData[];
}

const BRAND_COLORS: Record<string, string> = {
  'AMAZON PRIME VIDEO': '#00A8E1',
  'AMAZON': '#00A8E1',
  'NETFLIX': '#E50914',
  'CRUNCHYROLL': '#F47521',
  'HULU': '#1CE783',
  'DISNEY PLUS': '#113CCF',
  'YOUTUBE': '#FF0000',
  'HIDIVE': '#00AEEF',
};

const UplinkGroup: React.FC<UplinkGroupProps> = ({ links }) => {
  if (!links || links.length === 0) return null;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.glitchBox} />
        <span className={styles.title}>PLATFORM UPLINKS // SECTORS</span>
      </div>

      <div className={styles.grid}>
        {links.map((link, idx) => {
          const siteName = link.site.toUpperCase();
          const brandColor = BRAND_COLORS[siteName] || link.color || 'var(--primary-color)';

          return (
            <motion.a
              key={`${link.url}-${idx}`}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.uplink}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              whileHover={{ scale: 1.02, x: 5 }}
              style={{
                '--platform-glow': brandColor,
                '--platform-hsl': hexToHSLString(brandColor)
              } as any}
            >
              <div className={styles.iconBox}>
                <Play size={12} fill="currentColor" />
              </div>
              <div className={styles.label}>
                <span className={styles.siteName}>{siteName}</span>
                <span className={styles.typeTag}>{link.type}</span>
              </div>
              <ExternalLink size={14} className={styles.externalIcon} />

              {/* HUD Scanline Effect on hover */}
              <div className={styles.scanline} />
            </motion.a>
          );
        })}
      </div>
    </div>
  );
};


export default UplinkGroup;
