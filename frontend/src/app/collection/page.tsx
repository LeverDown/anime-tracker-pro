"use client";
import React, { useState, useEffect, useContext, JSX, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PlayCircle, CheckCircle, Clock, 
  XCircle, Search, ChevronRight,
  TrendingUp, BarChart3, Filter,
  Layers, ChevronUp, ChevronDown, Dices
} from 'lucide-react';
import { AuthContext } from '../AuthContext';
import api from '../../api/client';
import { useRouter } from 'next/navigation';
import { Button, MediaCard, Input } from '../../components/UI';
import styles from './collection.module.css';

/* eslint-disable @next/next/no-img-element */

interface CollectionItem {
  anime_id: number;
  title: string;
  image_url: string;
  status: string;
  score: number;
  episodes: number;
  progress: number;
  genres: string;
  series_name?: string;
  seasons_json?: string;
}

const STATUS_MAP = [
  { id: 'Watching', label: 'WATCHING', icon: <PlayCircle size={16} />, color: 'var(--primary-color)' },
  { id: 'Completed', label: 'COMPLETED', icon: <CheckCircle size={16} />, color: 'var(--accent-cyan)' },
  { id: 'On Hold', label: 'ON HOLD', icon: <Clock size={16} />, color: '#fbbf24' },
  { id: 'Dropped', label: 'DROPPED', icon: <XCircle size={16} />, color: '#ef4444' },
  { id: 'Plan to Watch', label: 'PLAN TO WATCH', icon: <Clock size={16} />, color: 'var(--text-dim)' },
];

/**
 * CollectionPage Protocol — v5.1 (Polymorphic MediaCard)
 * Standardizes the archive sector with the platform-wide MediaCard architecture.
 */
export default function CollectionPage(): JSX.Element {
  const auth = useContext(AuthContext);
  const user = auth?.user;
  const router = useRouter();
  
  const [mounted, setMounted] = useState<boolean>(false);
  const [collection, setCollection] = useState<CollectionItem[]>([]);
  const [activeTab, setActiveTab] = useState<string>('Watching');
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [expandedStack, setExpandedStack] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!user || !mounted) return;
    
    setLoading(true);
    api.get('/collection', { params: { username: user } })
      .then(r => {
        setCollection(r.data.data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user, mounted]);

  const handleProgressUpdate = async (animeId: number, newProgress: number) => {
    const item = collection.find(i => i.anime_id === animeId);
    if (!item) return;

    // Optimistic Update
    setCollection(prev => prev.map(i => i.anime_id === animeId ? { ...i, progress: newProgress } : i));

    try {
      await api.post('/collection/progress', {
        username: user,
        anime_id: animeId,
        episode_progress: newProgress,
        seasons_json: item.seasons_json // Keep existing seasons_json
      });
    } catch (err) {
      console.error("Failed to update progress:", err);
      // Rollback on error? Maybe not needed for a slider.
    }
  };

  const counts = useMemo(() => {
    return STATUS_MAP.reduce((acc, tab) => {
      acc[tab.id] = collection.filter(item => item.status?.toLowerCase() === tab.id.toLowerCase()).length;
      return acc;
    }, {} as Record<string, number>);
  }, [collection]);

  const grouped = useMemo(() => {
    const filtered = collection
      .filter(item => item.status?.toLowerCase() === activeTab?.toLowerCase())
      .filter(item => item.title.toLowerCase().includes(search.toLowerCase()));

    const ALIAS_MAP: Record<string, string> = {
      'SHINGEKI NO KYOJIN': 'ATTACK ON TANTAN', // User specifically mentioned this
      'ATTACK ON TITAN': 'ATTACK ON TITAN',
      'KIMETSU NO YAIBA': 'DEMON SLAYER',
      'DEMON SLAYER': 'DEMON SLAYER',
      'BOKU NO HERO ACADEMIA': 'MY HERO ACADEMIA',
      'MY HERO ACADEMIA': 'MY HERO ACADEMIA',
      'JUJUTSU KAISEN': 'JUJUTSU KAISEN',
      'ONE PUNCH MAN': 'ONE PUNCH MAN',
      'NANATSU NO TAIZAI': 'THE SEVEN DEADLY SINS',
      'THE SEVEN DEADLY SINS': 'THE SEVEN DEADLY SINS',
      'SHIGATSU WA KIMI NO USO': 'YOUR LIE IN APRIL',
      'YOUR LIE IN APRIL': 'YOUR LIE IN APRIL',
      'KOE NO KATACHI': 'A SILENT VOICE',
      'A SILENT VOICE': 'A SILENT VOICE',
      'KIMI NO NA WA.': 'YOUR NAME.',
      'YOUR NAME.': 'YOUR NAME.',
      'RE:ZERO KARA HAJIMERU ISEKAI SEIKATSU': 'RE:ZERO',
      'RE:ZERO': 'RE:ZERO',
    };

    return filtered.reduce((acc: Record<string, CollectionItem[]>, item) => {
      let key = item.series_name;
      if (!key) {
        // Advanced splitting: handles "2nd Season", "Part 2", "Movie", etc.
        const cleanTitle = item.title.toUpperCase()
          .replace(/\s+SEASON\s+\d+/g, '')
          .replace(/\s+\d+(ST|ND|RD|TH)?\s+SEASON/g, '')
          .replace(/\s+PART\s+\d+/g, '')
          .replace(/\s+STAGE/g, '')
          .replace(/\s+ARC/g, '')
          .replace(/\s+MOVIE/g, '')
          .replace(/\s+OAD/g, '')
          .replace(/\s+OVA/g, '')
          .replace(/\s+SPECIALS?/g, '');
        
        const titleParts = cleanTitle.split(/[:\-(]/);
        key = titleParts[0].trim();

        // Check for aliases
        if (ALIAS_MAP[key]) {
          key = ALIAS_MAP[key];
        }

        // Hardcoded group overrides
        if (key.includes("JOJO")) key = "JOJO'S BIZARRE ADVENTURE";
        else if (key.includes("FATE/")) key = "FATE FRANCHISE";
        else if (key.includes("MONOGATARI")) key = "MONOGATARI SERIES";
        else if (key.includes("HIGH SCHOOL DXD")) key = "HIGH SCHOOL DXD";
        else if (key.includes("SWORD ART ONLINE")) key = "SWORD ART ONLINE";
        else if (key.includes("GIRLS UND PANZER")) key = "GIRLS UND PANZER";
      }

      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});
  }, [collection, activeTab, search]);

  const activeTabIndex = STATUS_MAP.findIndex(t => t.id === activeTab);

  if (!mounted) return <div className={styles.skeletonCard} />;
  if (!user) return <div className={styles.emptyState}><p className={styles.emptyText}>PLEASE INITIALIZE SESSION TO VIEW COLLECTION.</p></div>;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.topRow}>
          <motion.h1 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className={styles.title}
          >
            <span className={styles.titlePrefix}>{"//"}</span> MY COLLECTION
          </motion.h1>
          
          <div className={styles.actionGroup}>
            {activeTab === 'Plan to Watch' && (
              <Button 
                variant="primary" 
                onClick={() => router.push('/backlog')} 
                icon={<Dices size={18} />}
                className={styles.rouletteButton}
              >
                ROULETTE
              </Button>
            )}
            <Button variant="secondary" onClick={() => router.push('/stats')} icon={<BarChart3 size={18} />}>STATS</Button>
            <Button variant="secondary" icon={<TrendingUp size={18} />}>IMPORT</Button>
          </div>
        </div>

        <div className={styles.filterCard}>
          <div className={styles.statusList}>
            <div 
              className={styles.tabHighlight}
              style={{ 
                width: `calc((100% - ${4 * 2}px) / 5)`, 
                left: `calc(${activeTabIndex} * ((100% - ${4 * 2}px) / 5) + ${activeTabIndex * 2}px)`,
                background: STATUS_MAP[activeTabIndex]?.color,
                boxShadow: `0 0 20px ${STATUS_MAP[activeTabIndex]?.color}44`
              }}
            />

            {STATUS_MAP.map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`${styles.statusButton} ${isActive ? styles.statusButtonActive : ''}`}
                >
                  <span className={styles.statusButtonIcon}>{tab.icon}</span>
                  {tab.label}
                  <span className={styles.countBadge}>{counts[tab.id] || 0}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className={styles.searchRow}>
          <div className={styles.searchInputWrapper}>
            <Input 
              icon={<Search size={18} />}
              placeholder="Search neural archive..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <Button variant="tactical" icon={<Filter size={18} />}>FILTERS</Button>
        </div>
      </header>

      {loading ? (
        <div className={styles.collectionGrid}>
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className={styles.skeletonCard} />)}
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className={styles.emptyState}>
          <p className={styles.emptyText}>NO_INTEL_DETECTED_IN_THIS_SECTOR.</p>
        </div>
      ) : (
        <div className={styles.collectionGrid}>
          {Object.entries(grouped).map(([series, items], idx) => {
            const latest = items[items.length - 1];
            const isExpanded = expandedStack === series;

            const totalProg = items.reduce((sum, item) => sum + (item.progress || 0), 0);
            const totalEpsCount = items.reduce((sum, item) => sum + (item.episodes || 0), 0);
            const progressPercent = Math.min(100, (totalProg / (totalEpsCount || 1)) * 100);

            return (
              <motion.div
                key={series}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
                className={styles.stackWrapper}
              >
                {items.length > 1 && (
                  <>
                    <div className={styles.stackLayerDouble} />
                    <div className={styles.stackLayer} />
                  </>
                )}
                
                <MediaCard
                  layout="vertical"
                  title={series}
                  imageUrl={latest.image_url}
                  onClick={() => !isExpanded && router.push(`/anime/${latest.anime_id}`)}
                  className={styles.seriesCard}
                  overflow="visible"
                  showDefaultOverlay={false}
                >
                  <div className={styles.collectionOverlay}>
                    <div className={styles.seriesTitle}>{series}</div>
                    <div className={styles.cardMetadata}>
                      <span className={styles.progressLabel}>
                        {activeTab === 'Completed' ? 'ARCHIVED // ' : 
                         activeTab === 'Watching' ? 'TRACKING // ' :
                         activeTab === 'On Hold' ? 'STALLED // ' :
                         activeTab === 'Dropped' ? 'SCRAPPED // ' :
                         activeTab === 'Plan to Watch' ? 'PLANNED // ' : ''}
                        {totalProg}/{totalEpsCount} EP
                      </span>
                      {items.length > 1 && (
                        <span 
                          className={styles.stackIndicator}
                          onClick={(e) => { e.stopPropagation(); setExpandedStack(isExpanded ? null : series); }}
                        >
                          <Layers size={10} /> 
                          {items.length} SEASONS
                          {isExpanded ? <ChevronDown size={10} /> : <ChevronUp size={10} />}
                        </span>
                      )}
                    </div>

                    {activeTab !== 'Plan to Watch' && items.length === 1 && (
                      <div className={styles.sliderContainer} onClick={(e) => e.stopPropagation()}>
                        <input 
                          type="range" 
                          min="0" 
                          max={latest.episodes || 12} 
                          value={latest.progress}
                          onChange={(e) => handleProgressUpdate(latest.anime_id, parseInt(e.target.value))}
                          className={styles.episodeSlider}
                        />
                      </div>
                    )}
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className={styles.stackDropdown}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className={styles.dropdownHeader}>
                          <span className={styles.dropdownTitle}>SELECT SECTOR // ARCHIVE</span>
                          <button 
                            className={styles.closeDropdown}
                            onClick={() => setExpandedStack(null)}
                          >
                            <XCircle size={14} />
                          </button>
                        </div>
                        {items.map((item) => (
                          <div 
                            key={item.anime_id}
                            className={styles.dropdownItem}
                            onClick={() => router.push(`/anime/${item.anime_id}`)}
                          >
                            <span className={styles.dropdownItemTitle}>{item.title}</span>
                            <span className={styles.dropdownItemProgress}>
                              {activeTab === 'Completed' ? item.episodes : item.progress}/{item.episodes || '?'}
                            </span>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className={styles.progressBar}>
                    <div 
                      className={styles.progressFill} 
                      style={{ 
                        width: `${progressPercent}%`,
                        background: activeTab === 'Completed' ? 'var(--accent-cyan)' : 'var(--primary-color)'
                      }} 
                    />
                  </div>
                </MediaCard>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
