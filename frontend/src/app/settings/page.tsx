"use client";
import React, { useState, useEffect, useContext, JSX, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings as SettingsIcon, Save, Image as ImageIcon, 
  Palette, Shield, User, LogOut, RefreshCcw, 
  Monitor, Cloud, Check, Upload, Trash2, Camera
} from 'lucide-react';
import { AuthContext } from '../AuthContext';
import api, { BACKEND_URL } from '../../api/client';
import { Button, Card, Input } from '../../components/UI';
import styles from './settings.module.css';

/* eslint-disable @next/next/no-img-element */
/* eslint-disable react-hooks/set-state-in-effect */

const THEMES = [
  { id: 'Dark', label: 'NEURAL_DARK', color: '#ff0055' },
  { id: 'Winter', label: 'CRYOGENIC', color: '#00f2ff' },
  { id: 'Halloween', label: 'SPECTRAL', color: '#ff6600' },
  { id: 'White', label: 'EUPHORIC', color: '#2563eb' },
  { id: 'Custom', label: 'OVERRIDE', color: '#00ff00' },
];

/**
 * SettingsPage Protocol — v3.1 (Multi-Asset DNA)
 * Decouples global atmosphere backgrounds from profile-specific hero banners.
 */
export default function SettingsPage(): JSX.Element {
  const auth = useContext(AuthContext);
  const user = auth?.user;
  
  const [theme, setTheme] = useState<string>('Dark');
  const [banner, setBanner] = useState<string>(''); // Profile Hero
  const [atmosphere, setAtmosphere] = useState<string>(''); // Global BG
  const [pfp, setPfp] = useState<string>('');
  const [customColor, setCustomColor] = useState<string>('#ff0055');
  const [saving, setSaving] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);
  const [uploading, setUploading] = useState<'atmosphere' | 'banner' | 'pfp' | null>(null);

  const bannerRef = useRef<HTMLInputElement>(null);
  const atmosRef = useRef<HTMLInputElement>(null);
  const pfpRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!user || !mounted) return;
    
    api.get('/user/theme/selection', { params: { username: user } })
      .then(r => setTheme(r.data.selection || 'Dark'))
      .catch(console.error);
    
    api.get(`/profile/${user}`)
      .then(r => {
        setBanner(r.data.banner_url || '');
        setAtmosphere(r.data.atmosphere_url || '');
        setCustomColor(r.data.theme_color || '#ff0055');
        setPfp(r.data.pfp_url || '');
      })
      .catch(console.error);
  }, [user, mounted]);

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    const themeConfig = THEMES.find(t => t.id === newTheme);
    const activeColor = newTheme === 'Custom' ? customColor : (themeConfig?.color || '#ff0055');
    document.documentElement.style.setProperty('--primary-color', activeColor);
  };

  const handleCustomColorChange = (color: string) => {
    setCustomColor(color);
    if (theme === 'Custom') {
      document.documentElement.style.setProperty('--primary-color', color);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'atmosphere' | 'banner' | 'pfp') => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(type);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const url = res.data.url;
      if (type === 'atmosphere') {
        setAtmosphere(url);
        document.documentElement.style.setProperty('--custom-bg', `url(${BACKEND_URL}${url})`);
      } else if (type === 'banner') {
        setBanner(url);
      } else {
        setPfp(url);
      }
    } catch (err) {
      console.error("Upload failed", err);
    } finally {
      setUploading(null);
    }
  };

  const handleSave = async (): Promise<void> => {
    if (!user) return;
    setSaving(true);
    try {
      const activeColor = theme === 'Custom' ? customColor : (THEMES.find(t => t.id === theme)?.color || '#ff0055');
      
      await api.post('/user/theme/selection', { username: user, selection: theme });
      await api.post('/profile/update', { 
        username: user, 
        banner_url: banner, 
        atmosphere_url: atmosphere,
        pfp_url: pfp,
        theme_color: activeColor
      });
      
      localStorage.setItem(`theme_color_${user}`, activeColor);
      localStorage.setItem(`theme_bg_${user}`, atmosphere); // For global sync
      
      alert("SYSTEM_SYNC_COMPLETE: CONFIGURATION_LOCKED");
    } catch (err) {
      console.error("Save failed", err);
    }
    setSaving(false);
  };

  const handleExport = async (): Promise<void> => {
    if (!user) return;
    try {
      const res = await api.get('/collection/export', { params: { username: user } });
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(res.data, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", `roninhub_archive_${user}_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
    } catch (err) {
      console.error("Export failed", err);
    }
  };

  const handleSync = async (): Promise<void> => {
    if (!user) return;
    try {
      const r = await api.get('/user/theme/selection', { params: { username: user } });
      setTheme(r.data.selection || 'Dark');
      const pr = await api.get(`/profile/${user}`);
      setBanner(pr.data.banner_url || '');
      setAtmosphere(pr.data.atmosphere_url || '');
      setCustomColor(pr.data.theme_color || '#ff0055');
      alert("NEURAL_SYNC_SUCCESS: DNA_REGENERATED");
    } catch (err) {
      console.error("Sync failed", err);
    }
  };

  const getPreviewUrl = (url: string) => {
    if (!url) return '';
    return url.startsWith('/') ? `${BACKEND_URL}${url}` : url;
  };

  if (!mounted) return <div className={styles.skeletonCard} />;
  if (!user) return <div className={styles.emptyState}>PLEASE INITIALIZE SESSION TO ACCESS SETTINGS.</div>;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <motion.h1 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className={styles.title}>
          <span className={styles.titlePrefix}>{"//"}</span> SYSTEM_SETTINGS
        </motion.h1>

        <Card className={styles.saveBar}>
          <div className={styles.reportLabel}>
            <SettingsIcon size={18} color="var(--primary-color)" />
            USER_PREFERENCE_OVERRIDE
          </div>
          <div style={{ flex: 1 }} />
          <Button variant="primary" icon={<Save size={16} />} onClick={handleSave} disabled={saving}>
            {saving ? 'SYNCING...' : 'SAVE_CONFIGURATION'}
          </Button>
        </Card>
      </header>

      <div className={styles.settingsGrid}>
        {/* Visual DNA Selection */}
        <Card className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <Palette size={20} color="var(--primary-color)" />
            <h3 className={styles.sectionTitle}>VISUAL_DNA_PRESETS</h3>
          </div>
          
          <div className={styles.themeGrid}>
            {THEMES.map(t => (
              <div
                key={t.id}
                onClick={() => handleThemeChange(t.id)}
                className={`${styles.themeOption} ${theme === t.id ? styles.themeOptionActive : ''}`}
              >
                <div className={styles.colorIndicator} style={{ background: t.color }} />
                <span className={styles.themeName}>{t.label}</span>
                {theme === t.id && <Check size={14} style={{ marginLeft: 'auto', marginRight: '10px' }} />}
              </div>
            ))}
          </div>

          <AnimatePresence>
            {theme === 'Custom' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ marginTop: '2rem', overflow: 'hidden' }}>
                <p className={styles.metricLabel} style={{ marginBottom: '1rem' }}>CUSTOM_HEX_OVERRIDE</p>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <div className={styles.colorPickerWrapper}>
                    <input type="color" value={customColor} onChange={e => handleCustomColorChange(e.target.value)} className={styles.realColorPicker} />
                    <div className={styles.colorPickerVisual} style={{ background: customColor }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <Input value={customColor} onChange={e => handleCustomColorChange(e.target.value)} />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>

        {/* Atmosphere Override (Global) */}
        <Card className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <Monitor size={20} color="var(--accent-cyan)" />
            <h3 className={styles.sectionTitle}>ATMOSPHERE_OVERRIDE</h3>
          </div>
          
          <div className={styles.imageSection}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p className={styles.metricLabel}>GLOBAL_BACKGROUND</p>
              <Button 
                variant="ghost" 
                size="sm" 
                icon={<Upload size={14} />}
                onClick={() => atmosRef.current?.click()}
                disabled={uploading === 'atmosphere'}
              >
                {uploading === 'atmosphere' ? 'UPLOADING...' : 'UPLOAD_ATMOSPHERE'}
              </Button>
              <input type="file" ref={atmosRef} hidden accept="image/*" onChange={e => handleFileUpload(e, 'atmosphere')} />
            </div>
            
            <div className={styles.previewContainer}>
              {atmosphere ? (
                <>
                  <img src={getPreviewUrl(atmosphere)} className={styles.previewImage} alt="Preview" />
                  <button className={styles.removeBtn} onClick={() => { setAtmosphere(''); document.documentElement.style.setProperty('--custom-bg', 'none'); }}>
                    <Trash2 size={16} />
                  </button>
                </>
              ) : (
                <div className={styles.previewPlaceholder}>
                  <ImageIcon size={32} opacity={0.2} />
                  NO_ATMOSPHERE_LOADED
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Identity Module (Profile Specific) */}
        <Card className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <User size={20} color="var(--success)" />
            <h3 className={styles.sectionTitle}>IDENTITY_MODULE</h3>
          </div>
          
          <div className={styles.identityContainer}>
            <div className={styles.bannerPreview}>
              {banner ? (
                <img src={getPreviewUrl(banner)} className={styles.bannerImage} alt="Banner" />
              ) : (
                <div className={styles.bannerPlaceholder}>NO_IDENTITY_BANNER</div>
              )}
              <button className={styles.bannerUploadBtn} onClick={() => bannerRef.current?.click()} disabled={uploading === 'banner'}>
                <ImageIcon size={14} style={{ marginRight: '6px' }} />
                {uploading === 'banner' ? 'UPLOADING...' : 'REPROGRAM_BANNER'}
              </button>
              <input type="file" ref={bannerRef} hidden accept="image/*" onChange={e => handleFileUpload(e, 'banner')} />
            </div>

            <div className={styles.identityRow}>
              <div className={styles.avatarWrapper}>
                <div className={styles.avatar} style={{ background: 'var(--primary-color)' }}>
                  {pfp ? (
                    <img src={getPreviewUrl(pfp)} className={styles.pfpImage} alt="Avatar" />
                  ) : (
                    user[0].toUpperCase()
                  )}
                </div>
                <button className={styles.pfpUploadBtn} onClick={() => pfpRef.current?.click()}>
                  <Camera size={14} />
                </button>
                <input type="file" ref={pfpRef} hidden accept="image/*" onChange={e => handleFileUpload(e, 'pfp')} />
              </div>
              <div className={styles.identityInfo}>
                <h4>{user.toUpperCase()}</h4>
                <p>STATUS: ONLINE</p>
                <p>ACCESS_LEVEL: ELITE_01</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Security Protocol */}
        <Card className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <Shield size={20} color="var(--warning)" />
            <h3 className={styles.sectionTitle}>SECURITY_PROTOCOL</h3>
          </div>
          <div className={styles.securityActions}>
            <Button variant="secondary" className={styles.ghostButton} fullWidth icon={<RefreshCcw size={16} />} onClick={handleSync}>
              SYNC_DATA_LOCALLY
            </Button>
            <Button variant="secondary" className={styles.ghostButton} fullWidth icon={<Cloud size={16} />} onClick={handleExport}>
              EXPORT_ARCHIVE
            </Button>
            <Button variant="secondary" className={styles.dangerButton} fullWidth icon={<LogOut size={16} />} onClick={() => auth?.logout?.()}>
              TERMINATE_SESSION
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
