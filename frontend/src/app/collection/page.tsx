"use client";
import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../AuthContext';
import api from '../../api/client';
import styles from './collection.module.css';

const STATUSES = ['All', 'Watching', 'Completed', 'Plan to Watch', 'Dropped'];

type AnimeEntry = {
  anime_id: number;
  title: string;
  image_url: string;
  status: string;
  score: number;
  episodes: number;
  genres: string;
  review: string;
  progress: number;
  seasons_json: string;
};

export default function CollectionPage() {
  const { user } = useContext(AuthContext);
  const [data, setData] = useState<AnimeEntry[]>([]);
  const [filter, setFilter] = useState('All');
  const [loading, setLoading] = useState(false);
  const [localProgress, setLocalProgress] = useState<Record<number, number>>({});
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const fetchCollection = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await api.get('/collection', { params: { username: user, status_filter: filter } });
      setData(res.data.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCollection(); }, [user, filter]);

  const handleProgressUpdate = async (animeId: number, episodes: number, totalEps: number) => {
    const entry = data.find(d => d.anime_id === animeId);
    if (!entry) return;

    let seasons = entry.seasons_json ? JSON.parse(entry.seasons_json) : [{ id: animeId, name: 'Season 1 (Main)', total: totalEps, watched: 0 }];
    if (seasons.length > 0) {
      seasons[0].watched = episodes;
    }
    await api.post('/collection/progress', { username: user, anime_id: animeId, seasons_json: JSON.stringify(seasons) });
    setLocalProgress(prev => ({ ...prev, [animeId]: episodes }));
    showToast('Progress saved!');
  };

  const handleRemove = async (animeId: number, title: string) => {
    await api.delete('/collection', { params: { username: user, anime_id: animeId } });
    setData(prev => prev.filter(d => d.anime_id !== animeId));
    showToast(`Removed "${title}" from your list.`);
  };

  return (
    <div className={styles.page}>
      {toast && (
        <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', background: '#222', color: 'white', padding: '1rem 1.5rem', borderRadius: '8px', zIndex: 1000, border: '1px solid var(--primary-color)' }}>
          {toast}
        </div>
      )}

      <h1 className={styles.pageTitle}>📚 My Collection</h1>

      <div className={styles.filterBar}>
        {STATUSES.map(s => (
          <button key={s} className={`${styles.filterBtn} ${filter === s ? styles.filterBtnActive : ''}`} onClick={() => setFilter(s)}>
            {s}
          </button>
        ))}
      </div>

      {loading && <div style={{ textAlign: 'center', padding: '4rem', color: '#aaa' }}>Loading…</div>}

      {!loading && data.length === 0 && (
        <div className={styles.empty}>
          <p style={{ fontSize: '3rem' }}>📭</p>
          <p>No anime found. Head to <a href="/discover" style={{ color: 'var(--primary-color)' }}>Discover</a> to add some!</p>
        </div>
      )}

      <div className={styles.list}>
        {data.map(entry => {
          const seasons = entry.seasons_json ? JSON.parse(entry.seasons_json) : [];
          const watchedEps = localProgress[entry.anime_id] ?? (seasons[0]?.watched ?? 0);
          const totalEps = entry.episodes || seasons[0]?.total || 0;
          const pct = totalEps > 0 ? Math.min((watchedEps / totalEps) * 100, 100) : 0;

          return (
            <div key={entry.anime_id} className={styles.item}>
              <img className={styles.coverImg} src={entry.image_url} alt={entry.title} />
              <div className={styles.info}>
                <div className={styles.title}>{entry.title}</div>
                <div className={styles.meta}>⭐ {entry.score} &nbsp;|&nbsp; 🏷️ {entry.genres}</div>
                <span className={styles.statusBadge}>{entry.status}</span>
                <div className={styles.progressWrap}>
                  <div className={styles.progressLabel}>
                    {watchedEps} / {totalEps > 0 ? totalEps : '?'} eps watched
                  </div>
                  <div className={styles.progressBar}>
                    <div className={styles.progressFill} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </div>
              <div className={styles.actions}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <input
                    type="number"
                    className={styles.editInput}
                    min={0}
                    max={totalEps || 99999}
                    value={watchedEps}
                    onChange={e => setLocalProgress(prev => ({ ...prev, [entry.anime_id]: Number(e.target.value) }))}
                    onBlur={() => handleProgressUpdate(entry.anime_id, watchedEps, totalEps)}
                  />
                  <span style={{ fontSize: '0.75rem', color: '#aaa' }}>eps</span>
                </div>
                <button className={styles.removeBtn} onClick={() => handleRemove(entry.anime_id, entry.title)}>🗑️ Remove</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
