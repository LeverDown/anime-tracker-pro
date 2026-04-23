"use client";
import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../AuthContext';
import api from '../../api/client';

export default function SettingsPage() {
  const { user, logout } = useContext(AuthContext);
  const [themeUrl, setThemeUrl] = useState('');
  const [savedTheme, setSavedTheme] = useState('');
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  useEffect(() => {
    if (!user) return;
    api.get('/user/theme', { params: { username: user } }).then(res => {
      if (res.data.theme_url) {
        setSavedTheme(res.data.theme_url);
        setThemeUrl(res.data.theme_url);
      }
    });
  }, [user]);

  const handleSaveTheme = async () => {
    await api.post('/user/theme', { username: user, theme_url: themeUrl });
    setSavedTheme(themeUrl);
    // Update body background immediately
    document.body.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.7),rgba(0,0,0,0.85)), url('${themeUrl}')`;
    showToast('✅ Theme saved!');
  };

  const handleResetTheme = async () => {
    const defaultUrl = 'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=2070&auto=format&fit=crop';
    await api.post('/user/theme', { username: user, theme_url: defaultUrl });
    setThemeUrl(defaultUrl);
    setSavedTheme(defaultUrl);
    document.body.style.backgroundImage = '';
    showToast('Theme reset to default!');
  };

  const sectionStyle = {
    background: 'rgba(20,20,35,0.92)', border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: '10px', padding: '1.75rem', marginBottom: '1.5rem', maxWidth: '600px',
  };

  return (
    <div>
      {toast && (
        <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', background: '#222', color: 'white', padding: '1rem 1.5rem', borderRadius: '8px', zIndex: 1000, border: '1px solid var(--primary-color)' }}>
          {toast}
        </div>
      )}

      <h1 style={{ color: 'var(--primary-color)', fontSize: '2rem', marginBottom: '1.5rem' }}>⚙️ Settings</h1>

      {/* Profile Info */}
      <div style={sectionStyle}>
        <h2 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '1rem', marginBottom: '1rem', color: '#ccc' }}>👤 Account</h2>
        <p style={{ color: '#aaa', fontSize: '0.9rem' }}>Logged in as: <strong style={{ color: 'white' }}>{user}</strong></p>
        <button onClick={logout} style={{ marginTop: '1rem', padding: '10px 20px', background: 'rgba(200,0,0,0.2)', border: '1px solid rgba(200,0,0,0.5)', color: '#ff6666', borderRadius: '6px', cursor: 'pointer', fontFamily: 'Orbitron, sans-serif', fontSize: '0.85rem' }}>
          🚪 Logout
        </button>
      </div>

      {/* Theme Customization */}
      <div style={sectionStyle}>
        <h2 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '1rem', marginBottom: '0.5rem', color: '#ccc' }}>🎨 Background Theme</h2>
        <p style={{ fontSize: '0.82rem', color: '#666', marginBottom: '1rem' }}>Paste any image URL (e.g. from Unsplash) to customize your app background.</p>
        <input
          value={themeUrl}
          onChange={e => setThemeUrl(e.target.value)}
          placeholder="https://images.unsplash.com/..."
          style={{ width: '100%', padding: '10px 14px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,0,85,0.4)', color: 'white', borderRadius: '6px', marginBottom: '0.75rem' }}
        />
        {themeUrl && (
          <div style={{ marginBottom: '0.75rem' }}>
            <p style={{ fontSize: '0.8rem', color: '#aaa', marginBottom: '4px' }}>Preview:</p>
            <img src={themeUrl} alt="Preview" style={{ width: '100%', height: '100px', objectFit: 'cover', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)' }} onError={e => (e.currentTarget.style.display = 'none')} />
          </div>
        )}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={handleSaveTheme} style={{ padding: '10px 20px', background: 'var(--primary-color)', color: 'white', borderRadius: '6px', cursor: 'pointer', fontFamily: 'Orbitron, sans-serif', fontSize: '0.85rem' }}>
            Save Theme
          </button>
          <button onClick={handleResetTheme} style={{ padding: '10px 20px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', color: '#ccc', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }}>
            Reset to Default
          </button>
        </div>
      </div>

      {/* Export */}
      <div style={sectionStyle}>
        <h2 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '1rem', marginBottom: '0.5rem', color: '#ccc' }}>💾 Export Library</h2>
        <p style={{ fontSize: '0.82rem', color: '#666', marginBottom: '1rem' }}>Download your entire anime collection as a CSV file for safekeeping.</p>
        <button onClick={async () => {
          const res = await api.get('/collection', { params: { username: user, status_filter: 'All' } });
          const entries = res.data.data;
          const headers = ['Title', 'Status', 'Score', 'Episodes', 'Genres', 'Progress', 'Review'];
          const rows = entries.map((e: any) => [
            `"${e.title}"`, e.status, e.score, e.episodes, `"${e.genres}"`, e.progress, `"${(e.review || '').replace(/"/g, "'")}"`,
          ]);
          const csv = [headers.join(','), ...rows.map((r: any[]) => r.join(','))].join('\n');
          const blob = new Blob([csv], { type: 'text/csv' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = 'anime_tracker_export.csv'; a.click();
          URL.revokeObjectURL(url);
          showToast('📥 Export downloaded!');
        }}
          style={{ padding: '10px 20px', background: 'rgba(255,0,85,0.15)', border: '1px solid var(--primary-color)', color: 'white', borderRadius: '6px', cursor: 'pointer', fontFamily: 'Orbitron, sans-serif', fontSize: '0.85rem' }}>
          📥 Export as CSV
        </button>
      </div>
    </div>
  );
}
