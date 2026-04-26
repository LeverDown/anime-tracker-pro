"use client";
import React, { useState, useEffect, useContext, useRef, JSX, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import api from '../../../api/client';
import { AuthContext } from '../../AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Star, Film, Users, Award,
  ChevronDown, Filter
} from 'lucide-react';
import { Button, Card } from '../../../components/UI';
import { Anime } from '../../../types/anime';
import styles from './anime-detail.module.css';

/* eslint-disable @next/next/no-img-element */
/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */

interface StatusDropdownProps {
  value: string;
  onChange: (val: string) => void;
}

function StatusDropdown({ value, onChange }: StatusDropdownProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const options = ['Watching', 'Completed', 'Plan to Watch', 'On Hold', 'Dropped'];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={styles.statusBadge}
        style={{ width: '100%', padding: 'var(--space-4)', justifyContent: 'space-between', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Filter size={18} color="var(--primary-color)" />
          {value ? value.toUpperCase() : 'SELECT STATUS'}
        </div>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }}>
          <ChevronDown size={20} />
        </motion.div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="glass-panel"
            style={{ 
              position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0,
              padding: '10px', zIndex: 1000
            }}
          >
            {options.map(opt => (
              <div 
                key={opt}
                onClick={() => { onChange(opt); setIsOpen(false); }}
                style={{ 
                  padding: '14px 20px', borderRadius: '14px', fontSize: '0.85rem', fontWeight: 800,
                  color: value === opt ? 'var(--primary-color)' : 'var(--text-main)',
                  background: value === opt ? 'rgba(255,255,255,0.05)' : 'transparent',
                  cursor: 'pointer', transition: '0.2s', display: 'flex', alignItems: 'center', gap: '0.75rem'
                }}
              >
                {value === opt && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary-color)', boxShadow: '0 0 10px var(--primary-color)' }} />}
                {opt.toUpperCase()}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * AnimeDetailPage Protocol
 * Enforces strict typing, hydration safety, and RDS token synchronization.
 */
export default function AnimeDetailPage(): JSX.Element {
  const params = useParams();
  const id = params?.id;
  const auth = useContext(AuthContext);
  const user = auth?.user;
  
  const [mounted, setMounted] = useState<boolean>(false);
  const [anime, setAnime] = useState<Anime | null>(null);
  const [smartRelations, setSmartRelations] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saveStatus, setSaveStatus] = useState<string>('');
  const [toast, setToast] = useState<string>('');

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchDetails = useCallback(async (targetId: string): Promise<void> => {
    setLoading(true);
    try {
      const response = await fetch(`https://api.jikan.moe/v4/anime/${targetId}/full`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const mainData = await response.json();
      if (mainData.data) {
        const [charRes, staffRes] = await Promise.all([
          fetch(`https://api.jikan.moe/v4/anime/${targetId}/characters`),
          fetch(`https://api.jikan.moe/v4/anime/${targetId}/staff`)
        ]);
        const charData = await charRes.json();
        const staffData = await staffRes.json();
        
        setAnime({ 
          ...mainData.data, 
          characters: charData.data, 
          staff: staffData.data 
        });

        // Async fetch relations via internal API
        api.get('/anime/relations/smart', { params: { idMal: targetId } })
           .then(r => setSmartRelations(r.data.data || []))
           .catch(() => setSmartRelations([]));
      } else {
        setAnime(null);
      }
    } catch (err) {
      console.error("Anime fetch error", err);
      setAnime(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (id) fetchDetails(id as string);
  }, [id, fetchDetails]);

  const showToast = (msg: string): void => { 
    setToast(msg); 
    setTimeout(() => setToast(''), 3500); 
  };

  const handleSave = async (): Promise<void> => {
    if (!user || !saveStatus || !anime) return;
    try {
      await api.post('/collection', {
        username: user, 
        anime_id: anime.mal_id, 
        title: anime.title,
        image_url: anime.images.jpg.large_image_url || anime.images.jpg.image_url,
        status: saveStatus, 
        score: anime.score || 0, 
        episodes: anime.episodes || 0,
        genres: anime.genres?.map(g => g.name).join(', ') || '', 
        idMal: anime.mal_id,
      });
      showToast(`\u2705 [LOGGED] ${anime.title_english || anime.title} saved to ARCHIVE.`);
    } catch (err) {
      console.error("Save error", err);
      showToast("\u274C Failed to sync to Archive.");
    }
  };

  if (!mounted) return <div className={styles.loadingState} />;
  if (loading) return <div className={styles.loadingState}>UPLINKING TO DATABASE...</div>;
  if (!anime) return <div className={styles.errorState}>IDENTITY NOT FOUND.</div>;

  const characters = anime.characters?.slice(0, 8) || [];

  return (
    <div className={styles.container}>
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className={styles.toast}>
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <div className={styles.backdrop}>
        <img src={anime.images.jpg.large_image_url} alt="" className={styles.backdropImage} />
        <div className={styles.backdropOverlay} />
      </div>

      <div className={styles.mainLayout}>
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className={styles.posterSection}>
          <div className={`glass-panel ${styles.posterWrapper}`}>
            <img src={anime.images.jpg.large_image_url} alt={anime.title} className={styles.poster} />
          </div>
          
          {user && (
            <div className={styles.actionGroup}>
              <StatusDropdown value={saveStatus} onChange={setSaveStatus} />
              <Button 
                variant="primary"
                fullWidth
                glow={!!saveStatus}
                disabled={!saveStatus}
                onClick={handleSave}
                style={{ padding: 'var(--space-4)', fontWeight: 900 }}
              >
                SYNC TO ARCHIVE
              </Button>
            </div>
          )}
        </motion.div>

        <div className={styles.infoSection}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className={styles.badgeGroup}>
              <span className={styles.typeBadge}>{anime.type?.toUpperCase()}</span>
              <span className={styles.statusBadge}>{anime.status.toUpperCase()}</span>
            </div>
            <h1 className={styles.title}>
              {anime.title_english || anime.title}
            </h1>
            <p className={styles.nativeTitle}>{anime.title_japanese || anime.title}</p>

            <div className={styles.statsGrid}>
              {[
                { icon: Star, val: anime.score || '\u2014', label: 'SCORE', color: '#fbbf24' },
                { icon: Film, val: anime.episodes || '?', label: 'EPISODES', color: 'var(--primary-color)' },
                { icon: Users, val: (anime.members || 0).toLocaleString(), label: 'MEMBERS', color: '#06b6d4' },
                { icon: Award, val: anime.rank ? `#${anime.rank}` : '\u2014', label: 'RANKING', color: '#fff' },
              ].map((s) => (
                <Card key={s.label} className={styles.statCard}>
                  <s.icon size={16} color={s.color} style={{ marginBottom: '0.5rem' }} />
                  <div className={styles.statVal}>{s.val}</div>
                  <div className={styles.statLabel}>{s.label}</div>
                </Card>
              ))}
            </div>

            <div className={styles.genreGroup}>
              {anime.genres?.map((g) => (
                <span key={g.name} className={`glass-panel ${styles.genreBadge}`}>{g.name.toUpperCase()}</span>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      <div className={styles.contentGrid}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className={styles.synopsisSection}>
          <Card className="glass-panel" style={{ padding: 'var(--space-10)', marginBottom: 'var(--space-8)' }}>
            <h3 className={styles.cardHeader}>{"//"} SYNOPSIS</h3>
            <p className={styles.synopsisBody}>{anime.synopsis || 'No synopsis available.'}</p>
          </Card>

          <Card className="glass-panel" style={{ padding: 'var(--space-10)' }}>
            <h3 className={styles.cardHeader}>{"//"} KEY_PERSONNEL</h3>
            <div className={styles.staffGrid}>
              {characters.map((c) => {
                const jpv = c.voice_actors?.find((va: any) => va.language === 'Japanese');
                return (
                  <div key={c.character.mal_id} className={styles.personEntry}>
                    <div className={styles.personInfo}>
                      <img src={c.character.images?.jpg?.image_url} alt="" className={styles.charThumb} />
                      <div>
                        <div className={styles.charName}>{c.character.name.toUpperCase()}</div>
                        <div className={styles.charRole}>{c.role.toUpperCase()}</div>
                      </div>
                    </div>
                    
                    {jpv && (
                      <div className={styles.vaInfo}>
                        <div>
                          <div style={{ fontSize: '0.75rem', fontWeight: 800 }}>{jpv.person.name.toUpperCase()}</div>
                          <div style={{ fontSize: '0.6rem', color: 'var(--text-dark)', fontWeight: 800 }}>VA / JP</div>
                        </div>
                        <img src={jpv.person.images?.jpg?.image_url} alt="" className={styles.vaThumb} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className={styles.sideSection}>
          <Card className="glass-panel" style={{ padding: 'var(--space-8)', marginBottom: 'var(--space-8)' }}>
            <h3 className={styles.cardHeader}>SYSTEM_INFO</h3>
            <div className={styles.systemInfoList}>
              {[
                { label: 'STUDIO', val: anime.studios?.map(s => s.name).join(', ') || '\u2014' },
                { label: 'SOURCE', val: anime.source || '\u2014' },
                { label: 'SEASON', val: anime.season ? `${anime.season} ${anime.year}` : '\u2014' },
                { label: 'DURATION', val: anime.duration || '\u2014' },
              ].map(i => (
                <div key={i.label} className={styles.systemInfoItem}>
                  <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-dark)' }}>{i.label}</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800 }}>{i.val.toUpperCase()}</span>
                </div>
              ))}
            </div>
          </Card>

          {(smartRelations.length > 0 || (anime as any).relations?.length > 0) && (
            <Card className="glass-panel" style={{ padding: 'var(--space-8)' }}>
              <h3 className={styles.cardHeader}>RELATIONS</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {(smartRelations.length > 0 ? smartRelations : ((anime as any).relations?.flatMap((r: any) => r.entry.map((e: any) => ({ ...e, relation: r.relation }))) || []))
                  .filter((rel: any) => rel.type === 'anime' || !rel.type)
                  .slice(0, 8).map((rel: any, i: number) => (
                  <Link key={i} href={`/anime/${rel.idMal || rel.mal_id}`} className={styles.relationLink}>
                    <span style={{ fontSize: '0.6rem', color: 'var(--primary-color)', fontWeight: 800 }}>{rel.relation?.toUpperCase() || 'RELATED'}</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{(rel.title_english || rel.name || rel.title)?.toUpperCase()}</span>
                  </Link>
                ))}
              </div>
            </Card>
          )}
        </motion.div>
      </div>
    </div>
  );
}
