import { Request, Response, NextFunction } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';
import { ParsedQs } from 'qs';
import { verifyIdToken, extractBearerToken } from '../services/firebaseAuth';
import { prisma } from '../utils/prisma';

/**
 * Authentication middleware.
 *
 * Replaces the previous JWT implementation: the client now sends a Firebase
 * ID token (obtained from the Firebase JS SDK), we verify it against Google's
 * public certificates, and resolve the user profile from RTDB keyed by the
 * Firebase uid. `bcrypt` and `JWT_SECRET` are no longer involved.
 */

interface AuthUser {
  /** Firebase uid — the RTDB key of the user profile. */
  id: string;
  email: string;
  role: string;
}

export type AuthRequest<
  Params extends ParamsDictionary = ParamsDictionary,
  ResBody = any,
  ReqBody = any,
  ReqQuery = ParsedQs
> = Request<Params, ResBody, ReqBody, ReqQuery> & {
  user?: AuthUser;
};

/**
 * Verifies the bearer ID token and attaches `req.user`.
 *
 * The profile is read from RTDB on every request on purpose: `role` is
 * checked by `authorizeRole`, and caching it would let a demoted admin keep
 * their access for the duration of the cache.
 */
export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = extractBearerToken(req.headers.authorization);

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const verified = await verifyIdToken(token);

    const profile = await prisma.user.findUnique({
      where: { id: verified.uid },
      select: { id: true, email: true, role: true, isActive: true },
    });

    if (!profile) {
      return res
        .status(401)
        .json({ error: 'Account profile not found. Please complete sign-up.' });
    }

    if (!profile.isActive) {
      return res.status(403).json({ error: 'Account is deactivated' });
    }

    req.user = {
      id: profile.id,
      email: profile.email,
      role: profile.role,
    };

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export const authorizeRole = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    next();
  };
};
