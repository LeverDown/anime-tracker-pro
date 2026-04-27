"use client";
import React, { useState, useEffect, useContext, Suspense, JSX } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, TrendingUp, Sparkles, 
  ChevronLeft, ChevronRight, Play, 
  Plus, Check, Bookmark, Clock, X, Filter, ChevronDown
} from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import api from '../../api/client';
import { AuthContext } from '../AuthContext';
import { Button, MediaCard, Input, Card } from '../../components/UI';
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

interface AnimeResult {
  mal_id: number;
  title: string;
  images: {
    jpg: {
      image_url: string;
      large_image_url: string;
    }
  };
  type?: string;
  score?: number;
  synopsis?: string;
}

/**
 * DiscoverContent Protocol — v2.1 (Polymorphic MediaCard Integration)
 * Standardizes the discovery sector with the platform-wide MediaCard architecture.
 */
function DiscoverContent(): JSX.Element {
  const auth = useContext(AuthContext);
  const user = auth?.user;
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [mounted, setMounted] = useState<boolean>(false);
  const [query, setQuery] = useState<string>('');
  const [mode, setMode] = useState<'top' | 'search' | 'foryou'>(searchParams.get('q') ? 'search' : 'top');
  const [results, setResults] = useState<AnimeResult[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [genre, setGenre] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [activeQuickId, setActiveQuickId] = useState<number | null>(null);
  const [showGenreMenu, setShowGenreMenu] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) {
      setQuery(q);
      setMode('search');
    }
  }, [searchParams]);

  useEffect(() => {
    if (!mounted) return;
    
    let isMounted = true;
    const fetchAnimes = async () => {
      setLoading(true);
      try {
        let res;
        const validPage = isNaN(page) || page < 1 ? 1 : page;
        
        if (mode === 'search' && query) {
          res = await api.get('/anime/discover', { params: { query, page: validPage, genre } });
        } else if (mode === 'foryou' && user) {
          res = await api.get('/anime/recommendations', { params: { username: user } });
        } else {
          res = await api.get('/anime/top', { params: { page: validPage, genre } });
        }
        
        if (isMounted) {
          setResults(res.data.data || []);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) setLoading(false);
      }
    };
    fetchAnimes();
    return () => { isMounted = false; };
  }, [mode, query, genre, page, user, mounted]);

  const handleQuickSave = async (anime: AnimeResult, status: string) => {
    if (!user) return;
    try {
      await api.post('/collection', {
        username: user,
        anime_id: anime.mal_id,
        title: anime.title,
        image_url: anime.images.jpg.large_image_url || anime.images.jpg.image_url,
        status: status,
        score: 0,
        episodes: 0,
        genres: '',
        idMal: anime.mal_id
      });
      setActiveQuickId(null);
    } catch (err) {
      console.error("Quick save failed", err);
    }
  };

  if (!mounted) return <div className={styles.skeletonCard} />;

  return (
    <div className="animate-fade-in">
      <header className={styles.header}>
        <motion.h1 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className={styles.title}
        >
          <span className={styles.titlePrefix}>{"//"}</span> DISCOVER
        </motion.h1>

        <Card className={styles.searchHub} hover={false}>
          <div className={styles.searchHubHeader}>
            <h2 className={styles.searchHubTitle}>Search Anime</h2>
            <div className={styles.searchHubDivider} />
          </div>

          <div className={styles.searchHubContent}>
            <div className={styles.searchInputWrapper}>
              <Input 
                icon={<Search size={18} />}
                placeholder="Search the neural network..."
                value={query}
                onChange={e => { setQuery(e.target.value); setMode('search'); setPage(1); }}
              />
            </div>

            <div className={styles.hubActions}>
              <Button 
                variant={mode === 'top' ? 'primary' : 'secondary'}
                onClick={() => { setMode('top'); setQuery(''); setPage(1); }}
                icon={<TrendingUp size={16} />}
              >
                TRENDING
              </Button>
              {user && (
                <Button 
                  variant={mode === 'foryou' ? 'primary' : 'secondary'}
                  onClick={() => { setMode('foryou'); setQuery(''); setPage(1); }}
                  icon={<Sparkles size={16} />}
                >
                  FOR YOU
                </Button>
              )}
              
              <div className="rds-select-wrapper">
                <button 
                  className="rds-select-toggle"
                  onClick={() => setShowGenreMenu(!showGenreMenu)}
                >
                  <Filter size={14} color="var(--primary-color)" />
                  {genre ? GENRES.find(g => g.id.toString() === genre)?.name : 'ALL GENRES'}
                  <ChevronDown size={14} style={{ marginLeft: 'auto', transform: showGenreMenu ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
                </button>

                <AnimatePresence>
                  {showGenreMenu && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="rds-select-menu"
                    >
                      <button 
                        className={`rds-select-item ${genre === '' ? 'rds-select-item-active' : ''}`}
                        onClick={() => { setGenre(''); setPage(1); setShowGenreMenu(false); }}
                      >
                        ALL GENRES
                      </button>
                      {GENRES.map(g => (
                        <button 
                          key={g.id} 
                          className={`rds-select-item ${genre === g.id.toString() ? 'rds-select-item-active' : ''}`}
                          onClick={() => { setGenre(g.id.toString()); setPage(1); setShowGenreMenu(false); }}
                        >
                          {g.name.toUpperCase()}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </Card>
      </header>

      <div className={styles.resultsGrid}>
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className={styles.skeletonCard} />
          ))
        ) : (
          results.map((anime, i) => (
            <motion.div
              key={anime.mal_id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={styles.cardWrapper}
            >
              <MediaCard
                layout="vertical"
                title={anime.title}
                imageUrl={anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url}
                score={anime.score ? Math.round(anime.score * 10) : undefined}
                synopsis={anime.synopsis}
                onClick={() => router.push(`/anime/${anime.mal_id}`)}
              >
                {/* Tactical Quick Action Overlay */}
                <div className={`${styles.quickAction} ${activeQuickId === anime.mal_id ? styles.quickActionVisible : ''}`} onClick={e => e.stopPropagation()}>
                  <button 
                    className={styles.quickActionBtn}
                    onClick={() => setActiveQuickId(activeQuickId === anime.mal_id ? null : anime.mal_id)}
                  >
                    {activeQuickId === anime.mal_id ? <X size={14} /> : <Plus size={14} />}
                  </button>
                  
                  <AnimatePresence>
                    {activeQuickId === anime.mal_id && (
                      <motion.div 
                        initial={{ x: -160, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -160, opacity: 0 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className={styles.quickDropdown}
                      >
                        {QUICK_STATUS.map(status => (
                          <button 
                            key={status.id}
                            className={styles.dropdownItem}
                            onClick={() => handleQuickSave(anime, status.id)}
                          >
                            <span>{status.label}</span>
                            <div className={styles.dropdownItemIcon} style={{ background: status.color, boxShadow: `0 0 8px ${status.color}` }} />
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </MediaCard>
            </motion.div>
          ))
        )}
      </div>

      {!loading && results.length > 0 && mode !== 'foryou' && (
        <div className={styles.pagination}>
          <Button 
            variant="secondary"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            icon={<ChevronLeft size={18} />}
          >
            PREV
          </Button>
          <span className={styles.pageIndicator}>PAGE {page}</span>
          <Button 
            variant="secondary"
            onClick={() => setPage(p => p + 1)}
            icon={<ChevronRight size={18} />}
          >
            NEXT
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
