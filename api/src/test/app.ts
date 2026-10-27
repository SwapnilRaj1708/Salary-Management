import request from 'supertest';
import { buildApp } from '../app.ts';
import type { ScryptParams } from '../auth/password.ts';
import { openDb } from '../db/client.ts';
import type { Clock } from '../domain/clock.ts';

/** The HR user every test app provisions at startup. */
export const TEST_HR = { email: 'hr@acme.example', password: 'correct horse battery' };

/** Cheap scrypt parameters for tests; production uses OWASP's (decision D9). */
export const FAST_SCRYPT: ScryptParams = { N: 2 ** 10, r: 8, p: 1 };

/** A clock the test moves by hand. */
export function settableClock(start = Date.UTC(2026, 9, 27, 9)) {
  let now = start;
  return {
    now: () => now,
    advance: (ms: number) => {
      now += ms;
    },
  } satisfies Clock & { advance(ms: number): void };
}

type TestAppOptions = {
  version?: string;
  clock?: Clock;
  cookieSecure?: boolean;
  timeZone?: string;
};

/** The real app on a fresh in-memory database, prepared on its first request as in production. */
export function testApp({
  version = 'test',
  clock = settableClock(),
  cookieSecure = false,
  timeZone = 'UTC',
}: TestAppOptions = {}) {
  const db = openDb({ url: ':memory:' });
  const app = buildApp({
    config: { version, cookieSecure, admin: TEST_HR, timeZone },
    db,
    clock,
    passwordParams: FAST_SCRYPT,
  });
  return { app, db };
}

/**
 * A supertest agent that has signed in as the test HR user and sends the session cookie
 * with every request.
 *
 * The cookie goes in an explicit header instead of the agent's cookie jar. The session's
 * expiry comes from the test clock, but the jar compares it with the real time, so a jar
 * would drop the cookie once the real time passed the test clock's expiry.
 */
export async function signedInAgent(app: ReturnType<typeof testApp>['app']) {
  const res = await request(app).post('/api/auth/login').send(TEST_HR);
  if (res.status !== 200) throw new Error(`test login failed with ${res.status}`);
  const sid = [res.headers['set-cookie'] ?? []].flat().find((c) => c.startsWith('sid='));
  if (!sid) throw new Error('test login set no session cookie');
  return request.agent(app).set('Cookie', sid.split(';')[0] as string);
}
