'use client';

/**
 * Firebase client SDK setup.
 *
 * This is the browser-side counterpart to `backend/src/services/firebaseAuth.ts`:
 * sign-in / sign-up / password-reset all happen here against Firebase Auth,
 * and the resulting ID token is what the API expects in `Authorization`.
 *
 * Config comes from NEXT_PUBLIC_* env vars (see .env.local). Those are
 * intentionally public — they ship in the browser bundle and are not secrets.
 */

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  type Auth,
  type User as FirebaseUser,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

function isConfigured(): boolean {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
}

let app: FirebaseApp | null = null;

if (isConfigured()) {
  // React Fast Refresh / repeated mounts must not create a second app.
  app = getApps().length ? getApp() : initializeApp(firebaseConfig);
}

/**
 * The Firebase Auth instance, or `null` when NEXT_PUBLIC_FIREBASE_* is not set.
 * Callers should treat `null` as "auth is not configured" rather than crashing
 * the whole app on a missing env var.
 */
export const firebaseAuth: Auth | null = app ? getAuth(app) : null;

export const firebaseReady = firebaseAuth !== null;

/**
 * Returns the caller's current ID token, refreshing it if it has expired.
 *
 * Firebase ID tokens last ~1 hour, so this must be called per request rather
 * than cached — that is what makes `apiClient` transparently handle expiry.
 *
 * Returns `null` when nobody is signed in (or Firebase is not configured).
 */
export async function getFirebaseIdToken(): Promise<string | null> {
  if (!firebaseAuth) return null;
  const user = firebaseAuth.currentUser;
  if (!user) return null;
  try {
    return await user.getIdToken(/* forceRefresh */ false);
  } catch {
    return null;
  }
}

/** True when a Firebase user is currently signed in on this device. */
export function hasFirebaseSession(): boolean {
  return Boolean(firebaseAuth?.currentUser);
}

/**
 * Maps a Firebase Auth error to a message safe to show a user.
 *
 * Deliberately conservative: it returns a generic message for anything it
 * doesn't recognise rather than leaking an internal code. Also covers the
 * "auth is not configured" case thrown by callers when env vars are missing.
 */
export function firebaseAuthErrorMessage(err: unknown): string {
  const code = (err as any)?.code as string | undefined;

  // Not a Firebase error (e.g. our own "not configured" Error).
  if (!code || typeof code !== 'string' || !code.startsWith('auth/')) {
    const message = (err as any)?.message;
    return typeof message === 'string' && message ? message : 'Something went wrong. Please try again.';
  }

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
    case 'auth/expired-action-code':
      return 'This reset link has expired. Please request a new one';
    case 'auth/invalid-action-code':
      return 'This reset link is invalid or has already been used';
    case 'auth/user-mismatch':
      return 'This reset link belongs to a different account';
    case 'auth/missing-new-password':
      return 'Please enter a new password';
    default:
      return 'Something went wrong. Please try again.';
  }
}

export type { FirebaseUser };
