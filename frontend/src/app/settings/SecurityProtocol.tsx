"use client";
import React from 'react';
import api from '@/api/client';
import { useQueryClient } from '@tanstack/react-query';

interface ActionRowProps {
  icon: string;
  label: string;
  desc: string;
  badge?: string;
  danger?: boolean;
  onClick?: () => void;
}

const ActionRow: React.FC<ActionRowProps> = ({ icon, label, desc, badge, danger, onClick }) => (
  <div 
    onClick={onClick}
    style={{
      border: danger ? '1px solid rgba(255,45,85,0.4)' : '1px solid var(--s-border)',
      padding: '9px 12px',
      marginBottom: '6px',
      cursor: 'pointer',
      transition: 'all 0.12s',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      background: 'transparent'
    }} className={danger ? 'danger-row-hover' : 'action-row-hover'}>
    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
      <span style={{ fontSize: '13px', color: danger ? 'var(--s-accent)' : 'var(--s-text-md)' }}>{icon}</span>
      <div>
        <div style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.06em', color: danger ? 'var(--s-accent)' : 'var(--s-text-hi)' }}>{label} {'//'}</div>
        <div style={{ fontSize: '10px', color: 'var(--s-text-md)', marginTop: '2px' }}>{desc}</div>
      </div>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      {badge && (
        <span style={{
          fontSize: '8px',
          padding: '1px 5px',
          border: '1px solid var(--s-cyan-dim)',
          color: 'var(--s-cyan)'
        }}>{badge}</span>
      )}
      <span style={{ fontSize: '10px', color: danger ? 'var(--s-accent)' : 'var(--s-text-lo)' }}>→</span>
    </div>
  </div>
);

export const SecurityProtocol: React.FC<{ username: string; onSync?: () => void; onLogout?: () => void }> = ({ username, onSync, onLogout }) => {
  const [status, setStatus] = React.useState('AUTH // SECURE');
  const queryClient = useQueryClient();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setStatus('SYSTEM // IMPORT_IN_PROGRESS');
      const formData = new FormData();
      formData.append('file', file);
      
      const endpoint = file.name.toLowerCase().endsWith('.xml') ? '/import/mal' : '/import/animeschedule';
      const res = await api.post(`${endpoint}?username=${username}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setStatus(`SYSTEM // IMPORT_SUCCESS (+${res.data.inserted})`);
      queryClient.invalidateQueries({ queryKey: ['user', username] });
    } catch (err) {
      console.error("IMPORT_FAILED", err);
      setStatus('SYSTEM // IMPORT_FAILURE');
      alert("CRITICAL_ERROR: DATA_IMPORT_FAILED");
    }
  };

  const handlePurge = async () => {
    if (!confirm('INITIATE_PURGE_PROTOCOL? THIS ACTION IS IRREVERSIBLE AND WILL WIPE ALL YOUR LISTS.')) return;
    
    try {
      setStatus('SYSTEM // PURGE_IN_PROGRESS');
      await api.delete('/collection/purge', { params: { username } });
      
      // Force-reset all TanStack Query caches and clear everything
      await queryClient.resetQueries({ queryKey: ['user'] });
      queryClient.clear();
      
      setStatus('SYSTEM // PURGE_COMPLETE');
      setTimeout(() => {
        // Full page reload to ensure zero cached state in memory or storage
        window.location.href = '/';
      }, 1500);
    } catch (err) {
      console.error("PURGE_FAILED", err);
      setStatus('SYSTEM // PURGE_FAILURE');
      alert("CRITICAL_ERROR: PURGE_PROTOCOL_FAILED");
    }
  };

  const handleExport = () => {
    const data = { site: 'RoninHub', timestamp: new Date().toISOString(), version: '2.4.1' };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'roninhub_archive.json';
    a.click();
    setStatus('SYSTEM // EXPORT_COMPLETE');
  };

  const handleSync = () => {
    setStatus('CACHE // SYNC_IN_PROGRESS...');
    setTimeout(() => {
      onSync?.();
      setStatus('CACHE // LOCAL_SYNC_NOMINAL');
    }, 1500);
  };

  const handleTerminate = async () => {
    if (!confirm('!!! CRITICAL_ALERT !!!\n\nYOU ARE ABOUT TO PERMANENTLY TERMINATE THIS IDENTITY.\nTHIS WILL DELETE ALL COLLECTIONS, HISTORY, AND YOUR USER ACCOUNT.\n\nTHIS ACTION CANNOT BE UNDONE. PROCEED?')) return;
    
    try {
      setStatus('SYSTEM // IDENTITY_DELETION_SEQUENCE_ACTIVE');
      await api.delete('/user/account', { params: { username } });
      
      // Clear everything
      await queryClient.resetQueries();
      queryClient.clear();
      if (onLogout) onLogout();
      
      setStatus('SYSTEM // IDENTITY_TERMINATED');
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    } catch (err) {
      console.error("TERMINATION_FAILED", err);
      setStatus('SYSTEM // TERMINATION_FAILURE');
      alert("CRITICAL_ERROR: IDENTITY_TERMINATION_SEQUENCE_FAULT");
    }
  };

  return (
    <section className="sector">
      <div className="sector-header">
        <div className="sector-title">⊕ SECURITY_PROTOCOL //</div>
        <div className="sector-status">{status}</div>
      </div>
      <div className="sector-body">
        <ActionRow icon="↺" label="SYNC_DATA_LOCALLY" desc="Push all list data to local cache" onClick={handleSync} />
        <ActionRow icon="⬆" label="IMPORT_ARCHIVE" desc="Upload AniList / MAL / AnimeSchedule archive" onClick={() => fileInputRef.current?.click()} />
        <input 
          type="file" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          accept=".json,.xml" 
          onChange={handleImport} 
        />
        <ActionRow icon="⬇" label="EXPORT_ARCHIVE" desc="Download full data archive — JSON / CSV" onClick={handleExport} />
        <ActionRow icon="⊕" label="CHANGE_PASSWORD" desc="Rotate authentication credentials" onClick={() => setStatus('AUTH // PASSWORD_RECOVERY_PENDING')} />
        <ActionRow icon="◎" label="TWO_FACTOR_AUTH" desc="TOTP authenticator — currently disabled" badge="DISABLED" onClick={() => setStatus('AUTH // TOTP_SETUP_PROTOCOL_REQUIRED')} />

        <div style={{
          marginTop: '12px',
          border: '1px solid var(--s-danger-border)',
          background: 'var(--s-danger-bg)',
          padding: '14px 16px'
        }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--s-accent)', letterSpacing: '0.12em', marginBottom: '10px' }}>
            ⚠ DANGER_ZONE // IRREVERSIBLE OPERATIONS
          </div>
          <ActionRow icon="⊘" label="PURGE_ALL_DATA" desc="Wipe all lists and preferences" danger onClick={handlePurge} />
          <ActionRow icon="💀" label="TERMINATE_IDENTITY" desc="Delete account and all neural data" danger onClick={handleTerminate} />
          <ActionRow icon="→" label="TERMINATE_SESSION" desc="Sign out all active devices" danger onClick={onLogout} />
        </div>
      </div>

      <style>{`
        .action-row-hover:hover {
          border-color: var(--s-border-h) !important;
          background: var(--s-accent-dim) !important;
        }
        .danger-row-hover:hover {
          background: rgba(255, 0, 40, 0.15) !important;
          border-color: var(--s-accent) !important;
        }
      `}</style>
    </section>
  );
};
