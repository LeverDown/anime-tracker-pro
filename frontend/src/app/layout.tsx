"use client";
import './globals.css';
import { AuthProvider, AuthContext } from './AuthContext';
import { useContext } from 'react';
import Link from 'next/link';
import styles from './layout.module.css';

function Sidebar() {
  const { user, logout } = useContext(AuthContext);
  if (!user) return null;

  return (
    <div className={styles.sidebar}>
      <h2 className={styles.title}>⛩️ Pro Anime Tracker</h2>
      <Link href="/discover" className={styles.navLink}>🔍 Discover</Link>
      <Link href="/schedule" className={styles.navLink}>📅 Schedule</Link>
      <Link href="/collection" className={styles.navLink}>📚 My Collection</Link>
      <Link href="/stats" className={styles.navLink}>📊 My Stats</Link>
      <Link href="/community" className={styles.navLink}>🌐 Community</Link>
      <Link href="/settings" className={styles.navLink}>⚙️ Settings</Link>
      <hr style={{ borderColor: 'var(--primary-color)', opacity: 0.3 }} />
      <button onClick={logout} className={styles.navLink} style={{ textAlign: 'left' }}>🚪 Logout</button>
    </div>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <div style={{ display: 'flex' }}>
            <Sidebar />
            <main className={styles.mainContent}>
              {children}
            </main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
