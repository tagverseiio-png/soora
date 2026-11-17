import axios from 'axios';
import jwt from 'jsonwebtoken';

/**
 * Verifies Firebase ID tokens without the firebase-admin SDK.
 *
 * firebase-admin requires a service-account JSON. Instead we fetch Google's
 * public x509 certificates (unauthenticated) and verify the RS256 signature
 * locally with `jsonwebtoken`, checking the standard Firebase claims:
 *
 *   iss = https://securetoken.google.com/<projectId>
 *   aud = <projectId>
 *   sub = the Firebase Auth uid (non-empty)
 *   exp = not expired (5 min clock tolerance)
 *
 * This is the same verification firebase-admin performs internally.
 */

const CERTS_URL =
  'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

export const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'soora-a92e1';
const ISSUER = `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`;

/** Certs rotate; refresh every 6h. */
const CERT_TTL_MS = 6 * 60 * 60 * 1000;

let certCache: { certs: Record<string, string>; fetchedAt: number } | null = null;

async function fetchCerts(force = false): Promise<Record<string, string>> {
  if (!force && certCache && Date.now() - certCache.fetchedAt < CERT_TTL_MS) {
    return certCache.certs;
  }
  const res = await axios.get<Record<string, string>>(CERTS_URL, { timeout: 10_000 });
  certCache = { certs: res.data, fetchedAt: Date.now() };
  return certCache.certs;
}

export interface VerifiedToken {
  /** Firebase Auth uid — this is the user's primary key in RTDB. */
  uid: string;
  email: string | null;
  emailVerified: boolean;
  name: string | null;
  /** `true` when Firebase has completed email/password sign-in for this token. */
  authTime: number;
}

function verifyWithCerts(
  token: string,
  certs: Record<string, string>
): VerifiedToken {
  const header = jwt.decode(token, { complete: true })?.header as
    | { kid?: string }
    | null
    | undefined;

  // Prefer the exact key the token was signed with; otherwise try them all
  // (handles key rotation where `kid` is unknown to our cached set).
  const candidates: string[] = [];
  if (header?.kid && certs[header.kid]) candidates.push(certs[header.kid]);
  for (const [kid, pem] of Object.entries(certs)) {
    if (!candidates.includes(pem)) candidates.push(pem);
  }
  if (candidates.length === 0) {
    throw new Error('No Firebase signing certificates available');
  }

  let lastError: unknown = null;
  for (const pem of candidates) {
    try {
      const payload = jwt.verify(token, pem, {
        algorithms: ['RS256'],
        issuer: ISSUER,
        audience: FIREBASE_PROJECT_ID,
        clockTolerance: 300, // seconds
      }) as jwt.JwtPayload;

      const uid = payload.sub;
      if (!uid || typeof uid !== 'string') {
        throw new Error('ID token is missing a subject (sub) claim');
      }

      return {
        uid,
        email: typeof payload.email === 'string' ? payload.email : null,
        emailVerified: payload.email_verified === true,
        name: typeof payload.name === 'string' ? payload.name : null,
        authTime: typeof payload.auth_time === 'number' ? payload.auth_time : 0,
      };
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Invalid ID token');
}

/**
 * Verifies a raw Firebase ID token string.
 * Throws if the token is expired, tampered with, or issued for another project.
 */
export async function verifyIdToken(token: string): Promise<VerifiedToken> {
  if (!token || typeof token !== 'string') {
    throw new Error('Missing ID token');
  }
  if (token.split('.').length !== 3) {
    throw new Error('Malformed ID token');
  }

  let certs = await fetchCerts();
  try {
    return verifyWithCerts(token, certs);
  } catch (error) {
    // The signing keys may have rotated since we cached them — refetch once.
    certs = await fetchCerts(true);
    return verifyWithCerts(token, certs);
  }
}

/** Extracts a Bearer token from an Authorization header. */
export function extractBearerToken(header?: string): string | null {
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1].trim() : null;
}
