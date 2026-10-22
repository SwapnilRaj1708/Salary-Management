import { describe, expect, it } from 'vitest';
import { openDb } from './client.ts';
import { type Migration, migrate } from './migrate.ts';
import { MIGRATIONS } from './migrations/index.ts';

const objectNames = async (db: ReturnType<typeof openDb>) =>
  (
    await db.execute("SELECT type, name FROM sqlite_schema WHERE name NOT LIKE 'sqlite_%'")
  ).rows.map((row) => `${row.type}:${row.name}`);

const appliedVersions = async (db: ReturnType<typeof openDb>) =>
  (await db.execute('SELECT version FROM schema_migrations ORDER BY version')).rows.map((row) =>
    Number(row.version),
  );

describe('migrate', () => {
  it('creates every table and the salary view on an empty database', async () => {
    const db = openDb({ url: ':memory:' });

    await migrate(db);

    expect(await objectNames(db)).toEqual(
      expect.arrayContaining([
        'table:currencies',
        'table:countries',
        'table:departments',
        'table:job_titles',
        'table:employees',
        'table:salary_history',
        'table:users',
        'table:sessions',
        'table:schema_migrations',
        'view:employee_salaries',
      ]),
    );
  });

  it('records every migration it applies', async () => {
    const db = openDb({ url: ':memory:' });

    const applied = await migrate(db);

    expect(applied).toEqual(MIGRATIONS.map((m) => m.version));
    expect(await appliedVersions(db)).toEqual(applied);
  });

  it('applies nothing when the database is already up to date', async () => {
    const db = openDb({ url: ':memory:' });
    await migrate(db);

    expect(await migrate(db)).toEqual([]);
  });

  it('applies each migration once when two instances start at the same time', async () => {
    const db = openDb({ url: ':memory:' });

    const [first, second] = await Promise.all([migrate(db), migrate(db)]);

    expect([...first, ...second].sort()).toEqual(MIGRATIONS.map((m) => m.version));
    expect(await appliedVersions(db)).toEqual(MIGRATIONS.map((m) => m.version));
  });

  it('rolls back a migration that fails part-way, so a fixed one can run later', async () => {
    const db = openDb({ url: ':memory:' });
    const broken: Migration = {
      version: 1,
      name: 'broken',
      statements: ['CREATE TABLE half (id INTEGER PRIMARY KEY) STRICT', 'CREATE TABLE oops ('],
    };

    await expect(migrate(db, [broken])).rejects.toThrow();

    expect(await objectNames(db)).not.toContain('table:half');
    expect(await appliedVersions(db)).toEqual([]);
  });
});
