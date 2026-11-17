import { Router, Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { validators } from '../middleware/validators';
import { validationResult } from 'express-validator';
import { authenticate, AuthRequest } from '../middleware/auth';
import { verifyIdToken, extractBearerToken } from '../services/firebaseAuth';
import { rtdbMultiUpdate } from '../data/rtdb';
import { serialize, MODELS } from '../data/schema';

/**
 * Firebase Auth routes.
 *
 * Passwords are no longer handled here at all — sign-in, sign-up and password
 * reset all happen in the browser through the Firebase JS SDK, which talks to
 * Firebase Auth directly. This file only:
 *
 *   POST /register  materialises the RTDB profile for a freshly created
 *                   Firebase account (idempotent, keyed by the Firebase uid)
 *   GET  /me        returns the profile for the caller's ID token
 *
 * `/login`, `/logout`, `/forgot-password` and `/reset-password` are gone:
 * there is no server-side session to create or destroy, and password reset is
 * `sendPasswordResetEmail` + `confirmPasswordReset` on the client.
 */

const router = Router();

/** Fields returned to the client. Never includes `password` or reset tokens. */
const PUBLIC_USER_SELECT = {
  id: true,
  email: true,
  name: true,
  phone: true,
  role: true,
  tier: true,
  dateOfBirth: true,
  ageVerified: true,
  emailVerified: true,
  isActive: true,
  createdAt: true,
} as const;

const MIN_AGE = Number(process.env.MIN_AGE ?? 18);
/** Average Gregorian year length, matching the original age check. */
const MS_PER_YEAR = 31557600000;

/** Models that reference a user by uid and must follow a re-key. */
const USER_CHILD_MODELS = ['address', 'order', 'review', 'cart'] as const;

/**
 * Moves a profile from one uid to another, re-pointing its children.
 *
 * Firebase guarantees one active account per email address, so if a profile
 * already holds this email under a *different* uid, that uid's Firebase
 * account no longer exists — an orphan left behind when an account was
 * deleted without cleaning up the database. Re-keying adopts it for the new
 * account instead of rejecting the sign-up forever, and preserves the user's
 * addresses, orders and reviews (which reference `userId`).
 *
 * Everything is applied as one atomic multi-path update so the profile can
 * never be seen half-moved.
 */
async function adoptOrphanedProfile(
  oldUid: string,
  newUid: string,
  patch: Record<string, unknown>
): Promise<void> {
  const profile = await prisma.user.findUnique({ where: { id: oldUid } });
  if (!profile) return;

  const updates: Record<string, unknown> = {};
  updates[`users/${newUid}`] = serialize('user', { ...profile, ...patch });
  updates[`users/${oldUid}`] = null;

  for (const model of USER_CHILD_MODELS) {
    const rows = await prisma[model].findMany({ where: { userId: oldUid } });
    for (const row of rows) {
      // Leaf writes only — never a parent and its child in the same update.
      updates[`${MODELS[model].path}/${row.id}/userId`] = newUid;
    }
  }

  await rtdbMultiUpdate(updates);
}

// Register — creates the RTDB profile for an existing Firebase account.
router.post('/register', validators.register, async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // The client must already be signed in to Firebase — we only verify.
    const token = extractBearerToken(req.headers.authorization);
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Mirrors `authenticate`: a token we cannot verify is a 401, not a 500.
    let verified;
    try {
      verified = await verifyIdToken(token);
    } catch {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const email = verified.email;
    if (!email) {
      return res.status(400).json({ error: 'Account has no email address' });
    }

    const { name, phone, dateOfBirth } = req.body;

    // Age verification (MIN_AGE+ for alcohol)
    if (dateOfBirth) {
      const age = Math.floor((Date.now() - new Date(dateOfBirth).getTime()) / MS_PER_YEAR);
      if (age < MIN_AGE) {
        return res.status(400).json({ error: `Must be ${MIN_AGE} or older to register` });
      }
    }

    // Profile fields supplied on this call, applied to a fresh or adopted row.
    const patch: Record<string, unknown> = { emailVerified: verified.emailVerified };
    if (name !== undefined) patch.name = name;
    if (phone !== undefined) patch.phone = phone;
    if (dateOfBirth !== undefined) {
      patch.dateOfBirth = new Date(dateOfBirth);
      patch.ageVerified = true;
    }

    // Idempotent: a retry (or a second device) must not fail or duplicate.
    // Also keeps the stored email in sync if it changed in Firebase.
    const existing = await prisma.user.findUnique({ where: { id: verified.uid } });
    if (existing) {
      if (existing.email !== email) {
        await prisma.user.update({
          where: { id: verified.uid },
          data: { email, emailVerified: verified.emailVerified },
          select: PUBLIC_USER_SELECT,
        });
      }
      const user = await prisma.user.findUnique({
        where: { id: verified.uid },
        select: PUBLIC_USER_SELECT,
      });
      return res.json({ user });
    }

    // Uniqueness is a logical constraint — RTDB cannot enforce it — so this
    // is check-then-create. Firebase itself rejects a second account with the
    // same email, so a clash here means an orphaned profile: adopt it.
    const byEmail = await prisma.user.findFirst({ where: { email } });
    if (byEmail && byEmail.id !== verified.uid) {
      await adoptOrphanedProfile(byEmail.id, verified.uid, patch);
      const user = await prisma.user.findUnique({
        where: { id: verified.uid },
        select: PUBLIC_USER_SELECT,
      });
      if (!user) {
        return res.status(500).json({ error: 'Failed to create profile' });
      }
      return res.json({ user });
    }

    const user = await prisma.user.create({
      data: {
        // Key the profile by the Firebase uid so `authenticate` can resolve it.
        id: verified.uid,
        email,
        ...patch,
      },
      select: PUBLIC_USER_SELECT,
    });

    res.status(201).json({ user });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return res.status(400).json({ error: 'Email already registered' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Get current user — profile is looked up fresh on every call so role changes
// (e.g. a demotion) take effect immediately.
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: PUBLIC_USER_SELECT,
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
