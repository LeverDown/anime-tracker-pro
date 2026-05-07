"use client";
import React, { useState, useRef } from 'react';
import { Visibility } from '@/types/settings';
import { SpecRow, HUDToggle } from '@/components/UI';

interface IdentityModuleProps {
  username: string;
  profile: any | null;
  visibility: Visibility;
  setVisibility: (v: Visibility) => void;
  activityFeed: boolean;
  setActivityFeed: (v: boolean) => void;
}

export const IdentityModule: React.FC<IdentityModuleProps> = ({
  username,
  profile,
  visibility,
  setVisibility,
  activityFeed,
  setActivityFeed
}) => {
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const pfpInputRef = useRef<HTMLInputElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState(username);
  
  const stats = [
    { key: 'WATCHED', val: profile?.total_titles ?? '0', unit: 'series' },
    { key: 'EPISODES', val: profile?.total_episodes ?? '0', unit: '' },
    { key: 'MEAN_SCORE', val: profile?.avg_score?.toFixed(1) ?? '0.0', unit: '' },
    { key: 'DAYS', val: profile?.days_watched ?? '0', unit: 'd' },
  ];
  return (
    <section className="sector">
      <div className="sector-header">
        <div className="sector-title">◉ IDENTITY_MODULE //</div>
        <div className="sector-status">ONLINE // ELITE_01</div>
      </div>
      <div className="sector-body">
        <div style={{
          margin: '-14px -14px 14px',
          padding: '12px 14px',
          background: 'var(--s-bg3)',
          borderBottom: '1px solid var(--s-border)',
          display: 'flex',
          alignItems: 'center',
          gap: '14px'
        }}>
          <div style={{
          width: '52px',
          height: '52px',
          background: profile?.pfp_url ? `url(${profile.pfp_url}) center/cover` : 'var(--s-accent)',
          fontSize: '22px',
          fontWeight: 800,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          color: 'var(--s-text-hi)'
        }}>
          {!profile?.pfp_url && username[0]?.toUpperCase()}
          <input type="file" ref={pfpInputRef} style={{ display: 'none' }} accept="image/*" />
          <div 
            onClick={() => pfpInputRef.current?.click()}
            style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              width: '16px',
              height: '16px',
              background: 'var(--s-bg)',
              border: '1px solid var(--s-accent)',
              fontSize: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--s-accent)',
              zIndex: 5
            }}>✎</div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '17px', fontWeight: 800, letterSpacing: '0.06em', color: 'var(--s-text-hi)' }}>
            {username.toUpperCase()}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--s-text-md)', marginTop: '2px', fontWeight: 500 }}>
            STATUS // <span style={{ color: 'var(--s-accent)' }}>ONLINE</span> • UID // <span style={{ color: 'var(--s-accent)' }}>ID-00412</span>
          </div>
        </div>
        <div style={{
          marginLeft: 'auto',
          padding: '4px 10px',
          fontSize: '10px',
          fontWeight: 700,
          background: 'var(--s-accent-dim)',
          border: '1px solid var(--s-accent)',
          color: 'var(--s-accent)',
          letterSpacing: '0.1em'
        }}>
          ELITE_01
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '1px',
        background: 'var(--s-grid-gap)',
        marginBottom: '14px'
      }}>
        {stats.map(stat => (
          <div key={stat.key} style={{ background: 'var(--s-bg2)', padding: '12px 14px' }}>
            <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--s-text-lo)', letterSpacing: '0.1em', marginBottom: '4px' }}>{stat.key} //</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--s-text-hi)' }}>
              {stat.val}
              <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--s-accent)', marginLeft: '4px' }}>{stat.unit}</span>
            </div>
          </div>
        ))}
      </div>

      <SpecRow label="DISPLAY_NAME" value={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isEditing ? (
            <input 
              autoFocus
              value={tempName} 
              onChange={(e) => setTempName(e.target.value)} 
              onKeyDown={(e) => e.key === 'Enter' && setIsEditing(false)}
              onBlur={() => setIsEditing(false)}
              style={{ background: 'var(--s-bg)', border: '1px solid var(--s-accent)', color: 'var(--s-text-hi)', fontSize: '11px', padding: '2px 4px', outline: 'none' }}
            />
          ) : (
            <>
              <span>{tempName.toUpperCase()}</span>
              <span 
                onClick={() => setIsEditing(true)}
                style={{ fontSize: '8px', color: 'var(--s-text-lo)', cursor: 'pointer' }}>EDIT //</span>
            </>
          )}
        </div>
      } />
        <SpecRow label="PROFILE_VISIBILITY" value={
          <span style={{ color: 'var(--s-accent)', cursor: 'pointer' }} onClick={() => setVisibility(visibility === 'PUBLIC' ? 'PRIVATE' : 'PUBLIC')}>
            {visibility}
          </span>
        } />
        <SpecRow label="ACTIVITY_FEED">
          <HUDToggle value={activityFeed} onChange={setActivityFeed} />
        </SpecRow>

        <div 
          onClick={() => bannerInputRef.current?.click()}
          style={{
            width: '100%',
            height: '72px',
            background: 'var(--s-bg)',
            border: '1px dashed var(--s-border)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            cursor: 'pointer',
            marginTop: '10px',
            position: 'relative',
            overflow: 'hidden'
          }} className="banner-upload-hover">
          <input type="file" ref={bannerInputRef} style={{ display: 'none' }} accept="image/*" />
          <span style={{ fontSize: '24px', color: 'rgba(255,45,85,0.4)' }}>⬆</span>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--s-text-md)' }}>IDENTITY_BANNER // DROP OR CLICK TO UPLOAD</div>
          <div style={{ fontSize: '9px', color: 'var(--s-text-lo)' }}>RECOMMENDED: 1200×200px — PNG / JPG / WEBP</div>
        </div>
      </div>
    </section>
  );
};
