import type { AuthUser } from '@salary/shared';
import type { RequestHandler, Response } from 'express';
import type { AuthService } from '../auth/service.ts';
import { UnauthenticatedError } from '../domain/errors.ts';
import { readCookie } from './cookies.ts';

export const SESSION_COOKIE = 'sid';

/** Lets a request through only with a live session; the user is on `res.locals.user`. */
export function requireAuth(auth: AuthService): RequestHandler {
  return async (req, res, next) => {
    const user = await auth.currentUser(readCookie(req.headers.cookie, SESSION_COOKIE));
    if (!user) throw new UnauthenticatedError();
    res.locals.user = user;
    next();
  };
}

export function signedInUser(res: Response): AuthUser {
  return res.locals.user as AuthUser;
}
