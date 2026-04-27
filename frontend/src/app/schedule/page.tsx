"use client";
import React, { useState, useEffect, JSX } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, Clock, Star, Users, Info, 
  ChevronLeft, ChevronRight, Zap, Play, Plus, ExternalLink
} from 'lucide-react';
import api from '../../api/client';
import { Button, MediaCard } from '../../components/UI';
import styles from './schedule.module.css';

/* eslint-disable @next/next/no-img-element */

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/**
 * SchedulePage Protocol — v3.1 (Polymorphic MediaCard)
 * Standardizes the airing schedule sector with the platform-wide MediaCard architecture.
 */
export default function SchedulePage(): JSX.Element {
  const [activeDay, setActiveDay] = useState<string>(DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1]);
  const [airing, setAiring] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchSchedule = async () => {
      setLoading(true);
      try {
        const res = await api.get('/anime/schedule', { params: { day: activeDay } });
        setAiring(res.data.data || []);
      } catch (err) {
        console.error("Failed to fetch schedule", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSchedule();
  }, [activeDay]);

  const filtered = airing;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.titleArea}>
          <motion.h1 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className={styles.title}>
            <span className={styles.titlePrefix}>{"//"}</span> AIRING_SCHEDULE
          </motion.h1>
          <div className={styles.statusIndicator}>
            <Zap size={14} color="var(--primary-color)" />
            LIVE_DATA_STREAM_ACTIVE
          </div>
        </div>

        <nav className={styles.dayNav}>
          {DAYS.map((day) => (
            <button
              key={day}
              onClick={() => setActiveDay(day)}
              className={`${styles.dayButton} ${activeDay === day ? styles.dayButtonActive : ''}`}
            >
              {day.toUpperCase()}
              {activeDay === day && <motion.div layoutId="dayUnderline" className={styles.dayUnderline} />}
            </button>
          ))}
        </nav>
      </header>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeDay}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className={styles.scheduleGrid}
        >
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => <div key={i} className={styles.skeletonCard} />)
          ) : filtered.length === 0 ? (
            <div className={styles.emptyState}>NO_TRANSMISSIONS_LOCATED_FOR_THIS_SECTOR</div>
          ) : (
            filtered.map((item, idx) => (
              <motion.div
                key={item.idMal}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <MediaCard 
                  layout="horizontal"
                  title={item.title}
                  imageUrl={item.images?.jpg?.large_image_url || item.images?.jpg?.image_url}
                  studio={item.studio}
                  score={item.score}
                  popularity={idx + 1}
                  synopsis={item.synopsis}
                  subtitle={item.broadcast?.string}
                />
              </motion.div>
            ))
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
