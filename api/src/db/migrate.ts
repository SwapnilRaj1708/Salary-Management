import type { Db } from './client.ts';
import { MIGRATIONS } from './migrations/index.ts';

/** One schema change: its statements run as a single batch, so they all apply or none do. */
export type Migration = { version: number; name: string; statements: readonly string[] };

/** Applies pending migrations and returns the versions this call applied. */
export async function migrate(
  _db: Db,
  _migrations: readonly Migration[] = MIGRATIONS,
): Promise<number[]> {
  throw new Error('Not implemented');
}
