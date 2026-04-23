"use client";
import { useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from '../AuthContext';
import api from '../../api/client';
import styles from './discover.module.css';

type Anime = {
  mal_id: number;
  title: string;
  images: { jpg: { image_url: string } };
  score: number;
  episodes: number | null;
  genres: { name: string }[];
  synopsis: string;
  trailer: { url: string | null };
  characters: any[];
};

const GENRES = ["Action","Adventure","Comedy","Drama","Fantasy","Horror","Mecha","Music","Mystery","Psychological","Romance","Sci-Fi","Slice of Life","Sports","Supernatural","Thriller"];

export default function DiscoverPage() {
  const { user } = useContext(AuthContext);
  const [anime, setAnime] = useState<Anime[]>([]);
  const [mode, setMode] = useState<'top'|'search'|'foryou'>('top');
  const [query, setQuery] = useState('');
  const [genre, setGenre] = useState('');
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<Record<number, string>>({});
  const [selectedStatus, setSelectedStatus] = useState<Record<number, string>>({});
  const [toast, setToast] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let res;
      if (mode === 'foryou' && user) {
        res = await api.get('/anime/recommendations', { params: { username: user } });
        setAnime(res.data.data);
        setHasNext(false);
      } else {
        const params: any = { mode, page };
        if (mode === 'search' && query) params.query = query;
        if (genre) params.genre = genre;
        res = await api.get('/anime/discover', { params });
        setAnime(res.data.data);
        setHasNext(res.data.pageInfo?.hasNextPage ?? false);
      }
    } finally {
      setLoading(false);
    }
  }, [mode, query, genre, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleSave = async (a: Anime) => {
    const status = selectedStatus[a.mal_id];
    if (!status || status === 'Select...') return;
    await api.post('/collection', {
      username: user,
      anime_id: a.mal_id,
      title: a.title,
      image_url: a.images.jpg.image_url,
      status,
      score: a.score,
      episodes: a.episodes ?? 0,
      genres: a.genres.map(g => g.name).join(', '),
    });
    showToast(`✅ Saved "${a.title}" to your list!`);
  };

  const getTab = (id: number) => activeTab[id] ?? 'info';
  const setTab = (id: number, tab: string) => setActiveTab(prev => ({ ...prev, [id]: tab }));

  return (
    <div className={styles.page}>
      {toast && (
        <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', background: 'var(--primary-color)', color: 'white', padding: '1rem 1.5rem', borderRadius: '8px', zIndex: 1000, boxShadow: '0 4px 20px rgba(255,0,85,0.4)' }}>
          {toast}
        </div>
      )}

      <div className={styles.header}>
        <h1 className={styles.pageTitle}>🔍 Discover Anime</h1>
        <div className={styles.searchBar}>
          <input
            className={styles.searchInput}
            placeholder="Search anime..."
            value={query}
            onChange={e => { setQuery(e.target.value); setMode('search'); setPage(1); }}
            onKeyDown={e => e.key === 'Enter' && fetchData()}
          />
          <select
            className={styles.statusSelect}
            style={{ width: 'auto', flex: '0 0 auto' }}
            value={genre}
            onChange={e => { setGenre(e.target.value); setPage(1); }}
          >
            <option value="">All Genres</option>
            {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          {user && (
            <button
              className={`${styles.modeBtn} ${mode === 'foryou' ? styles.modeBtnActive : ''}`}
              onClick={() => { setMode('foryou'); setQuery(''); setPage(1); }}
            >
              ✨ For You
            </button>
          )}
          <button
            className={`${styles.modeBtn} ${mode === 'top' ? styles.modeBtnActive : ''}`}
            onClick={() => { setMode('top'); setQuery(''); setPage(1); }}
          >
            🔥 Trending
          </button>
          <button className={styles.modeBtn} onClick={() => fetchData()}>
            🔍 Search
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: '#aaa' }}>Loading...</div>
      ) : (
        <>
          <div className={styles.grid}>
            {anime.map((a) => (
              <div key={a.mal_id} className={styles.card}>
                <img className={styles.cardImg} src={a.images.jpg.image_url} alt={a.title} />
                <div className={styles.cardBody}>
                  <div className={styles.cardTitle}>{a.title}</div>
                  <div className={styles.cardScore}>⭐ {a.score.toFixed(1)}</div>
                  <div className={styles.cardMeta}>
                    📺 {a.episodes ? `${a.episodes} eps` : '? (Ongoing)'} &nbsp;|&nbsp; 🏷️ {a.genres.slice(0, 2).map(g => g.name).join(', ')}
                  </div>

                  {/* Tabs */}
                  <div className={styles.tabs}>
                    {['info', 'cast', 'trailer'].map(t => (
                      <button key={t} className={`${styles.tabBtn} ${getTab(a.mal_id) === t ? styles.tabBtnActive : ''}`} onClick={() => setTab(a.mal_id, t)}>
                        {t === 'info' ? '📋' : t === 'cast' ? '🎭' : '▶️'}
                      </button>
                    ))}
                  </div>

                  <div className={styles.tabContent}>
                    {getTab(a.mal_id) === 'info' && (
                      <p>{(a.synopsis || '').slice(0, 150)}{a.synopsis && a.synopsis.length > 150 ? '…' : ''}</p>
                    )}
                    {getTab(a.mal_id) === 'cast' && (
                      a.characters?.length > 0 ? a.characters.slice(0, 4).map((c: any, i: number) => (
                        <div key={i} className={styles.castItem}>
                          <span className={styles.castChar}>{c.node?.name?.full}</span>
                          <span className={styles.castVa}>VA: {c.voiceActors?.[0]?.name?.full ?? '—'}</span>
                        </div>
                      )) : <span style={{ color: '#666' }}>No cast data</span>
                    )}
                    {getTab(a.mal_id) === 'trailer' && (
                      a.trailer?.url
                        ? <a href={a.trailer.url} target="_blank" rel="noreferrer" style={{ color: 'var(--primary-color)' }}>▶️ Watch on YouTube</a>
                        : <span style={{ color: '#666' }}>No trailer available</span>
                    )}
                  </div>

                  {user && (
                    <>
                      <select
                        className={styles.statusSelect}
                        value={selectedStatus[a.mal_id] ?? 'Select...'}
                        onChange={e => setSelectedStatus(prev => ({ ...prev, [a.mal_id]: e.target.value }))}
                      >
                        <option value="Select...">Add to list…</option>
                        {['Watching', 'Completed', 'Plan to Watch', 'Dropped'].map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                      {selectedStatus[a.mal_id] && selectedStatus[a.mal_id] !== 'Select...' && (
                        <button className={styles.saveBtn} onClick={() => handleSave(a)}>Save ✓</button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className={styles.pagination}>
            <button className={styles.pageBtn} disabled={page === 1} onClick={() => setPage(p => p - 1)}>⬅ Prev</button>
            <span style={{ color: '#aaa' }}>Page {page}</span>
            <button className={styles.pageBtn} disabled={!hasNext} onClick={() => setPage(p => p + 1)}>Next ➡</button>
          </div>
        </>
      )}
    </div>
  );
}
