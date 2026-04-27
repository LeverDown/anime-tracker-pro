import React from 'react';
import styles from './UplinkGroup.module.css';
import { ExternalLink, Play } from 'lucide-react';
import { motion } from 'framer-motion';
import { hexToHSLString } from '@/utils/color';

import { ExternalLinkData } from '@/types/anime';

interface UplinkGroupProps {
  links: ExternalLinkData[];
}

const UplinkGroup: React.FC<UplinkGroupProps> = ({ links }) => {
  if (!links || links.length === 0) return null;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.glitchBox} />
        <span className={styles.title}>PLATFORM UPLINKS // SECTORS</span>
      </div>
      
      <div className={styles.grid}>
        {links.map((link, idx) => (
          <motion.a
            key={link.url}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.uplink}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            whileHover={{ scale: 1.02, x: 5 }}
            style={{ 
              '--platform-glow': link.color || 'var(--primary-color)',
              '--platform-hsl': link.color ? hexToHSLString(link.color) : 'var(--primary-hsl)'
            } as any}
          >
            <div className={styles.iconBox}>
              <Play size={12} fill="currentColor" />
            </div>
            <div className={styles.label}>
              <span className={styles.siteName}>{link.site.toUpperCase()}</span>
              <span className={styles.typeTag}>{link.type}</span>
            </div>
            <ExternalLink size={14} className={styles.externalIcon} />
            
            {/* HUD Scanline Effect on hover */}
            <div className={styles.scanline} />
          </motion.a>
        ))}
      </div>
    </div>
  );
};


export default UplinkGroup;
