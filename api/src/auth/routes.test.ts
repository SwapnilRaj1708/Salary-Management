import { MeResponse } from '@salary/shared';
import request, { type Response } from 'supertest';
import { describe, expect, it } from 'vitest';
import { buildApp } from '../app.ts';
import { openDb } from '../db/client.ts';
import { FAST_SCRYPT, settableClock, TEST_HR, testApp } from '../test/app.ts';

const EIGHT_HOURS = 8 * 60 * 60 * 1000;

type App = ReturnType<typeof testApp>['app'];

const login = (app: App, body: object = TEST_HR) => request(app).post('/api/auth/login').send(body);

/** The `sid=…` pair from a login response, ready to send back as a Cookie header. */
function sessionCookie(res: Response): string {
  const header = [res.headers['set-cookie'] ?? []].flat().find((c) => c.startsWith('sid='));
  if (!header) throw new Error('no sid cookie was set');
  return header.split(';')[0] as string;
}

const me = (app: App, cookie?: string) => {
  const req = request(app).get('/api/auth/me');
  return cookie ? req.set('Cookie', cookie) : req;
};

describe('POST /api/auth/login', () => {
  it('signs the HR user in and returns them', async () => {
    const { app } = testApp();

    const res = await login(app);

    expect(res.status).toBe(200);
    expect(MeResponse.parse(res.body).user.email).toBe(TEST_HR.email);
  });

  it('sets an HttpOnly, SameSite=Lax session cookie for the whole site, without a Domain', async () => {
    const { app } = testApp();

    const res = await login(app);

    const cookie = [res.headers['set-cookie']].flat().find((c) => c?.startsWith('sid=')) ?? '';
    expect(cookie).toMatch(/; HttpOnly/);
    expect(cookie).toMatch(/; SameSite=Lax/);
    expect(cookie).toMatch(/; Path=\//);
    expect(cookie).not.toMatch(/Domain=/i);
    expect(cookie).not.toMatch(/; Secure/);
  });

  it('marks the cookie Secure when configured to, as in production', async () => {
    const { app } = testApp({ cookieSecure: true });

    const res = await login(app);

    expect(sessionCookie(res)).toBeTruthy();
    expect([res.headers['set-cookie']].flat().join()).toMatch(/; Secure/);
  });

  it('accepts the email in any letter case', async () => {
    const { app } = testApp();

    const res = await login(app, { ...TEST_HR, email: 'HR@Acme.Example' });

    expect(res.status).toBe(200);
  });

  it('gives a wrong password and an unknown email the same 401', async () => {
    const { app } = testApp();

    const wrongPassword = await login(app, { ...TEST_HR, password: 'nope' });
    const unknownEmail = await login(app, { ...TEST_HR, email: 'someone@acme.example' });

    for (const res of [wrongPassword, unknownEmail]) {
      expect(res.status).toBe(401);
      expect(res.headers['content-type']).toMatch(/^application\/problem\+json/);
      expect(res.body.code).toBe('INVALID_CREDENTIALS');
      expect(res.headers['set-cookie']).toBeUndefined();
    }
    expect(wrongPassword.body).toEqual(unknownEmail.body);
  });

  it('rejects a body with unknown fields as a validation failure', async () => {
    const { app } = testApp();

    const res = await login(app, { ...TEST_HR, role: 'admin' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_FAILED');
    expect(res.body.errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: '' })]),
    );
  });

  it('rejects malformed JSON as a validation failure, not a server error', async () => {
    const { app } = testApp();

    const res = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email": ');

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_FAILED');
  });

  it('issues a new session token at every login', async () => {
    const { app } = testApp();

    const first = sessionCookie(await login(app));
    const second = sessionCookie(await login(app));

    expect(first).not.toBe(second);
  });

  it('stores only a hash of the session token, never the token itself', async () => {
    const { app, db } = testApp();
    const token = sessionCookie(await login(app)).slice('sid='.length);

    const { rows } = await db.execute('SELECT token_hash FROM sessions');

    expect(rows).toHaveLength(1);
    expect(rows[0]?.token_hash).not.toBe(token);
    expect(String(rows[0]?.token_hash)).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('GET /api/auth/me', () => {
  it('answers 401 UNAUTHENTICATED without a session cookie', async () => {
    const { app } = testApp();

    const res = await me(app);

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHENTICATED');
  });

  it('answers 401 for a cookie that matches no session', async () => {
    const { app } = testApp();

    const res = await me(app, 'sid=not-a-real-token');

    expect(res.status).toBe(401);
  });

  it('returns the signed-in user', async () => {
    const { app } = testApp();
    const cookie = sessionCookie(await login(app));

    const res = await me(app, cookie);

    expect(res.status).toBe(200);
    expect(MeResponse.parse(res.body).user.email).toBe(TEST_HR.email);
  });

  it('ends the session 8 hours after login', async () => {
    const clock = settableClock();
    const { app } = testApp({ clock });
    const cookie = sessionCookie(await login(app));

    clock.advance(EIGHT_HOURS - 1);
    expect((await me(app, cookie)).status).toBe(200);

    clock.advance(1);
    expect((await me(app, cookie)).status).toBe(401);
  });
});

describe('POST /api/auth/logout', () => {
  it('deletes the session and clears the cookie, so the old cookie stops working', async () => {
    const { app, db } = testApp();
    const cookie = sessionCookie(await login(app));

    const res = await request(app).post('/api/auth/logout').set('Cookie', cookie);

    expect(res.status).toBe(204);
    expect([res.headers['set-cookie']].flat().join()).toMatch(/sid=;.*Expires=Thu, 01 Jan 1970/);
    expect((await db.execute('SELECT count(*) AS n FROM sessions')).rows[0]?.n).toBe(0);
    expect((await me(app, cookie)).status).toBe(401);
  });

  it('answers 401 when nobody is signed in', async () => {
    const { app } = testApp();

    const res = await request(app).post('/api/auth/logout');

    expect(res.status).toBe(401);
  });
});

describe('HR user provisioning at startup', () => {
  it('creates the configured HR user once, however many instances start', async () => {
    const db = openDb({ url: ':memory:' });
    const config = { version: 'test', admin: TEST_HR };
    const first = buildApp({ config, db, passwordParams: FAST_SCRYPT });
    const second = buildApp({ config, db, passwordParams: FAST_SCRYPT });

    await Promise.all([request(first).get('/api/health'), request(second).get('/api/health')]);

    const { rows } = await db.execute('SELECT email FROM users');
    expect(rows.map((row) => row.email)).toEqual([TEST_HR.email]);
  });

  it('adds a user for a newly configured email, so changing ADMIN_EMAIL takes effect', async () => {
    const db = openDb({ url: ':memory:' });
    await request(
      buildApp({ config: { version: 't', admin: TEST_HR }, db, passwordParams: FAST_SCRYPT }),
    ).get('/api/health');
    const renamed = { email: 'admin@acme.example', password: 'local-demo-password' };
    const app = buildApp({
      config: { version: 't', admin: renamed },
      db,
      passwordParams: FAST_SCRYPT,
    });

    const res = await login(app, renamed);

    expect(res.status).toBe(200);
  });

  it('stores the HR user email in lower case', async () => {
    const db = openDb({ url: ':memory:' });
    const app = buildApp({
      config: { version: 't', admin: { email: 'Admin@ACME.example', password: 'x' } },
      db,
      passwordParams: FAST_SCRYPT,
    });

    await request(app).get('/api/health');

    expect((await db.execute('SELECT email FROM users')).rows[0]?.email).toBe('admin@acme.example');
  });
});
