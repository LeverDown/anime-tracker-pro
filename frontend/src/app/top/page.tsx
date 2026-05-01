"use client";
import { useState, useEffect, Suspense } from 'react';
import { Trophy, ChevronLeft, ChevronRight, Filter, ChevronDown, Activity, Target, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import api from '../../api/client';
import { Button } from '../../components/UI';
import { DataPacket } from '../../components/UI/DataPacket/DataPacket';
import styles from './top.module.css';

const GENRES = [
  { id: 1, name: 'Action' }, { id: 2, name: 'Adventure' }, { id: 4, name: 'Comedy' },
  { id: 8, name: 'Drama' }, { id: 10, name: 'Fantasy' }, { id: 22, name: 'Romance' },
  { id: 24, name: 'Sci-Fi' }, { id: 36, name: 'Slice of Life' }, { id: 37, name: 'Supernatural' }
];

function TopContent() {
  const router = useRouter();
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [genre, setGenre] = useState('');
  const [year, setYear] = useState<number | ''>('');
  const [page, setPage] = useState(1);
  const [showGenreMenu, setShowGenreMenu] = useState(false);
  const [showYearMenu, setShowYearMenu] = useState(false);

  const currentYear = new Date().getFullYear();
  const YEARS = Array.from({ length: currentYear - 1940 + 1 }, (_, i) => currentYear - i);

  useEffect(() => {
    let isMounted = true;
    const fetchTop = async () => {
      setLoading(true);
      try {
        const validPage = isNaN(page) || page < 1 ? 1 : page;
        const params: any = { page: validPage };
        if (genre) params.genre = genre;
        if (year) params.year = year;
        
        const res = await api.get('/anime/top', { params });
        if (isMounted) {
          setResults(res.data.data || []);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) setLoading(false);
      }
    };
    fetchTop();
    return () => { isMounted = false; };
  }, [genre, page, year]);

  return (
    <div className={`${styles.container} rds-hatch`}>
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <h1 className={styles.title}>
            <span style={{ color: 'var(--primary-color)' }}>//</span> ELITE 100
          </h1>
          <div className={styles.sectorInfo}>
            <span><Activity size={14} color="var(--primary-color)" /> SYS // GLOBAL_RANKINGS</span>
            <span><Target size={14} /> SECTOR // ELITE_CORE</span>
          </div>
        </div>

        <div className={styles.controls}>
          <div className="rds-select-wrapper" style={{ marginRight: '16px' }}>
             <span style={{ fontSize: '10px', color: 'var(--text-dark)', fontWeight: 900, fontFamily: 'var(--font-mono)', marginRight: '12px' }}>YEAR //</span>
            <div style={{ position: 'relative' }}>
              <button 
                className={`rds-select-toggle ${year ? 'rds-select-toggle-active' : ''}`}
                onClick={() => setShowYearMenu(!showYearMenu)}
                style={{ minWidth: '140px', borderRadius: 0, height: '32px' }}
              >
                {!year && <Calendar size={14} color="var(--primary-color)" />}
                {year ? year : 'ALL_TIME'}
                <ChevronDown size={14} style={{ marginLeft: 'auto', transform: showYearMenu ? 'rotate(180deg)' : 'none', transition: '0.2s', opacity: 0.6 }} />
              </button>

              <AnimatePresence>
                {showYearMenu && (
                  <motion.div 
                    initial={{ opacity: 0, y: 5, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 5, scale: 0.98 }}
                    className="rds-select-menu"
                    style={{ borderRadius: 0, top: 'calc(100% + 4px)', width: '100%', maxHeight: '300px', overflowY: 'auto' }}
                  >
                    <button 
                      className={`rds-select-item ${year === '' ? 'rds-select-item-active' : ''}`}
                      onClick={() => { setYear(''); setPage(1); setShowYearMenu(false); }}
                      style={{ borderRadius: 0 }}
                    >
                      ALL TIME
                    </button>
                    {YEARS.map(y => (
                      <button 
                        key={y} 
                        className={`rds-select-item ${year === y ? 'rds-select-item-active' : ''}`}
                        onClick={() => { setYear(y); setPage(1); setShowYearMenu(false); }}
                        style={{ borderRadius: 0 }}
                      >
                        {y}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
          
          <div className="rds-select-wrapper">
             <span style={{ fontSize: '10px', color: 'var(--text-dark)', fontWeight: 900, fontFamily: 'var(--font-mono)', marginRight: '12px' }}>GENRE //</span>
            <div style={{ position: 'relative' }}>
              <button 
                className={`rds-select-toggle ${genre ? 'rds-select-toggle-active' : ''}`}
                onClick={() => setShowGenreMenu(!showGenreMenu)}
                style={{ minWidth: '180px', borderRadius: 0, height: '32px' }}
              >
                {!genre && <Filter size={14} color="var(--primary-color)" />}
                {genre ? genre.toUpperCase() : 'ALL_GENRES'}
                <ChevronDown size={14} style={{ marginLeft: 'auto', transform: showGenreMenu ? 'rotate(180deg)' : 'none', transition: '0.2s', opacity: 0.6 }} />
              </button>

              <AnimatePresence>
                {showGenreMenu && (
                  <motion.div 
                    initial={{ opacity: 0, y: 5, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 5, scale: 0.98 }}
                    className="rds-select-menu"
                    style={{ borderRadius: 0, top: 'calc(100% + 4px)', width: '100%' }}
                  >
                    <button 
                      className={`rds-select-item ${genre === '' ? 'rds-select-item-active' : ''}`}
                      onClick={() => { setGenre(''); setPage(1); setShowGenreMenu(false); }}
                      style={{ borderRadius: 0 }}
                    >
                      ALL GENRES
                    </button>
                    {GENRES.map(g => (
                      <button 
                        key={g.id} 
                        className={`rds-select-item ${genre === g.name ? 'rds-select-item-active' : ''}`}
                        onClick={() => { setGenre(g.name); setPage(1); setShowGenreMenu(false); }}
                        style={{ borderRadius: 0 }}
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
      </header>

      <motion.div 
        className={styles.resultsGrid}
        initial="hidden"
        animate="visible"
        variants={{
          visible: { transition: { staggerChildren: 0.05 } }
        }}
      >
        {loading ? (
          Array.from({ length: 12 }).map((_, i) => (
            <div key={i} style={{ height: '380px', background: 'var(--hud-topbar-bg)', border: '1px solid var(--hud-footer-border)', opacity: 0.3 }} />
          ))
        ) : (
          results.map((anime, i) => (
            <div key={anime.mal_id} style={{ position: 'relative' }}>
              <div className={styles.rankBadge}>
                #{ (page - 1) * 50 + i + 1 }
              </div>
              <DataPacket
                {...anime}
                id={anime.mal_id}
                title={{ romaji: anime.title, english: anime.title_english || anime.title }}
                coverImage={{ large: anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url, medium: anime.images?.jpg?.image_url, extraLarge: anime.images?.jpg?.large_image_url, color: '#3db4f2' }}
                averageScore={anime.score ? (anime.score * 10) : null}
                episodes={anime.episodes ?? null}
                status={anime.status || 'FINISHED'}
                format={anime.type || 'TV'}
                index={i}
                showSpecs={false}
                onSelect={() => router.push(`/anime/${anime.mal_id}`)}
              />
            </div>
          ))
        )}
      </motion.div>

      {!loading && results.length > 0 && (
        <div className={styles.pagination}>
          <Button 
            variant="secondary"
            onClick={() => { setPage(p => Math.max(1, p - 1)); window.scrollTo(0, 0); }}
            disabled={page === 1}
            icon={<ChevronLeft size={18} />}
            style={{ borderRadius: 0, fontFamily: 'var(--font-mono)', fontWeight: 900, fontSize: '11px' }}
          >
            PREV_SECTOR
          </Button>
          <span className={styles.pageIndicator}>DECK_PAGE {page.toString().padStart(2, '0')}</span>
          <Button 
            variant="secondary"
            onClick={() => { setPage(p => p + 1); window.scrollTo(0, 0); }}
            icon={<ChevronRight size={18} />}
            style={{ borderRadius: 0, fontFamily: 'var(--font-mono)', fontWeight: 900, fontSize: '11px' }}
          >
            NEXT_SECTOR
          </Button>
        </div>
      )}
    </div>
  );
}

export default function TopPage() {
  return (
    <Suspense fallback={<div className={styles.loadingState}>SYNCHRONIZING GLOBAL DATA...</div>}>
      <TopContent />
    </Suspense>
  );
}
