"use client";
import './globals.css';
import { Inter } from 'next/font/google';
import { useEffect, useContext, useCallback, JSX, useState, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AuthProvider, AuthContext } from './AuthContext';
import api, { BACKEND_URL } from '../api/client';
import { Navbar } from '../components/Navbar';
import { PageTransition } from '../components/UI/PageTransition';
import { hexToHSL } from '@/utils/color';
import { getUserProfile, getUserThemeSelection } from '@/api/user';

const inter = Inter({ subsets: ['latin'] });

function ThemeManager({ children }: { children: React.ReactNode }): JSX.Element {
  const auth = useContext(AuthContext);
  const user = auth?.user;

  const applyTheme = useCallback((color: string, banner: string): void => {
    if (color) {
      document.documentElement.style.setProperty('--primary-color', color);
      
      // Calculate HSL for Tactical HUD sync (Modern Space-Separated Syntax)
      const hsl = hexToHSL(color);
      if (hsl) {
        document.documentElement.style.setProperty('--primary-hsl', `${hsl.h} ${hsl.s}% ${hsl.l}%`);
      }
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

      getUserThemeSelection(user).then(data => {
        const sel = data.selection;
        const RDS_PRESETS: Record<string, string> = {
          NEURAL_DARK: '#ff2d55',
          CRYOGENIC: '#00d4ff',
          SPECTRAL: '#ff6a00',
          EUPHORIC: '#b44fff',
          OVERRIDE: '#39ff14',
          HAZARD: '#ffaa00',
          // Legacy mappings
          'Dark': '#ff2d55', 'Winter': '#00d4ff', 'Halloween': '#ff6a00', 'White': '#b44fff', 'Custom': '#39ff14'
        };

        if (sel && sel !== 'OVERRIDE' && sel !== 'Custom') {
          applyTheme(RDS_PRESETS[sel] || '#ff2d55', '');
        } else {
          getUserProfile(user).then(pr => {
            if (pr.theme_color) applyTheme(pr.theme_color, pr.atmosphere_url || '');
          });
        }
      }).catch(() => {
        getUserProfile(user).then(pr => {
          if (pr.theme_color) applyTheme(pr.theme_color, pr.atmosphere_url || '');
        });
      });
    } else {
      applyTheme('#ff0055', '');
      document.documentElement.style.setProperty('--custom-bg', 'none');
    }
  }, [user, applyTheme]);

  return <>{children}</>;
}

import { IntelProvider, IntelContext } from '@/context/IntelContext';
import { IntelAlert } from '@/components/UI/IntelAlert';
import { SeasonalIntelModal } from '@/components/UI/SeasonalIntelModal';
import { AnimatePresence } from 'framer-motion';

const IntelHUD = () => {
  const intel = useContext(IntelContext);
  if (!intel) return null;
  return (
    <>
      <IntelAlert episodes={intel.upcomingEpisodes} onDismiss={intel.dismissAlert} />
      <AnimatePresence>
        {intel.seasonalIntel && (
          <SeasonalIntelModal 
            key="seasonal-modal"
            intel={intel.seasonalIntel} 
            onClose={intel.dismissIntel} 
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isAuthPage = pathname === '/';
  const prevPathname = useRef(pathname);
  const direction = useRef<1 | -1>(1);

  // Track navigation direction
  useEffect(() => {
    const routeOrder = ['/', '/discover', '/top', '/seasonal', '/schedule', '/community', '/collection', '/backlog', '/stats', '/settings'];
    const currentIdx = routeOrder.indexOf(pathname);
    const prevIdx = routeOrder.indexOf(prevPathname.current);

    if (currentIdx !== -1 && prevIdx !== -1 && currentIdx !== prevIdx) {
      direction.current = currentIdx > prevIdx ? 1 : -1;
    }
    prevPathname.current = pathname;
  }, [pathname]);

  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <ThemeManager>
            <IntelProvider>
              <div style={{ display: 'flex', flexDirection: 'column', width: '100%', minHeight: '100vh' }}>
                {!isAuthPage && <Navbar />}
                <main style={{
                  marginTop: isAuthPage ? 0 : '52px',
                  padding: isAuthPage ? 0 : '12px 18px',
                  flex: 1,
                  minWidth: 0,
                  position: 'relative'
                }}>
                  <PageTransition
                    transitionKey={pathname}
                    variant={isAuthPage ? 'fade' : 'slide'}
                    direction={direction.current}
                  >
                    {children}
                  </PageTransition>
                </main>
              </div>
              <IntelHUD />
            </IntelProvider>
          </ThemeManager>
        </AuthProvider>
      </body>
    </html>
  );
}
