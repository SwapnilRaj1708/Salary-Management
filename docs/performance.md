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

*To be measured with the Performance workflow (S10); the agent's sandbox can't reach
`*.vercel.app`.*

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
