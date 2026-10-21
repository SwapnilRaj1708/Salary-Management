import { type Db, openDb } from '../db/client.ts';
import { migrate } from '../db/migrate.ts';

/** A fresh in-memory database with the real migrations applied. */
export async function migratedDb(): Promise<Db> {
  const db = openDb({ url: ':memory:' });
  await migrate(db);
  return db;
}
