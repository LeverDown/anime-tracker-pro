"use client";
import React, { useState, useEffect, useContext, JSX } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Compass, Trophy, Calendar, 
  Library, Bell, LogOut, Activity, Sparkles,
  Users, BarChart3, Settings as SettingsIcon, Dices
} from 'lucide-react';
import { AuthContext } from '../../app/AuthContext';
import api from '../../api/client';
import { Button, Card } from '../UI';
import { Notification } from '../../types/anime';
import styles from './sidebar.module.css';

/**
 * Sidebar Protocol
 * Enforces strict RDS aesthetic, token synchronization, and hydration safety.
 */
export default function Sidebar(): JSX.Element {
  const auth = useContext(AuthContext);
  const user = auth?.user;
  const pathname = usePathname();
  
  const [mounted, setMounted] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifs, setShowNotifs] = useState<boolean>(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!user) return;
    // Notification polling deactivated during Community Purge
    setNotifications([]);
    setUnreadCount(0);
  }, [user]);

  const markRead = async (): Promise<void> => {
    // Logic deactivated
  };

  const logout = (): void => {
    auth?.logout?.();
  };

  if (!mounted) return <div className={styles.sidebar} style={{ opacity: 0 }} />;

  const sensors = [
    { name: 'Discover', icon: <Compass size={20} />, path: '/discover' },
    { name: 'Elite 100', icon: <Trophy size={20} />, path: '/top' },
    { name: 'Seasonal', icon: <Sparkles size={20} />, path: '/seasonal' },
    { name: 'Schedule', icon: <Calendar size={20} />, path: '/schedule' },
    { name: 'Community', icon: <Users size={20} />, path: '/community' },
  ];

  const memberZone = [
    { name: 'My Collection', icon: <Library size={20} />, path: '/collection' },
    { name: 'Backlog Roulette', icon: <Dices size={20} />, path: '/backlog' },
    { name: 'Stats', icon: <BarChart3 size={20} />, path: '/stats' },
    { name: 'Settings', icon: <SettingsIcon size={20} />, path: '/settings' },
  ];

  return (
    <motion.div 
      initial={{ x: -280 }}
      animate={{ x: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 120 }}
      className={`glass-panel ${styles.sidebar}`}
    >
      <div className={styles.scrollArea}>
        <div className={styles.brand}>
          <div className={styles.logo}>
            <Activity size={20} color="white" fill="white" />
          </div>
          <h1 className={styles.brandTitle}>
            RONIN<span style={{ color: 'var(--primary-color)' }}>HUB</span>
          </h1>
        </div>

        <div className={styles.sectionLabel}>SENSORS</div>
        <div className={styles.navGroup}>
          {sensors.map((item) => (
            <Link href={item.path} key={item.name}>
              <Button
                variant={pathname === item.path ? 'primary' : 'ghost'}
                fullWidth
                icon={item.icon}
                className={styles.navButton}
              >
                {item.name}
              </Button>
            </Link>
          ))}
        </div>

        <div className={styles.sectionLabel}>MEMBER ZONE</div>
        <div className={styles.navGroup}>
          {user ? (
            memberZone.map((item) => (
              <Link href={item.path} key={item.name}>
                <Button
                  variant={pathname === item.path ? 'primary' : 'ghost'}
                  fullWidth
                  icon={item.icon}
                  className={styles.navButton}
                >
                  {item.name}
                </Button>
              </Link>
            ))
          ) : (
            <Link href="/">
              <Button variant="primary" fullWidth>
                INITIALIZE_SESSION
              </Button>
            </Link>
          )}
        </div>
      </div>

      {user && (
        <div className={styles.footer}>
          <div className={styles.notifWrapper}>
            <Button
              variant="ghost"
              fullWidth
              onClick={() => { setShowNotifs(v => !v); if (!showNotifs) markRead(); }}
              className={styles.navButton}
              icon={
                <div style={{ position: 'relative', display: 'flex' }}>
                  <Bell size={20} />
                  {unreadCount > 0 && <span className={styles.badge}>{unreadCount}</span>}
                </div>
              }
            >
              Updates
            </Button>
            
            <AnimatePresence>
              {showNotifs && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, x: 20 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95, x: 20 }}
                  className={`glass-panel ${styles.notifPanel}`}
                >
                  <div className={styles.notifHeader}>
                    <span className={styles.notifHeaderLabel}>ACTIVITY_STREAM</span>
                    <Sparkles size={14} color="var(--primary-color)" />
                  </div>
                  <div className={styles.notifList}>
                    {notifications.length === 0 ? (
                      <div className={styles.emptyNotifs}>NO NEW INTEL.</div>
                    ) : (
                      notifications.map((n, i) => (
                        <Card 
                          key={`notif-${i}`} 
                          hover={false} 
                          className={`${styles.notifCard} ${!n.is_read ? styles.notifUnread : ''}`}
                        >
                          <p className={styles.notifMessage}>{n.message}</p>
                          <span className={styles.notifTime}>
                            {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </Card>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <Link href={`/profile/${user}`}>
            <div className={styles.userProfile}>
              <div className={styles.avatar}>
                {user[0].toUpperCase()}
              </div>
              <div className={styles.userInfo}>
                <span className={styles.userName}>{user}</span>
                <span className={styles.userStatus}>ONLINE</span>
              </div>
            </div>
          </Link>

          <Button
            variant="ghost"
            fullWidth
            onClick={logout}
            className={styles.navButton}
            icon={<LogOut size={16} />}
          >
            LOGOUT
          </Button>
        </div>
      )}
    </motion.div>
  );
}
