import type { Db } from './client.ts';
import { migrate } from './migrate.ts';
import { syncReferenceData } from './reference.ts';

/** Brings the database up to date: migrations, then reference data (docs/architecture.md §10). */
export async function prepareDatabase(db: Db): Promise<void> {
  await migrate(db);
  await syncReferenceData(db);
}

/**
 * Wraps a startup task so it runs once per instance. Concurrent callers share one run. Only
 * success is kept: after a failure the next call tries again, instead of every later request
 * failing until the instance is recycled.
 */
export function onceUntilSuccess(task: () => Promise<void>): () => Promise<void> {
  let running: Promise<void> | undefined;
  return () => {
    running ??= task().catch((error: unknown) => {
      running = undefined;
      throw error;
    });
    return running;
  };
}
