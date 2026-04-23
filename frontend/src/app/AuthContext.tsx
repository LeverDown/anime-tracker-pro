"use client";
import React, { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext<any>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("username");
    if (saved) setUser(saved);
  }, []);

  const login = (username: string) => {
    localStorage.setItem("username", username);
    setUser(username);
  };

  const logout = () => {
    localStorage.removeItem("username");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
