import { EmployeeListResponse, ReferenceDataResponse } from '@salary/shared';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { signedInAgent, testApp } from '../test/app.ts';
import { anEmployee, insertRow } from '../test/builders.ts';

// Reference ids follow the order of the fixed lists in db/reference.ts.
const ENGINEERING = 1;
const DATA = 4;
const SALES = 5;
const SOFTWARE_ENGINEER = 2;
const SENIOR_SOFTWARE_ENGINEER = 3;
const DATA_SCIENTIST = 13;

let app: ReturnType<typeof testApp>['app'];
let agent: Awaited<ReturnType<typeof signedInAgent>>;

beforeEach(async () => {
  const test = testApp();
  app = test.app;
  agent = await signedInAgent(app); // the first request also prepares the database
  const rows: Record<string, string | number>[] = [
    // 1–6, inserted in id order
    {
      full_name: 'Ada Lovelace',
      email: 'ada@acme.example',
      country_code: 'US',
      department_id: ENGINEERING,
      job_title_id: SOFTWARE_ENGINEER,
      hire_date: '2020-01-10',
      current_salary_minor: 9_000_000,
    },
    {
      full_name: 'Grace Hopper',
      email: 'grace@acme.example',
      country_code: 'US',
      department_id: DATA,
      job_title_id: DATA_SCIENTIST,
      hire_date: '2019-05-01',
      current_salary_minor: 12_000_000,
    },
    {
      full_name: 'Haruto Sato',
      email: 'haruto.sato@acme.example',
      country_code: 'JP',
      department_id: ENGINEERING,
      job_title_id: SENIOR_SOFTWARE_ENGINEER,
      hire_date: '2021-03-01',
      current_salary_minor: 9_000_000,
    },
    {
      full_name: 'Priya Sharma',
      email: 'priya@acme.example',
      country_code: 'IN',
      department_id: SALES,
      job_title_id: SOFTWARE_ENGINEER,
      hire_date: '2022-07-15',
      current_salary_minor: 180_000_000,
    },
    {
      full_name: 'Lukas Müller',
      email: 'lukas@acme.example',
      country_code: 'DE',
      department_id: ENGINEERING,
      job_title_id: SOFTWARE_ENGINEER,
      hire_date: '2018-02-01',
      current_salary_minor: 6_000_000,
      status: 'left',
      left_on: '2024-06-30',
    },
    {
      full_name: 'Ada Lovelace',
      email: 'ada2@acme.example',
      country_code: 'GB',
      department_id: ENGINEERING,
      job_title_id: SOFTWARE_ENGINEER,
      hire_date: '2023-09-01',
      current_salary_minor: 5_000_000,
    },
  ];
  for (const row of rows) await insertRow(test.db, 'employees', anEmployee(row));
});

const list = async (query: Record<string, string | number> = {}) => {
  const res = await agent.get('/api/employees').query(query);
  return { res, body: res.status === 200 ? EmployeeListResponse.parse(res.body) : undefined };
};
const ids = async (query: Record<string, string | number> = {}) =>
  (await list(query)).body?.items.map((item) => item.id);

describe('GET /api/employees', () => {
  it('needs a session', async () => {
    expect((await request(app).get('/api/employees')).status).toBe(401);
  });

  it('lists active employees by name, 25 a page, with the total and the rate date', async () => {
    const { body } = await list();

    expect(body?.items.map((item) => item.id)).toEqual([1, 6, 2, 3, 4]);
    expect(body).toMatchObject({ page: 1, pageSize: 25, total: 5, fx: { asOf: '2026-10-01' } });
  });

  it('returns each employee with local salary, USD salary and readable names', async () => {
    const { body } = await list({ country: 'JP' });

    expect(body?.items[0]).toEqual({
      id: 3,
      employeeCode: 'EMP-000003',
      fullName: 'Haruto Sato',
      email: 'haruto.sato@acme.example',
      country: 'JP',
      departmentId: ENGINEERING,
      department: 'Engineering',
      jobTitleId: SENIOR_SOFTWARE_ENGINEER,
      jobTitle: 'Senior Software Engineer',
      hireDate: '2021-03-01',
      status: 'active',
      leftOn: null,
      salary: { amountMinor: 9_000_000, currency: 'JPY' },
      salaryUsd: 60_000,
    });
  });

  it('rounds the USD salary to cents', async () => {
    const { body } = await list({ country: 'IN' });

    expect(body?.items[0]?.salaryUsd).toBe(20_454.55);
  });

  it('lists leavers on request, or everyone', async () => {
    expect(await ids({ status: 'left' })).toEqual([5]);
    expect((await list({ status: 'all' })).body?.total).toBe(6);
  });

  it('filters by country, department and job title together', async () => {
    expect(await ids({ country: 'US' })).toEqual([1, 2]);
    expect(await ids({ departmentId: ENGINEERING, country: 'JP' })).toEqual([3]);
    expect(await ids({ jobTitleId: DATA_SCIENTIST })).toEqual([2]);
  });

  it('searches name, email and employee code, ignoring letter case', async () => {
    expect(await ids({ q: 'hopper' })).toEqual([2]);
    expect(await ids({ q: 'HARUTO.SATO@' })).toEqual([3]);
    expect(await ids({ q: 'emp-000004' })).toEqual([4]);
    expect(await ids({ q: 'ada' })).toEqual([1, 6]);
  });

  it('treats % and _ in the search as plain characters, not wildcards', async () => {
    expect(await ids({ q: '%' })).toEqual([]);
    expect(await ids({ q: '_' })).toEqual([]);
  });

  it('sorts by USD salary, so amounts in different currencies compare fairly', async () => {
    // INR 1.8M ≈ $20k, JPY 9M = $60k, GBP 50k ≈ $63k, USD 90k, USD 120k.
    expect(await ids({ sort: 'salaryUsd' })).toEqual([4, 3, 6, 1, 2]);
    expect(await ids({ sort: '-salaryUsd' })).toEqual([2, 1, 6, 3, 4]);
  });

  it('breaks ties by id, so pages never repeat or skip an employee', async () => {
    const pages = [];
    for (const page of [1, 2, 3]) pages.push(...((await ids({ pageSize: 2, page })) ?? []));

    expect(pages).toEqual(await ids());
    expect(await ids({ sort: '-name' })).toEqual([4, 3, 2, 1, 6]);
  });

  it('returns an empty page past the end, with the real total', async () => {
    const { body } = await list({ page: 9 });

    expect(body?.items).toEqual([]);
    expect(body?.total).toBe(5);
  });

  it.each([
    [{ sort: 'salary' }],
    [{ pageSize: 101 }],
    [{ country: 'XX' }],
    [{ unexpected: 'yes' }],
  ])('rejects the query %j as a validation failure', async (query) => {
    const { res } = await list(query);

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_FAILED');
  });
});

describe('GET /api/reference-data', () => {
  it('needs a session', async () => {
    expect((await request(app).get('/api/reference-data')).status).toBe(401);
  });

  it('returns every department and job title, sorted by name', async () => {
    const res = await agent.get('/api/reference-data');

    const body = ReferenceDataResponse.parse(res.body);
    expect(body.departments).toHaveLength(10);
    expect(body.jobTitles).toHaveLength(30);
    expect(body.departments.map((d) => d.name)).toEqual(
      [...body.departments.map((d) => d.name)].sort((a, b) => a.localeCompare(b)),
    );
    expect(body.departments).toContainEqual({ id: ENGINEERING, name: 'Engineering' });
  });
});
