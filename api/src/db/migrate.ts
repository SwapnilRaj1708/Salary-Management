import type { Db } from './client.ts';
import { MIGRATIONS } from './migrations/index.ts';

/** One schema change: its statements run as a single batch, so they all apply or none do. */
export type Migration = { version: number; name: string; statements: readonly string[] };

/**
 * Applies pending migrations and returns the versions this call applied.
 *
 * Each migration's batch inserts its `schema_migrations` row first. If another instance
 * applied it in the meantime, that insert hits the primary key, the whole batch rolls back,
 * and this call re-reads the table and moves on (docs/architecture.md §10).
 */
export async function migrate(
  db: Db,
  migrations: readonly Migration[] = MIGRATIONS,
): Promise<number[]> {
  await db.execute(
    'CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY) STRICT',
  );
  const applied = new Set(await appliedVersions(db));
  const appliedNow: number[] = [];

  for (const migration of migrations) {
    if (applied.has(migration.version)) continue;
    try {
      await db.batch(
        [
          {
            sql: 'INSERT INTO schema_migrations (version) VALUES (?)',
            args: [BigInt(migration.version)],
          },
          ...migration.statements,
        ],
        'write',
      );
      appliedNow.push(migration.version);
    } catch (error) {
      if ((await appliedVersions(db)).includes(migration.version)) continue;
      throw error;
    }
  }
  return appliedNow;
}

async function appliedVersions(db: Db): Promise<number[]> {
  const { rows } = await db.execute('SELECT version FROM schema_migrations');
  return rows.map((row) => Number(row.version));
}
