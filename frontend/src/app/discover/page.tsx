"use client";
import React, { useState, useEffect, useContext, Suspense, JSX } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, TrendingUp, Sparkles,
  ChevronLeft, ChevronRight,
  Plus, Check, Bookmark, Clock, X, Filter, ChevronDown
} from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useDiscoverAnime } from '@/hooks/queries/useAnime';
import { useSaveToCollection } from '@/hooks/queries/useUser';
import { AuthContext } from '../AuthContext';
import { Button, Input, Card, SkeletonHUD, DataPacket } from '../../components/UI';
import { seasonalGridVariants, scrollRevealVariants } from '@/animations/motions';
import { AnimeStatus, AnimeFormat } from '@/types/seasonal';
import { AnimeResult } from '@/types/anime';
import styles from './discover.module.css';

/* eslint-disable @next/next/no-img-element */

const GENRES = [
  { id: 1, name: 'Action' }, { id: 2, name: 'Adventure' }, { id: 4, name: 'Comedy' },
  { id: 8, name: 'Drama' }, { id: 10, name: 'Fantasy' }, { id: 22, name: 'Romance' },
  { id: 24, name: 'Sci-Fi' }, { id: 36, name: 'Slice of Life' }, { id: 37, name: 'Supernatural' }
];

const QUICK_STATUS = [
  { id: 'Watching', label: 'WATCHING', color: 'var(--primary-color)' },
  { id: 'Completed', label: 'COMPLETED', color: 'var(--accent-cyan)' },
  { id: 'Plan to Watch', label: 'PLANNING', color: 'var(--text-dim)' },
  { id: 'On Hold', label: 'ON HOLD', color: 'var(--warning)' },
  { id: 'Dropped', label: 'DROPPED', color: 'var(--danger)' },
];

function DiscoverContent(): JSX.Element {
  const auth = useContext(AuthContext);
  const user = auth?.user;
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [mounted, setMounted] = useState<boolean>(false);
  const [query, setQuery] = useState<string>(searchParams.get('q') || '');
  const [mode, setMode] = useState<'top' | 'search' | 'foryou' | 'score'>(searchParams.get('q') ? 'search' : 'top');
  const [genre, setGenre] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [showGenreMenu, setShowGenreMenu] = useState<boolean>(false);
  const [activeQuickId, setActiveQuickId] = useState<number | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { data: animeData, isPending: loading, isError, error } = useDiscoverAnime(mode, query, genre, page, user);
  const results = animeData?.data || [];

  const { mutate: saveToCollection } = useSaveToCollection();

  const handleQuickSave = (anime: AnimeResult, status: string) => {
    if (!user) return;
    saveToCollection({
      username: user,
      anime_id: anime.mal_id,
      title: anime.title,
      image_url: anime.images.jpg.large_image_url || anime.images.jpg.image_url,
      status: status,
      score: 0,
      episodes: anime.episodes || 0,
      genres: '',
      idMal: anime.mal_id
    }, {
      onSuccess: () => setActiveQuickId(null)
    });
  };

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) {
      setQuery(q);
      setMode('search');
    }
  }, [searchParams]);

  if (!mounted) return <div className={styles.skeletonCard} />;

  return (
    <div className="animate-fade-in">
      <motion.header
        variants={scrollRevealVariants}
        initial="hidden"
        animate="visible"
        className={`${styles.header} rds-hatch`}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 className={styles.title}>
            RONINHUB // NEURAL DISCOVERY // GLOBAL SECTOR ACTIVE
          </h1>
          <div style={{ fontSize: '10px', color: 'var(--spec-val-color)', display: 'flex', alignItems: 'center', gap: '12px', fontFamily: 'var(--font-mono)' }}>
            <span style={{ opacity: 0.6 }}>NODES_LOADED // {results.length.toString().padStart(3, '0')}</span>
            <div style={{ width: '1px', height: '10px', background: 'var(--hud-footer-border)' }} />
            SYS: <span style={{ color: 'var(--spec-val-color)', marginLeft: '4px', fontWeight: 800 }}>NOMINAL</span>
            <div style={{ marginLeft: '8px', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--spec-val-color)', boxShadow: '0 0 8px var(--spec-val-color)' }} />
          </div>
        </div>

        <motion.div variants={scrollRevealVariants} className={styles.discoveryBar}>
          <div className={styles.linearSearchWrapper}>
            <span className={styles.categoryLabel}>SEARCH//</span>
            <input
              type="text"
              className={styles.linearInput}
              placeholder="NEURAL_UPLINK_READY..."
              value={query}
              onChange={e => { setQuery(e.target.value); setMode('search'); setPage(1); }}
            />
          </div>

          <div className={styles.separator} />

          <span className={styles.categoryLabel}>MODE//</span>
          <div className={styles.hubActions} style={{ display: 'flex', gap: '8px' }}>
            <button className={`${styles.chip} ${mode === 'top' ? styles.chipActive : ''}`} onClick={() => { setMode('top'); setQuery(''); setPage(1); }}>
              <TrendingUp size={12} /> TRENDING
            </button>
            <button className={`${styles.chip} ${mode === 'score' ? styles.chipActive : ''}`} onClick={() => { setMode('score'); setQuery(''); setPage(1); }}>
              <Filter size={12} /> TOP RATED
            </button>
            {user && (
              <button className={`${styles.chip} ${mode === 'foryou' ? styles.chipActive : ''}`} onClick={() => { setMode('foryou'); setQuery(''); setPage(1); }}>
                <Sparkles size={12} /> FOR YOU
              </button>
            )}
          </div>

          <div className={styles.separator} />

          <div className="rds-select-wrapper">
            <span className={styles.categoryLabel} style={{ marginRight: '12px' }}>SECTOR//</span>
            <div style={{ position: 'relative' }}>
              <button 
                className={`rds-select-toggle ${genre ? 'rds-select-toggle-active' : ''}`}
                onClick={() => setShowGenreMenu(!showGenreMenu)}
              >
                {genre ? genre.toUpperCase() : 'ALL_SECTORS'}
                <ChevronDown size={14} style={{ marginLeft: 'auto' }} />
              </button>
              <AnimatePresence>
                {showGenreMenu && (
                  <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }} className="rds-select-menu">
                    <button className="rds-select-item" onClick={() => { setGenre(''); setPage(1); setShowGenreMenu(false); }}>ALL SECTORS</button>
                    {GENRES.map(g => (
                      <button key={g.id} className="rds-select-item" onClick={() => { setGenre(g.name); setPage(1); setShowGenreMenu(false); }}>{g.name.toUpperCase()}</button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </motion.header>

      <motion.div className={styles.resultsGrid} variants={seasonalGridVariants} initial="hidden" animate="visible">
        {loading ? (
          <SkeletonHUD />
        ) : results.length > 0 ? (
          results.map((anime, idx) => (
            <div key={anime.mal_id} className={styles.cardWrapper}>
              <DataPacket
                {...anime}
                id={anime.mal_id}
                title={{ romaji: anime.title, english: anime.title_english || anime.title, native: anime.title }}
                coverImage={{ large: anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url || '', medium: anime.images?.jpg?.image_url || '', extraLarge: anime.images?.jpg?.large_image_url || '', color: '#3db4f2' }}
                averageScore={anime.score ? (anime.score * 10) : null}
                episodes={anime.episodes ?? null}
                format={(anime.type?.toUpperCase() as AnimeFormat) || 'TV'}
                status={(anime.status === 'Finished Airing' ? 'FINISHED' : 'RELEASING') as AnimeStatus}
                genres={anime.genres?.map(g => g.name) || []}
                index={idx}
                onSelect={() => router.push(`/anime/${anime.mal_id}`)}
                showSpecs={false}
              >
                <div className={`${styles.quickAction} ${activeQuickId === anime.mal_id ? styles.quickActionVisible : ''}`} onClick={e => e.stopPropagation()}>
                  <button className={styles.quickActionBtn} onClick={() => setActiveQuickId(activeQuickId === anime.mal_id ? null : anime.mal_id)}>
                    {activeQuickId === anime.mal_id ? <X size={14} /> : <Plus size={14} />}
                  </button>
                  <AnimatePresence>
                    {activeQuickId === anime.mal_id && (
                      <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className={styles.quickDropdown}>
                        {QUICK_STATUS.map(status => (
                          <button key={status.id} className={styles.dropdownItem} onClick={() => handleQuickSave(anime, status.id)}>
                            <span>{status.label}</span>
                            <div className={styles.dropdownItemIcon} style={{ background: status.color }} />
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </DataPacket>
            </div>
          ))
        ) : (
          <div style={{ gridColumn: 'span 6', padding: '100px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
            NO_INTEL_DETECTED_IN_THIS_SECTOR //
          </div>
        )}
      </motion.div>

      {!loading && results.length > 0 && (
        <div className={styles.pagination}>
          <Button variant="secondary" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} icon={<ChevronLeft size={18} />}>
            PREV_SECTOR //
          </Button>
          <span className={styles.pageIndicator}>PAGE_INDICATOR // {page.toString().padStart(2, '0')}</span>
          <Button variant="secondary" onClick={() => setPage(p => p + 1)} icon={<ChevronRight size={18} />}>
            NEXT_SECTOR //
          </Button>
        </div>
      )}
    </div>
  );
}

export default function DiscoverPage(): JSX.Element {
  return (
    <Suspense fallback={<div className={styles.loadingState}>INITIALIZING NEURAL DISCOVERY...</div>}>
      <DiscoverContent />
    </Suspense>
  );
}
