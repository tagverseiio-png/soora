'use client';

import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { authApi, handleApiError, type User, type AuthResponse, usersApi, type Address } from './api';

type AuthContextType = {
  user: User | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  selectedAddress: Address | null;
  addresses: Address[];
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signUp: (email: string, password: string, data?: any) => Promise<void>;
  refreshUser: () => Promise<void>;
  setSelectedAddress: (address: Address | null) => void;
  fetchAddresses: () => Promise<void>;
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
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const addressesInFlight = useRef<Promise<void> | null>(null);
  const addressesCooldownUntil = useRef<number>(0);

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

  const fetchAddresses = useCallback(async () => {
    const now = Date.now();
    if (addressesCooldownUntil.current && now < addressesCooldownUntil.current) {
      return;
    }
    if (addressesInFlight.current) {
      return addressesInFlight.current;
    }

    const run = (async () => {
      try {
        const userAddresses = await usersApi.getAddresses();
        setAddresses(userAddresses || []);
        const defaultAddr = userAddresses?.find((a: Address) => a.isDefault);
        setSelectedAddress(defaultAddr || null);
      } catch (err: any) {
        const status = err?.status || err?.response?.status;
        if (status === 429) {
          // Back off to avoid hammering the rate limiter
          addressesCooldownUntil.current = Date.now() + 60_000;
          console.warn('Address fetch rate-limited (429). Cooling down for 60s.');
        }
        console.error('Failed to fetch addresses:', err);
        setAddresses([]);
        setSelectedAddress(null);
      } finally {
        addressesInFlight.current = null;
      }
    })();

    addressesInFlight.current = run;
    return run;
  }, []);

  const refreshUser = async () => {
    try {
      const userData = await authApi.getCurrentUser();
      setUser(userData);
      setError(null);
      await fetchAddresses();
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
        selectedAddress,
        addresses,
        signIn, 
        signOut, 
        signUp, 
        refreshUser,
        setSelectedAddress,
        fetchAddresses
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
