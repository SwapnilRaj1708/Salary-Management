import { API_VERSION, HealthResponse } from '@salary/shared';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { testApp } from '../test/app.ts';

describe('GET /api/health', () => {
  it('reports ok with the deployed version and the API contract version', async () => {
    const { app } = testApp('abc1234');

    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', version: 'abc1234', apiVersion: API_VERSION });
    expect(HealthResponse.safeParse(res.body).success).toBe(true);
  });

  it('tells every cache not to store the response', async () => {
    const { app } = testApp('abc1234');

    const res = await request(app).get('/api/health');

    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('runs a query, so the daily keep-alive call reaches the database', async () => {
    const { app, db } = testApp();
    const execute = vi.spyOn(db, 'execute');

    await request(app).get('/api/health');

    expect(execute).toHaveBeenCalledWith('SELECT 1');
  });
});
