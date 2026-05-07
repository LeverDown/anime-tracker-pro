"use client";
import React, { createContext, useState, useEffect, ReactNode, JSX } from 'react';
import api from '@/api/client';
/* eslint-disable react-hooks/set-state-in-effect */

interface AuthContextType {
  user: string | null;
  login: (username: string) => void;
  logout: () => void;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextType | null>(null);

/**
 * AuthProvider Protocol — v2.0 (Hardened Auth)
 * Synchronizes local session state with backend identity registries.
 */
export const AuthProvider = ({ children }: { children: ReactNode }): JSX.Element => {
  const [user, setUser] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const hydrateSession = async () => {
      const saved = localStorage.getItem("username");
      if (saved) {
        setUser(saved);
        
        // SESSION_HYDRATION_PROTOCOL: Proactively refresh token on load
        try {
          await api.post('/auth/refresh');
          console.log("SESSION_HYDRATED_SUCCESSFULLY");
        } catch (err) {
          console.warn("SESSION_HYDRATION_FAILED // REDIRECTING_TO_IDENTITY_CORE");
          // If refresh fails on boot, we should probably clear the user to be safe
          localStorage.removeItem("username");
          setUser(null);
        }

        // Trigger global theme/bg sync on load
        const themeBg = localStorage.getItem(`theme_bg_${saved}`);
        const themeColor = localStorage.getItem(`theme_color_${saved}`);
        if (themeBg) document.documentElement.style.setProperty('--custom-bg', `url(${themeBg})`);
        if (themeColor) {
          document.documentElement.style.setProperty('--primary-color', themeColor);
          // Sync HSL for components using hsl(var(--primary-hsl))
          import('@/utils/color').then(({ hexToHSL }) => {
            const hsl = hexToHSL(themeColor);
            if (hsl) {
              document.documentElement.style.setProperty('--primary-hsl', `${hsl.h} ${hsl.s}% ${hsl.l}%`);
            }
          });
        }
      }
      setLoading(false);
    };

    hydrateSession();
  }, []);

  const login = (username: string): void => {
    localStorage.setItem("username", username);
    setUser(username);
  };

  const logout = (): void => {
    localStorage.removeItem("username");
    setUser(null);
    // Reset theme to default
    document.documentElement.style.setProperty('--primary-color', '#ff0055');
    document.documentElement.style.setProperty('--custom-bg', 'none');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
