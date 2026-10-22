import type { Db } from '../db/client.ts';
import type { SeedEmployee } from './generate.ts';

export type WriteResult = { employees: number; salaryChanges: number };

/**
 * Writes the seeded organisation in batches. Refuses a database that already has employees
 * unless `reset` is set, which deletes employees and their history first (users and
 * reference data stay).
 */
export async function writeOrg(
  _db: Db,
  _org: readonly SeedEmployee[],
  _options: { reset: boolean },
): Promise<WriteResult> {
  throw new Error('Not implemented');
}
