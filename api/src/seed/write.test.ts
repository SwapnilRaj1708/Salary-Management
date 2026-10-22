import { describe, expect, it } from 'vitest';
import { syncReferenceData } from '../db/reference.ts';
import { insertRow } from '../test/builders.ts';
import { migratedDb } from '../test/db.ts';
import { HEADCOUNT, SEED, SEED_AS_OF } from './catalogue.ts';
import { generateOrg } from './generate.ts';
import { mulberry32 } from './prng.ts';
import { writeOrg } from './write.ts';

const smallOrg = generateOrg({ rng: mulberry32(SEED), count: 300, asOf: SEED_AS_OF });

async function preparedDb() {
  const db = await migratedDb();
  await syncReferenceData(db);
  return db;
}

const countOf = async (db: Awaited<ReturnType<typeof preparedDb>>, sql: string) =>
  Number((await db.execute(sql)).rows[0]?.n);

describe('writeOrg', () => {
  it('writes every employee and every salary change', async () => {
    const db = await preparedDb();

    const result = await writeOrg(db, smallOrg, { reset: false });

    const changes = smallOrg.reduce((sum, e) => sum + e.history.length, 0);
    expect(result).toEqual({ employees: 300, salaryChanges: changes });
    expect(await countOf(db, 'SELECT count(*) AS n FROM employees')).toBe(300);
    expect(await countOf(db, 'SELECT count(*) AS n FROM salary_history')).toBe(changes);
  });

  it('numbers employees in generation order, so employee codes are the same on every run', async () => {
    const db = await preparedDb();

    await writeOrg(db, smallOrg, { reset: false });

    const { rows } = await db.execute(
      "SELECT email FROM employees WHERE employee_code = 'EMP-000001'",
    );
    expect(rows[0]?.email).toBe(smallOrg[0]?.email);
  });

  it('stores a current salary equal to the latest history row for every employee', async () => {
    const db = await preparedDb();

    await writeOrg(db, smallOrg, { reset: false });

    const mismatches = await countOf(
      db,
      `SELECT count(*) AS n FROM employees e
       WHERE e.current_salary_minor IS NOT (
         SELECT h.amount_minor FROM salary_history h
         WHERE h.employee_id = e.id ORDER BY h.effective_date DESC, h.id DESC LIMIT 1)`,
    );
    expect(mismatches).toBe(0);
  });

  it('records each salary change in the currency of the employee country', async () => {
    const db = await preparedDb();

    await writeOrg(db, smallOrg, { reset: false });

    const wrongCurrency = await countOf(
      db,
      `SELECT count(*) AS n FROM salary_history h
       JOIN employees e ON e.id = h.employee_id
       JOIN countries c ON c.code = e.country_code
       WHERE h.currency_code <> c.currency_code`,
    );
    expect(wrongCurrency).toBe(0);
  });

  it('stores leavers as left, with their leaving date', async () => {
    const db = await preparedDb();

    await writeOrg(db, smallOrg, { reset: false });

    const leavers = smallOrg.filter((e) => e.leftOn !== null).length;
    expect(await countOf(db, "SELECT count(*) AS n FROM employees WHERE status = 'left'")).toBe(
      leavers,
    );
  });

  it('refuses a database that already has employees, so data is never wiped by accident', async () => {
    const db = await preparedDb();
    await writeOrg(db, smallOrg, { reset: false });

    await expect(writeOrg(db, smallOrg, { reset: false })).rejects.toThrow(/--reset/);
  });

  it('replaces existing employees on reset, and keeps users', async () => {
    const db = await preparedDb();
    await writeOrg(db, smallOrg, { reset: false });
    await insertRow(db, 'users', { email: 'hr@acme.example', password_hash: 'x' });

    await writeOrg(db, smallOrg.slice(0, 100), { reset: true });

    expect(await countOf(db, 'SELECT count(*) AS n FROM employees')).toBe(100);
    expect(await countOf(db, 'SELECT count(*) AS n FROM users')).toBe(1);
  });

  it('writes the full 10,000-employee organisation within the database constraints', async () => {
    const db = await preparedDb();
    const org = generateOrg({ rng: mulberry32(SEED), count: HEADCOUNT, asOf: SEED_AS_OF });

    await writeOrg(db, org, { reset: false });

    expect(await countOf(db, 'SELECT count(*) AS n FROM employees')).toBe(HEADCOUNT);
  });
});
