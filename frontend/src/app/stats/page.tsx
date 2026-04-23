"use client";
import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../AuthContext';
import api from '../../api/client';

export default function StatsPage() {
  const { user } = useContext(AuthContext);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    api.get('/collection', { params: { username: user, status_filter: 'All' } })
      .then(res => setData(res.data.data))
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) return <p style={{ color: '#aaa' }}>Loading stats…</p>;
  if (!data.length) return (
    <div>
      <h1 style={{ color: 'var(--primary-color)', fontSize: '2rem', marginBottom: '1rem' }}>📊 My Stats</h1>
      <p style={{ color: '#666' }}>No data yet! Add some anime to your collection first.</p>
    </div>
  );

  // Calculate stats
  let totalEpsWatched = 0;
  const statusCounts: Record<string, number> = {};
  const genreCounts: Record<string, number> = {};
  let scoredCount = 0; let totalScore = 0;

  for (const entry of data) {
    // Episodes
    if (entry.seasons_json) {
      try {
        const seasons = JSON.parse(entry.seasons_json);
        for (const s of seasons) totalEpsWatched += (s.watched || 0);
      } catch {}
    }

    // Status
    statusCounts[entry.status] = (statusCounts[entry.status] || 0) + 1;

    // Genres
    if (entry.genres) {
      for (const g of entry.genres.split(',')) {
        const trimmed = g.trim();
        if (trimmed) genreCounts[trimmed] = (genreCounts[trimmed] || 0) + 1;
      }
    }

    // Scores
    if (entry.score > 0) { totalScore += entry.score; scoredCount++; }
  }

  const totalHours = (totalEpsWatched * 24) / 60;
  const avgScore = scoredCount > 0 ? (totalScore / scoredCount).toFixed(2) : '—';
  const topGenre = Object.entries(genreCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';
  const tasteMap: Record<string, string> = {
    "Action": "Shounen Junkie", "Romance": "Romance Connoisseur", "Comedy": "Gag Master",
    "Fantasy": "Isekai Protagonist", "Sci-Fi": "Futurist", "Drama": "Tearjerker Collector",
    "Slice of Life": "Cozy Watcher", "Horror": "Thrill Seeker"
  };
  const tasteProfile = tasteMap[topGenre] ?? `${topGenre} Enthusiast`;

  const cardStyle = { background: 'rgba(20,20,35,0.92)', border: '1px solid rgba(255,0,85,0.25)', borderRadius: '10px', padding: '1.5rem', textAlign: 'center' as const };
  const numStyle = { fontSize: '2.5rem', fontFamily: 'Orbitron, sans-serif', color: 'var(--primary-color)', marginBottom: '0.4rem' };
  const labelStyle = { fontSize: '0.85rem', color: '#aaa' };

  return (
    <div>
      <h1 style={{ color: 'var(--primary-color)', fontSize: '2rem', marginBottom: '1.5rem' }}>📊 My Otaku Stats</h1>

      {/* Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div style={cardStyle}><div style={numStyle}>{data.length}</div><div style={labelStyle}>Total Titles</div></div>
        <div style={cardStyle}><div style={numStyle}>{totalEpsWatched}</div><div style={labelStyle}>Episodes Watched</div></div>
        <div style={cardStyle}><div style={numStyle}>{Math.floor(totalHours)}h</div><div style={labelStyle}>Hours Watched</div></div>
        <div style={cardStyle}><div style={numStyle}>{avgScore}</div><div style={labelStyle}>Avg Score</div></div>
      </div>

      {/* Taste Profile */}
      <div style={{ ...cardStyle, textAlign: 'left', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        <div style={{ fontSize: '3rem' }}>🏆</div>
        <div>
          <div style={{ fontSize: '0.85rem', color: '#aaa', marginBottom: '0.25rem' }}>Your Taste Profile</div>
          <div style={{ fontSize: '1.6rem', fontFamily: 'Orbitron, sans-serif', color: 'white' }}>{tasteProfile}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--primary-color)', marginTop: '0.2rem' }}>Top genre: {topGenre}</div>
        </div>
      </div>

      {/* Status Distribution */}
      <h2 style={{ color: 'white', fontSize: '1.1rem', marginBottom: '1rem', fontFamily: 'Orbitron, sans-serif' }}>Status Breakdown</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '2rem' }}>
        {Object.entries(statusCounts).map(([status, count]) => {
          const pct = Math.round((count / data.length) * 100);
          return (
            <div key={status}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px', color: '#ccc' }}>
                <span>{status}</span><span>{count} ({pct}%)</span>
              </div>
              <div style={{ height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: 'var(--primary-color)', borderRadius: '4px', transition: 'width 0.6s ease' }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Top Genres */}
      <h2 style={{ color: 'white', fontSize: '1.1rem', marginBottom: '1rem', fontFamily: 'Orbitron, sans-serif' }}>Top Genres</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
        {Object.entries(genreCounts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([g, count]) => (
          <span key={g} style={{ padding: '4px 12px', borderRadius: '20px', background: 'rgba(255,0,85,0.15)', border: '1px solid rgba(255,0,85,0.4)', fontSize: '0.82rem', color: '#eee' }}>
            {g} <span style={{ color: 'var(--primary-color)' }}>×{count}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
