"use client";
import { useState, useEffect, useContext } from 'react';
import { useParams } from 'next/navigation';
import api, { BACKEND_URL } from '../../../api/client';
import { AuthContext } from '../../AuthContext';

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
    showToast(`✅ Added ${username} as a friend!`);
  };

  const tasteMap: Record<string, string> = {
    "Action": "Shounen Junkie 🥊", "Romance": "Romance Connoisseur 💕", "Comedy": "Gag Master 😂",
    "Fantasy": "Isekai Protagonist ⚔️", "Sci-Fi": "Futurist 🚀", "Drama": "Tearjerker Collector 😭",
    "Slice of Life": "Cozy Watcher ☕", "Horror": "Thrill Seeker 💀",
  };

  const card = { background: 'rgba(20,20,35,0.92)', border: '1px solid rgba(255,0,85,0.18)', borderRadius: '14px', padding: '1.5rem' };


  if (loading) return <div style={{ padding: '4rem', color: '#aaa', textAlign: 'center' }}>Loading profile…</div>;
  if (!profile) return <div style={{ padding: '4rem', color: '#ff6b6b', textAlign: 'center' }}>User not found.</div>;

  const topGenre = profile.top_genres?.[0]?.name ?? '';
  const tasteProfile = tasteMap[topGenre] ?? `${topGenre} Enthusiast`;

  const heroStyle: React.CSSProperties = {
    position: 'relative',
    height: '320px',
    borderRadius: '20px',
    overflow: 'hidden',
    marginBottom: '2rem',
    background: profile.banner_url ? `url(${getFullUrl(profile.banner_url)}) center/cover no-repeat` : 'linear-gradient(135deg, #1a1a2e, #16213e)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
    border: '1px solid rgba(255,255,255,0.05)',
    boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
  };

  return (
    <div style={{ paddingBottom: '3rem' }}>
      {toast && <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', background: 'var(--primary-color)', color: 'white', padding: '1rem 1.5rem', borderRadius: '10px', zIndex: 1000 }}>{toast}</div>}

      {/* ── Hero Banner & Avatar ────────────────────────────────── */}
      <div style={heroStyle}>
        {/* Glass Overlay for info */}
        <div style={{ 
          background: 'linear-gradient(transparent, rgba(0,0,0,0.9))', 
          padding: '2rem', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '2rem',
          backdropFilter: 'blur(4px)'
        }}>
          {/* Profile Picture */}
          <div style={{ 
            width: '120px', 
            height: '120px', 
            borderRadius: '50%', 
            border: `4px solid var(--primary-color)`, 
            overflow: 'hidden',
            background: '#111',
            flexShrink: 0,
            boxShadow: `0 0 20px var(--primary-color)44`
          }}>
            {profile.pfp_url ? (
              <img src={getFullUrl(profile.pfp_url)} alt={profile.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', fontWeight: 'bold', color: 'var(--primary-color)', background: 'rgba(255,255,255,0.05)' }}>
                {profile.username[0].toUpperCase()}
              </div>
            )}
          </div>

          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: '2.5rem', color: 'white', marginBottom: '0.3rem', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
              {profile.username}
            </h1>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <span style={{ 
                background: 'var(--primary-color)', 
                color: 'white', 
                padding: '4px 12px', 
                borderRadius: '20px', 
                fontSize: '0.8rem', 
                fontWeight: 'bold',
                letterSpacing: '0.05em'
              }}>
                {tasteProfile}
              </span>
              <span style={{ color: '#aaa', fontSize: '0.85rem' }}>Level {Math.floor(profile.total_titles / 5) + 1} Otaku</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {user && user !== username && (
              <button onClick={handleAddFriend}
                style={{ padding: '12px 24px', borderRadius: '12px', background: 'var(--primary-color)', border: 'none', color: 'white', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem', boxShadow: `0 0 15px var(--primary-color)44` }}>
                👥 Add Friend
              </button>
            )}
            <button onClick={() => { navigator.clipboard.writeText(window.location.href); showToast('Link copied!'); }}
              style={{ padding: '12px 18px', borderRadius: '12px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', cursor: 'pointer', backdropFilter: 'blur(10px)' }}>
              🔗 Share
            </button>
          </div>
        </div>
      </div>

      {/* ── Stats Row ───────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { val: profile.total_titles, label: 'Total Titles', icon: '🎬' },
          { val: profile.completed, label: 'Completed', icon: '✅' },
          { val: profile.avg_score || '—', label: 'Avg Score', icon: '⭐' },
        ].map(({ val, label, icon }) => (
          <div key={label} style={{ ...card, textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.3rem' }}>{icon}</div>
            <div style={{ fontSize: '2rem', fontFamily: 'Orbitron, sans-serif', color: 'var(--primary-color)', lineHeight: 1 }}>{val}</div>
            <div style={{ fontSize: '0.78rem', color: '#666', marginTop: '0.4rem' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* ── Top Genres ──────────────────────────────────────────── */}
      {profile.top_genres?.length > 0 && (
        <div style={{ ...card, marginBottom: '1.5rem' }}>
          <h2 style={{ color: 'white', fontFamily: 'Orbitron, sans-serif', fontSize: '1rem', marginBottom: '1rem' }}>Top Genres</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {profile.top_genres.map((g: any) => (
              <span key={g.name} style={{ padding: '5px 14px', borderRadius: '20px', background: 'rgba(255,0,85,0.15)', border: '1px solid rgba(255,0,85,0.4)', fontSize: '0.85rem', color: '#eee' }}>
                {g.name} <span style={{ color: 'var(--primary-color)' }}>×{g.count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Completed Shows Grid ──────────────────────────────── */}
      {profile.completed_shows?.length > 0 && (
        <div style={card}>
          <h2 style={{ color: 'white', fontFamily: 'Orbitron, sans-serif', fontSize: '1rem', marginBottom: '1rem' }}>
            Completed ({profile.completed})
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '0.5rem' }}>
            {profile.completed_shows.map((show: any) => (
              <div key={show.anime_id} title={`${show.title}${show.score ? ` · ${show.score}/10` : ''}`}
                style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', aspectRatio: '2/3' }}>
                {show.image_url
                  ? <img src={show.image_url} alt={show.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <div style={{ width: '100%', height: '100%', background: 'rgba(255,0,85,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: '#666', textAlign: 'center', padding: '4px' }}>{show.title}</div>
                }
                {show.score > 0 && (
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(0,0,0,0.8))', padding: '4px', fontSize: '0.7rem', color: 'gold', textAlign: 'center' }}>
                    ⭐{show.score}
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
