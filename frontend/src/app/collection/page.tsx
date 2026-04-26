"use client";
import React, { useState, useEffect, useContext, JSX, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PlayCircle, CheckCircle, Clock, 
  XCircle, Search, ChevronRight,
  TrendingUp, BarChart3, Filter,
  Layers, ChevronUp, ChevronDown
} from 'lucide-react';
import { AuthContext } from '../AuthContext';
import api from '../../api/client';
import { useRouter } from 'next/navigation';
import { Button, Card, Input } from '../../components/UI';
import styles from './collection.module.css';

/* eslint-disable @next/next/no-img-element */
/* eslint-disable react-hooks/set-state-in-effect */

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
}

const STATUS_MAP = [
  { id: 'Watching', label: 'WATCHING', icon: <PlayCircle size={16} />, color: 'var(--primary-color)' },
  { id: 'Completed', label: 'COMPLETED', icon: <CheckCircle size={16} />, color: 'var(--accent-cyan)' },
  { id: 'On Hold', label: 'ON HOLD', icon: <Clock size={16} />, color: '#fbbf24' },
  { id: 'Dropped', label: 'DROPPED', icon: <XCircle size={16} />, color: '#ef4444' },
  { id: 'Plan to Watch', label: 'PLANNING', icon: <Clock size={16} />, color: 'var(--text-dim)' },
];

/**
 * CollectionPage Protocol — v5.0 (Neural Segmented Controls)
 * Enforces high-fidelity navigation and real-time category counting.
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

    return filtered.reduce((acc: Record<string, CollectionItem[]>, item) => {
      let key = item.series_name;
      if (!key) {
        const titleParts = item.title.split(/[:\-(]|(?:\s+PART\s+)|(?:\s+SEASON\s+)|(?:\s+\d+(?:st|nd|rd|th)\s+STAGE)|(?:\s+ARC\s+)/i);
        key = titleParts[0].trim();
        const upperTitle = item.title.toUpperCase();
        if (upperTitle.includes("JOJO")) key = "JOJO'S BIZARRE ADVENTURE";
        else if (upperTitle.includes("FATE/")) key = "FATE FRANCHISE";
        else if (upperTitle.includes("MONOGATARI")) key = "MONOGATARI SERIES";
        else if (upperTitle.includes("HIGH SCHOOL DXD")) key = "HIGH SCHOOL DXD";
        else if (upperTitle.includes("SWORD ART ONLINE")) key = "SWORD ART ONLINE";
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
            <Button variant="secondary" onClick={() => router.push('/stats')} icon={<BarChart3 size={18} />}>STATS</Button>
            <Button variant="secondary" icon={<TrendingUp size={18} />}>IMPORT</Button>
          </div>
        </div>

        <div className={styles.filterCard}>
          <div className={styles.statusList}>
            {/* Sliding Highlight */}
            <div 
              className={styles.tabHighlight}
              style={{ 
                width: `calc((100% - ${4 * 2}px) / 5)`, // Adjust for gaps
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

            const totalEps = items.reduce((sum, item) => sum + (item.episodes || 0), 0);
            const totalProg = items.reduce((sum, item) => {
              return sum + (activeTab === 'Completed' ? (item.episodes || 0) : item.progress);
            }, 0);
            const progressPercent = Math.min(100, (totalProg / (totalEps || 1)) * 100);

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
                
                <Card 
                  className={styles.seriesCard}
                  onClick={() => !isExpanded && router.push(`/anime/${latest.anime_id}`)}
                >
                  <img src={latest.image_url} alt="" className={styles.poster} />
                  
                  <div className={styles.overlay}>
                    <h3 className={styles.seriesTitle}>{series}</h3>
                    
                    <div className={styles.cardMetadata}>
                      <span className={styles.progressLabel}>
                        {activeTab === 'Completed' ? 'ARCHIVED' : `${totalProg}/${totalEps} EP`}
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
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
