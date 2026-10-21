import { buildApp } from '../app.ts';
import { openDb } from '../db/client.ts';

/** The real app on a fresh in-memory database, prepared on its first request as in production. */
export function testApp(version = 'test') {
  const db = openDb({ url: ':memory:' });
  return { app: buildApp({ config: { version }, db }), db };
}
