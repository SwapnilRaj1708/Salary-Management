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

type TestAppOptions = { version?: string; clock?: Clock; cookieSecure?: boolean };

/** The real app on a fresh in-memory database, prepared on its first request as in production. */
export function testApp({
  version = 'test',
  clock = settableClock(),
  cookieSecure = false,
}: TestAppOptions = {}) {
  const db = openDb({ url: ':memory:' });
  const app = buildApp({
    config: { version, cookieSecure, admin: TEST_HR },
    db,
    clock,
    passwordParams: FAST_SCRYPT,
  });
  return { app, db };
}
