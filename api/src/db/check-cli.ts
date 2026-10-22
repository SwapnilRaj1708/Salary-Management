import { loadConfig } from '../config.ts';
import { type Db, openDb } from './client.ts';
import { prepareDatabase } from './prepare.ts';

// npm run db:check: checks on the database in TURSO_DATABASE_URL the behaviour the design
// relies on and that tests can only show on a local libSQL file (decision D17, plan S4).
// It writes only short-lived rows named __check…__ and deletes them again.

type Check = {
  name: string;
  run: (db: Db, config: ReturnType<typeof loadConfig>) => Promise<string>;
};

const PROBE = '__check_probe__';

const checks: Check[] = [
  {
    name: 'migrations and reference data apply',
    run: async (db) => {
      await prepareDatabase(db);
      const { rows } = await db.execute('SELECT max(version) AS v FROM schema_migrations');
      return `schema version ${rows[0]?.v}`;
    },
  },
  {
    name: 'foreign keys are enforced',
    run: async (db) => {
      try {
        await db.execute(
          "INSERT INTO countries (code, name, currency_code) VALUES ('ZZ', 'Nowhere', 'XXX')",
        );
      } catch (error) {
        return describe(error);
      }
      await db.execute("DELETE FROM countries WHERE code = 'ZZ'");
      throw new Error('an unknown currency was accepted, so foreign keys are off');
    },
  },
  {
    name: 'a failing batch rolls back as a whole',
    run: async (db) => {
      await expectFailure(
        db.batch(
          [
            { sql: 'INSERT INTO departments (name) VALUES (?)', args: [PROBE] },
            'INSERT INTO departments (name) VALUES (NULL)',
          ],
          'write',
        ),
      );
      const { rows } = await db.execute({
        sql: 'SELECT count(*) AS n FROM departments WHERE name = ?',
        args: [PROBE],
      });
      if (Number(rows[0]?.n) !== 0) {
        await db.execute({ sql: 'DELETE FROM departments WHERE name = ?', args: [PROBE] });
        throw new Error('the first statement of the failed batch was kept');
      }
      return 'nothing from the failed batch was kept';
    },
  },
  {
    name: 'a constraint error carries SQLITE_CONSTRAINT and the constraint name',
    run: async (db) => {
      const error = await expectFailure(
        db.execute("INSERT INTO departments (name) VALUES ('Engineering')"),
      );
      const { code, message } = error as { code?: string; message?: string };
      if (code !== 'SQLITE_CONSTRAINT' || !message?.includes('UNIQUE constraint failed')) {
        throw new Error(`unexpected error shape: ${describe(error)}`);
      }
      return describe(error);
    },
  },
  {
    name: 'two writers at the same time both succeed',
    run: async (_db, config) => {
      const [a, b] = [openDb(config.database), openDb(config.database)];
      const names = [`${PROBE}a`, `${PROBE}b`];
      try {
        await Promise.all(
          [a, b].map((client, i) =>
            client.batch(
              [
                { sql: 'INSERT INTO departments (name) VALUES (?)', args: [names[i] as string] },
                { sql: 'DELETE FROM departments WHERE name = ?', args: [names[i] as string] },
              ],
              'write',
            ),
          ),
        );
        return 'both batches committed';
      } finally {
        a.close();
        b.close();
      }
    },
  },
  {
    name: 'the USD view answers',
    run: async (db) => {
      const { rows } = await db.execute(
        'SELECT count(*) AS n, round(sum(salary_usd)) AS usd FROM employee_salaries',
      );
      return `${rows[0]?.n} employees, total USD ${rows[0]?.usd ?? 0}`;
    },
  },
];

async function expectFailure(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error('the statement was expected to fail, but it succeeded');
}

function describe(error: unknown): string {
  const { code, message } = error as { code?: string; message?: string };
  return `${code ?? 'no code'}: ${message ?? String(error)}`;
}

const config = loadConfig(process.env);
const db = openDb(config.database);
console.log(`Checking ${config.database.url.replace(/\?.*$/, '')}`);
let failed = 0;
for (const check of checks) {
  try {
    console.log(`✓ ${check.name} (${await check.run(db, config)})`);
  } catch (error) {
    failed += 1;
    console.log(`✗ ${check.name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}
db.close();
process.exitCode = failed === 0 ? 0 : 1;
