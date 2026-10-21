import { API_VERSION, type HealthResponse } from '@salary/shared';
import { Router } from 'express';

export function healthRouter({ version }: { version: string }): Router {
  const router = Router();

  router.get('/health', (_req, res) => {
    const body: HealthResponse = { status: 'ok', version, apiVersion: API_VERSION };
    res.json(body);
  });

  return router;
}
