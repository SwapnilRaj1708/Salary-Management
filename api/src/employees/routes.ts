import {
  CreateEmployeeRequest,
  type EmployeeDetail,
  EmployeeListQuery,
  type EmployeeListResponse,
  FX_AS_OF,
  LeaveRequest,
  type ReferenceDataResponse,
  SalaryChangeRequest,
  UpdateEmployeeRequest,
} from '@salary/shared';
import { type RequestHandler, Router } from 'express';
import { NotFoundError } from '../domain/errors.ts';
import { signedInUser } from '../http/requireAuth.ts';
import { parseWith } from '../http/validate.ts';
import type { EmployeesRepository } from './repository.ts';
import type { EmployeesService } from './service.ts';

/** A positive whole-number id from the path; anything else names no employee. */
function employeeId(raw: unknown): number {
  if (typeof raw !== 'string' || !/^[1-9]\d{0,14}$/.test(raw)) {
    throw new NotFoundError(`There is no employee with id ${raw}.`);
  }
  return Number(raw);
}

const withFx = (employee: Omit<EmployeeDetail, 'fx'>): EmployeeDetail => ({
  ...employee,
  fx: { asOf: FX_AS_OF },
});

export function employeesRouter({
  employees,
  service,
  requireAuth,
}: {
  employees: EmployeesRepository;
  service: EmployeesService;
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

  router.post('/employees', requireAuth, async (req, res) => {
    const input = parseWith(CreateEmployeeRequest, req.body);
    const employee = await service.create(input, signedInUser(res).id);
    res.status(201).json(withFx(employee));
  });

  // `export.csv` (S9) must be registered above this route.
  router.get('/employees/:id', requireAuth, async (req, res) => {
    res.json(withFx(await service.detail(employeeId(req.params.id))));
  });

  router.patch('/employees/:id', requireAuth, async (req, res) => {
    const id = employeeId(req.params.id);
    const changes = parseWith(UpdateEmployeeRequest, req.body);
    res.json(withFx(await service.update(id, changes)));
  });

  router.post('/employees/:id/salary-changes', requireAuth, async (req, res) => {
    const id = employeeId(req.params.id);
    const change = parseWith(SalaryChangeRequest, req.body);
    const employee = await service.changeSalary(id, change, signedInUser(res).id);
    res.status(201).json(withFx(employee));
  });

  router.post('/employees/:id/leave', requireAuth, async (req, res) => {
    const id = employeeId(req.params.id);
    const { leftOn } = parseWith(LeaveRequest, req.body);
    res.json(withFx(await service.leave(id, leftOn)));
  });

  return router;
}
