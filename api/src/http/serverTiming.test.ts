import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { settableClock, testApp } from '../test/app.ts';

describe('Server-Timing', () => {
  it('reports how long the API spent on a request', async () => {
    const { app } = testApp();

    const res = await request(app).get('/api/health');

    expect(res.headers['server-timing']).toMatch(/(^|, )app;dur=\d+/);
  });

  it('marks the first request on an instance as cold, and no later one', async () => {
    const { app } = testApp();

    const first = await request(app).get('/api/health');
    const second = await request(app).get('/api/health');

    expect(first.headers['server-timing']).toContain('cold');
    expect(second.headers['server-timing']).not.toContain('cold');
  });

  it('measures with the injected clock, so a clock that stands still gives 0 ms', async () => {
    const { app } = testApp({ clock: settableClock() });
    await request(app).get('/api/health');

    const res = await request(app).get('/api/health');

    expect(res.headers['server-timing']).toBe('app;dur=0');
  });

  it('is on error responses too', async () => {
    const { app } = testApp();

    const res = await request(app).get('/api/nope');

    expect(res.status).toBe(404);
    expect(res.headers['server-timing']).toMatch(/app;dur=\d+/);
  });
});
