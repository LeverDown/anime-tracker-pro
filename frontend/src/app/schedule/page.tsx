"use client";
import React, { useState, useEffect, JSX } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, Clock, Star, Users, Info, 
  ChevronLeft, ChevronRight, Zap, Play, Plus, ExternalLink
} from 'lucide-react';
import api from '../../api/client';
import { Button, Card } from '../../components/UI';
import styles from './schedule.module.css';

/* eslint-disable @next/next/no-img-element */

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/**
 * SchedulePage Protocol — v3.0 (Horizontal High-Fidelity)
 * Implements the premium horizontal card layout inspired by industry-leading UI.
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
              <HorizontalAnimeCard key={item.idMal} item={item} idx={idx} />
            ))
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function HorizontalAnimeCard({ item, idx }: { item: any, idx: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: idx * 0.05 }}
    >
      <Card className={styles.horizontalCard} hover={false}>
        <div className={styles.posterSection}>
          <img src={item.image_url} alt={item.title} className={styles.poster} />
          <div className={styles.studioLabel}>{item.studio || 'UNKN_STUDIO'}</div>
        </div>

        <div className={styles.contentSection}>
          <div className={styles.cardHeader}>
            <div className={styles.mainInfo}>
              <h3 className={styles.animeTitle}>{item.title}</h3>
              <div className={styles.airingTime}>
                <Clock size={14} style={{ marginRight: '6px' }} />
                Airing at {item.time || 'TBA'}
              </div>
            </div>
            <div className={styles.statsArea}>
              <div className={styles.statItem}>
                <Star size={14} color="var(--warning)" fill="var(--warning)" />
                <span>{item.score || 'N/A'}%</span>
              </div>
              <div className={styles.statItem}>
                <Users size={14} color="var(--primary-color)" />
                <span>#{idx + 1}</span>
              </div>
            </div>
          </div>

          <p className={styles.synopsis}>{item.synopsis || 'Neural summary currently unavailable for this transmission...'}</p>

          <div className={styles.cardFooter}>
            <div className={styles.tags}>
              {item.genres?.split(',').slice(0, 3).map((tag: string) => (
                <span key={tag} className={styles.tag}>{tag.trim().toLowerCase()}</span>
              ))}
            </div>
            <div className={styles.actions}>
              <Button variant="ghost" size="sm" icon={<Plus size={14} />} className={styles.actionBtn} />
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
