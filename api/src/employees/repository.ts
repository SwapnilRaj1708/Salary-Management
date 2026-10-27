import type { InValue, ResultSet, Row } from '@libsql/client';
import type {
  CountryCode,
  CurrencyCode,
  EmployeeDetail,
  EmployeeFilters,
  EmployeeListItem,
  EmployeeSortField,
  SalaryHistoryEntry,
  SalaryReason,
  UpdateEmployeeRequest,
} from '@salary/shared';
import type { Db } from '../db/client.ts';
import { constraintFailure } from '../db/errors.ts';
import {
  ConflictError,
  DateOutOfRangeError,
  employeeLeft,
  UnknownReferenceError,
} from '../domain/errors.ts';

/** Each sort key maps to a fixed SQL fragment, so user input never reaches the SQL text. */
const SORT_SQL: Record<EmployeeSortField, string> = {
  name: 'es.full_name COLLATE NOCASE',
  employeeCode: 'es.id',
  hireDate: 'es.hire_date',
  country: 'es.country_code',
  department: 'd.name COLLATE NOCASE',
  jobTitle: 'j.name COLLATE NOCASE',
  salaryUsd: 'es.salary_usd',
};

/** Makes `%`, `_` and the escape character itself match literally in a LIKE pattern. */
export function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, (char) => `\\${char}`);
}

/** The directory's filters and sort, without paging: what the list and the export share. */
type Selection = Omit<EmployeeFilters, 'page' | 'pageSize'>;

function whereClause(filters: Selection): { sql: string; args: InValue[] } {
  const conditions: string[] = [];
  const args: InValue[] = [];
  if (filters.status !== 'all') {
    conditions.push('es.status = ?');
    args.push(filters.status);
  }
  if (filters.country) {
    conditions.push('es.country_code = ?');
    args.push(filters.country);
  }
  if (filters.departmentId) {
    conditions.push('es.department_id = ?');
    args.push(filters.departmentId);
  }
  if (filters.jobTitleId) {
    conditions.push('es.job_title_id = ?');
    args.push(filters.jobTitleId);
  }
  if (filters.q) {
    const pattern = `%${escapeLike(filters.q)}%`;
    conditions.push(
      "(es.full_name LIKE ? ESCAPE '\\' OR es.email LIKE ? ESCAPE '\\' OR es.employee_code LIKE ? ESCAPE '\\')",
    );
    args.push(pattern, pattern, pattern);
  }
  return { sql: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '', args };
}

/** The columns every employee read selects, from `employee_salaries es` joined to names. */
const EMPLOYEE_COLUMNS = `es.id, es.employee_code, es.full_name, es.email, es.country_code,
  es.department_id, d.name AS department, es.job_title_id, j.name AS job_title,
  es.hire_date, es.status, es.left_on, es.current_salary_minor, es.currency_code, es.salary_usd`;

const EMPLOYEE_FROM = `FROM employee_salaries es
  JOIN departments d ON d.id = es.department_id
  JOIN job_titles j ON j.id = es.job_title_id`;

function toListItem(row: Row): EmployeeListItem {
  return {
    id: Number(row.id),
    employeeCode: String(row.employee_code),
    fullName: String(row.full_name),
    email: String(row.email),
    country: String(row.country_code) as CountryCode,
    departmentId: Number(row.department_id),
    department: String(row.department),
    jobTitleId: Number(row.job_title_id),
    jobTitle: String(row.job_title),
    hireDate: String(row.hire_date),
    status: row.status === 'left' ? 'left' : 'active',
    leftOn: row.left_on === null ? null : String(row.left_on),
    salary: {
      amountMinor: Number(row.current_salary_minor),
      currency: String(row.currency_code) as CurrencyCode,
    },
    // The view's USD value is a float; it is rounded once, here (CLAUDE.md, Money).
    salaryUsd: Math.round(Number(row.salary_usd) * 100) / 100,
  };
}

/** History rows arrive newest first; each change is measured against the row after it. */
function toHistory(rows: Row[]): SalaryHistoryEntry[] {
  return rows.map((row, index) => {
    const amountMinor = Number(row.amount_minor);
    const previous = rows[index + 1];
    const previousMinor = previous ? Number(previous.amount_minor) : undefined;
    return {
      id: Number(row.id),
      effectiveDate: String(row.effective_date),
      amount: { amountMinor, currency: String(row.currency_code) as CurrencyCode },
      reason: String(row.reason) as SalaryReason,
      note: row.note === null ? null : String(row.note),
      // A derived float, rounded once to one decimal; `+ 0` turns -0 into 0.
      changePercent:
        previousMinor === undefined
          ? null
          : Math.round(((amountMinor - previousMinor) / previousMinor) * 1000) / 10 + 0,
    };
  });
}

/** Columns PATCH may change, each mapped to a fixed SQL column. */
const UPDATE_COLUMNS = {
  fullName: 'full_name',
  email: 'email',
  jobTitleId: 'job_title_id',
  departmentId: 'department_id',
} as const satisfies Record<keyof UpdateEmployeeRequest, string>;

/**
 * Turns a failed write into the DomainError it stands for. Triggers RAISE with the API
 * error code (migration 2); UNIQUE and foreign-key failures are matched by their text.
 */
function mapWriteError(error: unknown): never {
  const failure = constraintFailure(error);
  if (failure === undefined) throw error;
  if (/\bEMPLOYEE_LEFT\b/.test(failure)) throw employeeLeft();
  if (failure.includes('EFFECTIVE_DATE_BEFORE_LATEST_CHANGE')) {
    throw new ConflictError(
      'EFFECTIVE_DATE_BEFORE_LATEST_CHANGE',
      'The effective date is before the latest salary change.',
    );
  }
  if (failure.includes('SALARY_UNCHANGED')) {
    throw new ConflictError('SALARY_UNCHANGED', 'The new salary is the same as the current one.');
  }
  if (failure.includes('LEFT_BEFORE_LATEST_CHANGE') || failure.includes('left_on >= hire_date')) {
    throw new DateOutOfRangeError(
      'The leaving date is before the hire date or the latest salary change.',
    );
  }
  if (failure.includes('UNIQUE constraint failed: employees.email')) {
    throw new ConflictError('EMAIL_TAKEN', 'Another employee already has this email.');
  }
  if (failure.includes('FOREIGN KEY constraint failed')) {
    throw new UnknownReferenceError('The department or job title does not exist.');
  }
  throw error;
}

/** The whitelisted ORDER BY for a sort key, with an id tie-breaker so order is stable. */
function orderBy(sort: Selection['sort']): string {
  const descending = sort.startsWith('-');
  const field = (descending ? sort.slice(1) : sort) as EmployeeSortField;
  return `ORDER BY ${SORT_SQL[field]} ${descending ? 'DESC' : 'ASC'}, es.id ASC`;
}

export function employeesRepository(db: Db) {
  return {
    /** One page of the directory and the total count, in a single round trip. */
    async list(filters: EmployeeFilters): Promise<{ items: EmployeeListItem[]; total: number }> {
      const where = whereClause(filters);
      const [count, page] = await db.batch(
        [
          { sql: `SELECT count(*) AS n FROM employee_salaries es ${where.sql}`, args: where.args },
          {
            sql: `SELECT ${EMPLOYEE_COLUMNS}
                  ${EMPLOYEE_FROM}
                  ${where.sql}
                  ${orderBy(filters.sort)}
                  LIMIT ? OFFSET ?`,
            args: [...where.args, filters.pageSize, (filters.page - 1) * filters.pageSize],
          },
        ],
        'read',
      );
      return {
        total: Number(count?.rows[0]?.n ?? 0),
        items: (page?.rows ?? []).map(toListItem),
      };
    },

    /** Every employee matching the directory's filters, in its sort order (the export). */
    async listAll(filters: Selection): Promise<EmployeeListItem[]> {
      const where = whereClause(filters);
      const { rows } = await db.execute({
        sql: `SELECT ${EMPLOYEE_COLUMNS} ${EMPLOYEE_FROM} ${where.sql} ${orderBy(filters.sort)}`,
        args: where.args,
      });
      return rows.map(toListItem);
    },

    /** One employee with their salary history (newest first), or null. One round trip. */
    async findDetail(id: number): Promise<Omit<EmployeeDetail, 'fx'> | null> {
      const [employee, history] = await db.batch(
        [
          { sql: `SELECT ${EMPLOYEE_COLUMNS} ${EMPLOYEE_FROM} WHERE es.id = ?`, args: [id] },
          {
            sql: `SELECT id, effective_date, amount_minor, currency_code, reason, note
                  FROM salary_history WHERE employee_id = ?
                  ORDER BY effective_date DESC, id DESC`,
            args: [id],
          },
        ],
        'read',
      );
      const row = employee?.rows[0];
      if (!row) return null;
      return { ...toListItem(row), salaryHistory: toHistory(history?.rows ?? []) };
    },

    /** Which of the given department and job title ids do not exist. */
    async missingReferences(ids: { departmentId?: number; jobTitleId?: number }) {
      const [departments, jobTitles] = await db.batch(
        [
          {
            sql: 'SELECT count(*) AS n FROM departments WHERE id = ?',
            args: [ids.departmentId ?? null],
          },
          {
            sql: 'SELECT count(*) AS n FROM job_titles WHERE id = ?',
            args: [ids.jobTitleId ?? null],
          },
        ],
        'read',
      );
      const missing: ('department' | 'job title')[] = [];
      if (ids.departmentId !== undefined && Number(departments?.rows[0]?.n) === 0) {
        missing.push('department');
      }
      if (ids.jobTitleId !== undefined && Number(jobTitles?.rows[0]?.n) === 0) {
        missing.push('job title');
      }
      return missing;
    },

    /** Inserts the employee and their hire row in one batch; returns the new id. */
    async create(employee: NewEmployee): Promise<number> {
      try {
        const [inserted] = await db.batch(
          [
            {
              sql: `INSERT INTO employees (full_name, email, job_title_id, department_id,
                      country_code, hire_date, current_salary_minor)
                    VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id`,
              args: [
                employee.fullName,
                employee.email,
                employee.jobTitleId,
                employee.departmentId,
                employee.countryCode,
                employee.hireDate,
                employee.salaryMinor,
              ],
            },
            {
              // The batch runs as one transaction, so last_insert_rowid() is the row above.
              sql: `INSERT INTO salary_history (employee_id, amount_minor, currency_code,
                      effective_date, reason, changed_by_user_id)
                    VALUES (last_insert_rowid(), ?, ?, ?, 'hire', ?)`,
              args: [
                employee.salaryMinor,
                employee.currency,
                employee.hireDate,
                employee.changedBy,
              ],
            },
          ],
          'write',
        );
        return Number(inserted?.rows[0]?.id);
      } catch (error) {
        mapWriteError(error);
      }
    },

    async update(id: number, changes: UpdateEmployeeRequest): Promise<void> {
      const fields = (Object.keys(UPDATE_COLUMNS) as (keyof UpdateEmployeeRequest)[]).filter(
        (field) => changes[field] !== undefined,
      );
      if (fields.length === 0) return;
      try {
        await db.batch(
          [
            {
              sql: `UPDATE employees SET ${fields.map((field) => `${UPDATE_COLUMNS[field]} = ?`).join(', ')}
                    WHERE id = ?`,
              args: [...fields.map((field) => changes[field] as InValue), id],
            },
          ],
          'write',
        );
      } catch (error) {
        mapWriteError(error);
      }
    },

    /** Appends the history row and moves the cached current salary, atomically (D5). */
    async addSalaryChange(change: NewSalaryChange): Promise<void> {
      try {
        await db.batch(
          [
            {
              sql: `INSERT INTO salary_history (employee_id, amount_minor, currency_code,
                      effective_date, reason, note, changed_by_user_id)
                    VALUES (?, ?, ?, ?, ?, ?, ?)`,
              args: [
                change.employeeId,
                change.amountMinor,
                change.currency,
                change.effectiveDate,
                change.reason,
                change.note,
                change.changedBy,
              ],
            },
            {
              sql: 'UPDATE employees SET current_salary_minor = ? WHERE id = ?',
              args: [change.amountMinor, change.employeeId],
            },
          ],
          'write',
        );
      } catch (error) {
        mapWriteError(error);
      }
    },

    async markLeft(id: number, leftOn: string): Promise<void> {
      try {
        await db.batch(
          [
            {
              sql: "UPDATE employees SET status = 'left', left_on = ? WHERE id = ?",
              args: [leftOn, id],
            },
          ],
          'write',
        );
      } catch (error) {
        mapWriteError(error);
      }
    },

    async referenceData() {
      const [departments, jobTitles] = await db.batch(
        [
          'SELECT id, name FROM departments ORDER BY name COLLATE NOCASE',
          'SELECT id, name FROM job_titles ORDER BY name COLLATE NOCASE',
        ],
        'read',
      );
      const named = (rows: ResultSet['rows'] = []) =>
        rows.map((row) => ({ id: Number(row.id), name: String(row.name) }));
      return {
        departments: named(departments?.rows ?? []),
        jobTitles: named(jobTitles?.rows ?? []),
      };
    },
  };
}

export type NewEmployee = {
  fullName: string;
  email: string;
  jobTitleId: number;
  departmentId: number;
  countryCode: CountryCode;
  hireDate: string;
  salaryMinor: number;
  currency: CurrencyCode;
  changedBy: number | null;
};

export type NewSalaryChange = {
  employeeId: number;
  amountMinor: number;
  currency: CurrencyCode;
  effectiveDate: string;
  reason: SalaryReason;
  note: string | null;
  changedBy: number | null;
};

export type EmployeesRepository = ReturnType<typeof employeesRepository>;
