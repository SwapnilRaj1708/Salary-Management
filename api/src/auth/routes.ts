import { LoginRequest, type MeResponse } from '@salary/shared';
import { type CookieOptions, Router } from 'express';
import { readCookie } from '../http/cookies.ts';
import { requireAuth, SESSION_COOKIE, signedInUser } from '../http/requireAuth.ts';
import { parseWith } from '../http/validate.ts';
import type { AuthService } from './service.ts';

export function authRouter({
  auth,
  cookieSecure,
}: {
  auth: AuthService;
  cookieSecure: boolean;
}): Router {
  const router = Router();
  // Host-only (no Domain), so it stays on the one host that serves the app and the API.
  const cookie: CookieOptions = {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: cookieSecure,
  };

  router.post('/auth/login', async (req, res) => {
    const { email, password } = parseWith(LoginRequest, req.body);
    const session = await auth.login(email, password);
    res.cookie(SESSION_COOKIE, session.token, { ...cookie, expires: new Date(session.expiresAt) });
    const body: MeResponse = { user: session.user };
    res.json(body);
  });

  router.post('/auth/logout', requireAuth(auth), async (req, res) => {
    await auth.logout(readCookie(req.headers.cookie, SESSION_COOKIE) as string);
    res.clearCookie(SESSION_COOKIE, cookie);
    res.status(204).end();
  });

  router.get('/auth/me', requireAuth(auth), (_req, res) => {
    const body: MeResponse = { user: signedInUser(res) };
    res.json(body);
  });

  return router;
}
