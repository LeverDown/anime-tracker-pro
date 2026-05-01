"use client";
import React, { createContext, useState, useEffect, useCallback, useContext, useRef } from 'react';
import { AuthContext } from '@/app/AuthContext';
import api from '@/api/client';

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
  const cancelRef = useRef(false);

  const refreshIntel = useCallback(async () => {
    if (!userId) return;
    cancelRef.current = false;
    try {
      const dismissed = safeLocalGet<number[]>('dismissed_alerts', []);
      
      // In a real scenario, this fetches from /api/notifications/airing
      const data: AiringEpisode[] = []; 
      
      if (cancelRef.current) return;
      setUpcomingEpisodes(data.filter(ep => !dismissed.includes(ep.id)));

      // SESSION_INTEL_HANDSHAKE
      let intelDismissed = false;
      try { 
        if (typeof window !== 'undefined') {
          intelDismissed = !!sessionStorage.getItem('seasonal_intel_dismissed'); 
        }
      } catch {}

      if (!intelDismissed) {
        if (cancelRef.current) return;
        setSeasonalIntel({
          season: "SUMMER",
          year: 2024,
          trendingTargets: ["Oshi no Ko S2", "Tower of God S2", "Monogatari Off Season"],
          summary: "PROJECTION: HIGH-INTENSITY SEQUEL DOMINANCE DETECTED."
        });
      }
    } catch (err) {
      console.error("INTEL_FETCH_FAILURE:", err);
    }
  }, [userId]);

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

  useEffect(() => {
    if (userId) {
      refreshIntel();
      const interval = setInterval(refreshIntel, 300000);
      return () => {
        cancelRef.current = true;
        clearInterval(interval);
      };
    }
  }, [userId, refreshIntel]);

  return (
    <IntelContext.Provider value={{ upcomingEpisodes, seasonalIntel, dismissAlert, dismissIntel, refreshIntel }}>
      {children}
    </IntelContext.Provider>
  );
};
