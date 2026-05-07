"use client";
import React, { useState, JSX, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BroadcastSlider, DataPacket } from '../../components/UI';
import { useSchedule } from '@/lib/scheduleApi';
import { AiringEntry } from '@/types/schedule';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function SchedulePage(): JSX.Element {
  const [activeDay, setActiveDay] = useState<string>('');
  const [direction, setDirection] = useState<1 | -1>(1);
  const [timezone, setTimezone] = useState<string>('UTC');

  useEffect(() => {
    setActiveDay(DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1]);
    try {
      setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
    } catch {
      setTimezone('UTC');
    }
  }, []);

  const { data: response, isPending, isError, error } = useSchedule(activeDay, timezone);
  const airing = response?.data || [];

  const handleDayChange = (newDay: string) => {
    const oldIdx = DAYS.indexOf(activeDay);
    const newIdx = DAYS.indexOf(newDay);
    setDirection(newIdx > oldIdx ? 1 : -1);
    setActiveDay(newDay);
  };

  const mapToDataPacket = (item: AiringEntry): any => {
    const date = new Date(item.airing_at * 1000);
    const timeString = item.airing_at ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
    let tzAbbr = '';
    try {
      const parts = new Intl.DateTimeFormat('en-US', { timeZoneName: 'short' }).formatToParts(date);
      const tzPart = parts.find(p => p.type === 'timeZoneName');
      if (tzPart) tzAbbr = tzPart.value;
    } catch {
      tzAbbr = 'UTC';
    }
    const airtimeOverride = item.airing_at ? `EP ${item.episode} @ ${timeString} ${tzAbbr}` : 'TIME TBD';

    return {
      id: item.id_mal || item.id,
      title: {
        romaji: item.title_romaji,
        english: item.title_english || item.title_romaji
      },
      coverImage: {
        large: item.cover_image,
        extraLarge: item.cover_image
      },
      averageScore: item.average_score || null,
      episodes: item.episodes || item.episode,
      episode: item.episode,
      status: item.status || 'RELEASING',
      format: item.format || 'TV',
      genres: item.genres || [],
      description: item.description || '',
      season: 'CURRENT',
      seasonYear: new Date().getFullYear(),
      airtimeOverride,
      nextAiringEpisode: null
    };
  };

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
          SYS: <span style={{ color: isError ? 'var(--spec-error-color, #ff2d55)' : 'var(--spec-val-color)', marginLeft: '4px', fontWeight: 900 }}>
            {isError ? 'ERROR' : (response?.meta?.source === 'jikan' ? 'DEGRADED' : 'NOMINAL')}
          </span>
          <motion.div
            animate={{ opacity: [1, 1, 0, 0, 1] }}
            transition={{ duration: 1.5, repeat: Infinity, times: [0, 0.45, 0.5, 0.95, 1], ease: "linear" }}
            style={{ 
              marginLeft: '8px', 
              width: '8px', 
              height: '8px', 
              borderRadius: '50%', 
              background: isError ? 'var(--spec-error-color, #ff2d55)' : 'var(--spec-val-color)',
              boxShadow: isError ? '0 0 8px var(--spec-error-color, #ff2d55)' : '0 0 8px var(--spec-val-color)'
            }}
          />
        </div>
      </header>

      {activeDay && (
        <BroadcastSlider 
          activeDay={activeDay} 
          onDayChange={handleDayChange}
          direction={direction}
        />
      )}

      <main style={{ flex: 1, position: 'relative', overflowY: 'auto' }} className="rds-scroll">
        <AnimatePresence mode="wait">
          {!activeDay || isPending ? (
            <motion.div
              key="loading"
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
              {Array.from({ length: 12 }).map((_, idx) => (
                <div key={idx} style={{
                  background: 'rgba(255,255,255,0.02)',
                  height: '380px',
                  animation: 'pulse 1.5s infinite ease-in-out'
                }} />
              ))}
            </motion.div>
          ) : isError ? (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ textAlign: 'center', padding: '100px', color: 'var(--spec-error-color, #ff2d55)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}
            >
              UPLINK_FAILURE // {error?.message || 'UNABLE TO RETRIEVE SCHEDULE DATA'}
            </motion.div>
          ) : airing.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ textAlign: 'center', padding: '100px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}
            >
              NO_TRANSMISSIONS_LOCATED_FOR_THIS_SECTOR
            </motion.div>
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
                  key={item.id_mal || item.id}
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
