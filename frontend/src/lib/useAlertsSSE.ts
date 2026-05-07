import { useEffect, useRef, useState, useCallback } from 'react';
import { BACKEND_URL } from '../api/client';

export interface AlertEventData {
  anime_id: number;
  title: string;
  episode: number;
  airing_at: number;
  cover_image: string;
}

export interface SeasonalEventData {
  season: string;
  year: number;
  count: number;
}

export const useAlertsSSE = (enabled: boolean) => {
  const eventSourceRef = useRef<EventSource | null>(null);
  const [lastAlert, setLastAlert] = useState<AlertEventData | null>(null);
  const [lastSeasonal, setLastSeasonal] = useState<SeasonalEventData | null>(null);

  const connect = useCallback(() => {
    if (!enabled || typeof window === 'undefined') return;

    // We pass withCredentials so cookies are sent if needed
    const url = `${BACKEND_URL}/api/events/alerts`;
    const es = new EventSource(url, { withCredentials: true });
    
    es.addEventListener('airing_alert', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        setLastAlert(data);
      } catch (err) {
        console.error('Failed to parse airing_alert event', err);
      }
    });

    es.addEventListener('seasonal_preview', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        setLastSeasonal(data);
      } catch (err) {
        console.error('Failed to parse seasonal_preview event', err);
      }
    });

    es.onerror = (err) => {
      console.error('SSE connection error:', err);
      es.close();
      // Reconnect after 10s
      setTimeout(() => {
        if (enabled) connect();
      }, 10000);
    };

    eventSourceRef.current = es;
  }, [enabled]);

  useEffect(() => {
    connect();
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [connect]);

  return { lastAlert, lastSeasonal };
};
