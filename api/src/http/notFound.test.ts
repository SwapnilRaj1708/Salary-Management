import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { buildApp } from '../app.ts';

describe('unknown API routes', () => {
  it('answer with a JSON 404 problem, not an HTML error page', async () => {
    const app = buildApp({ config: { version: 'test' } });

    const res = await request(app).get('/api/nope');

    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toMatch(/^application\/problem\+json/);
    expect(res.body).toEqual({
      type: 'about:blank',
      title: 'Not Found',
      status: 404,
      code: 'NOT_FOUND',
      detail: 'No API route for GET /api/nope',
    });
  });
});
