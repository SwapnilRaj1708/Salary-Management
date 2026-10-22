import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildApp } from '../app.ts';
import { openDb } from '../db/client.ts';
import { prepareDatabase } from '../db/prepare.ts';
import { testApp } from '../test/app.ts';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('database preparation on the first request', () => {
  it('migrates the database and fills in the reference data before answering', async () => {
    const { app, db } = testApp();

    await request(app).get('/api/health');

    const { rows } = await db.execute('SELECT count(*) AS n FROM countries');
    expect(Number(rows[0]?.n)).toBe(10);
  });

  it('answers a 500 problem when the database cannot be prepared, without the error details', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const db = openDb({ url: ':memory:' });
    const app = buildApp({
      config: { version: 'test' },
      db,
      prepare: () => Promise.reject(new Error('connect ECONNREFUSED 10.0.0.1')),
    });

    const res = await request(app).get('/api/health');

    expect(res.status).toBe(500);
    expect(res.headers['content-type']).toMatch(/^application\/problem\+json/);
    expect(res.body).toEqual({
      type: 'about:blank',
      title: 'Internal Server Error',
      status: 500,
      code: 'INTERNAL',
      detail: 'Something went wrong on our side. Please try again.',
    });
  });

  it('logs the underlying error for the operator', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
    const failure = new Error('connect ECONNREFUSED 10.0.0.1');
    const app = buildApp({
      config: { version: 'test' },
      db: openDb({ url: ':memory:' }),
      prepare: () => Promise.reject(failure),
    });

    await request(app).get('/api/health');

    expect(logged).toHaveBeenCalledWith(expect.anything(), failure);
  });

  it('recovers on the next request once the database is reachable again', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const db = openDb({ url: ':memory:' });
    let attempts = 0;
    const app = buildApp({
      config: { version: 'test' },
      db,
      prepare: async (database) => {
        attempts += 1;
        if (attempts === 1) throw new Error('database unreachable');
        await prepareDatabase(database);
      },
    });
    await request(app).get('/api/health');

    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
  });
});
