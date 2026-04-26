"use client";
import './globals.css';
import { Inter } from 'next/font/google';
import { useEffect, useContext, useCallback, JSX, useState } from 'react';
import { usePathname } from 'next/navigation';
import { AuthProvider, AuthContext } from './AuthContext';
import api, { BACKEND_URL } from '../api/client';
import { Sidebar } from '../components/Sidebar';

const inter = Inter({ subsets: ['latin'] });

function ThemeManager({ children }: { children: React.ReactNode }): JSX.Element {
  const auth = useContext(AuthContext);
  const user = auth?.user;

  const applyTheme = useCallback((color: string, banner: string): void => {
    if (color) {
      document.documentElement.style.setProperty('--primary-color', color);
      const glowColor = color.startsWith('#') ? color : '#ff0055';
      document.documentElement.style.setProperty('--primary-glow', `${glowColor}66`);
    }
    if (banner) {
      const base = banner.startsWith('/') ? `${BACKEND_URL}${banner}` : banner;
      const fullUrl = `${base}?t=${Date.now()}`;
      document.documentElement.style.setProperty('--custom-bg', `url(${fullUrl})`);
      if (user) localStorage.setItem(`theme_bg_${user}`, banner);
    }
    if (color && user) localStorage.setItem(`theme_color_${user}`, color);
  }, [user]);

  useEffect(() => {
    if (user) {
      const cachedColor = localStorage.getItem(`theme_color_${user}`);
      const cachedBg = localStorage.getItem(`theme_bg_${user}`);
      
      if (cachedColor || cachedBg) {
        applyTheme(cachedColor || '#ff0055', cachedBg || '');
      }

      api.get('/user/theme/selection', { params: { username: user } }).then(r => {
        const sel = r.data.selection;
        if (sel && sel !== 'Custom') {
          const colors: Record<string, string> = { Halloween: '#ff6600', Winter: '#00f2ff', Dark: '#ff0055', White: '#2563eb' };
          applyTheme(colors[sel] || '#ff0055', '');
        } else {
          api.get(`/profile/${user}`).then(pr => {
            if (pr.data.theme_color) applyTheme(pr.data.theme_color, pr.data.atmosphere_url);
          });
        }
      }).catch(() => {
        api.get(`/profile/${user}`).then(pr => {
          if (pr.data.theme_color) applyTheme(pr.data.theme_color, pr.data.atmosphere_url);
        });
      });
    } else {
      document.documentElement.style.setProperty('--primary-color', '#ff0055');
      document.documentElement.style.setProperty('--primary-glow', 'rgba(255, 0, 85, 0.4)');
      document.documentElement.style.setProperty('--custom-bg', 'none');
    }
  }, [user, applyTheme]);

  return <>{children}</>;
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === '/';

  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <ThemeManager>
            <div style={{ display: 'flex', width: '100%', minHeight: '100vh' }}>
              {!isAuthPage && <Sidebar />}
              <main style={{ 
                marginLeft: isAuthPage ? 0 : 'var(--sidebar-width)', 
                padding: isAuthPage ? 0 : '2.5rem 3.5rem', 
                flex: 1, 
                minWidth: 0, 
                position: 'relative' 
              }}>
                {children}
              </main>
            </div>
          </ThemeManager>
        </AuthProvider>
      </body>
    </html>
  );
}
