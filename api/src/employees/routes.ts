import {
  EmployeeListQuery,
  type EmployeeListResponse,
  FX_AS_OF,
  type ReferenceDataResponse,
} from '@salary/shared';
import { type RequestHandler, Router } from 'express';
import { parseWith } from '../http/validate.ts';
import type { EmployeesRepository } from './repository.ts';

export function employeesRouter({
  employees,
  requireAuth,
}: {
  employees: EmployeesRepository;
  requireAuth: RequestHandler;
}): Router {
  const router = Router();

  router.get('/employees', requireAuth, async (req, res) => {
    const filters = parseWith(EmployeeListQuery, req.query);
    const { items, total } = await employees.list(filters);
    const body: EmployeeListResponse = {
      items,
      page: filters.page,
      pageSize: filters.pageSize,
      total,
      fx: { asOf: FX_AS_OF },
    };
    res.json(body);
  });

  router.get('/reference-data', requireAuth, async (_req, res) => {
    const body: ReferenceDataResponse = await employees.referenceData();
    res.json(body);
  });

  return router;
}
