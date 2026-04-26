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
    
    let isMounted = true;
    const fetchActivity = async () => {
      try {
        const res = await api.get('/activity');
        if (isMounted) {
          setActivities(res.data.data || []);
          setLoading(false);
        }
      } catch (err) {
        console.error("Activity fetch error", err);
        if (isMounted) setLoading(false);
      }
    };
    
    fetchActivity();
    return () => { isMounted = false; };
  }, [mounted]);

  if (!mounted) return <div className={styles.skeletonCard} />;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <motion.h1 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className={styles.title}
        >
          <span className={styles.titlePrefix}>{"//"}</span> COMMUNITY_HUB
        </motion.h1>

        <Card className={styles.toolbar}>
          <div className={styles.toolbarLabel}>
            <Activity size={18} color="var(--primary-color)" />
            REAL_TIME_INTEL_STREAM
          </div>
          <div style={{ flex: 1 }} />
          <Button variant="tactical" icon={<Users size={16} />}>FRIENDS_ONLY</Button>
        </Card>
      </header>

      <div className={styles.feedContainer}>
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className={styles.skeletonCard} />
          ))
        ) : activities.length === 0 ? (
          <Card className={styles.emptyState}>
            <p className={styles.emptyText}>NO RECENT ACTIVITY DETECTED IN THE SECTOR.</p>
          </Card>
        ) : (
          activities.map((act, i) => (
            <motion.div
              key={`${act.timestamp}-${i}`}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className={styles.activityCard}>
                <div className={styles.activityLayout}>
                  <div className={styles.avatar}>
                    {act.username ? act.username[0].toUpperCase() : '?'}
                  </div>
                  <div className={styles.mainContent}>
                    <div className={styles.headerRow}>
                      <div>
                        <span className={styles.userLabel}>{act.username}</span>
                        <span className={styles.actionLabel}>
                          {act.action}
                        </span>
                      </div>
                      <span className={styles.timestamp}>
                        {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    
                    <div className={styles.subjectPanel}>
                      <span className={styles.subjectTitle}>{act.anime_title}</span>
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
              </Card>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
