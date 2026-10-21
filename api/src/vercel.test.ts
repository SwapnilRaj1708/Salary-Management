import request from 'supertest';
import { describe, expect, it } from 'vitest';
import app from './vercel.ts';

describe('Vercel entry point', () => {
  it('default-exports a ready Express app, which Vercel serves', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok' });
  });
});
