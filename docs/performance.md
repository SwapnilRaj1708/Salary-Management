# Performance

Targets come from [requirements.md](requirements.md) and [architecture §11](architecture.md#11-performance-considerations):
list and insights under 300 ms at p95 on the warm deployed app with 10,000 employees.

## How it is measured

`npm run measure` (`api/src/perf/cli.ts`) calls the app from outside, one request at a
time, the way a browser would: the full response body is read before the clock stops.

- Each scenario gets one warm-up request, then 30 timed ones (5 for sign-in and the full
  export). The table gives p50, p95 and max of the total time.
- Every API response carries `Server-Timing: app;dur=<ms>`, the time the API itself spent,
  so the table also shows how much of each request was the app and how much the network.
- The first request of a run also says whether it landed on a cold instance: the API adds
  `cold` to `Server-Timing` on each instance's first request. That request's app time
  includes the database preparation every new instance runs once (§10).
- The **Performance** workflow runs the same script from a GitHub runner against the
  deployed site and writes the table to the run's summary.

## Deployed

Measured on 27 Oct 2026 with the Performance workflow
([run 2](https://github.com/SwapnilRaj1708/Salary-Management/actions/runs/40585310083)),
from a GitHub-hosted runner against https://salary-management-topaz.vercel.app at commit
`09e86cb`: the Vercel Function and the production Turso database (both in
`aws-us-east-1`), with the 10,000-employee seed.

**Every list and insights request meets the target**: the slowest p95 is 249 ms
(insights by country).

| Request | n | p50 | p95 | max | app p50 | app p95 |
|---|---|---|---|---|---|---|
| Sign in (scrypt) | 5 | 490 ms | 645 ms | 662 ms | 372 ms | 464 ms |
| Web app shell (`/`) | 30 | 29 ms | 40 ms | 77 ms | – | – |
| Health (one query) | 30 | 115 ms | 132 ms | 152 ms | 7 ms | 13 ms |
| Directory, first page | 30 | 123 ms | 138 ms | 163 ms | 20 ms | 29 ms |
| Directory, search | 30 | 129 ms | 165 ms | 177 ms | 22 ms | 34 ms |
| Directory, filter + USD sort + page 3 | 30 | 122 ms | 177 ms | 202 ms | 18 ms | 26 ms |
| Employee detail | 30 | 126 ms | 158 ms | 199 ms | 17 ms | 26 ms |
| Insights: by country | 30 | 206 ms | 249 ms | 275 ms | 102 ms | 141 ms |
| Insights: by job title | 30 | 125 ms | 147 ms | 154 ms | 21 ms | 32 ms |
| Insights: by department | 30 | 130 ms | 162 ms | 184 ms | 24 ms | 54 ms |
| Insights: distribution | 30 | 127 ms | 161 ms | 207 ms | 23 ms | 37 ms |
| CSV export, all 10,000 | 5 | 782 ms | 825 ms | 836 ms | 408 ms | 432 ms |

What the numbers say:

- **Most of each request is outside the app.** The health check spends 7 ms in the app
  but 115 ms in total: the network from the runner, Vercel's routing and the function
  invocation. The app's own share of a directory page or an insight is 20–30 ms, mostly
  the round trip to Turso.
- **Cold start:** the run's first request landed on a fresh instance. It took 1,535 ms in
  total, 264 ms of it in the app, which is the one-off database preparation (migrations
  check, reference data, HR user). The rest is Vercel starting the function. Later
  requests on that instance were warm.
- **By country is the slowest read** (app p95 141 ms): it reads every active salary,
  sorted, to take each country's median in TypeScript. It is still inside the target; if
  it ever isn't, the first step is to cache it behind a counter that every write
  increments (architecture §11).
- **Sign-in** costs about a third of a second in the app on purpose: scrypt with OWASP's
  parameters (decision D9).
- **The full export** of 10,000 rows (1.34 MB) takes about 0.8 s, half of it building the
  CSV in memory (decision X5).

Not measured: browser rendering time, and concurrent load. These are one client's
sequential requests.

**Turso quota.** The free plan allows 500 million row reads a month (decision P3). A
directory page reads about 10,000 rows (the count plus the page from the
`employee_salaries` view), and an Insights page load about 50,000. The production
database's monthly usage is on the Turso dashboard.

## Locally, for comparison

The dev servers on one machine against the 10,000-employee seed in a local SQLite file
(`BASE_URL=http://localhost:5173 ROUNDS=10 npm run measure`, 27 Oct). There is no network
and no Turso, so these show the app's own cost.

| Request | n | p50 | p95 | app p50 |
|---|---|---|---|---|
| Sign in (scrypt, N=2^15) | 5 | 345 ms | 369 ms | 334 ms |
| Directory, first page | 10 | 12 ms | 16 ms | 7 ms |
| Directory, search | 10 | 17 ms | 30 ms | 12 ms |
| Directory, filter + USD sort + page 3 | 10 | 10 ms | 13 ms | 6 ms |
| Insights: by country | 10 | 65 ms | 92 ms | 59 ms |
| Insights: by job title | 10 | 18 ms | 32 ms | 14 ms |
| Insights: by department | 10 | 19 ms | 27 ms | 15 ms |
| Insights: distribution | 10 | 9 ms | 14 ms | 5 ms |
| CSV export, all 10,000 (1.34 MB) | 5 | 252 ms | 255 ms | 229 ms |

Sign-in is slow on purpose: scrypt with OWASP's parameters costs about a third of a
second per attempt (decision D9). By country is the slowest read: it sorts every active
salary to take each country's median in TypeScript.
