"use client";
import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../AuthContext';
import api from '../../api/client';

export default function CommunityPage() {
  const { user } = useContext(AuthContext);
  const [friends, setFriends] = useState<string[]>([]);
  const [searchUser, setSearchUser] = useState('');
  const [searchMsg, setSearchMsg] = useState('');
  const [friendDetails, setFriendDetails] = useState<Record<string, any>>({});
  const [tab, setTab] = useState<'find' | 'friends'>('find');
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const loadFriends = async () => {
    if (!user) return;
    const res = await api.get('/community/friends', { params: { username: user } });
    setFriends(res.data.data);
  };

  useEffect(() => { loadFriends(); }, [user]);

  const loadFriendDetails = async (friendName: string) => {
    if (friendDetails[friendName]) return; // already loaded
    const myRes = await api.get('/collection', { params: { username: user, status_filter: 'Completed' } });
    const fRes = await api.get('/collection', { params: { username: friendName, status_filter: 'Completed' } });
    const myIds = new Set(myRes.data.data.map((a: any) => a.anime_id));
    const fData: any[] = fRes.data.data;
    const shared = fData.filter(a => myIds.has(a.anime_id));
    setFriendDetails(prev => ({ ...prev, [friendName]: { count: fData.length, shared } }));
  };

  const handleSearch = async () => {
    setSearchMsg('');
    if (!searchUser.trim()) return;
    if (searchUser.toLowerCase() === user?.toLowerCase()) { setSearchMsg('⚠️ That\'s you!'); return; }
    try {
      await api.get('/community/search', { params: { username: searchUser } });
      try {
        await api.post('/community/friends', { username: user, friend_username: searchUser });
        showToast(`✅ Added ${searchUser} as a friend!`);
        loadFriends();
      } catch {
        setSearchMsg(`ℹ️ You're already friends with ${searchUser}.`);
      }
    } catch {
      setSearchMsg(`❌ User "${searchUser}" not found.`);
    }
  };

  const handleRemoveFriend = async (friendName: string) => {
    await api.delete('/community/friends', { params: { username: user, friend_username: friendName } });
    setFriends(prev => prev.filter(f => f !== friendName));
    showToast(`Removed ${friendName}.`);
  };

  const tabBtnStyle = (active: boolean) => ({
    padding: '10px 24px', borderRadius: '8px', cursor: 'pointer', fontFamily: 'Orbitron, sans-serif', fontSize: '0.85rem',
    background: active ? 'var(--primary-color)' : 'rgba(255,255,255,0.05)',
    border: `1px solid ${active ? 'var(--primary-color)' : 'rgba(255,255,255,0.15)'}`,
    color: 'white', transition: 'all 0.2s',
  });

  return (
    <div>
      {toast && (
        <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', background: '#222', color: 'white', padding: '1rem 1.5rem', borderRadius: '8px', zIndex: 1000, border: '1px solid var(--primary-color)' }}>
          {toast}
        </div>
      )}

      <h1 style={{ color: 'var(--primary-color)', fontSize: '2rem', marginBottom: '1.5rem' }}>🌐 Community</h1>

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem' }}>
        <button style={tabBtnStyle(tab === 'find')} onClick={() => setTab('find')}>🔍 Find Users</button>
        <button style={tabBtnStyle(tab === 'friends')} onClick={() => setTab('friends')}>👥 My Friends ({friends.length})</button>
      </div>

      {tab === 'find' && (
        <div style={{ background: 'rgba(20,20,35,0.9)', padding: '2rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.07)', maxWidth: '480px' }}>
          <p style={{ color: '#aaa', marginBottom: '1rem' }}>Search for a registered username to add them as a friend.</p>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <input
              value={searchUser}
              onChange={e => setSearchUser(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Username…"
              style={{ flex: 1, padding: '10px 14px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,0,85,0.4)', color: 'white', borderRadius: '6px' }}
            />
            <button onClick={handleSearch} style={{ padding: '10px 20px', background: 'var(--primary-color)', color: 'white', borderRadius: '6px', fontFamily: 'Orbitron, sans-serif', cursor: 'pointer' }}>
              Add
            </button>
          </div>
          {searchMsg && <div style={{ marginTop: '0.75rem', fontSize: '0.9rem', color: '#ccc' }}>{searchMsg}</div>}
        </div>
      )}

      {tab === 'friends' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {friends.length === 0 && <p style={{ color: '#666' }}>You haven't added any friends yet. Use the Find Users tab!</p>}
          {friends.map(f => (
            <div key={f} style={{ background: 'rgba(20,20,35,0.92)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '1.25rem', cursor: 'pointer' }}
              onClick={() => loadFriendDetails(f)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '1rem' }}>👤 {f}</span>
                <button onClick={e => { e.stopPropagation(); handleRemoveFriend(f); }}
                  style={{ padding: '4px 12px', background: 'rgba(200,0,0,0.2)', border: '1px solid rgba(200,0,0,0.4)', color: '#ff6666', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>
                  Remove
                </button>
              </div>
              {friendDetails[f] && (
                <div style={{ marginTop: '1rem', fontSize: '0.85rem', color: '#aaa', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.75rem' }}>
                  <p>Completed shows: <strong style={{ color: 'white' }}>{friendDetails[f].count}</strong></p>
                  <p>Shows you both completed: <strong style={{ color: 'var(--primary-color)' }}>{friendDetails[f].shared.length}</strong></p>
                  {friendDetails[f].shared.length > 0 && (
                    <div style={{ marginTop: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                      {friendDetails[f].shared.slice(0, 5).map((a: any) => (
                        <span key={a.anime_id} style={{ padding: '2px 10px', borderRadius: '12px', background: 'rgba(255,0,85,0.15)', border: '1px solid rgba(255,0,85,0.3)', fontSize: '0.78rem', color: '#eee' }}>
                          {a.title}
                        </span>
                      ))}
                      {friendDetails[f].shared.length > 5 && <span style={{ fontSize: '0.78rem', color: '#666' }}>+{friendDetails[f].shared.length - 5} more</span>}
                    </div>
                  )}
                </div>
              )}
              {!friendDetails[f] && <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.5rem' }}>Click to compare tastes →</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
