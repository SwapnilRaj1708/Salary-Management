import {
  type AuthUser,
  COUNTRIES,
  type CountryCode,
  type EmployeeDetail,
  type EmployeeListItem,
  type SalaryReason,
} from '@salary/shared';
import { vi } from 'vitest';

export const FAKE_USER: AuthUser = { id: 1, email: 'admin@acme.example' };
export const FAKE_PASSWORD = 'local-demo-password';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': status >= 400 ? 'application/problem+json' : 'application/json' },
  });

const problem = (status: number, code: string) =>
  json(status, { type: 'about:blank', status, code, title: code, detail: code });

/**
 * Replaces `fetch` with an in-memory stand-in for the auth API, so web tests never touch the
 * network. `signedIn` is the starting state; tests can flip it to simulate an expired session.
 */
export function installFakeApi({ signedIn = true } = {}) {
  const state = { signedIn, requests: [] as string[], bodies: [] as unknown[] };
  const records = fakeRecords();
  vi.stubGlobal('fetch', async (input: string, init: RequestInit = {}) => {
    const method = init.method ?? 'GET';
    state.requests.push(`${method} ${input}`);
    if (method === 'GET' && input === '/api/auth/me') {
      return state.signedIn ? json(200, { user: FAKE_USER }) : problem(401, 'UNAUTHENTICATED');
    }
    if (method === 'POST' && input === '/api/auth/login') {
      const { email, password } = JSON.parse(String(init.body));
      if (email !== FAKE_USER.email || password !== FAKE_PASSWORD) {
        return problem(401, 'INVALID_CREDENTIALS');
      }
      state.signedIn = true;
      return json(200, { user: FAKE_USER });
    }
    const record = /^\/api\/employees\/(\d+)(\/salary-changes|\/leave)?$/.exec(input);
    if (record || (method === 'POST' && input === '/api/employees')) {
      if (!state.signedIn) return problem(401, 'UNAUTHENTICATED');
      const body = init.body ? JSON.parse(String(init.body)) : {};
      if (method !== 'GET') state.bodies.push(body);
      return records.handle(method, record ? Number(record[1]) : undefined, record?.[2], body);
    }
    if (method === 'GET' && input.startsWith('/api/employees')) {
      if (!state.signedIn) return problem(401, 'UNAUTHENTICATED');
      return json(200, listEmployees(new URL(input, 'http://test').searchParams));
    }
    if (method === 'GET' && input.startsWith('/api/insights/')) {
      if (!state.signedIn) return problem(401, 'UNAUTHENTICATED');
      const url = new URL(input, 'http://test');
      const body = insights(url.pathname, url.searchParams.get('country'));
      return body ? json(200, body) : problem(404, 'NOT_FOUND');
    }
    if (method === 'GET' && input === '/api/reference-data') {
      if (!state.signedIn) return problem(401, 'UNAUTHENTICATED');
      return json(200, {
        departments: [
          { id: 1, name: 'Engineering' },
          { id: 5, name: 'Sales' },
        ],
        jobTitles: [
          { id: 2, name: 'Software Engineer' },
          { id: 16, name: 'Account Executive' },
        ],
      });
    }
    if (method === 'POST' && input === '/api/auth/logout') {
      state.signedIn = false;
      return new Response(null, { status: 204 });
    }
    return problem(404, 'NOT_FOUND');
  });
  return state;
}

const employee = (
  id: number,
  fullName: string,
  overrides: Partial<EmployeeListItem> = {},
): EmployeeListItem => ({
  id,
  employeeCode: `EMP-${String(id).padStart(6, '0')}`,
  fullName,
  email: `${fullName.toLowerCase().replace(/[^a-z]+/g, '.')}@acme.example`,
  country: 'US',
  departmentId: 1,
  department: 'Engineering',
  jobTitleId: 2,
  jobTitle: 'Software Engineer',
  hireDate: '2022-01-10',
  status: 'active',
  leftOn: null,
  salary: { amountMinor: 9_000_000, currency: 'USD' },
  salaryUsd: 90_000,
  ...overrides,
});

/** 30 people: Ada and Haruto first by name, then Person 01–27, then a leaver. */
export const FAKE_EMPLOYEES: EmployeeListItem[] = [
  employee(1, 'Ada Lovelace'),
  employee(2, 'Haruto Sato', {
    country: 'JP',
    salary: { amountMinor: 9_000_000, currency: 'JPY' },
    salaryUsd: 60_000,
  }),
  ...Array.from({ length: 27 }, (_, i) =>
    employee(i + 3, `Person ${String(i + 1).padStart(2, '0')}`, {
      salaryUsd: 50_000 + i * 1000,
      salary: { amountMinor: (50_000 + i * 1000) * 100, currency: 'USD' },
    }),
  ),
  employee(30, 'Zed Leaver', { status: 'left', leftOn: '2025-03-31' }),
];

/** What the web app sends to the record endpoints. The fake trusts it to be complete. */
type FakeBody = {
  fullName: string;
  email: string;
  countryCode: CountryCode;
  departmentId: number;
  jobTitleId: number;
  hireDate: string;
  salaryMinor: number;
  amountMinor: number;
  effectiveDate: string;
  reason: SalaryReason;
  note?: string;
  leftOn: string;
};

const DEPARTMENTS: Record<number, string> = { 1: 'Engineering', 5: 'Sales' };
const JOB_TITLES: Record<number, string> = { 2: 'Software Engineer', 16: 'Account Executive' };

/**
 * In-memory employee records for detail and write tests. Ada (id 1) has a raise on top of
 * her hire row; everyone else has only a hire row. It applies the API's main rules.
 */
function fakeRecords() {
  const store = new Map<number, Omit<EmployeeDetail, 'fx'>>();
  for (const e of FAKE_EMPLOYEES) {
    store.set(e.id, {
      ...e,
      salaryHistory: [
        {
          id: e.id * 100,
          effectiveDate: e.hireDate,
          amount: e.salary,
          reason: 'hire',
          note: null,
          changePercent: null,
        },
      ],
    });
  }
  const ada = store.get(1) as Omit<EmployeeDetail, 'fx'>;
  ada.salaryHistory = [
    {
      id: 101,
      effectiveDate: '2024-03-01',
      amount: { amountMinor: 9_000_000, currency: 'USD' },
      reason: 'annual_review',
      note: null,
      changePercent: 12.5,
    },
    {
      id: 100,
      effectiveDate: '2022-01-10',
      amount: { amountMinor: 8_000_000, currency: 'USD' },
      reason: 'hire',
      note: null,
      changePercent: null,
    },
  ];
  let nextId = 1000;
  const reply = (status: number, id: number) =>
    json(status, { ...store.get(id), fx: { asOf: '2026-10-01' } });
  const emailTaken = (email: string, except?: number) =>
    [...store.values()].some((e) => e.email === email.toLowerCase() && e.id !== except);

  return {
    handle(method: string, id: number | undefined, action: string | undefined, body: FakeBody) {
      if (id === undefined) {
        if (emailTaken(body.email)) return problem(409, 'EMAIL_TAKEN');
        const newId = nextId++;
        const currency = COUNTRIES[body.countryCode].currency;
        store.set(newId, {
          id: newId,
          employeeCode: `EMP-${String(newId).padStart(6, '0')}`,
          fullName: body.fullName,
          email: String(body.email).toLowerCase(),
          country: body.countryCode,
          departmentId: body.departmentId,
          department: DEPARTMENTS[body.departmentId] ?? '?',
          jobTitleId: body.jobTitleId,
          jobTitle: JOB_TITLES[body.jobTitleId] ?? '?',
          hireDate: body.hireDate,
          status: 'active',
          leftOn: null,
          salary: { amountMinor: body.salaryMinor, currency },
          salaryUsd: 0,
          salaryHistory: [
            {
              id: newId * 100,
              effectiveDate: body.hireDate,
              amount: { amountMinor: body.salaryMinor, currency },
              reason: 'hire',
              note: null,
              changePercent: null,
            },
          ],
        });
        return reply(201, newId);
      }
      const employee = store.get(id);
      if (!employee) return problem(404, 'NOT_FOUND');
      if (method === 'GET') return reply(200, id);
      if (employee.status === 'left') return problem(409, 'EMPLOYEE_LEFT');
      if (method === 'PATCH') {
        if (body.email && emailTaken(body.email, id)) return problem(409, 'EMAIL_TAKEN');
        Object.assign(employee, body);
        if (body.departmentId) employee.department = DEPARTMENTS[body.departmentId] ?? '?';
        if (body.jobTitleId) employee.jobTitle = JOB_TITLES[body.jobTitleId] ?? '?';
        return reply(200, id);
      }
      const latest = employee.salaryHistory[0];
      if (action === '/salary-changes') {
        if (latest && body.effectiveDate < latest.effectiveDate) {
          return problem(409, 'EFFECTIVE_DATE_BEFORE_LATEST_CHANGE');
        }
        if (body.amountMinor === employee.salary.amountMinor) {
          return problem(409, 'SALARY_UNCHANGED');
        }
        const previous = employee.salary.amountMinor;
        employee.salary = { ...employee.salary, amountMinor: body.amountMinor };
        employee.salaryHistory = [
          {
            id: nextId++,
            effectiveDate: body.effectiveDate,
            amount: employee.salary,
            reason: body.reason,
            note: body.note ?? null,
            changePercent: Math.round(((body.amountMinor - previous) / previous) * 1000) / 10,
          },
          ...employee.salaryHistory,
        ];
        return reply(201, id);
      }
      if (action === '/leave') {
        if (latest && body.leftOn < latest.effectiveDate) return problem(400, 'DATE_OUT_OF_RANGE');
        employee.status = 'left';
        employee.leftOn = body.leftOn;
        return reply(200, id);
      }
      return problem(404, 'NOT_FOUND');
    },
  };
}

/** A small stand-in for GET /api/employees: enough filtering, sorting and paging for UI tests. */
function listEmployees(params: URLSearchParams) {
  const q = params.get('q')?.toLowerCase();
  const status = params.get('status') ?? 'active';
  const country = params.get('country');
  const sort = params.get('sort') ?? 'name';
  const page = Number(params.get('page') ?? 1);
  const pageSize = Number(params.get('pageSize') ?? 25);
  const matches = FAKE_EMPLOYEES.filter(
    (e) =>
      (status === 'all' || e.status === status) &&
      (!country || e.country === country) &&
      (!q || e.fullName.toLowerCase().includes(q)),
  );
  const key = sort.replace(/^-/, '') === 'salaryUsd' ? 'salaryUsd' : 'fullName';
  matches.sort((a, b) => (a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : a.id - b.id));
  if (sort.startsWith('-')) matches.reverse();
  return {
    items: matches.slice((page - 1) * pageSize, page * pageSize),
    page,
    pageSize,
    total: matches.length,
    fx: { asOf: '2026-10-01' },
  };
}

const usd = (amountMinor: number) => ({ amountMinor, currency: 'USD' });
const jpy = (amountMinor: number) => ({ amountMinor, currency: 'JPY' });
const inr = (amountMinor: number) => ({ amountMinor, currency: 'INR' });
const FX = { asOf: '2026-10-01' };

/** Fixed insight responses: the same six people the API's insights tests use. */
function insights(path: string, country: string | null): unknown {
  switch (path) {
    case '/api/insights/by-country':
      return {
        items: [
          {
            country: 'IN',
            currency: 'INR',
            headcount: 1,
            min: inr(176_000_000),
            median: inr(176_000_000),
            avg: inr(176_000_000),
            max: inr(176_000_000),
            avgUsd: 20_000,
            payrollUsd: 20_000,
          },
          {
            country: 'JP',
            currency: 'JPY',
            headcount: 2,
            min: jpy(9_000_000),
            median: jpy(10_500_000),
            avg: jpy(10_500_000),
            max: jpy(12_000_000),
            avgUsd: 70_000,
            payrollUsd: 140_000,
          },
          {
            country: 'US',
            currency: 'USD',
            headcount: 3,
            min: usd(9_000_000),
            median: usd(10_000_000),
            avg: usd(10_333_333),
            max: usd(12_000_000),
            avgUsd: 103_333.33,
            payrollUsd: 310_000,
          },
        ],
        fx: FX,
      };
    case '/api/insights/by-department':
      return {
        items: [
          {
            departmentId: 1,
            department: 'Engineering',
            headcount: 4,
            payrollUsd: 330_000,
            avgUsd: 82_500,
            share: 0.7021,
          },
          {
            departmentId: 4,
            department: 'Data',
            headcount: 1,
            payrollUsd: 120_000,
            avgUsd: 120_000,
            share: 0.2553,
          },
          {
            departmentId: 5,
            department: 'Sales',
            headcount: 1,
            payrollUsd: 20_000,
            avgUsd: 20_000,
            share: 0.0426,
          },
        ],
        totalUsd: 470_000,
        fx: FX,
      };
    case '/api/insights/by-job-title':
      return country === 'US'
        ? {
            country: 'US',
            items: [
              {
                jobTitleId: 13,
                jobTitle: 'Data Scientist',
                headcount: 1,
                countries: 1,
                avgUsd: 120_000,
                local: { min: usd(12_000_000), avg: usd(12_000_000), max: usd(12_000_000) },
              },
              {
                jobTitleId: 2,
                jobTitle: 'Software Engineer',
                headcount: 2,
                countries: 1,
                avgUsd: 95_000,
                local: { min: usd(9_000_000), avg: usd(9_500_000), max: usd(10_000_000) },
              },
            ],
            fx: FX,
          }
        : {
            country: null,
            items: [
              {
                jobTitleId: 13,
                jobTitle: 'Data Scientist',
                headcount: 1,
                countries: 1,
                avgUsd: 120_000,
              },
              {
                jobTitleId: 3,
                jobTitle: 'Senior Software Engineer',
                headcount: 1,
                countries: 1,
                avgUsd: 80_000,
              },
              {
                jobTitleId: 2,
                jobTitle: 'Software Engineer',
                headcount: 4,
                countries: 3,
                avgUsd: 67_500,
              },
            ],
            fx: FX,
          };
    case '/api/insights/distribution':
      if (country === 'US') {
        return {
          country: 'US',
          currency: 'USD',
          headcount: 3,
          percentiles: {
            p10: usd(9_200_000),
            p25: usd(9_500_000),
            p50: usd(10_000_000),
            p75: usd(11_000_000),
            p90: usd(11_600_000),
          },
          buckets: [
            { fromMinor: 9_000_000, toMinor: 10_000_000, count: 1 },
            { fromMinor: 10_000_000, toMinor: 11_000_000, count: 1 },
            { fromMinor: 11_000_000, toMinor: 12_000_000, count: 0 },
            { fromMinor: 12_000_000, toMinor: 13_000_000, count: 1 },
          ],
        };
      }
      if (country === 'JP') {
        return {
          country: 'JP',
          currency: 'JPY',
          headcount: 2,
          percentiles: {
            p10: jpy(9_300_000),
            p25: jpy(9_750_000),
            p50: jpy(10_500_000),
            p75: jpy(11_250_000),
            p90: jpy(11_700_000),
          },
          buckets: [
            { fromMinor: 9_000_000, toMinor: 10_000_000, count: 1 },
            { fromMinor: 10_000_000, toMinor: 11_000_000, count: 0 },
            { fromMinor: 11_000_000, toMinor: 12_000_000, count: 0 },
            { fromMinor: 12_000_000, toMinor: 13_000_000, count: 1 },
          ],
        };
      }
      return { country, currency: 'EUR', headcount: 0, percentiles: null, buckets: [] };
    default:
      return undefined;
  }
}
