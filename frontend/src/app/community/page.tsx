"use client";
import React, { useState, useEffect, useContext, JSX } from 'react';
import { motion } from 'framer-motion';
import { Users, MessageSquare, Heart, Share2, Activity } from 'lucide-react';
import { AuthContext } from '../AuthContext';
import api from '../../api/client';
import { Button, Card } from '../../components/UI';
import styles from './community.module.css';

/* eslint-disable react-hooks/set-state-in-effect */

interface CommunityActivity {
  username: string;
  action: string;
  anime_title: string;
  anime_id: number;
  timestamp: string;
}

/**
 * CommunityPage Protocol
 * Enforces RDS naming consistency, token synchronization, and payload safety.
 */
export default function CommunityPage(): JSX.Element {
  const auth = useContext(AuthContext);
  const user = auth?.user;
  
  const [mounted, setMounted] = useState<boolean>(false);
  const [activities, setActivities] = useState<CommunityActivity[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    setLoading(false);
  }, [mounted]);

  if (!mounted) return <div className={styles.skeletonCard} />;

  return (
    <div className={`${styles.container} rds-hatch`}>
      <header className={styles.header}>
        <div className={styles.headerTop} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 className={styles.title}>
            <span className={styles.titlePrefix}>{"//"}</span> COMMUNITY_HUB
          </h1>
          <div style={{ display: 'flex', gap: '16px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-dim)', letterSpacing: '0.1em' }}>
            <span><Activity size={14} color="var(--primary-color)" /> SYS // LIVE_STREAM</span>
            <span><Users size={14} /> SECTOR // GLOBAL_INTEL</span>
          </div>
        </div>

        <div className={styles.toolbar}>
          <div className={styles.toolbarLabel}>
            INTEL_STATUS // NOMINAL
          </div>
          <div style={{ flex: 1 }} />
        </div>
      </header>

      <div className={styles.feedContainer}>
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className={styles.skeletonCard} />
          ))
        ) : activities.length === 0 ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyText}>NO RECENT ACTIVITY DETECTED IN THE SECTOR.</p>
          </div>
        ) : (
          activities.map((act, i) => (
            <motion.div
              key={`${act.timestamp}-${i}`}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <div className={styles.activityCard}>
                <div className={styles.activityLayout}>
                  <div className={styles.avatar}>
                    {act.username ? act.username[0].toUpperCase() : '?'}
                  </div>
                  <div className={styles.mainContent}>
                    <div className={styles.headerRow}>
                      <div>
                        <span className={styles.userLabel}>{act.username}</span>
                        <span className={styles.actionLabel}>
                          {act.action?.toUpperCase()}
                        </span>
                      </div>
                      <span className={styles.timestamp}>
                        SYNC_TIME // {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    
                    <div className={styles.subjectPanel}>
                      <span className={styles.subjectTitle}>{act.anime_title?.toUpperCase()}</span>
                    </div>

                    <div className={styles.engagement}>
                      <button className={styles.engagementButton}>
                        <Heart size={14} /> 12
                      </button>
                      <button className={styles.engagementButton}>
                        <MessageSquare size={14} /> 4
                      </button>
                      <button className={styles.engagementButton}>
                        <Share2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
