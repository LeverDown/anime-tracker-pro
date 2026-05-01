"use client";
import { useState, useEffect, useContext } from 'react';
import { useParams } from 'next/navigation';
import api, { BACKEND_URL } from '../../../api/client';
import { AuthContext } from '../../AuthContext';

import styles from './profile.module.css';
import { Button, MediaCard } from '../../../components/UI';
import { User, Activity, Zap, Star, Share2, Users } from 'lucide-react';

export default function PublicProfilePage() {
  const params = useParams();
  const username = params?.username as string;
  const auth = useContext(AuthContext);
  const user = auth?.user;
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  const getFullUrl = (path: string) => {
    if (!path) return '';
    const base = path.startsWith('/uploads') ? `${BACKEND_URL}${path}` : path;
    return `${base}?t=${Date.now()}`;
  };

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  useEffect(() => {
    if (!username) return;
    api.get(`/profile/${username}`)
      .then(r => setProfile(r.data))
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [username]);

  const handleAddFriend = async () => {
    if (!user) return;
    await api.post('/community/friends', { username: user, friend_username: username });
    showToast(`Friend sync established: ${username}`);
  };

  const tasteMap: Record<string, string> = {
    "Action": "SHOUNEN_JUNKIE", "Romance": "ROMANCE_CONNOISSEUR", "Comedy": "GAG_MASTER",
    "Fantasy": "ISEKAI_PROTAGONIST", "Sci-Fi": "FUTURIST", "Drama": "TEARJERKER_COLLECTOR",
    "Slice of Life": "COZY_WATCHER", "Horror": "THRILL_SEEKER",
  };

  if (loading) return <div className={styles.container}><div className={styles.skeletonCard} /></div>;
  if (!profile) return <div className={styles.container} style={{ textAlign: 'center', padding: '100px' }}><p className={styles.levelLabel}>USER_NOT_FOUND // ERROR_404</p></div>;

  const topGenre = profile.top_genres?.[0]?.name ?? '';
  const tasteProfile = tasteMap[topGenre] ?? `${topGenre?.toUpperCase()}_ENTHUSIAST`;

  return (
    <div className={`${styles.container} rds-hatch`}>
      {toast && <div className={styles.toast}>{toast} //</div>}

      <header className={styles.header}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h1 className={styles.title}>
            <span className={styles.titlePrefix}>{"//"}</span> NEURAL_IDENTITY
          </h1>
          <div style={{ display: 'flex', gap: '16px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-dim)', letterSpacing: '0.1em' }}>
            <span><Zap size={14} color="var(--primary-color)" /> SYS // PUBLIC_PROFILE</span>
            <span><User size={14} /> SECTOR // USER_CORE</span>
          </div>
        </div>
      </header>

      {/* ── Hero Banner & Avatar ────────────────────────────────── */}
      <div 
        className={styles.hero}
        style={{ 
          background: profile.banner_url 
            ? `url(${getFullUrl(profile.banner_url)}) center/cover no-repeat` 
            : 'var(--bg-deep)' 
        }}
      >
        <div className={styles.heroOverlay}>
          <div className={styles.avatarWrapper}>
            {profile.pfp_url ? (
              <img src={getFullUrl(profile.pfp_url)} alt={profile.username} className={styles.avatarImage} />
            ) : (
              <div className={styles.avatarPlaceholder}>
                {profile.username[0].toUpperCase()}
              </div>
            )}
          </div>

          <div className={styles.identityInfo}>
            <h1 className={styles.username}>{profile.username}</h1>
            <div className={styles.metaRow}>
              <span className={styles.tasteBadge}>{tasteProfile}</span>
              <span className={styles.levelLabel}>LVL // {Math.floor(profile.total_titles / 5) + 1} OTAKU_NODE</span>
            </div>
          </div>

          <div className={styles.actionGroup}>
            {user && user !== username && (
              <Button 
                variant="primary" 
                onClick={handleAddFriend}
                icon={<Users size={16} />}
                style={{ borderRadius: 0, fontSize: '10px', fontWeight: 900, fontFamily: 'var(--font-mono)' }}
              >
                SYNC_FRIEND //
              </Button>
            )}
            <Button 
              variant="secondary" 
              onClick={() => { navigator.clipboard.writeText(window.location.href); showToast('Link copied!'); }}
              icon={<Share2 size={16} />}
              style={{ borderRadius: 0, fontSize: '10px', fontWeight: 900, fontFamily: 'var(--font-mono)' }}
            >
              SHARE_IDENTITY
            </Button>
          </div>
        </div>
      </div>

      {/* ── Stats Row ───────────────────────────────────────────── */}
      <div className={styles.statsGrid}>
        {[
          { val: profile.total_titles, label: 'TOTAL_TITLES', icon: <Activity size={20} /> },
          { val: profile.completed, label: 'COMPLETED', icon: <Zap size={20} /> },
          { val: profile.avg_score || '—', label: 'AVG_SCORE', icon: <Star size={20} /> },
        ].map(({ val, label, icon }) => (
          <div key={label} className={styles.statCard}>
            <div className={styles.statIcon} style={{ color: 'var(--primary-color)' }}>{icon}</div>
            <div className={styles.statValue}>{val}</div>
            <div className={styles.statLabel}>{label}</div>
          </div>
        ))}
      </div>

      {/* ── Top Genres ──────────────────────────────────────────── */}
      {profile.top_genres?.length > 0 && (
        <div className={styles.sectionCard}>
          <h2 className={styles.sectionTitle}>
            <Zap size={14} /> TOP_GENRE_DNA //
          </h2>
          <div className={styles.genreList}>
            {profile.top_genres.map((g: any) => (
              <span key={g.name} className={styles.genreBadge}>
                {g.name?.toUpperCase()} <span className={styles.genreCount}>×{g.count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Completed Shows Grid ──────────────────────────────── */}
      {profile.completed_shows?.length > 0 && (
        <div className={styles.sectionCard} style={{ padding: '0' }}>
          <div style={{ padding: '24px 24px 12px' }}>
            <h2 className={styles.sectionTitle}>
              <Star size={14} /> COMPLETED_ARCHIVE // ({profile.completed})
            </h2>
          </div>
          <div className={styles.showsGrid}>
            {profile.completed_shows.map((show: any) => (
              <div 
                key={show.anime_id} 
                className={styles.showThumb}
                title={`${show.title}${show.score ? ` · ${show.score}/10` : ''}`}
                onClick={() => auth?.user && window.location.assign(`/anime/${show.anime_id}`)}
                style={{ cursor: 'pointer' }}
              >
                {show.image_url ? (
                  <img src={show.image_url} alt={show.title} className={styles.showImage} />
                ) : (
                  <div className={styles.avatarPlaceholder} style={{ fontSize: '10px' }}>{show.title}</div>
                )}
                {show.score > 0 && (
                  <div className={styles.showScore}>
                    ⭐ {show.score}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
