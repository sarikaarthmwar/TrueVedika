import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from './mockData';
import { useLocation } from 'wouter';
import { apiRequest } from './queryClient';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string, redirectTo?: string | null) => Promise<void>;
  register: (name: string, email: string, password: string, redirectTo?: string | null) => Promise<void>;
  logout: () => Promise<void>;
  joinInitiative: (initiativeId: string) => Promise<void>;
  leaveInitiative: (initiativeId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (res.ok) {
        setUser(await res.json());
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    fetchUser().finally(() => setIsLoading(false));
  }, [fetchUser]);

  // redirectTo defaults to '/' (used by the full-page /auth screen).
  // Pass `null` to stay on the current page (used by the in-page auth prompt dialog).
  const login = async (email: string, password: string, redirectTo: string | null = '/') => {
    setIsLoading(true);
    try {
      const res = await apiRequest('POST', '/api/auth/login', { email, password });
      const loggedInUser = await res.json();
      await fetchUser();
      if (redirectTo) setLocation(redirectTo);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string, redirectTo: string | null = '/') => {
    setIsLoading(true);
    try {
      await apiRequest('POST', '/api/auth/register', { name, email, password });
      await fetchUser();
      if (redirectTo) setLocation(redirectTo);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    await apiRequest('POST', '/api/auth/logout');
    setUser(null);
    setLocation('/auth');
  };

  const joinInitiative = async (initiativeId: string) => {
    if (!user) return;
    await apiRequest('POST', `/api/initiatives/${initiativeId}/join`);
    await fetchUser();
  };

  const leaveInitiative = async (initiativeId: string) => {
    if (!user) return;
    await apiRequest('POST', `/api/initiatives/${initiativeId}/leave`);
    await fetchUser();
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, joinInitiative, leaveInitiative }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
