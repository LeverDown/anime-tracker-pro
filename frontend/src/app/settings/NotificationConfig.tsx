"use client";
import React from 'react';
import { SpecRow, HUDToggle } from '@/components/UI';
import { NotificationPrefs } from '@/types/settings';

interface NotificationConfigProps {
  prefs: NotificationPrefs;
  onChange: (prefs: NotificationPrefs) => void;
}

export const NotificationConfig: React.FC<NotificationConfigProps> = ({ prefs, onChange }) => {
  const toggleRow = (key: keyof NotificationPrefs, label: string, desc: string) => (
    <div key={key} style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '8px 0',
      borderBottom: '1px solid rgba(255,45,85,0.08)'
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', color: 'var(--s-text-hi)' }}>{label} //</div>
        <div style={{ fontSize: '10px', color: 'var(--s-text-md)', marginTop: '2px', fontWeight: 400 }}>{desc}</div>
      </div>
      <HUDToggle value={prefs[key] as boolean} onChange={(v) => onChange({ ...prefs, [key]: v })} />
    </div>
  );

  return (
    <section className="sector">
      <div className="sector-header">
        <div className="sector-title">🔔 NOTIFICATION_CONFIG //</div>
        <div className="sector-status">3 ACTIVE CHANNELS</div>
      </div>
      <div className="sector-body">
        {toggleRow('airingAlerts', 'AIRING_ALERTS', 'New episode broadcast notifications')}
        {toggleRow('seasonalIntel', 'SEASONAL_INTEL', 'New season preview briefings')}
        {toggleRow('scoreUpdates', 'SCORE_UPDATES', 'AniList score delta alerts')}
        {toggleRow('systemAlerts', 'SYSTEM_ALERTS', 'Maintenance and platform updates')}
        {toggleRow('backlogReminders', 'BACKLOG_REMINDERS', 'Roulette and watchlist nudges')}

        <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(255,45,85,0.08)' }}>
          <SpecRow label="DELIVERY_MODE" value={<span style={{ color: 'var(--s-accent)' }}>{prefs.deliveryMode}</span>} />
          <SpecRow label="QUIET_HOURS" value={`${prefs.quietHoursStart} — ${prefs.quietHoursEnd} JST`} />
        </div>
      </div>
    </section>
  );
};
