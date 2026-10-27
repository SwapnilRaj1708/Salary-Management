import { describe, expect, it } from 'vitest';
import { anEmployee, insertRow, withUsReferenceRows } from '../test/builders.ts';
import { migratedDb } from '../test/db.ts';
import { constraintFailure } from './errors.ts';

describe('constraintFailure', () => {
  it('reads a RAISE name from a local libSQL error', async () => {
    const db = await migratedDb();
    await withUsReferenceRows(db);
    await insertRow(db, 'employees', anEmployee({ status: 'left', left_on: '2025-01-01' }));

    const error = await db.execute("UPDATE employees SET full_name = 'X'").catch((e) => e);

    expect(constraintFailure(error)).toContain('EMPLOYEE_LEFT');
  });

  it('reads the failed constraint from a local batch error', async () => {
    const db = await migratedDb();
    await withUsReferenceRows(db);
    await insertRow(db, 'employees', anEmployee());

    const error = await db
      .batch(
        [
          {
            sql: 'INSERT INTO employees (full_name, email, job_title_id, department_id, country_code, hire_date, current_salary_minor) VALUES (?, ?, 1, 1, ?, ?, 1)',
            args: ['B', 'ada@acme.example', 'US', '2025-01-01'],
          },
        ],
        'write',
      )
      .catch((e) => e);

    expect(constraintFailure(error)).toContain('UNIQUE constraint failed: employees.email');
  });

  it("reads Turso's HTTP error shape, which has no extended code", () => {
    const error = Object.assign(new Error('SQLite error: EMPLOYEE_LEFT'), {
      code: 'SQLITE_CONSTRAINT',
      extendedCode: undefined,
    });

    expect(constraintFailure(error)).toContain('EMPLOYEE_LEFT');
  });

  it('ignores errors that are not constraint failures', () => {
    expect(constraintFailure(new Error('network down'))).toBeUndefined();
    expect(
      constraintFailure(Object.assign(new Error('busy'), { code: 'SQLITE_BUSY' })),
    ).toBeUndefined();
    expect(constraintFailure('a string')).toBeUndefined();
  });
});
