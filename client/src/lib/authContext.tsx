import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, MOCK_USERS } from './mockData';
import { useLocation } from 'wouter';

interface AuthContextType {
  user: User | null;
  login: (email: string) => void;
  logout: () => void;
  isLoading: boolean;
  joinInitiative: (initiativeId: string) => void;
  leaveInitiative: (initiativeId: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Simulate checking session
    const storedUserId = localStorage.getItem('truvedika_user_id');
    if (storedUserId) {
      const foundUser = MOCK_USERS.find(u => u.id === storedUserId);
      if (foundUser) {
        setUser(foundUser);
      }
    }
    setIsLoading(false);
  }, []);

  const login = (email: string) => {
    setIsLoading(true);
    // Simple mock login - finds user by email or defaults to first user
    setTimeout(() => {
      const foundUser = MOCK_USERS.find(u => u.email === email) || MOCK_USERS[0];
      setUser(foundUser);
      localStorage.setItem('truvedika_user_id', foundUser.id);
      setIsLoading(false);
      setLocation('/');
    }, 800);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('truvedika_user_id');
    setLocation('/auth');
  };

  const joinInitiative = (initiativeId: string) => {
    if (!user) return;
    const updatedUser = { 
      ...user, 
      joinedInitiatives: [...user.joinedInitiatives, initiativeId] 
    };
    setUser(updatedUser);
    // In a real app, this would update backend. Here we just update local state.
  };

  const leaveInitiative = (initiativeId: string) => {
    if (!user) return;
    const updatedUser = { 
      ...user, 
      joinedInitiatives: user.joinedInitiatives.filter(id => id !== initiativeId) 
    };
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading, joinInitiative, leaveInitiative }}>
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
