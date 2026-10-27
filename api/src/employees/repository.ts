import type { InValue, ResultSet } from '@libsql/client';
import type {
  CountryCode,
  CurrencyCode,
  EmployeeFilters,
  EmployeeListItem,
  EmployeeSortField,
} from '@salary/shared';
import type { Db } from '../db/client.ts';

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

function whereClause(filters: EmployeeFilters): { sql: string; args: InValue[] } {
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

export function employeesRepository(db: Db) {
  return {
    /** One page of the directory and the total count, in a single round trip. */
    async list(filters: EmployeeFilters): Promise<{ items: EmployeeListItem[]; total: number }> {
      const where = whereClause(filters);
      const descending = filters.sort.startsWith('-');
      const field = (descending ? filters.sort.slice(1) : filters.sort) as EmployeeSortField;
      const [count, page] = await db.batch(
        [
          { sql: `SELECT count(*) AS n FROM employee_salaries es ${where.sql}`, args: where.args },
          {
            sql: `SELECT es.id, es.employee_code, es.full_name, es.email, es.country_code,
                         es.department_id, d.name AS department, es.job_title_id, j.name AS job_title,
                         es.hire_date, es.status, es.left_on, es.current_salary_minor,
                         es.currency_code, es.salary_usd
                  FROM employee_salaries es
                  JOIN departments d ON d.id = es.department_id
                  JOIN job_titles j ON j.id = es.job_title_id
                  ${where.sql}
                  ORDER BY ${SORT_SQL[field]} ${descending ? 'DESC' : 'ASC'}, es.id ASC
                  LIMIT ? OFFSET ?`,
            args: [...where.args, filters.pageSize, (filters.page - 1) * filters.pageSize],
          },
        ],
        'read',
      );
      return {
        total: Number(count?.rows[0]?.n ?? 0),
        items: (page?.rows ?? []).map((row) => ({
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
        })),
      };
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

export type EmployeesRepository = ReturnType<typeof employeesRepository>;
