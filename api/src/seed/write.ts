import type { InStatement, InValue } from '@libsql/client';
import { COUNTRIES } from '@salary/shared';
import type { Db } from '../db/client.ts';
import type { SeedEmployee } from './generate.ts';

export type WriteResult = { employees: number; salaryChanges: number };

/** Rows per INSERT statement, and statements per request to the database. */
const ROWS_PER_INSERT = 500;
const STATEMENTS_PER_BATCH = 10;

/**
 * Writes the seeded organisation in batches. Refuses a database that already has employees
 * unless `reset` is set, which deletes employees and their history first (users and
 * reference data stay).
 *
 * Each batch is atomic, but the whole seed is not: it is too big for one request to Turso.
 * If a run fails part-way, run it again with `--reset`.
 */
export async function writeOrg(
  db: Db,
  org: readonly SeedEmployee[],
  { reset }: { reset: boolean },
): Promise<WriteResult> {
  const existing = Number((await db.execute('SELECT count(*) AS n FROM employees')).rows[0]?.n);
  if (existing > 0 && !reset) {
    throw new Error(
      `The database already has ${existing} employees. Run with --reset to replace them.`,
    );
  }

  const departmentIds = await idsByName(db, 'departments');
  const titleIds = await idsByName(db, 'job_titles');

  // Everyone is inserted as active and leavers are marked after their history is written,
  // because the database refuses salary history for someone who has already left.
  const employeeRows: InValue[][] = org.map((e, index) => [
    index + 1,
    e.fullName,
    e.email,
    idOf(titleIds, e.jobTitle),
    idOf(departmentIds, e.department),
    e.countryCode,
    e.hireDate,
    e.salaryMinor,
  ]);
  const leaverRows: InValue[][] = org.flatMap((e, index) =>
    e.leftOn === null ? [] : [[index + 1, e.leftOn]],
  );
  const historyRows: InValue[][] = org.flatMap((e, index) =>
    e.history.map((change) => [
      index + 1,
      change.amountMinor,
      COUNTRIES[e.countryCode].currency,
      change.effectiveDate,
      change.reason,
    ]),
  );

  const statements: InStatement[] = [
    ...(reset ? ['DELETE FROM salary_history', 'DELETE FROM employees'] : []),
    ...inserts(
      'employees (id, full_name, email, job_title_id, department_id, country_code, hire_date, current_salary_minor)',
      employeeRows,
    ),
    ...inserts(
      'salary_history (employee_id, amount_minor, currency_code, effective_date, reason)',
      historyRows,
    ),
    ...leaverUpdates(leaverRows),
  ];
  for (let i = 0; i < statements.length; i += STATEMENTS_PER_BATCH) {
    await db.batch(statements.slice(i, i + STATEMENTS_PER_BATCH), 'write');
  }
  return { employees: employeeRows.length, salaryChanges: historyRows.length };
}

function inserts(target: string, rows: InValue[][]): InStatement[] {
  const statements: InStatement[] = [];
  for (let i = 0; i < rows.length; i += ROWS_PER_INSERT) {
    const chunk = rows.slice(i, i + ROWS_PER_INSERT);
    const placeholders = chunk.map((row) => `(${row.map(() => '?').join(', ')})`).join(', ');
    statements.push({ sql: `INSERT INTO ${target} VALUES ${placeholders}`, args: chunk.flat() });
  }
  return statements;
}

/** Marks leavers in chunks: `UPDATE … FROM (VALUES (id, leftOn), …)`. */
function leaverUpdates(rows: InValue[][]): InStatement[] {
  const statements: InStatement[] = [];
  for (let i = 0; i < rows.length; i += ROWS_PER_INSERT) {
    const chunk = rows.slice(i, i + ROWS_PER_INSERT);
    statements.push({
      sql: `UPDATE employees SET status = 'left', left_on = leavers.column2
            FROM (VALUES ${chunk.map(() => '(?, ?)').join(', ')}) AS leavers
            WHERE employees.id = leavers.column1`,
      args: chunk.flat(),
    });
  }
  return statements;
}

async function idsByName(
  db: Db,
  table: 'departments' | 'job_titles',
): Promise<Map<string, number>> {
  const { rows } = await db.execute(`SELECT id, name FROM ${table}`);
  return new Map(rows.map((row) => [String(row.name), Number(row.id)]));
}

function idOf(ids: Map<string, number>, name: string): number {
  const id = ids.get(name);
  if (id === undefined) throw new Error(`"${name}" is not in the reference data`);
  return id;
}
