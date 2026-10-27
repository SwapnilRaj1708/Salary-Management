import { appendFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { readServerTiming, summarize, type Timing, tableRow } from './summary.ts';

// npm run measure: times the deployed app from outside, the way a browser would call it
// (docs/performance.md). Read-only apart from the sessions its logins create.
//   BASE_URL        the site, e.g. https://salary-management-topaz.vercel.app
//   ADMIN_EMAIL     the HR login (the local-only default when BASE_URL is localhost)
//   ADMIN_PASSWORD
//   ROUNDS          requests per scenario after one warm-up request (default 30)

const base = (process.env.BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const local = /^http:\/\/(localhost|127\.0\.0\.1)(:|$)/.test(base);
const email = process.env.ADMIN_EMAIL ?? (local ? 'admin@acme.example' : undefined);
const password = process.env.ADMIN_PASSWORD ?? (local ? 'local-demo-password' : undefined);
const rounds = Number(process.env.ROUNDS ?? 30);
if (!email || !password) {
  throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD to measure a deployed site.');
}

let cookie = '';

async function timed(path: string, init: RequestInit = {}): Promise<Timing & { res: Response }> {
  const start = performance.now();
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: { ...(cookie ? { Cookie: cookie } : {}), ...init.headers },
  });
  await res.arrayBuffer(); // the full body, as the browser would wait for it
  const ms = performance.now() - start;
  if (!res.ok) throw new Error(`${init.method ?? 'GET'} ${path} answered ${res.status}`);
  const { serverMs, cold } = readServerTiming(res.headers.get('server-timing'));
  return { res, ms, serverMs, cold };
}

async function login(): Promise<Timing> {
  const result = await timed('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  cookie = result.res.headers.get('set-cookie')?.split(';')[0] ?? '';
  return result;
}

async function series(name: string, paths: readonly string[], count = rounds) {
  await timed(paths[0] as string); // warm-up, not counted
  const timings: Timing[] = [];
  for (let i = 0; i < count; i += 1) timings.push(await timed(paths[i % paths.length] as string));
  return tableRow(name, summarize(timings));
}

const lines: string[] = [];
const print = (line = '') => {
  console.log(line);
  lines.push(line);
};

// The first request may land on a fresh instance (marked `cold` by Server-Timing). Its app
// time includes the database preparation every new instance runs once.
const first = await timed('/api/health');
print(`## Measured ${base}`);
print();
print(
  `First request: ${Math.round(first.ms)} ms in total, ${first.serverMs ?? '?'} ms in the app, ` +
    `${first.cold ? 'on a cold instance' : 'on a warm instance'}.`,
);
print();
print('| Request | n | p50 | p95 | max | app p50 | app p95 |');
print('|---|---|---|---|---|---|---|');

const logins: Timing[] = [];
for (let i = 0; i < 5; i += 1) logins.push(await login());
print(tableRow('Sign in (scrypt)', summarize(logins)));

const rows = [
  await series('Web app shell (`/`)', ['/']),
  await series('Health (one query)', ['/api/health']),
  await series('Directory, first page', ['/api/employees']),
  await series('Directory, search', ['/api/employees?q=sha', '/api/employees?q=EMP-0042']),
  await series('Directory, filter + USD sort + page 3', [
    '/api/employees?country=IN&sort=-salaryUsd&page=3',
    '/api/employees?departmentId=1&status=all&sort=hireDate&page=3',
  ]),
  await series(
    'Employee detail',
    Array.from({ length: 10 }, (_, i) => `/api/employees/${1 + i * 997}`),
  ),
  await series('Insights: by country', ['/api/insights/by-country']),
  await series('Insights: by job title', [
    '/api/insights/by-job-title',
    '/api/insights/by-job-title?country=IN',
  ]),
  await series('Insights: by department', ['/api/insights/by-department']),
  await series('Insights: distribution', [
    '/api/insights/distribution?country=US',
    '/api/insights/distribution?country=JP',
  ]),
  await series('CSV export, all 10,000', ['/api/employees/export.csv?status=all'], 5),
];
for (const row of rows) print(row);
print();
print(
  `Sequential requests from one client; ${rounds} per row after a warm-up, unless n says otherwise.`,
);

if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${lines.join('\n')}\n`);
}
