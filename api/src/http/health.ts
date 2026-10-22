import { API_VERSION, type HealthResponse } from '@salary/shared';
import { Router } from 'express';
import type { Db } from '../db/client.ts';

export function healthRouter({ version, db }: { version: string; db: Db }): Router {
  const router = Router();

  router.get('/health', async (_req, res) => {
    // One query, so the daily Cron call keeps Turso's free database active (architecture §10).
    await db.execute('SELECT 1');
    const body: HealthResponse = { status: 'ok', version, apiVersion: API_VERSION };
    res.json(body);
  });

  return router;
}
