import type { AuthUser, EmployeeListItem } from '@salary/shared';
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
  const state = { signedIn, requests: [] as string[] };
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
    if (method === 'GET' && input.startsWith('/api/employees')) {
      if (!state.signedIn) return problem(401, 'UNAUTHENTICATED');
      return json(200, listEmployees(new URL(input, 'http://test').searchParams));
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
