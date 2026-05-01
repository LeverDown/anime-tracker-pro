"use client";
import React, { useRef } from 'react';
import { SpecRow, HUDToggle } from '@/components/UI';
import { AtmosphereConfig } from '@/types/settings';

interface AtmosphereOverrideProps {
  config: AtmosphereConfig;
  onChange: (config: AtmosphereConfig) => void;
}

export const AtmosphereOverride: React.FC<AtmosphereOverrideProps> = ({ config, onChange }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onChange({ ...config, file: file.name }); // Store name as proxy for now
    }
  };

  const handleReset = () => {
    onChange({
      file: null,
      parallax: false,
      blurIntensity: 12,
      opacity: 0.35
    });
  };

  return (
    <section className="sector">
      <div className="sector-header">
        <div className="sector-title">☁ ATMOSPHERE_OVERRIDE //</div>
        <div className="sector-status">{config.file ? 'ATMOSPHERE_LOCKED' : 'NO_ATMOSPHERE_LOADED'}</div>
      </div>
      <div className="sector-body">
        <div 
          onClick={() => fileInputRef.current?.click()}
          style={{
            width: '100%',
            aspectRatio: '16/7',
            background: config.file ? 'rgba(255,45,85,0.05)' : 'var(--s-bg)',
            border: `1px ${config.file ? 'solid' : 'dashed'} var(--s-border)`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            cursor: 'pointer',
            marginBottom: '10px',
            position: 'relative',
            overflow: 'hidden'
          }} className="atmos-drop-hover">
          <input 
            type="file" 
            ref={fileInputRef} 
            style={{ display: 'none' }} 
            onChange={handleFileChange}
            accept="image/*,video/*"
          />
          {config.file ? (
            <>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--s-accent)' }}>{config.file.toUpperCase()} // LOADED</span>
              <div style={{ fontSize: '9px', color: 'var(--s-text-lo)' }}>CLICK TO REPLACE ASSET</div>
            </>
          ) : (
            <>
              <span style={{ fontSize: '26px', color: 'var(--s-text-lo)' }}>⬆</span>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--s-text-md)' }}>DROP ATMOSPHERE FILE //</div>
              <div style={{ fontSize: '9px', color: 'var(--s-text-lo)' }}>PNG / MP4 / WEBM — MAX 50MB</div>
            </>
          )}
        </div>

        <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
          <button 
            onClick={() => fileInputRef.current?.click()}
            style={{
              flex: 1,
              border: '1px solid var(--s-border)',
              background: 'transparent',
              color: 'var(--s-text-md)',
              fontSize: '11px',
              fontWeight: 700,
              padding: '8px 16px',
              letterSpacing: '0.08em',
              cursor: 'pointer',
              transition: 'all 0.12s'
            }} className="hud-btn-tactical">⬆ UPLOAD_FILE //</button>
          <button 
            onClick={handleReset}
            style={{
              border: '1px solid var(--s-border)',
              background: 'transparent',
              color: 'var(--s-text-md)',
              fontSize: '11px',
              fontWeight: 700,
              padding: '8px 16px',
              letterSpacing: '0.08em',
              cursor: 'pointer',
              transition: 'all 0.12s'
            }} className="hud-btn-tactical">↺ RESET //</button>
        </div>

        <SpecRow label="GLOBAL_BG" value={<span style={{ color: config.file ? 'var(--s-accent)' : 'var(--s-text-lo)' }}>{config.file ? 'ACTIVE' : 'NONE'}</span>} />
        <SpecRow label="PARALLAX">
          <HUDToggle value={config.parallax} onChange={(v) => onChange({ ...config, parallax: v })} />
        </SpecRow>
        <SpecRow label="BLUR_INTENSITY" value={`${config.blurIntensity}px`}>
          <input 
            type="range" min="0" max="40" step="1"
            value={config.blurIntensity} 
            onChange={(e) => onChange({ ...config, blurIntensity: parseInt(e.target.value) })}
            style={{ width: '60px', accentColor: 'var(--s-accent)' }}
          />
        </SpecRow>
        <SpecRow label="OPACITY" value={config.opacity.toFixed(2)}>
          <input 
            type="range" min="0" max="1" step="0.05"
            value={config.opacity} 
            onChange={(e) => onChange({ ...config, opacity: parseFloat(e.target.value) })}
            style={{ width: '60px', accentColor: 'var(--s-accent)' }}
          />
        </SpecRow>
      </div>
    </section>
  );
};
