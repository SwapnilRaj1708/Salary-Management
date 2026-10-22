import { describe, expect, it } from 'vitest';
import { migratedDb } from '../test/db.ts';
import { openDb } from './client.ts';
import { onceUntilSuccess, prepareDatabase } from './prepare.ts';

function countingTask(outcomes: Array<'ok' | 'fail'>) {
  let calls = 0;
  const task = async () => {
    const outcome = outcomes[calls] ?? 'ok';
    calls += 1;
    if (outcome === 'fail') throw new Error('database unreachable');
  };
  return { task, calls: () => calls };
}

describe('onceUntilSuccess', () => {
  it('runs the task once for callers that arrive at the same time', async () => {
    const { task, calls } = countingTask(['ok']);
    const ready = onceUntilSuccess(task);

    await Promise.all([ready(), ready(), ready()]);

    expect(calls()).toBe(1);
  });

  it('does not run the task again after it succeeded', async () => {
    const { task, calls } = countingTask(['ok']);
    const ready = onceUntilSuccess(task);
    await ready();

    await ready();

    expect(calls()).toBe(1);
  });

  it('gives every waiting caller the failure', async () => {
    const { task } = countingTask(['fail']);
    const ready = onceUntilSuccess(task);

    const results = await Promise.allSettled([ready(), ready()]);

    expect(results.map((r) => r.status)).toEqual(['rejected', 'rejected']);
  });

  it('tries again on the next call after a failure', async () => {
    const { task, calls } = countingTask(['fail', 'ok']);
    const ready = onceUntilSuccess(task);
    await expect(ready()).rejects.toThrow('database unreachable');

    await ready();

    expect(calls()).toBe(2);
  });
});

describe('prepareDatabase', () => {
  it('migrates an empty database and fills in the reference data', async () => {
    const db = openDb({ url: ':memory:' });

    await prepareDatabase(db);

    const { rows } = await db.execute('SELECT count(*) AS n FROM countries');
    expect(Number(rows[0]?.n)).toBe(10);
  });

  it('is safe to run on a database that is already prepared', async () => {
    const db = await migratedDb();
    await prepareDatabase(db);

    await expect(prepareDatabase(db)).resolves.toBeUndefined();
  });
});
