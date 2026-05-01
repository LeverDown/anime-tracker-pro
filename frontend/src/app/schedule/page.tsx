"use client";
import React, { useState, useEffect, JSX } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../api/client';
import { BroadcastSlider, DataPacket } from '../../components/UI';
import { SeasonalAnimeEntry } from '@/types/seasonal';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function SchedulePage(): JSX.Element {
  const [activeDay, setActiveDay] = useState<string>(DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1]);
  const [airing, setAiring] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [direction, setDirection] = useState<1 | -1>(1);

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

  const handleDayChange = (newDay: string) => {
    const oldIdx = DAYS.indexOf(activeDay);
    const newIdx = DAYS.indexOf(newDay);
    setDirection(newIdx > oldIdx ? 1 : -1);
    setActiveDay(newDay);
  };

  const shortenBroadcast = (str: string) => {
    if (!str) return null;
    // Example: "Mondays at 23:00 (JST)" -> "MON 23:00 JST"
    const match = str.match(/(\w+)s\s+at\s+(\d{1,2}:\d{2})\s+\((JST)\)/i);
    if (match) {
      return `${match[1].substring(0, 3).toUpperCase()} ${match[2]} ${match[3]}`;
    }
    return str.replace(' (JST)', ' JST').toUpperCase();
  };

  const mapToDataPacket = (item: any): any => ({
    id: item.mal_id,
    title: {
      romaji: item.title,
      english: item.title_english || item.title
    },
    coverImage: {
      large: item.images?.jpg?.large_image_url || item.images?.jpg?.image_url,
      extraLarge: item.images?.jpg?.large_image_url || item.images?.jpg?.image_url
    },
    averageScore: item.score ? Math.round(item.score * 10) : null,
    episodes: item.episodes,
    status: item.status === 'Finished Airing' ? 'FINISHED' : 'RELEASING',
    format: 'TV',
    genres: item.genres?.map((g: any) => g.name) || [],
    description: item.synopsis,
    season: 'SPRING',
    seasonYear: 2026,
    airtimeOverride: shortenBroadcast(item.broadcast?.string),
    nextAiringEpisode: null
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg-deep)' }}>
      {/* Tactical Uplink Header */}
      <header style={{ 
        padding: '14px 20px', 
        borderBottom: '1px solid var(--glow-border)',
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        background: 'rgba(5, 5, 8, 0.4)',
        backdropFilter: 'blur(10px)',
        zIndex: 10
      }}>
        <div style={{ fontSize: '12px', letterSpacing: '0.1em', color: 'var(--spec-title-color)', fontFamily: 'var(--font-mono)', fontWeight: 900 }}>
          RONINHUB // BROADCAST INTEL // TEMPORAL SCHEDULE ACTIVE
        </div>
        <div style={{ fontSize: '12px', color: 'var(--spec-val-color)', display: 'flex', alignItems: 'center', fontFamily: 'var(--font-mono)', fontWeight: 900 }}>
          SYS: <span style={{ color: 'var(--spec-val-color)', marginLeft: '4px', fontWeight: 900 }}>NOMINAL</span>
          <motion.div
            animate={{ opacity: [1, 1, 0, 0, 1] }}
            transition={{ duration: 1.5, repeat: Infinity, times: [0, 0.45, 0.5, 0.95, 1], ease: "linear" }}
            style={{ 
              marginLeft: '8px', 
              width: '8px', 
              height: '8px', 
              borderRadius: '50%', 
              background: 'var(--spec-val-color)',
              boxShadow: '0 0 8px var(--spec-val-color)'
            }}
          />
        </div>
      </header>

      <BroadcastSlider 
        activeDay={activeDay} 
        onDayChange={handleDayChange}
        direction={direction}
      />

      <main style={{ flex: 1, position: 'relative', overflowY: 'auto' }} className="rds-scroll">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ display: 'flex', justifyContent: 'center', padding: '100px', color: 'var(--primary-color)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}
            >
              UPLINKING_TO_BROADCAST_STREAM...
            </motion.div>
          ) : airing.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '100px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
              NO_TRANSMISSIONS_LOCATED_FOR_THIS_SECTOR
            </div>
          ) : (
            <motion.div
              key={activeDay}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                gap: '1px',
                background: 'var(--glow-grid-gap)',
                minHeight: '100%'
              }}
            >
              {airing.map((item, idx) => (
                <DataPacket 
                  key={item.mal_id}
                  {...mapToDataPacket(item)}
                  index={idx}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
