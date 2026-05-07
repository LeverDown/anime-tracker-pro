"use client";
import React, { useState, useEffect, useContext, useRef, JSX, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAnimeDetails, useSmartRelations } from '@/hooks/queries/useAnime';
import { useSaveToCollection } from '@/hooks/queries/useUser';
import UplinkGroup from '../../../components/UI/UplinkGroup/UplinkGroup';
import SeasonalTimeline from '../../../components/UI/SeasonalTimeline/SeasonalTimeline';
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
        style={{ width: '100%', padding: 'var(--space-4)', justifyContent: 'space-between', display: 'flex', alignItems: 'center' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Filter size={14} color="var(--primary-color)" />
          {value ? value.toUpperCase() : 'IDENTITY_STATUS // UNKNOWN'}
        </div>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }}>
          <ChevronDown size={16} />
        </motion.div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            className="glass-panel"
            style={{
              position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
              padding: '0', zIndex: 1000, borderRadius: 0,
              border: '1px solid var(--primary-color)',
              boxShadow: '0 10px 40px rgba(0,0,0,0.8)'
            }}
          >
            {options.map(opt => (
              <div
                key={opt}
                onClick={() => { onChange(opt); setIsOpen(false); }}
                className={`${styles.statusOption} ${value === opt ? styles.statusOptionSelected : ''}`}
              >
                {value === opt && <div style={{ width: '4px', height: '4px', background: 'var(--primary-color)', boxShadow: '0 0 8px var(--primary-color)' }} />}
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
 * Enhanced with staggered animations and backdrop effects.
 */
export default function AnimeDetailPage(): JSX.Element {
  const params = useParams();
  const id = params?.id;
  const auth = useContext(AuthContext);
  const user = auth?.user;

  const [mounted, setMounted] = useState<boolean>(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  const { data: animeData, isPending, isError } = useAnimeDetails(Number(id));
  const anime = animeData?.data as Anime | null;

  const { data: smartRelationsData } = useSmartRelations(Number(id));
  
  // Combine internal relations and smart relations
  const smartRelations = useMemo(() => {
    if (!anime) return [];
    if (anime.relations && anime.relations.length > 0) {
      return anime.relations.flatMap((r: any) =>
        r.entry.map((e: any) => ({ ...e, relation: r.relation }))
      );
    }
    return smartRelationsData || [];
  }, [anime, smartRelationsData]);

  const [saveStatus, setSaveStatus] = useState<string>('');
  const [toast, setToast] = useState<string>('');

  const { mutate: saveToCollection } = useSaveToCollection();

  const showToast = (msg: string): void => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const handleSave = (): void => {
    if (!user || !saveStatus || !anime) return;
    saveToCollection({
      username: user,
      anime_id: anime.mal_id,
      title: anime.title,
      image_url: anime.images.jpg.large_image_url || anime.images.jpg.image_url,
      status: saveStatus,
      score: anime.score || 0,
      episodes: anime.episodes || 0,
      genres: anime.genres?.map(g => g.name).join(', ') || '',
      idMal: anime.mal_id,
    }, {
      onSuccess: () => showToast(`✅ [LOGGED] ${anime.title_english || anime.title} saved to ARCHIVE.`),
      onError: () => showToast("❌ Failed to sync to Archive.")
    });
  };

  if (!mounted) return <div className={styles.loadingState} />;
  if (isPending) return <div className={styles.loadingState}>UPLINKING TO DATABASE...</div>;
  if (!anime) return <div className={styles.errorState}>IDENTITY NOT FOUND.</div>;

  const characters = anime.characters?.slice(0, 8) || [];

  return (
    <div className={styles.container}>
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className={styles.toast}>
            <span style={{ color: 'var(--primary-color)', marginRight: '8px' }}>[SYSTEM_MSG]</span> {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className={styles.backdrop}
      >
        <motion.img
          initial={{ scale: 1.1, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          src={anime.images.jpg.large_image_url}
          alt=""
          className={styles.backdropImage}
        />
        <div className={styles.backdropOverlay} />
      </motion.div>

      <motion.div
        className={styles.mainLayout}
        variants={{
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
          }
        }}
        initial="hidden"
        animate="visible"
      >
        <motion.div
          variants={{
            hidden: { opacity: 0, scale: 0.95, y: 20 },
            visible: { opacity: 1, scale: 1, y: 0 }
          }}
          className={styles.posterSection}
        >
          <div className={styles.posterWrapper}>
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
                style={{ 
                  padding: '16px', 
                  fontWeight: 900, 
                  fontSize: '11px', 
                  letterSpacing: '0.2em',
                  boxShadow: saveStatus ? '0 0 30px var(--primary-glow)' : 'none'
                }}
              >
                UPLINK_TO_ARCHIVE //
              </Button>
            </div>
          )}
        </motion.div>

        <div className={styles.infoSection}>
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0 }
            }}
          >
            <div className={styles.statsBar}>
              <span><div style={{ width: '6px', height: '6px', background: 'var(--primary-color)' }} /> STATUS // {anime.status?.toUpperCase()}</span>
              <span><div style={{ width: '6px', height: '6px', background: 'var(--text-dim)' }} /> SCORE // {anime.score ? (anime.score > 10 ? anime.score/10 : anime.score).toFixed(1) : 'N/A'}</span>
              <span><div style={{ width: '6px', height: '6px', background: 'var(--text-dim)' }} /> TYPE // {anime.type?.toUpperCase()}</span>
            </div>

            <h1 className={styles.title}>
              {anime.title_english || anime.title}
            </h1>
            <p className={styles.nativeTitle}>SYS // {anime.title_japanese || anime.title}</p>

            <div className={styles.statsGrid}>
              {[
                { val: anime.score ? (anime.score > 10 ? anime.score/10 : anime.score).toFixed(1) : '—', label: 'RATING_LVL' },
                { val: anime.episodes || '?', label: 'DATA_UNITS' },
                { val: (anime.members || 0).toLocaleString(), label: 'COGNITIVE_SYNC' },
                { val: anime.rank ? `#${anime.rank}` : '—', label: 'SECTOR_RANK' },
              ].map((s) => (
                <div key={s.label} className={styles.statCard}>
                  <div className={styles.statVal}>{s.val}</div>
                  <div className={styles.statLabel}>{s.label}</div>
                </div>
              ))}
            </div>

            <div className={styles.genreGroup}>
              {anime.genres?.map((g) => (
                <span key={g.name} className={styles.genreBadge}>{g.name.toUpperCase()}</span>
              ))}
            </div>
          </motion.div>
        </div>
      </motion.div>

      <div className={styles.contentGrid}>
        <div className={styles.synopsisSection}>
          <div style={{ marginBottom: 'var(--space-10)' }}>
            <h3 className={styles.cardHeader}><div style={{ width: '12px', height: '12px', background: 'var(--primary-color)' }} /> DECK // SYNOPSIS</h3>
            <div style={{ border: '1px solid var(--hud-footer-border)', padding: 'var(--space-8)', background: 'var(--hud-topbar-bg)' }}>
              <p className={styles.synopsisBody}>{anime.synopsis || 'No synopsis available.'}</p>
              <div style={{ marginTop: 'var(--space-8)', borderTop: '1px solid var(--hud-footer-border)', paddingTop: 'var(--space-6)' }}>
                <UplinkGroup links={anime.external_links || []} />
              </div>
            </div>
          </div>

          <div>
            <h3 className={styles.cardHeader}><div style={{ width: '12px', height: '12px', background: 'var(--primary-color)' }} /> DECK // KEY_PERSONNEL</h3>
            <div className={styles.staffGrid}>
              {characters.map((c, i) => {
                const jpv = c.voice_actors?.find((va: any) => va.language === 'Japanese');
                return (
                  <motion.div
                    key={c.character.mal_id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 * i }}
                    className={styles.personEntry}
                  >
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
                          <div style={{ fontSize: '11px', fontWeight: 900, fontFamily: 'var(--font-mono)' }}>{jpv.person.name.toUpperCase()}</div>
                          <div style={{ fontSize: '9px', color: 'var(--text-dark)', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>VA / JP</div>
                        </div>
                        <img src={jpv.person.images?.jpg?.image_url} alt="" className={styles.vaThumb} />
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        <div className={styles.sideSection}>
          <div style={{ marginBottom: 'var(--space-10)' }}>
            <h3 className={styles.cardHeader}><div style={{ width: '12px', height: '12px', background: 'var(--primary-color)' }} /> SYS // INTEL</h3>
            <div className={styles.systemInfoList}>
              {[
                { label: 'STUDIO', val: anime.studios?.map(s => s.name).join(', ') || '—' },
                { label: 'SOURCE', val: anime.source || '—' },
                { label: 'SEASON', val: anime.season ? `${anime.season} ${anime.year}` : '—' },
                { label: 'DURATION', val: anime.duration || '—' },
              ].map(i => (
                <div key={i.label} className={styles.systemInfoItem}>
                  <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-dark)', fontFamily: 'var(--font-mono)' }}>{i.label}</span>
                  <span style={{ fontSize: '11px', fontWeight: 900, fontFamily: 'var(--font-mono)' }}>{i.val.toUpperCase()}</span>
                </div>
              ))}
            </div>
          </div>

          {(smartRelations.length > 0 || (anime as any).relations?.length > 0) && (
            <div>
              <h3 className={styles.cardHeader}><div style={{ width: '12px', height: '12px', background: 'var(--primary-color)' }} /> SYS // RELATIONS</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                {(smartRelations.length > 0 ? smartRelations : ((anime as any).relations?.flatMap((r: any) => r.entry.map((e: any) => ({ ...e, relation: r.relation }))) || []))
                  .filter((rel: any) => rel.type === 'anime' || !rel.type)
                  .slice(0, 8).map((rel: any, i: number) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Link href={`/anime/${rel.idMal || rel.mal_id}`} className={styles.relationLink}>
                      <span style={{ fontSize: '9px', color: 'var(--primary-color)', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>{rel.relation?.toUpperCase() || 'RELATED'}</span>
                      <span style={{ fontSize: '11px', fontWeight: 900, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)' }}>{(rel.title_english || rel.name || rel.title)?.toUpperCase()}</span>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
