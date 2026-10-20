import { API_VERSION, HealthResponse } from '@salary/shared';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { buildApp } from '../app.ts';

describe('GET /api/health', () => {
  it('reports ok with the deployed version and the API contract version', async () => {
    const app = buildApp({ config: { version: 'abc1234' } });

    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', version: 'abc1234', apiVersion: API_VERSION });
    expect(HealthResponse.safeParse(res.body).success).toBe(true);
  });

  it('tells every cache not to store the response', async () => {
    const app = buildApp({ config: { version: 'abc1234' } });

    const res = await request(app).get('/api/health');

    expect(res.headers['cache-control']).toBe('no-store');
  });
});
