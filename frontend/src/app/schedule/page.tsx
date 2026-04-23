"use client";
import { useState, useEffect } from 'react';
import api from '../../api/client';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function SchedulePage() {
  const [day, setDay] = useState(DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1]);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get('/anime/schedule', { params: { day: day.toLowerCase() } })
      .then(res => setData(res.data.data))
      .finally(() => setLoading(false));
  }, [day]);

  return (
    <div>
      <h1 style={{ color: 'var(--primary-color)', fontSize: '2rem', marginBottom: '1.5rem' }}>📅 Weekly Airing Schedule</h1>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {DAYS.map(d => (
          <button key={d} onClick={() => setDay(d)} style={{
            padding: '8px 18px', borderRadius: '6px', cursor: 'pointer', fontFamily: 'Orbitron, sans-serif', fontSize: '0.8rem',
            background: day === d ? 'var(--primary-color)' : 'rgba(255,255,255,0.05)',
            border: `1px solid ${day === d ? 'var(--primary-color)' : 'rgba(255,255,255,0.15)'}`,
            color: 'white', boxShadow: day === d ? '0 0 10px rgba(255,0,85,0.4)' : 'none',
            transition: 'all 0.2s',
          }}>
            {d}
          </button>
        ))}
      </div>

      {loading && <p style={{ color: '#aaa', textAlign: 'center', padding: '4rem' }}>Loading schedule…</p>}

      {!loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
          {data.length === 0 && <p style={{ color: '#666' }}>No shows found for this day.</p>}
          {data.map(show => (
            <div key={show.mal_id} style={{
              background: 'rgba(20,20,35,0.92)', border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '10px', overflow: 'hidden', transition: 'transform 0.2s, box-shadow 0.2s',
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 20px rgba(255,0,85,0.2)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = ''; }}
            >
              <img src={show.images.jpg.image_url} alt={show.title} style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover' }} />
              <div style={{ padding: '0.75rem' }}>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'white', marginBottom: '0.3rem' }}>{show.title}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--primary-color)' }}>🕒 {show.broadcast.string}</div>
                <div style={{ fontSize: '0.75rem', color: '#888', marginTop: '0.2rem' }}>
                  {show.episodes ? `${show.episodes} eps total` : 'Ongoing'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
