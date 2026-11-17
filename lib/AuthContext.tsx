'use client';

import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { authApi, handleApiError, type User, usersApi, type Address } from './api';
import { firebaseAuth } from './firebase';

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
  selectedAddress: null,
  addresses: [],
  signIn: async () => {},
  signOut: async () => {},
  signUp: async () => {},
  refreshUser: async () => {},
  setSelectedAddress: () => {},
  fetchAddresses: async () => {},
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

  /**
   * Loads the backend profile for the currently signed-in Firebase user.
   * Returns false when there is no usable profile (signed out, or the
   * account exists in Firebase but has no RTDB record yet).
   */
  const loadProfile = useCallback(async (): Promise<boolean> => {
    try {
      const userData = await authApi.getCurrentUser();
      setUser(userData);
      setError(null);
      await fetchAddresses();
      return true;
    } catch (err) {
      setUser(null);
      setAddresses([]);
      setSelectedAddress(null);
      setError(null); // Silent: this is the normal signed-out path
      return false;
    }
  }, [fetchAddresses]);

  // Restore the session on mount.
  //
  // `onAuthStateChanged` is Firebase's own persistence listener: it fires with
  // the restored user (or null) as soon as the SDK has hydrated its state, so
  // we never have to guess from localStorage whether someone is signed in.
  useEffect(() => {
    if (!firebaseAuth) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const unsubscribe = onAuthStateChanged(firebaseAuth, async (fbUser) => {
      if (cancelled) return;
      if (fbUser) {
        await loadProfile();
      } else {
        setUser(null);
        setAddresses([]);
        setSelectedAddress(null);
      }
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      setUser(null);
      setAddresses([]);
      setSelectedAddress(null);
    }
  };

  const signIn = async (email: string, password: string) => {
    if (!firebaseAuth) {
      throw new Error('Authentication is not configured');
    }
    try {
      setError(null);
      setLoading(true);
      await signInWithEmailAndPassword(firebaseAuth, email, password);
      // onAuthStateChanged will also fire, but awaiting here means `signIn`
      // only resolves once `user` is populated for the caller.
      await loadProfile();
    } catch (err) {
      const message = handleFirebaseError(err);
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, data?: any) => {
    if (!firebaseAuth) {
      throw new Error('Authentication is not configured');
    }
    try {
      setError(null);
      setLoading(true);

      const credential = await createUserWithEmailAndPassword(firebaseAuth, email, password);

      try {
        // Firebase account now exists — materialise the backend profile,
        // keyed by the new uid. The ID token identifies the caller.
        await authApi.register(data);
      } catch (err) {
        // Roll the Firebase account back so a validation failure (underage,
        // bad phone, duplicate email) doesn't leave an account that can never
        // sign in. The user can then retry with the same address.
        try {
          await credential.user.delete();
        } catch {
          /* best effort */
        }
        throw err;
      }

      await loadProfile();
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
      if (firebaseAuth) {
        await firebaseSignOut(firebaseAuth);
      }
    } catch (err) {
      // Ignore logout errors
    } finally {
      setUser(null);
      setAddresses([]);
      setSelectedAddress(null);
      setError(null);
    }
  };

  // Derived from real auth state, not a localStorage flag: Firebase keeps its
  // own persisted session, and `user` only exists once the profile loaded.
  const isAuthenticated = !!user;

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

/**
 * Maps Firebase Auth error codes to the human-readable messages the login and
 * sign-up forms already display. Unknown codes fall back to the API's own
 * message handling so backend errors (age check, duplicate email) pass through.
 */
function handleFirebaseError(err: unknown): string {
  const code = (err as any)?.code;
  switch (code) {
    case 'auth/invalid-email':
      return 'Please enter a valid email address';
    case 'auth/user-disabled':
      return 'This account has been disabled';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Invalid credentials';
    case 'auth/email-already-in-use':
      return 'Email already registered';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please try again later';
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection';
    case 'auth/operation-not-allowed':
      return 'Email/password sign-in is not enabled for this project';
    default:
      return handleApiError(err);
  }
}
