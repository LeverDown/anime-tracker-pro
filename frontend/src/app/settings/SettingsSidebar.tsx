"use client";
import React from 'react';

interface SidebarItemProps {
  label: string;
  icon: string;
  active?: boolean;
  badge?: string;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ label, icon, active, badge }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 16px',
    fontSize: '10px',
    letterSpacing: '0.06em',
    color: active ? 'var(--s-accent)' : 'var(--s-text-md)',
    borderLeft: `2px solid ${active ? 'var(--s-accent)' : 'transparent'}`,
    background: active ? 'var(--s-accent-dim)' : 'transparent',
    transition: 'all 0.1s',
    cursor: 'pointer'
  }}
  className="sidebar-item-hover"
  >
    <span style={{ fontSize: '12px' }}>{icon}</span>
    <span>{label}</span>
    {badge && (
      <span style={{
        marginLeft: 'auto',
        fontSize: '8px',
        padding: '1px 5px',
        background: 'var(--s-accent-dim)',
        color: 'var(--s-accent)',
        border: '1px solid var(--s-accent-mid)'
      }}>
        {badge}
      </span>
    )}
  </div>
);

export const SettingsSidebar: React.FC = () => {
  return (
    <aside style={{
      width: '200px',
      flexShrink: 0,
      background: 'var(--s-bg2)',
      borderRight: '1px solid var(--s-border)',
      padding: '12px 0',
      overflowY: 'auto'
    }}>
      <style>{`
        .sidebar-item-hover:hover {
          color: var(--s-text-hi) !important;
          background: rgba(255,45,85,0.04) !important;
        }
      `}</style>

      <div style={{ padding: '10px 16px 4px', fontSize: '8px', letterSpacing: '0.14em', color: 'var(--s-text-lo)', textTransform: 'uppercase' }}>
        CORE_MODULES //
      </div>
      <SidebarItem label="VISUAL_DNA" icon="◈" active />
      <SidebarItem label="IDENTITY" icon="◉" />
      <SidebarItem label="ATMOSPHERE" icon="☁" />
      <SidebarItem label="NOTIFICATIONS" icon="🔔" badge="3" />

      <div style={{ padding: '10px 16px 4px', fontSize: '8px', letterSpacing: '0.14em', color: 'var(--s-text-lo)', textTransform: 'uppercase', marginTop: '12px' }}>
        SYSTEM //
      </div>
      <SidebarItem label="DISPLAY" icon="◱" />
      <SidebarItem label="ACCESSIBILITY" icon="⌨" />
      <SidebarItem label="DATA_CACHE" icon="◎" />

      <div style={{ padding: '10px 16px 4px', fontSize: '8px', letterSpacing: '0.14em', color: 'var(--s-text-lo)', textTransform: 'uppercase', marginTop: '12px' }}>
        SECURITY //
      </div>
      <SidebarItem label="AUTH_PROTOCOL" icon="⊕" />
      <SidebarItem label="DANGER_ZONE" icon="⚠" />

      <div style={{ margin: '16px', borderTop: '1px solid var(--s-border)', paddingTop: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', marginBottom: '4px' }}>
          <span style={{ color: 'var(--s-text-lo)' }}>VERSION //</span>
          <span style={{ color: 'var(--s-accent)' }}>v2.4.1</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px' }}>
          <span style={{ color: 'var(--s-text-lo)' }}>BUILD //</span>
          <span style={{ color: 'var(--s-text-md)' }}>A1F2C9</span>
        </div>
      </div>
    </aside>
  );
};
