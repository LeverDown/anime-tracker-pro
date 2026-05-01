"use client";
import React from 'react';
import { PresetName } from '@/types/settings';
import { SpecRow, HUDToggle } from '@/components/UI';

interface VisualDNAPresetsProps {
  activePreset: PresetName;
  onPresetChange: (p: PresetName) => void;
  customColor: string;
  setCustomColor: (c: string) => void;
  glassmorphism: boolean;
  setGlassmorphism: (v: boolean) => void;
  scanAnimations: boolean;
  setScanAnimations: (v: boolean) => void;
}

import { hexToHSL } from '@/utils/color';

const PRESET_COLORS: Record<PresetName, string> = {
  NEURAL_DARK: '#ff2d55',
  CRYOGENIC: '#00d4ff',
  SPECTRAL: '#ff6a00',
  EUPHORIC: '#b44fff',
  OVERRIDE: '#39ff14',
  HAZARD: '#ffaa00',
};

const THEMES: { id: PresetName; label: string; gradient: string; accent: string }[] = [
  { id: 'NEURAL_DARK', label: 'NEURAL_DARK', gradient: 'var(--s-dna-nd-grad)', accent: 'var(--s-dna-nd-acc)' },
  { id: 'CRYOGENIC', label: 'CRYOGENIC', gradient: 'var(--s-dna-cr-grad)', accent: 'var(--s-dna-cr-acc)' },
  { id: 'SPECTRAL', label: 'SPECTRAL', gradient: 'var(--s-dna-sp-grad)', accent: 'var(--s-dna-sp-acc)' },
  { id: 'EUPHORIC', label: 'EUPHORIC', gradient: 'var(--s-dna-eu-grad)', accent: 'var(--s-dna-eu-acc)' },
  { id: 'OVERRIDE', label: 'OVERRIDE', gradient: 'var(--s-dna-ov-grad)', accent: 'var(--s-dna-ov-acc)' },
  { id: 'HAZARD', label: 'HAZARD', gradient: 'var(--s-dna-hz-grad)', accent: 'var(--s-dna-hz-acc)' },
];

export const VisualDNAPresets: React.FC<VisualDNAPresetsProps> = ({
  activePreset,
  onPresetChange,
  customColor,
  setCustomColor,
  glassmorphism,
  setGlassmorphism,
  scanAnimations,
  setScanAnimations
}) => {
  const colorInputRef = React.useRef<HTMLInputElement>(null);
  return (
    <section className="sector">
      <div className="sector-header">
        <div className="sector-title">◈ VISUAL_DNA_PRESETS //</div>
        <div className="sector-status">6 PRESETS AVAILABLE</div>
      </div>
      <div className="sector-body">
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '8px',
          marginBottom: '12px'
        }}>
          {THEMES.map((t) => {
            const isOverride = t.id === 'OVERRIDE';
            const displayGradient = isOverride ? `linear-gradient(135deg, #0d0c14, ${customColor}33, ${customColor}66)` : t.gradient;
            const displayAccent = isOverride ? customColor : t.accent;
            
            return (
              <div
                key={t.id}
                onClick={() => onPresetChange(t.id)}
                style={{
                  border: `1px solid ${activePreset === t.id ? 'var(--s-accent)' : 'var(--s-border)'}`,
                  padding: '10px',
                  cursor: 'pointer',
                  background: activePreset === t.id ? 'var(--s-accent-dim)' : 'transparent',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'all 0.12s'
                }}
              >
                {activePreset === t.id && (
                  <>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'var(--s-accent)' }} />
                    <div style={{ position: 'absolute', top: '4px', right: '4px', fontSize: '9px', padding: '2px 6px', background: 'var(--s-accent)', color: 'var(--s-text-hi)', letterSpacing: '0.06em', zIndex: 10, fontWeight: 700 }}>
                    ACTIVE
                  </div>
                  </>
                )}
                <div style={{ width: '100%', height: '32px', background: displayGradient, marginBottom: '6px', position: 'relative' }}>
                  <div style={{ position: 'absolute', bottom: '3px', right: '3px', width: '8px', height: '8px', borderRadius: '50%', background: displayAccent }} />
                </div>
                <div style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.08em', color: activePreset === t.id ? 'var(--s-accent)' : 'var(--s-text-md)' }}>
                  {t.label}
                </div>
              </div>
            );
          })}

          <div 
            onClick={() => {
              onPresetChange('OVERRIDE');
              colorInputRef.current?.click();
            }}
            style={{
              gridColumn: '1 / -1',
              border: `1px ${activePreset === 'OVERRIDE' ? 'solid' : 'dashed'} var(--s-border)`,
              padding: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              cursor: 'pointer',
              background: activePreset === 'OVERRIDE' ? 'var(--s-accent-dim)' : 'transparent'
            }} className="custom-preset-hover">
            <input 
              type="color" 
              ref={colorInputRef} 
              style={{ display: 'none' }} 
              value={customColor}
              onChange={(e) => setCustomColor(e.target.value)}
            />
            <span style={{ fontSize: '14px', color: activePreset === 'OVERRIDE' ? 'var(--s-accent)' : 'rgba(255,45,85,0.4)' }}>{activePreset === 'OVERRIDE' ? '◎' : '+'}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--s-text-hi)' }}>CUSTOM_PRESET // BUILD YOUR OWN</div>
              <div style={{ fontSize: '9px', color: 'var(--s-text-lo)' }}>DEFINE HSL ACCENT + BACKGROUND TEMPERATURE</div>
            </div>
            <span style={{ color: 'var(--s-text-lo)' }}>→</span>
          </div>
        </div>

        <SpecRow label="ACTIVE_PRESET" value={activePreset} />
        <SpecRow label="ACCENT_HUE">
           <div style={{ width: '10px', height: '10px', background: 'var(--s-accent)', marginRight: '4px' }} />
           <span>
             {(() => {
               const hex = activePreset === 'OVERRIDE' ? customColor : PRESET_COLORS[activePreset];
               const { h, s, l } = hexToHSL(hex);
               return `HSL(${h}, ${s}%, ${l}%)`;
             })()}
           </span>
        </SpecRow>
        <SpecRow label="GLASSMORPHISM">
          <HUDToggle value={glassmorphism} onChange={setGlassmorphism} />
        </SpecRow>
        <SpecRow label="SCAN_ANIMATIONS">
          <HUDToggle value={scanAnimations} onChange={setScanAnimations} />
        </SpecRow>
      </div>
    </section>
  );
};
