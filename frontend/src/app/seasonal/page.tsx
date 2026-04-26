"use client";
import React, { useState, useEffect, JSX } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import api from '../../api/client';
import { Button, Card } from '../../components/UI';
import { Anime, SeasonalResponse } from '../../types/anime';
import styles from './seasonal.module.css';

/* eslint-disable @next/next/no-img-element */

const SEASONS = ['WINTER', 'SPRING', 'SUMMER', 'FALL'];
const YEARS = [2024, 2023, 2022, 2021, 2020];

/**
 * SeasonalPage Protocol
 * Implements strict type safety and token-based styling.
 */
export default function SeasonalPage(): JSX.Element {
  const router = useRouter();
  const [results, setResults] = useState<Anime[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [mounted, setMounted] = useState<boolean>(false);
  const [season, setSeason] = useState<string>('SPRING');
  const [year, setYear] = useState<number>(2024);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchSeasonal = async (): Promise<void> => {
      setLoading(true);
      try {
        const res = await api.get<SeasonalResponse>('/anime/seasonal', { params: { year, season } });
        if (isMounted) {
          setResults(res.data.data || []);
          setLoading(false);
        }
      } catch (err) {
        console.error("Seasonal fetch error", err);
        if (isMounted) setLoading(false);
      }
    };
    fetchSeasonal();
    return () => { isMounted = false; };
  }, [season, year]);

  if (!mounted) return <div className={styles.container} />;

  return (
    <div className="animate-fade-in">
      <header className={styles.header}>
        <motion.h1 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className={styles.title}
        >
          <span className={styles.titlePrefix}>{"//"}</span> SEASONAL_CHART
        </motion.h1>

        <Card className={styles.filterBar}>
          <div className={styles.filterGroup}>
            {SEASONS.map((s: string) => (
              <Button
                key={s}
                variant={season === s ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setSeason(s)}
              >
                {s}
              </Button>
            ))}
          </div>
          <div className={styles.spacer} />
          <div className={styles.filterGroup}>
            {YEARS.map((y: number) => (
              <Button
                key={y}
                variant={year === y ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setYear(y)}
              >
                {y}
              </Button>
            ))}
          </div>
        </Card>
      </header>

      <div className={styles.grid}>
        {loading ? (
          Array.from({ length: 12 }).map((_, i: number) => (
            <Card key={`skeleton-${i}`} className={`${styles.skeleton} ${styles.skeletonPulse}`} hover={false} />
          ))
        ) : (
          results.map((anime: Anime, i: number) => {
            const imageUrl = anime.images.jpg.large_image_url || anime.images.jpg.image_url;
            return (
              <motion.div
                key={anime.mal_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card 
                  className={styles.animeCard}
                  onClick={() => router.push(`/anime/${anime.mal_id}`)}
                >
                  <div className={styles.imageWrapper}>
                    {imageUrl && (
                      <img 
                        src={imageUrl} 
                        alt={anime.title}
                        className={styles.animeImage}
                      />
                    )}
                    <div className={styles.cardOverlay}>
                      <h3 className={styles.animeTitle}>{anime.title}</h3>
                      <div className={styles.badgeGroup}>
                        <span className={`${styles.badge} ${styles.badgePrimary}`}>
                          {anime.type || 'TV'}
                        </span>
                        <span className={`${styles.badge} ${styles.badgeCyan}`}>
                          ★ {anime.score || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
