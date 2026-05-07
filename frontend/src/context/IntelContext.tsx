"use client";
import React, { createContext, useState, useEffect, useCallback, useContext } from 'react';
import { AuthContext } from '@/app/AuthContext';
import { useAlertsSSE } from '@/lib/useAlertsSSE';

export interface AiringEpisode {
  id: number;
  title: string;
  episode: number;
  airingAt: number;
  thumbnail: string;
}

export interface SeasonalIntel {
  season: string;
  year: number;
  trendingTargets: string[];
  summary: string;
}

interface IntelContextType {
  upcomingEpisodes: AiringEpisode[];
  seasonalIntel: SeasonalIntel | null;
  dismissAlert: (id: number) => void;
  dismissIntel: () => void;
  refreshIntel: () => Promise<void>;
}

export const IntelContext = createContext<IntelContextType | undefined>(undefined);

const safeLocalGet = <T,>(key: string, fallback: T): T => {
  try {
    if (typeof window === 'undefined') return fallback;
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : fallback;
  } catch (err) {
    console.warn(`STORAGE_READ_ACCESS_DENIED // ${key}`, err);
    return fallback;
  }
};

const safeLocalSet = (key: string, value: unknown): void => {
  try {
    if (typeof window === 'undefined') return;
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`STORAGE_WRITE_ACCESS_DENIED // ${key}`, err);
  }
};

export const IntelProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const auth = useContext(AuthContext);
  const userId = auth?.user ?? null;
  
  const [upcomingEpisodes, setUpcomingEpisodes] = useState<AiringEpisode[]>([]);
  const [seasonalIntel, setSeasonalIntel] = useState<SeasonalIntel | null>(null);

  // For simplicity, check if user is logged in to enable SSE.
  // In a full implementation, we'd fetch actual notification preferences.
  const alertsEnabled = !!userId;
  
  const { lastAlert, lastSeasonal } = useAlertsSSE(alertsEnabled);

  useEffect(() => {
    if (lastAlert) {
      const dismissed = safeLocalGet<number[]>('dismissed_alerts', []);
      if (!dismissed.includes(lastAlert.anime_id)) {
        setUpcomingEpisodes(prev => {
          if (prev.find(ep => ep.id === lastAlert.anime_id && ep.episode === lastAlert.episode)) return prev;
          return [...prev, {
            id: lastAlert.anime_id,
            title: lastAlert.title,
            episode: lastAlert.episode,
            airingAt: lastAlert.airing_at,
            thumbnail: lastAlert.cover_image
          }];
        });
      }
    }
  }, [lastAlert]);

  useEffect(() => {
    if (lastSeasonal) {
      let intelDismissed = false;
      try { 
        if (typeof window !== 'undefined') {
          intelDismissed = !!sessionStorage.getItem('seasonal_intel_dismissed'); 
        }
      } catch {}

      if (!intelDismissed) {
        setSeasonalIntel({
          season: lastSeasonal.season,
          year: lastSeasonal.year,
          trendingTargets: ["New Data Available"],
          summary: `PROJECTION: NEW INTEL ACQUIRED FOR ${lastSeasonal.season} ${lastSeasonal.year}. (${lastSeasonal.count} TARGETS)`
        });
      }
    }
  }, [lastSeasonal]);

  const refreshIntel = useCallback(async () => {
    // Legacy polling fallback or manual refresh trigger can go here.
    // We rely on SSE now, so this is mostly a no-op for alerts, 
    // but could be used to fetch missed alerts.
  }, []);

  const dismissAlert = useCallback((id: number) => {
    setUpcomingEpisodes(prev => prev.filter(ep => ep.id !== id));
    const dismissed = safeLocalGet<number[]>('dismissed_alerts', []);
    safeLocalSet('dismissed_alerts', [...dismissed, id]);
  }, []);

  const dismissIntel = useCallback(() => {
    setSeasonalIntel(null);
    try { 
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('seasonal_intel_dismissed', 'true'); 
      }
    } catch {}
  }, []);

  return (
    <IntelContext.Provider value={{ upcomingEpisodes, seasonalIntel, dismissAlert, dismissIntel, refreshIntel }}>
      {children}
    </IntelContext.Provider>
  );
};
