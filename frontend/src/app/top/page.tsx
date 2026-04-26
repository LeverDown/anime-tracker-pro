"use client";
import { useState, useEffect, Suspense } from 'react';
import { motion } from 'framer-motion';
import { Trophy, ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { useRouter } from 'next/navigation';
import api from '../../api/client';
import { Button, Card } from '../../components/UI';

const GENRES = [
  { id: 1, name: 'Action' }, { id: 2, name: 'Adventure' }, { id: 4, name: 'Comedy' },
  { id: 8, name: 'Drama' }, { id: 10, name: 'Fantasy' }, { id: 22, name: 'Romance' },
  { id: 24, name: 'Sci-Fi' }, { id: 36, name: 'Slice of Life' }, { id: 37, name: 'Supernatural' }
];

function TopContent() {
  const router = useRouter();
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [genre, setGenre] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    let isMounted = true;
    const fetchTop = async () => {
      setLoading(true);
      try {
        const validPage = isNaN(page) || page < 1 ? 1 : page;
        const res = await api.get('/anime/top', { params: { page: validPage, genre } });
        if (isMounted) {
          setResults(res.data.data || []);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) setLoading(false);
      }
    };
    fetchTop();
    return () => { isMounted = false; };
  }, [genre, page]);

  return (
    <div className="animate-fade-in">
      <header style={{ marginBottom: '3rem' }}>
        <motion.h1 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          style={{ fontSize: '2.5rem', marginBottom: '1.5rem', fontWeight: 900 }}
        >
          <span style={{ color: 'var(--primary-color)' }}>{"//"}</span> ELITE 100
        </motion.h1>

        <Card style={{ padding: '1.25rem', display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-dim)', fontSize: '0.85rem', fontWeight: 700 }}>
            <Trophy size={18} color="var(--primary-color)" />
            GLOBAL_RANKINGS_LIVE
          </div>
          <div style={{ flex: 1 }} />
          <select 
            value={genre}
            onChange={(e) => { setGenre(e.target.value); setPage(1); }}
            style={{
              padding: '12px 20px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(0,0,0,0.2)',
              border: '1px solid var(--glass-border)',
              color: 'white',
              fontWeight: 800,
              cursor: 'pointer',
              minWidth: '200px'
            }}
          >
            <option value="">ALL GENRES</option>
            {GENRES.map(g => <option key={g.id} value={g.id}>{g.name.toUpperCase()}</option>)}
          </select>
        </Card>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '2.5rem' }}>
        {loading ? (
          Array.from({ length: 12 }).map((_, i) => (
            <Card key={i} style={{ height: '420px', opacity: 0.2, animation: 'pulse 2s infinite' }} hover={false} />
          ))
        ) : (
          results.map((anime, i) => (
            <motion.div
              key={anime.mal_id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card 
                style={{ padding: 0, overflow: 'hidden', height: '100%', position: 'relative' }}
                onClick={() => router.push(`/anime/${anime.mal_id}`)}
              >
                <div style={{ position: 'relative', height: '380px' }}>
                  <img 
                    src={anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url} 
                    alt={anime.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  
                  {/* Rank Badge */}
                  <div style={{ 
                    position: 'absolute', top: '1rem', left: '1rem', 
                    background: 'rgba(0,0,0,0.7)', padding: '4px 10px', 
                    borderRadius: '8px', border: '1px solid var(--glass-border)',
                    fontSize: '0.8rem', fontWeight: 900, color: 'var(--primary-color)',
                    backdropFilter: 'blur(10px)'
                  }}>
                    #{ (page - 1) * 20 + i + 1 }
                  </div>

                  <div style={{ 
                    position: 'absolute', bottom: 0, left: 0, right: 0, 
                    padding: '2rem 1.5rem 1.5rem',
                    background: 'linear-gradient(to top, rgba(5,5,8,1), transparent)'
                  }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 900, marginBottom: '0.5rem', color: 'white', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{anime.title}</h3>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--primary-color)', background: 'rgba(255,0,85,0.1)', padding: '4px 8px', borderRadius: '4px' }}>
                        {anime.type || 'TV'}
                      </span>
                      <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--accent-cyan)', background: 'rgba(0,242,255,0.1)', padding: '4px 8px', borderRadius: '4px' }}>
                        ★ {anime.score || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))
        )}
      </div>

      {!loading && results.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '2rem', marginTop: '4rem' }}>
          <Button 
            variant="secondary"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            icon={<ChevronLeft size={18} />}
          >
            PREV
          </Button>
          <span style={{ fontWeight: 900, letterSpacing: '2px', color: 'var(--text-dim)' }}>PAGE {page}</span>
          <Button 
            variant="secondary"
            onClick={() => setPage(p => p + 1)}
            icon={<ChevronRight size={18} />}
          >
            NEXT
          </Button>
        </div>
      )}
    </div>
  );
}

export default function TopPage() {
  return (
    <Suspense fallback={<div style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '5rem' }}>SYNCHRONIZING GLOBAL DATA...</div>}>
      <TopContent />
    </Suspense>
  );
}
