import type { Row } from '@libsql/client';
import type { CountryCode, CurrencyCode } from '@salary/shared';
import type { Db } from '../db/client.ts';

// Every query reads active employees only (docs/architecture.md §6), through the
// employee_salaries view, the one place USD is computed. Rows come back raw; the service
// rounds each float once.

export type CountryAggregate = {
  country: CountryCode;
  currency: CurrencyCode;
  headcount: number;
  minMinor: number;
  maxMinor: number;
  avgMinor: number;
  avgUsd: number;
  payrollUsd: number;
};

export type JobTitleAggregate = {
  jobTitleId: number;
  jobTitle: string;
  headcount: number;
  countries: number;
  avgUsd: number;
  minMinor: number;
  avgMinor: number;
  maxMinor: number;
};

export type DepartmentAggregate = {
  departmentId: number;
  department: string;
  headcount: number;
  payrollUsd: number;
  avgUsd: number;
};

const rows = (result: { rows: Row[] } | undefined) => result?.rows ?? [];

export function insightsRepository(db: Db) {
  return {
    /** Aggregates per country, and every salary by country in ascending order for medians. */
    async byCountry() {
      const [aggregates, salaries] = await db.batch(
        [
          `SELECT country_code, currency_code, count(*) AS headcount,
                  min(current_salary_minor) AS min_minor, max(current_salary_minor) AS max_minor,
                  avg(current_salary_minor) AS avg_minor,
                  avg(salary_usd) AS avg_usd, sum(salary_usd) AS payroll_usd
           FROM employee_salaries WHERE status = 'active'
           GROUP BY country_code, currency_code`,
          `SELECT country_code, current_salary_minor FROM employees WHERE status = 'active'
           ORDER BY country_code, current_salary_minor`,
        ],
        'read',
      );
      const sorted = new Map<CountryCode, number[]>();
      for (const row of rows(salaries)) {
        const country = String(row.country_code) as CountryCode;
        const list = sorted.get(country) ?? [];
        list.push(Number(row.current_salary_minor));
        sorted.set(country, list);
      }
      const items: CountryAggregate[] = rows(aggregates).map((row) => ({
        country: String(row.country_code) as CountryCode,
        currency: String(row.currency_code) as CurrencyCode,
        headcount: Number(row.headcount),
        minMinor: Number(row.min_minor),
        maxMinor: Number(row.max_minor),
        avgMinor: Number(row.avg_minor),
        avgUsd: Number(row.avg_usd),
        payrollUsd: Number(row.payroll_usd),
      }));
      return { items, sortedSalaries: sorted };
    },

    async byJobTitle(country: CountryCode | undefined): Promise<JobTitleAggregate[]> {
      const { rows: found } = await db.execute({
        sql: `SELECT j.id, j.name, count(*) AS headcount,
                     count(DISTINCT es.country_code) AS countries, avg(es.salary_usd) AS avg_usd,
                     min(es.current_salary_minor) AS min_minor,
                     avg(es.current_salary_minor) AS avg_minor,
                     max(es.current_salary_minor) AS max_minor
              FROM employee_salaries es JOIN job_titles j ON j.id = es.job_title_id
              WHERE es.status = 'active' AND (? IS NULL OR es.country_code = ?)
              GROUP BY j.id, j.name
              ORDER BY j.name COLLATE NOCASE`,
        args: [country ?? null, country ?? null],
      });
      return found.map((row) => ({
        jobTitleId: Number(row.id),
        jobTitle: String(row.name),
        headcount: Number(row.headcount),
        countries: Number(row.countries),
        avgUsd: Number(row.avg_usd),
        minMinor: Number(row.min_minor),
        avgMinor: Number(row.avg_minor),
        maxMinor: Number(row.max_minor),
      }));
    },

    async byDepartment(): Promise<DepartmentAggregate[]> {
      const { rows: found } = await db.execute(
        `SELECT d.id, d.name, count(*) AS headcount,
                sum(es.salary_usd) AS payroll_usd, avg(es.salary_usd) AS avg_usd
         FROM employee_salaries es JOIN departments d ON d.id = es.department_id
         WHERE es.status = 'active'
         GROUP BY d.id, d.name
         ORDER BY payroll_usd DESC, d.name COLLATE NOCASE`,
      );
      return found.map((row) => ({
        departmentId: Number(row.id),
        department: String(row.name),
        headcount: Number(row.headcount),
        payrollUsd: Number(row.payroll_usd),
        avgUsd: Number(row.avg_usd),
      }));
    },

    /** One country's salaries in minor units, ascending. */
    async salaries(country: CountryCode): Promise<number[]> {
      const { rows: found } = await db.execute({
        sql: `SELECT current_salary_minor FROM employees
              WHERE status = 'active' AND country_code = ?
              ORDER BY current_salary_minor`,
        args: [country],
      });
      return found.map((row) => Number(row.current_salary_minor));
    },
  };
}

export type InsightsRepository = ReturnType<typeof insightsRepository>;
