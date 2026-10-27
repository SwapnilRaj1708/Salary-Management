import { describe, expect, it } from 'vitest';
import { anEmployee, aSalaryChange, insertRow, withUsReferenceRows } from '../test/builders.ts';
import { migratedDb } from '../test/db.ts';
import { employeesRepository } from './repository.ts';

/** Ada, hired 2024-03-01 on 9,000,000 cents, with her hire row, written directly. */
async function dbWithAda() {
  const db = await migratedDb();
  await withUsReferenceRows(db);
  await insertRow(db, 'employees', anEmployee());
  await insertRow(db, 'salary_history', aSalaryChange());
  return db;
}

const change = {
  employeeId: 1,
  amountMinor: 9_500_000,
  currency: 'USD',
  effectiveDate: '2025-03-01',
  reason: 'annual_review',
  note: null,
  changedBy: null,
} as const;

// These call the repository directly, as a request would if another one changed the
// employee between its service checks and its write batch (decision D17).
describe('employee writes that no service checked', () => {
  it('rejects a salary change dated before the latest one, and keeps the current salary', async () => {
    const db = await dbWithAda();

    await expect(
      employeesRepository(db).addSalaryChange({ ...change, effectiveDate: '2024-02-01' }),
    ).rejects.toMatchObject({ code: 'EFFECTIVE_DATE_BEFORE_LATEST_CHANGE', status: 409 });
    const { rows } = await db.execute('SELECT current_salary_minor AS salary FROM employees');
    expect(rows[0]?.salary).toBe(9_000_000);
    const history = await db.execute('SELECT count(*) AS n FROM salary_history');
    expect(history.rows[0]?.n).toBe(1);
  });

  it('rejects a salary change for a leaver, and keeps the current salary', async () => {
    const db = await dbWithAda();
    await db.execute("UPDATE employees SET status = 'left', left_on = '2025-06-30'");

    await expect(employeesRepository(db).addSalaryChange(change)).rejects.toMatchObject({
      code: 'EMPLOYEE_LEFT',
    });
    const { rows } = await db.execute('SELECT current_salary_minor AS salary FROM employees');
    expect(rows[0]?.salary).toBe(9_000_000);
  });

  it('rejects a leaving date before the latest salary change as out of range', async () => {
    const db = await dbWithAda();
    await employeesRepository(db).addSalaryChange(change);

    await expect(employeesRepository(db).markLeft(1, '2025-02-28')).rejects.toMatchObject({
      code: 'DATE_OUT_OF_RANGE',
      status: 400,
    });
  });

  it('rejects a duplicate email as EMAIL_TAKEN', async () => {
    const db = await dbWithAda();

    await expect(
      employeesRepository(db).create({
        fullName: 'Another Ada',
        email: 'ada@acme.example',
        jobTitleId: 1,
        departmentId: 1,
        countryCode: 'US',
        hireDate: '2025-01-01',
        salaryMinor: 1_000_000,
        currency: 'USD',
        changedBy: null,
      }),
    ).rejects.toMatchObject({ code: 'EMAIL_TAKEN', status: 409 });
  });
});
