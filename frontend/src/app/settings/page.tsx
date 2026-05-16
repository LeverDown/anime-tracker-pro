"use client";
import React, { useState, useContext, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthContext } from '../AuthContext';
import { VisualDNAPresets } from './VisualDNAPresets';
import { IdentityModule } from './IdentityModule';
import { AtmosphereOverride } from './AtmosphereOverride';
import { NotificationConfig } from './NotificationConfig';
import { SecurityProtocol } from './SecurityProtocol';
import { SettingsState, PresetName, Visibility } from '@/types/settings';
import { Button } from '@/components/UI';
import { hexToHSLString } from '@/utils/color';
import api from '@/api/client';
import { getUserProfile, updateProfile, getUserThemeSelection } from '@/api/user';
import styles from './settings.module.css';

const PRESET_COLORS: Record<PresetName, string> = {
  NEURAL_DARK: '#ff2d55',
  CRYOGENIC: '#00d4ff',
  SPECTRAL: '#ff6a00',
  EUPHORIC: '#b44fff',
  OVERRIDE: '#39ff14',
  HAZARD: '#ffaa00',
};

const INITIAL_STATE: SettingsState = {
  activePreset: 'NEURAL_DARK',
  glassmorphism: true,
  scanAnimations: true,
  profileVisibility: 'PUBLIC',
  listVisibility: 'PUBLIC',
  activityFeed: true,
  atmosphere: {
    file: null,
    parallax: false,
    blurIntensity: 12,
    opacity: 0.35
  },
  notifications: {
    airingAlerts: true,
    seasonalIntel: true,
    communityFeed: true,
    scoreUpdates: false,
    systemAlerts: true,
    backlogReminders: false,
    deliveryMode: 'IN_APP + PUSH',
    quietHoursStart: '02:00',
    quietHoursEnd: '08:00'
  },
  customColor: '#00ff00',
  profile: null,
  isDirty: false,
  dirtyCount: 0
};

export default function SettingsPage() {
  const auth = useContext(AuthContext);
  const [state, setState] = useState<SettingsState>(INITIAL_STATE);

  const [lastSavedState, setLastSavedState] = useState<Partial<SettingsState> | null>(null);

  const applyTheme = useCallback((preset: PresetName, customColor?: string) => {
    const color = preset === 'OVERRIDE' ? (customColor || state.customColor) : (PRESET_COLORS[preset] || PRESET_COLORS.NEURAL_DARK);
    document.documentElement.style.setProperty('--primary-color', color);
    document.documentElement.style.setProperty('--primary-hsl', hexToHSLString(color));
  }, [state.customColor]);

  // Sync theme live on preset change (Optimistic Update)
  useEffect(() => {
    applyTheme(state.activePreset);
    
    // Apply Glassmorphism effect
    document.documentElement.style.setProperty('--glass-bg', state.glassmorphism ? 'rgba(21, 31, 46, 0.7)' : '#151f2e');
    
    // Apply Scan Animation effect (Global Scanline)
    document.documentElement.style.setProperty('--scan-line-opacity', state.scanAnimations ? '0.1' : '0');
    
    // Apply Parallax effect
    document.documentElement.style.setProperty('--parallax-intensity', state.atmosphere.parallax ? '1' : '0');
    document.documentElement.style.setProperty('--parallax-attachment', state.atmosphere.parallax ? 'scroll' : 'fixed');
  }, [state.activePreset, state.customColor, state.glassmorphism, state.scanAnimations, state.atmosphere.parallax, applyTheme]);

  // Initial Load
  useEffect(() => {
    if (!auth?.user) return;
    
    Promise.all([
      getUserProfile(auth.user),
      getUserThemeSelection(auth.user)
    ]).then(([profile, themeData]) => {
      const legacyMap: Record<string, PresetName> = {
        'Dark': 'NEURAL_DARK', 'Winter': 'CRYOGENIC', 'Halloween': 'SPECTRAL', 'White': 'EUPHORIC', 'Custom': 'OVERRIDE'
      };
      const preset = legacyMap[themeData.selection] || themeData.selection as PresetName;

      // Load persistent preferences from localStorage
      const cachedNotifications = localStorage.getItem(`notifications_${auth.user}`);
      const cachedAtmosphere = localStorage.getItem(`atmosphere_${auth.user}`);
      const cachedVisibility = localStorage.getItem(`visibility_${auth.user}`);

      const loadedState: SettingsState = {
        ...INITIAL_STATE,
        profile: profile,
        customColor: profile.theme_color || INITIAL_STATE.customColor,
        activePreset: preset || 'NEURAL_DARK',
        notifications: cachedNotifications ? JSON.parse(cachedNotifications) : INITIAL_STATE.notifications,
        atmosphere: cachedAtmosphere ? JSON.parse(cachedAtmosphere) : INITIAL_STATE.atmosphere,
        profileVisibility: (cachedVisibility as Visibility) || INITIAL_STATE.profileVisibility
      };

      setState(loadedState);
      setLastSavedState(loadedState);
    }).catch(console.error);
  }, [auth?.user]);

  const updateState = useCallback((patch: Partial<SettingsState>) => {
    setState(prev => {
      const newState = { ...prev, ...patch, isDirty: true };
      return { ...newState, dirtyCount: newState.isDirty ? prev.dirtyCount + 1 : 0 };
    });
  }, []);

  const handleSave = async () => {
    if (!auth?.user) return;
    try {
      const activeColor = state.activePreset === 'OVERRIDE' ? state.customColor : PRESET_COLORS[state.activePreset];
      
      await api.post('/user/theme/selection', { username: auth.user, selection: state.activePreset });
      await updateProfile({
        username: auth.user,
        theme_color: activeColor
      });

      // Persist all preferences
      localStorage.setItem(`theme_color_${auth.user}`, activeColor);
      localStorage.setItem(`notifications_${auth.user}`, JSON.stringify(state.notifications));
      localStorage.setItem(`atmosphere_${auth.user}`, JSON.stringify(state.atmosphere));
      localStorage.setItem(`visibility_${auth.user}`, state.profileVisibility);

      setState(prev => ({ ...prev, isDirty: false, dirtyCount: 0 }));
      setLastSavedState(state);
      alert("SYSTEM_SYNC_COMPLETE: CONFIGURATION_LOCKED");
    } catch (err) {
      console.error("SAVE_FAILED", err);
      alert("SYSTEM_SYNC_FAILURE: CONNECTION_LOST");
    }
  };

  const handleDiscard = () => {
    if (lastSavedState) {
      setState({ ...lastSavedState as SettingsState, isDirty: false, dirtyCount: 0 });
    }
  };

  return (
    <div className={`${styles.settingsPage} settings-page rds-hatch`}>
      <header style={{
        padding: '20px 20px 12px',
        borderBottom: '1px solid var(--s-border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        background: 'var(--s-bg2)'
      }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '0.06em', color: 'var(--s-text-hi)', margin: 0 }}>
            <span style={{ color: 'var(--s-accent)' }}>//</span> SYSTEM_SETTINGS
          </h1>
          <div style={{ fontSize: '11px', color: 'var(--s-text-lo)', letterSpacing: '0.12em', marginTop: '6px', fontWeight: 500 }}>
            USER_PREFERENCE_OVERRIDE // READY
          </div>
        </div>

        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '20px', fontSize: '11px', fontWeight: 600, color: 'var(--s-text-md)', letterSpacing: '0.08em' }}>
            <span>⚙ SYS // CONFIG_ACTIVE</span>
            <span>◉ SECTOR // CORE_IDENTITY</span>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {state.isDirty && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ padding: '0 20px', marginTop: '8px', overflow: 'hidden' } as React.CSSProperties}
          >
            <div style={{
              background: 'rgba(255,45,85,0.08)',
              border: '1px solid var(--s-accent-mid)',
              padding: '7px 14px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--s-accent)', letterSpacing: '0.08em' }}>
                ⚡ UNSAVED_CHANGES_DETECTED // {state.dirtyCount} PARAMETERS MODIFIED
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  onClick={handleDiscard}
                  style={{ background: 'transparent', border: '1px solid var(--s-border)', color: 'var(--s-text-md)', padding: '6px 12px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                >
                  DISCARD //
                </button>
                <button 
                  onClick={handleSave}
                  style={{ background: 'var(--s-accent)', color: 'var(--s-text-hi)', border: 'none', padding: '6px 12px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                >
                  APPLY_CHANGES //
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={styles.layout}>
        <main className={styles.main}>
          <div className={styles.grid2}>
            <VisualDNAPresets 
              activePreset={state.activePreset}
              onPresetChange={(p) => updateState({ activePreset: p })}
              customColor={state.customColor}
              setCustomColor={(c) => updateState({ customColor: c })}
              glassmorphism={state.glassmorphism}
              setGlassmorphism={(v) => updateState({ glassmorphism: v })}
              scanAnimations={state.scanAnimations}
              setScanAnimations={(v) => updateState({ scanAnimations: v })}
            />
            <IdentityModule 
              username={state.profile?.username || auth?.user || 'ROTTENFRUIT'}
              profile={state.profile}
              visibility={state.profileVisibility}
              setVisibility={(v) => updateState({ profileVisibility: v })}
              activityFeed={state.activityFeed}
              setActivityFeed={(v) => updateState({ activityFeed: v })}
            />
          </div>
          <div className={styles.grid3}>
            <AtmosphereOverride 
              config={state.atmosphere}
              onChange={(c) => updateState({ atmosphere: c })}
            />
            <NotificationConfig 
              prefs={state.notifications}
              onChange={(p) => updateState({ notifications: p })}
            />
            <SecurityProtocol 
              username={auth?.user || ""}
              onLogout={() => {
                if (confirm('TERMINATE_ALL_SESSIONS?')) {
                  auth?.logout();
                }
              }}
            />
          </div>
        </main>
      </div>

      <footer style={{
        height: '32px',
        background: 'var(--s-bg2)',
        borderTop: '1px solid var(--s-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        fontSize: '10px',
        fontWeight: 500,
        letterSpacing: '0.08em',
        color: 'var(--s-text-lo)',
        flexShrink: 0
      }}>
        <div>
          CONFIG_SESSION // ACTIVE — {state.dirtyCount} UNSAVED PARAMETERS
        </div>
        <div>
          RONINHUB v2.4.1 // BUILD_A1F2C9 // SYS: NOMINAL <span className={styles.cursor}>▋</span>
        </div>
      </footer>
    </div>
  );
}
