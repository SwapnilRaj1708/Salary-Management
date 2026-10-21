import type { Migration } from '../migrate.ts';

/**
 * The whole v1 schema (docs/architecture.md §4). Migrations are TypeScript modules, not
 * `.sql` files: Vercel's bundler only ships what the code imports, and an array of
 * statements needs no splitting (trigger bodies contain semicolons).
 */
export const initial: Migration = {
  version: 1,
  name: 'initial',
  statements: [
    `CREATE TABLE currencies (
      code TEXT PRIMARY KEY CHECK (length(code) = 3),
      minor_unit INTEGER NOT NULL CHECK (minor_unit IN (0, 2, 3)),
      units_per_usd REAL NOT NULL CHECK (units_per_usd > 0),
      rate_as_of TEXT NOT NULL CHECK (rate_as_of IS date(rate_as_of))
    ) STRICT`,

    `CREATE TABLE countries (
      code TEXT PRIMARY KEY CHECK (length(code) = 2),
      name TEXT NOT NULL,
      currency_code TEXT NOT NULL REFERENCES currencies (code)
    ) STRICT`,

    `CREATE TABLE departments (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL UNIQUE COLLATE NOCASE CHECK (length(trim(name)) > 0)
    ) STRICT`,

    `CREATE TABLE job_titles (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL UNIQUE COLLATE NOCASE CHECK (length(trim(name)) > 0)
    ) STRICT`,

    `CREATE TABLE users (
      id INTEGER PRIMARY KEY,
      email TEXT NOT NULL UNIQUE CHECK (email = lower(email)),
      password_hash TEXT NOT NULL
    ) STRICT`,

    `CREATE TABLE sessions (
      token_hash TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL
    ) STRICT`,

    // A CHECK that evaluates to NULL passes, so every check here is written to be NULL-proof:
    // `IS date(…)` rather than `= date(…)` (date('banana') is NULL), and `coalesce` around
    // a NULL-able note. `left_on IS date(left_on)` also holds when left_on is NULL.
    `CREATE TABLE employees (
      id INTEGER PRIMARY KEY,
      employee_code TEXT GENERATED ALWAYS AS ('EMP-' || printf('%06d', id)) VIRTUAL,
      full_name TEXT NOT NULL CHECK (length(trim(full_name)) > 0),
      email TEXT NOT NULL UNIQUE CHECK (email = lower(email)),
      job_title_id INTEGER NOT NULL REFERENCES job_titles (id),
      department_id INTEGER NOT NULL REFERENCES departments (id),
      country_code TEXT NOT NULL REFERENCES countries (code),
      hire_date TEXT NOT NULL CHECK (hire_date IS date(hire_date)),
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'left')),
      left_on TEXT CHECK (left_on IS date(left_on)),
      current_salary_minor INTEGER NOT NULL CHECK (current_salary_minor > 0),
      CHECK ((status = 'left') = (left_on IS NOT NULL)),
      CHECK (left_on IS NULL OR left_on >= hire_date)
    ) STRICT`,

    `CREATE TABLE salary_history (
      id INTEGER PRIMARY KEY,
      employee_id INTEGER NOT NULL REFERENCES employees (id),
      amount_minor INTEGER NOT NULL CHECK (amount_minor > 0),
      currency_code TEXT NOT NULL REFERENCES currencies (code),
      effective_date TEXT NOT NULL CHECK (effective_date IS date(effective_date)),
      reason TEXT NOT NULL CHECK (
        reason IN ('hire', 'annual_review', 'promotion', 'market_adjustment', 'correction', 'other')
      ),
      note TEXT,
      changed_by_user_id INTEGER REFERENCES users (id),
      CHECK (reason <> 'other' OR coalesce(length(trim(note)), 0) > 0)
    ) STRICT`,

    'CREATE INDEX employees_country_status ON employees (country_code, status)',
    'CREATE INDEX employees_name ON employees (full_name COLLATE NOCASE, id)',
    'CREATE INDEX employees_department ON employees (department_id)',
    'CREATE INDEX employees_job_title ON employees (job_title_id)',
    'CREATE INDEX salary_history_employee ON salary_history (employee_id, effective_date, id)',
    'CREATE INDEX sessions_user ON sessions (user_id)',

    // The only place USD conversion is defined (decision X1). A CASE instead of
    // power(10, minor_unit) needs no math extension, locally or on Turso.
    `CREATE VIEW employee_salaries AS
    SELECT e.*,
           co.currency_code,
           cu.minor_unit,
           e.current_salary_minor
             / ((CASE cu.minor_unit WHEN 0 THEN 1.0 WHEN 2 THEN 100.0 ELSE 1000.0 END)
                * cu.units_per_usd) AS salary_usd
    FROM employees e
    JOIN countries co ON co.code = e.country_code
    JOIN currencies cu ON cu.code = co.currency_code`,
  ],
};
