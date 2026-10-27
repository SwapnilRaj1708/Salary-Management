import { ByJobTitleQuery, DistributionQuery } from '@salary/shared';
import { type RequestHandler, Router } from 'express';
import { parseWith } from '../http/validate.ts';
import type { InsightsService } from './service.ts';

export function insightsRouter({
  insights,
  requireAuth,
}: {
  insights: InsightsService;
  requireAuth: RequestHandler;
}): Router {
  const router = Router();

  router.get('/insights/by-country', requireAuth, async (_req, res) => {
    res.json(await insights.byCountry());
  });

  router.get('/insights/by-job-title', requireAuth, async (req, res) => {
    const { country } = parseWith(ByJobTitleQuery, req.query);
    res.json(await insights.byJobTitle(country));
  });

  router.get('/insights/by-department', requireAuth, async (_req, res) => {
    res.json(await insights.byDepartment());
  });

  router.get('/insights/distribution', requireAuth, async (req, res) => {
    const { country } = parseWith(DistributionQuery, req.query);
    res.json(await insights.distribution(country));
  });

  return router;
}
