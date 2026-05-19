"use client";
import React, { useState, useEffect, useContext, JSX, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Compass, Trophy, Calendar, 
  Library, Bell, LogOut, Activity, Sparkles,
  Users, BarChart3, Settings as SettingsIcon, Dices, ChevronDown, User
} from 'lucide-react';
import { AuthContext } from '../../app/AuthContext';
import api from '../../api/client';
import { Button, Card } from '../UI';
import { Notification } from '../../types/anime';
import styles from './navbar.module.css';
import { getUserProfile } from '@/api/user';
import { BACKEND_URL } from '@/api/client';

interface NavbarProps {
  user?: string;
  pfp_url?: string;
}

/**
 * RONINHUB Navbar Protocol
 * Implements Top-Level Navigation with Tactical HUD aesthetics.
 */
export default function Navbar({ user: propUser, pfp_url }: NavbarProps = {}): JSX.Element {
  const auth = useContext(AuthContext);
  const contextUser = auth?.user;
  const user = propUser || contextUser;
  const pathname = usePathname();
  
  const [mounted, setMounted] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifs, setShowNotifs] = useState<boolean>(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState<boolean>(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const [profilePfp, setProfilePfp] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!pfp_url && user) {
      getUserProfile(user).then(profile => {
        setProfilePfp(profile?.pfp_url);
      }).catch(err => console.error("Failed to load navbar pfp:", err));
    }
  }, [user, pfp_url]);

  const activePfp = pfp_url || profilePfp;
  const resolvedPfp = activePfp 
    ? (activePfp.startsWith('/') ? `${BACKEND_URL}${activePfp}` : activePfp) 
    : undefined;

  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    setMounted(true);
    
    // Handle clicks outside to close dropdowns
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfileDropdown(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifs(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);



  const markRead = async (): Promise<void> => {
    // Logic deactivated
  };

  const logout = (): void => {
    auth?.logout?.();
    setShowProfileDropdown(false);
  };

  if (!mounted) return <div className={styles.navbar} style={{ opacity: 0 }} />;

  const sensors = [
    { name: 'Discover', icon: <Compass size={16} />, path: '/discover' },
    { name: 'Elite 100', icon: <Trophy size={16} />, path: '/top' },
    { name: 'Seasonal', icon: <Sparkles size={16} />, path: '/seasonal' },
    { name: 'Schedule', icon: <Calendar size={16} />, path: '/schedule' },
    { name: 'Community', icon: <Users size={16} />, path: '/community' },
  ];

  return (
    <motion.nav 
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 120 }}
      className={`${styles.navbar} rds-hatch`}
    >
      <Link href="/discover" className={styles.brand}>
        <div className={styles.logo} style={{ padding: '4px' }}>
          <Activity size={14} color="white" fill="white" />
        </div>
        <h1 className={styles.brandTitle}>
          RONIN<span style={{ color: 'var(--primary-color)' }}>HUB</span>
        </h1>
      </Link>

      <div className={styles.navLinks}>
        {sensors.map((item, idx) => (
          <React.Fragment key={item.name}>
            {idx > 0 && <div className={styles.separator} style={{ width: '1px', height: '12px', background: 'var(--hud-footer-border)', margin: '0 4px' }} />}
            <Link 
              href={item.path} 
              className={`${styles.navLink} ${pathname === item.path ? styles.navLinkActive : ''}`}
            >
              {item.name}
            </Link>
          </React.Fragment>
        ))}
      </div>

      <div className={styles.userActions}>
        {user ? (
          <>
            <div className={styles.notifWrapper} ref={notifRef}>
              <Button
                variant="ghost"
                onClick={() => { setShowNotifs(v => !v); if (!showNotifs) markRead(); }}
                icon={
                  <div style={{ position: 'relative', display: 'flex' }}>
                    <Bell size={20} color={unreadCount > 0 ? 'var(--primary-color)' : 'var(--text-dim)'} />
                    {unreadCount > 0 && (
                      <motion.span
                        className={styles.badge}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', damping: 10, stiffness: 300 }}
                      >
                        {unreadCount}
                      </motion.span>
                    )}
                  </div>
                }
              />
              
              <AnimatePresence>
                {showNotifs && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className={`glass-panel ${styles.notifPanel}`}
                  >
                    <div className={styles.notifHeader}>
                      <span className={styles.dropdownLabel}>INTEL_STREAM</span>
                      <Sparkles size={14} color="var(--primary-color)" />
                    </div>
                    <div className={styles.notifList}>
                      {notifications.length === 0 ? (
                        <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-dark)', fontSize: '10px' }}>
                          NO NEW INTEL.
                        </div>
                      ) : (
                        notifications.map((n, i) => (
                          <Card 
                            key={`notif-${i}`} 
                            hover={true} 
                            className={`${styles.notifCard} ${!n.is_read ? 'rds-glow-active' : ''}`}
                          >
                            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-main)', lineHeight: 1.4 }}>{n.message}</p>
                            <span style={{ fontSize: '10px', color: 'var(--text-dark)', marginTop: '4px', display: 'block' }}>
                              {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </Card>
                        ))
                      )}
                    </div>
                    {/* Tactical Scanline */}
                    <div className={styles.scanline} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div style={{ position: 'relative' }} ref={profileRef}>
              <div 
                className={styles.profileButton}
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              >
                <div className={styles.avatar}>
                  {resolvedPfp ? (
                    <img
                      src={resolvedPfp}
                      alt={user}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <span style={{ display: resolvedPfp ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                    {user ? user[0].toUpperCase() : ''}
                  </span>
                </div>
                <span className={styles.userName}>{user}</span>
                <ChevronDown size={14} color="var(--text-dark)" />
              </div>

              <AnimatePresence>
                {showProfileDropdown && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className={styles.dropdown}
                  >
                    <div className={styles.dropdownHeader}>
                      <span className={styles.dropdownLabel}>MEMBER_ZONE</span>
                    </div>
                    
                    <Link href="/collection" className={styles.dropdownItem} onClick={() => setShowProfileDropdown(false)}>
                      <Library size={16} />
                      My Collection
                    </Link>
                    
                    <Link href="/backlog" className={`${styles.dropdownItem} ${styles.nestedItem}`} onClick={() => setShowProfileDropdown(false)}>
                      <Dices size={14} />
                      Backlog Roulette
                    </Link>

                    <Link href="/stats" className={styles.dropdownItem} onClick={() => setShowProfileDropdown(false)}>
                      <BarChart3 size={16} />
                      Stats
                    </Link>

                    <Link href="/settings" className={styles.dropdownItem} onClick={() => setShowProfileDropdown(false)}>
                      <SettingsIcon size={16} />
                      Settings
                    </Link>

                    <div className={styles.dropdownDivider} />

                    <Link href={`/profile/${user}`} className={styles.dropdownItem} onClick={() => setShowProfileDropdown(false)}>
                      <User size={16} />
                      Profile Page
                    </Link>

                    <button className={`${styles.dropdownItem} ${styles.dropdownItemPrimary}`} onClick={logout}>
                      <LogOut size={16} />
                      Terminate Session
                    </button>
                    {/* Tactical Scanline */}
                    <div className={styles.scanline} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </>
        ) : (
          <Link href="/">
            <Button variant="primary" size="sm">
              INITIALIZE_SESSION
            </Button>
          </Link>
        )}
      </div>
      {/* Global Navbar Scanline */}
      <div className={styles.scanline} style={{ opacity: 0.03, height: '2px', top: 'auto', bottom: 0 }} />
    </motion.nav>
  );
}
