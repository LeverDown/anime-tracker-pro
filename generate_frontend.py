import os

def create_file(path, content):
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

# Discover Page
discover_tsx = """\"use client\";
import { useState, useEffect } from 'react';
import api from '../../api/client';

export default function DiscoverPage() {
  const [data, setData] = useState([]);
  
  useEffect(() => {
    api.get('/anime/discover?mode=top').then(res => setData(res.data.data));
  }, []);

  return (
    <div>
      <h1 style={{color: 'var(--primary-color)'}}>🔍 Discover Anime</h1>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '2rem' }}>
        {data.map((anime: any) => (
          <div key={anime.mal_id} style={{ width: '225px', background: 'rgba(20,20,35,0.9)', padding: '1rem', borderRadius: '8px' }}>
            <img src={anime.images.jpg.image_url} alt={anime.title} style={{ width: '100%', borderRadius: '4px' }} />
            <h4 style={{ marginTop: '0.5rem' }}>{anime.title}</h4>
            <p style={{ fontSize: '0.8rem', color: '#aaa' }}>⭐ {anime.score} | 📺 {anime.episodes > 0 ? anime.episodes : '?'} eps</p>
          </div>
        ))}
      </div>
    </div>
  );
}
"""

# Collection Page
collection_tsx = """\"use client\";
import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../AuthContext';
import api from '../../api/client';

export default function CollectionPage() {
  const { user } = useContext(AuthContext);
  const [data, setData] = useState([]);

  useEffect(() => {
    if (user) {
      api.get(`/collection?username=${user}`).then(res => setData(res.data.data));
    }
  }, [user]);

  return (
    <div>
      <h1 style={{color: 'var(--primary-color)'}}>📚 My Collection</h1>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '2rem' }}>
        {data.length === 0 && <p>No anime in your collection yet.</p>}
        {data.map((anime: any) => (
          <div key={anime.anime_id} style={{ display: 'flex', gap: '1rem', background: 'rgba(20,20,35,0.9)', padding: '1rem', borderRadius: '8px' }}>
            <img src={anime.image_url} alt={anime.title} style={{ width: '100px', borderRadius: '4px' }} />
            <div>
              <h3>{anime.title}</h3>
              <p style={{ color: 'var(--primary-color)' }}>{anime.status}</p>
              <p>Progress: {anime.progress} / {anime.episodes || '?'} eps</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
"""

# Schedule Page
schedule_tsx = """\"use client\";
import { useState, useEffect } from 'react';
import api from '../../api/client';

export default function SchedulePage() {
  const [data, setData] = useState([]);
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const [day, setDay] = useState('Monday');

  useEffect(() => {
    api.get(`/anime/schedule?day=${day.toLowerCase()}`).then(res => setData(res.data.data));
  }, [day]);

  return (
    <div>
      <h1 style={{color: 'var(--primary-color)'}}>📅 Weekly Schedule</h1>
      <div style={{ display: 'flex', gap: '1rem', margin: '1rem 0' }}>
        {days.map(d => (
          <button key={d} onClick={() => setDay(d)} style={{ padding: '0.5rem 1rem', background: day === d ? 'var(--primary-color)' : '#333', color: 'white', borderRadius: '4px' }}>
            {d}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
        {data.map((anime: any) => (
          <div key={anime.mal_id} style={{ width: '225px', background: 'rgba(20,20,35,0.9)', padding: '1rem', borderRadius: '8px' }}>
            <img src={anime.images.jpg.image_url} alt={anime.title} style={{ width: '100%', borderRadius: '4px' }} />
            <h4 style={{ marginTop: '0.5rem' }}>{anime.title}</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--primary-color)' }}>🕒 {anime.broadcast.string}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
"""

# Stats Page
stats_tsx = """\"use client\";
export default function StatsPage() {
  return <div><h1 style={{color: 'var(--primary-color)'}}>📊 My Stats</h1><p>Analytics coming soon via Recharts!</p></div>;
}
"""

# Community Page
community_tsx = """\"use client\";
import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../AuthContext';
import api from '../../api/client';

export default function CommunityPage() {
  const { user } = useContext(AuthContext);
  const [friends, setFriends] = useState([]);

  useEffect(() => {
    if (user) {
      api.get(`/community/friends?username=${user}`).then(res => setFriends(res.data.data));
    }
  }, [user]);

  return (
    <div>
      <h1 style={{color: 'var(--primary-color)'}}>🌐 Community</h1>
      <h3>My Friends</h3>
      <ul>
        {friends.map((f: string) => <li key={f}>{f}</li>)}
      </ul>
    </div>
  );
}
"""

# Settings Page
settings_tsx = """\"use client\";
import { useContext } from 'react';
import { AuthContext } from '../AuthContext';

export default function SettingsPage() {
  const { user, logout } = useContext(AuthContext);
  return (
    <div>
      <h1 style={{color: 'var(--primary-color)'}}>⚙️ Settings</h1>
      <p>Logged in as: {user}</p>
      <button onClick={logout} style={{ padding: '0.5rem 1rem', background: 'red', color: 'white', borderRadius: '4px', marginTop: '1rem' }}>Logout</button>
    </div>
  );
}
"""

base = "frontend/src/app"
create_file(f"{base}/discover/page.tsx", discover_tsx)
create_file(f"{base}/collection/page.tsx", collection_tsx)
create_file(f"{base}/schedule/page.tsx", schedule_tsx)
create_file(f"{base}/stats/page.tsx", stats_tsx)
create_file(f"{base}/community/page.tsx", community_tsx)
create_file(f"{base}/settings/page.tsx", settings_tsx)

print("Frontend pages generated successfully.")
