# Delivery plan

How v1 gets built, tested and shipped. The scope is in [requirements.md](requirements.md),
the design in [architecture.md](architecture.md), and the choices in
[decisions.md](decisions.md).

## Approach

1. **Walking skeleton first, deployed on day 1.** An empty app goes all the way through
   CI and Vercel before any feature work. Hosting problems surface on day 1, not day 3.
2. **Then vertical slices.** Each slice goes test → API → UI → deploy, and leaves the
   deployed app able to do something new.
3. **Test-first where behaviour lives,** in domain rules and API behaviour. Those changes
   land as a red/green commit pair (see Commit conventions below). Scaffolding and UI
   commits include their tests in the same commit.

## Slices

Estimates are focused hours.

| Slice | Delivers | Key tests | Est. |
|---|---|---|---|
| **S0 Planning** ✅ | Clarifications, requirements, architecture, decisions, design system, this plan, CONTRIBUTING, CLAUDE.md, AI log. **Before this PR merges**, the owner sets merge-commit-only and creates the `main` ruleset without required checks (CONTRIBUTING.md), so even the first merge can't be squashed. | – | done |
| **S1 Skeleton** ✅ | npm workspaces, TS 6, Biome, Vitest; `buildApp()` with `/api/health` importing `shared/`; MUI theme with motion tokens (design-system.md), app shell on TanStack Router with View Transitions and a "demo data resets" notice; test helper with the reduced-motion test theme; CI `verify` job, added to the `main` ruleset once it has run | Health returns version; app shell renders; motion: `reducedMotion` is `'system'`, search-only navigations don't animate, no duration over 375 ms | 2.5 h |
| **S2 Deploy** ✅ | `vercel.json` with two services: `api` on `/api/*`, `web` on every other path. The Vercel entry point; a problem+json 404 for unknown API routes; the demo notice reworded for persistent data. CI `deploy-smoke` job (boot the API, `vercel build`, boot the built function), added to the `main` ruleset. Needs the repo imported into Vercel with the "Services" preset. **Smoke test on the deployed URL:** deep links return `index.html`, `/api/health` reports the commit, an unknown API route is a JSON 404. Measure the skeleton's cold start. *Re-planned 21 Oct:* Render, Docker and the wake gate are gone (decision P3). *Done 21 Oct:* deployed at salary-management-topaz.vercel.app; the owner ran the three URL checks. The agent's sandbox can't reach `*.vercel.app`, so the cold-start measurement moves to S10. | JSON 404; the Vercel entry default-exports the app; deploy smoke in CI | 3 h |
| **S3 Money** ✅ | `parseMoney` / `formatMoney` and the currency table in `shared/` | Decimal places 0/2/3, rejects extra decimals, zero, negatives and non-numbers, Indian digit grouping, JPY formatting | 1.5 h |
| **S4 Data + seed** ✅ | `@libsql/client`; schema migration with every table, including `users` and `sessions` (salary history references users); migration runner with `schema_migrations`; startup preparation (architecture §10); reference sync; FX view; deterministic generator; seed CLI writing in batches; `npm run db:check`; the manual **Database** workflow and the daily Cron call. **Checked on a real Turso database** with `db:check`, run by that workflow: foreign keys enforced (if not, triggers enforce the references); a failing batch rolls back; two writers at once both succeed; constraint errors carry `SQLITE_CONSTRAINT` and the constraint name over HTTP; seed time over the network. *Done 27 Oct:* `db:check` passed all six checks on both Turso databases; seeding took 11.0 s (preview) and 4.9 s (production) from GitHub Actions. | Bad dates rejected by CHECK; view converts JPY, INR and KWD correctly; migrations run once even when started twice; same seed gives the same org; seed invariants (10,000 rows, every row passes the database constraints, cached salary = latest history row) | 3 h |
| **S5 Auth** | HR-user provisioning, scrypt, login/logout/me, `requireAuth`, login page and route guard. On the deployed URL, login sets the cookie and `/auth/me` then returns 200. | 401 without a session; cookie flags; same error for wrong email or password; logout and expiry (fixed clock) | 2 h |
| **S6 Directory** ⭐ | Query builder, list endpoint, employee directory on MUI X Data Grid in server mode (lazy-loaded route), with filters, search, sort and paging in the URL. **First demoable deploy.** | LIKE wildcards escaped; unknown sort → 400; USD sort orders mixed currencies; stable pages; default status = active | 3 h |
| **S7 Records** | Detail with history, create, edit, salary change, mark as left (API and UI) | Each rule in architecture §8; salary change is atomic; triggers reject an out-of-order change and a change for a leaver even when the service check is skipped; leavers read-only; duplicate email → 409 | 3.5 h |
| **S8 Insights** | `percentile` and `histogram` (pure), 4 endpoints, Insights page (MUI tables, MUI X Charts bar charts, lazy-loaded route) | Excel fixtures (`[1,2,10]` → P90 = 8.4; median of an even count); nice bucket widths with empty bins kept; exact numbers on a hand-built fixture; leavers excluded | 3 h |
| **S9 Export** | CSV escaping and the export endpoint and button | Quoting, formula-injection prefix, numbers left raw, BOM, filters respected | 1 h |
| **S10 Ship** | README; performance numbers measured on the deployed app (cold start, login time, list and insights p95); AI log; demo video; tag `v1.0.0` | – | 2.5 h |

**Total: about 25 hours.** That is about three and a half focused days, with
submission after day 4 at the latest.

After `v1.0.0`, only if time allows: a Playwright smoke test against the live URL, a
warning on pay cuts or raises above 50%, then CSV import (the stretch goal).

## Cut order if time runs short

1. CSV import (already a stretch goal)
2. The distribution chart, shown as a percentile table instead (still answers the question)
3. Sorting on every column (keep name and salary)
4. Web component tests other than login error, JPY formatting and the salary-change dialog

**Never cut:** requirements, deployed app, salary history with reasons, all four insight
metrics, CSV export, domain and API tests, the 10,000-row seed, the video, AI notes.

## Test strategy

| Layer | Scope | Tools | Share |
|---|---|---|---|
| Unit (pure) | money, salary-change rules, stats, CSV escaping, query builder, seed generator, zod contracts | Vitest, node environment | ~60% |
| API integration | Every route through `buildApp()`. Each test gets a fresh in-memory SQLite database with the real migrations. No mocked repositories. Responses are parsed with the shared zod schemas as contract checks. | Vitest + supertest | ~35% |
| Web components | Login error, money formatting (JPY), form validation without network, salary-change dialog, redirect to login on 401 | Vitest, jsdom, Testing Library, TanStack Router with memory history. A `renderWithProviders` helper uses the reduced-motion test theme, so transitions finish instantly. The Data Grid and MUI need no jsdom stubs; only `window.scrollTo` is stubbed, for the router *(verified)*. | 4–6 tests |
| End to end | One happy-path smoke test against the live URL, after v1 | Playwright | 1 |

**Fast and deterministic, by construction:**
- The clock and random number generator are injected. Domain code, services and the seed
  never call `Date.now()`, `new Date()` or `Math.random()`.
- Dates are `YYYY-MM-DD` strings. Tests run with `TZ=UTC`.
- The FX rates are a constant committed to the repo. Tests never touch the network and
  never sleep.
- Test-data builders (e.g. `anEmployee().inCountry('JP').build()`) keep tests readable:
  one behaviour per test, named like a sentence.
- Targets: the whole suite under 10 s, unit tests under 1 s. Coverage is reported in the
  README, not enforced.

## Commit conventions

Branches, commits, red/green pairs, pull requests and merge rules are in
[CONTRIBUTING.md](../CONTRIBUTING.md).

## CI

GitHub Actions, on every pull request and on `main`:
1. **verify:** `npm ci` → `biome ci` → `npm run typecheck` → `npm test` (with coverage) →
   `npm run build`
2. **deploy-smoke:** `npm ci` → `node scripts/deploy-smoke.mjs`. It boots the API locally,
   builds the repo with Vercel's own CLI (pinned) and boots what that build produced
   (architecture §10). This catches a wrong entry point, a broken bundle or a broken route
   before Vercel does. The CLI runs through `npx` at an exact version instead of being a
   devDependency. As a devDependency its lockfile would pin its dependencies too, but
   about 195 packages would land in every `npm ci`, including Vercel's own installs. The
   pin is bumped deliberately.

The job ids `verify` and `deploy-smoke` are the names the `main` ruleset requires. The
workflow has no `paths` filters, because a skipped workflow would leave required checks
pending.

**Deploy.**
- Vercel deploys both services from the same commit: `main` to production on every
  merge, and a preview for every pull-request push. Previews use their own Turso database.
- A GitHub ruleset on `main` requires a pull request with passing `verify` and
  `deploy-smoke` checks, and blocks direct pushes, force pushes and deletion. The repo
  allows merge commits only.
- So every production deploy came through a pull request that passed both jobs. Vercel
  doesn't wait for `main`'s own CI run.
- `/api/health` reports the deployed commit, which Vercel provides as
  `VERCEL_GIT_COMMIT_SHA`.

## Risks

| Risk | Mitigation |
|---|---|
| Hosting surprises (account setup, Vercel's build differing from local runs) | Deploy the skeleton on day 1. CI runs Vercel's own build and boots its output on every pull request. |
| Free-tier limits: Turso's monthly row reads, a possible archive of idle free databases, a network round trip per query | Reads batched per request; quota headroom estimated in decision P3; a daily Cron query keeps the database active. Cold start measured in S2, latency and quota use in S10. If insights miss the target: fewer round trips first, then a cache keyed on a write counter. |
| Turso's terms change (Supabase is buying it) | The data is plain SQLite behind repositories, so it can move to another host or to Postgres |
| Money bugs (float maths, JPY decimals, FX direction) | Integer minor units, string parsing, one conversion path, tests for 0, 2 and 3 decimal places |
| A very new toolchain (Vite 8, Vitest 5, MUI 9, MUI X 9, TanStack Router) | Exact version pins and a lockfile. The skeleton exercises every tool on day 1. `tsx` is the fallback for type stripping. Node is pinned to 22.22.3, because jsdom 30 needs at least 22.22.2. `skipLibCheck` stays on in `web/`, because MUI X's own type files fail strict checks. |
| Open tabs older than the API after a deploy | API changes stay backward-compatible, and response contracts aren't strict. UI and API deploy together, so the UI is never ahead of the API. |
| Pull-request code migrating production data | Previews use a separate Turso database through Vercel's Preview environment variables. Migrations are additive (expand, then contract). |
| AI-written code the candidate can't explain | Tests written first and reviewed as the spec; small diffs; the decision log; CLAUDE.md rules |
| Scope creep | The "deliberately out" list, plus the cut order above |
| Reviewers see each other's changes | The seed is deterministic, the demo notice says changes are shared, and `npm run seed -- --reset` restores the starting data |
| No deadline given (the recruiter's reply didn't set one) | Demoable from slice S6. Submission aimed at the end of day 3 of the build. |
