'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { authApi, handleApiError, type AuthResponse } from './api';

type User = {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  role?: string;
  tier?: string;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signUp: (email: string, password: string, data?: any) => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  error: null,
  isAuthenticated: false,
  signIn: async () => {},
  signOut: async () => {},
  signUp: async () => {},
  refreshUser: async () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (token) {
        const userData = await authApi.getCurrentUser();
        setUser(userData);
        setError(null);
      }
    } catch (err) {
      localStorage.removeItem('auth_token');
      setUser(null);
      setError(null); // Silent fail on initial check
    } finally {
      setLoading(false);
    }
  };

  const refreshUser = async () => {
    try {
      const userData = await authApi.getCurrentUser();
      setUser(userData);
      setError(null);
    } catch (err) {
      const message = handleApiError(err);
      setError(message);
      localStorage.removeItem('auth_token');
      setUser(null);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setError(null);
      setLoading(true);
      const response: AuthResponse = await authApi.login(email, password);
      localStorage.setItem('auth_token', response.token);
      setUser(response.user);
    } catch (err) {
      const message = handleApiError(err);
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, data?: any) => {
    try {
      setError(null);
      setLoading(true);
      const response: AuthResponse = await authApi.register(email, password, data);
      localStorage.setItem('auth_token', response.token);
      setUser(response.user);
    } catch (err) {
      const message = handleApiError(err);
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      await authApi.logout();
    } catch (err) {
      // Ignore logout errors
    } finally {
      localStorage.removeItem('auth_token');
      setUser(null);
      setError(null);
    }
  };

  const isAuthenticated = !!user && !!localStorage.getItem('auth_token');

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        loading, 
        error, 
        isAuthenticated, 
        signIn, 
        signOut, 
        signUp, 
        refreshUser 
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
