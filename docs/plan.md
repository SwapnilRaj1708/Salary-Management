# Delivery plan

How v1 gets built, tested and shipped. The scope is in [requirements.md](requirements.md),
the design in [architecture.md](architecture.md), and the choices in
[decisions.md](decisions.md).

## Approach

1. **Walking skeleton first, deployed on day 1.** An empty app goes all the way through
   CI, Docker, Render and Vercel before any feature work. Hosting problems surface on day 1, not
   day 3.
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
| **S2 Deploy** | Dockerfile, `render.yaml` (auto-deploy after CI checks pass), CI Docker smoke test (build → run → curl health); `web/vercel.json` with the `/api` rewrite; `ServerWakeGate`; `docker-smoke` added to the `main` ruleset. Needs free Render and Vercel accounts connected to GitHub. **Smoke test through the Vercel URL:** deep links return `index.html`, and `/api` is never cached, including while Render sleeps. Measure the skeleton's cold start on the 0.1 CPU instance. | Docker smoke in CI; wake-gate states | 3 h |
| **S3 Money** | `parseMoney` / `formatMoney` in `shared/` | Decimal places 0/2/3, rejects extra decimals, zero, negatives and non-numbers, Indian digit grouping, JPY formatting | 1.5 h |
| **S4 Data + seed** | Schema migration with every table, including `users` and `sessions` (salary history references users), migration runner, reference sync, FX view, deterministic generator, seed CLI, seed-if-empty at boot; cold start with the boot seed measured on Render (decides the listen-before-seed fallback, architecture §10) | Bad dates rejected by CHECK; view converts JPY and INR correctly; same seed gives the same org; seed invariants (10,000 rows, every row passes the contract, cached salary = latest history row) | 2.5 h |
| **S5 Auth** | HR-user provisioning, scrypt, login/logout/me, `requireAuth`, login page and route guard. Through the Vercel URL, login's `Set-Cookie` passes through and `/auth/me` then returns 200 (P3's cookie check). | 401 without a session; cookie flags; same error for wrong email or password; logout and expiry (fixed clock) | 2 h |
| **S6 Directory** ⭐ | Query builder, list endpoint, employee directory on MUI X Data Grid in server mode (lazy-loaded route), with filters, search, sort and paging in the URL. Query strings reach Render intact through Vercel. **First demoable deploy.** | LIKE wildcards escaped; unknown sort → 400; USD sort orders mixed currencies; stable pages; default status = active | 3 h |
| **S7 Records** | Detail with history, create, edit, salary change, mark as left (API and UI) | Each rule in architecture §8; salary change is atomic; leavers read-only; duplicate email → 409 | 3.5 h |
| **S8 Insights** | `percentile` and `histogram` (pure), 4 endpoints, Insights page (MUI tables, MUI X Charts bar charts, lazy-loaded route) | Excel fixtures (`[1,2,10]` → P90 = 8.4; median of an even count); nice bucket widths with empty bins kept; exact numbers on a hand-built fixture; leavers excluded | 3 h |
| **S9 Export** | CSV escaping and the export endpoint and button | Quoting, formula-injection prefix, numbers left raw, BOM, filters respected | 1 h |
| **S10 Ship** | README; performance numbers measured on the deployed app (cold start including the boot seed, login time, list and insights p95); AI log; demo video; tag `v1.0.0` | – | 2.5 h |

**Total: about 24.5 hours.** That is about three and a half focused days, with
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
2. **docker-smoke:** build the image → run it → `curl /api/health`. This catches a broken
   image, such as the type-stripping symlink failure, before Render does.

The job ids `verify` and `docker-smoke` are the names the `main` ruleset requires. The
workflow has no `paths` filters, because a skipped workflow would leave required checks
pending.

**Deploy.**
- Render auto-deploys `main` only after its CI checks pass (`autoDeployTrigger:
  checksPass` in `render.yaml`).
- A GitHub ruleset on `main` requires a pull request with passing `verify` and
  `docker-smoke` checks, and blocks direct pushes, force pushes and deletion. The repo
  allows merge commits only.
- So every API deploy (Render) came through a pull request and passed both jobs, on the
  PR and again on `main`.
- The UI is not gated the same way. Vercel deploys `main` about a minute after a merge,
  before `main`'s CI finishes, and builds a preview for every PR push. Those previews call
  the production API.
- `/api/health` reports the deployed commit, which Render provides as
  `RENDER_GIT_COMMIT`.

## Risks

| Risk | Mitigation |
|---|---|
| Hosting surprises (account setup, cookies behind a proxy, image boot) | Deploy the skeleton on day 1 and boot the image in CI |
| Free host limits: sleeps after 15 min idle (cold start up to about a minute), 0.1 CPU, data reset on every boot | Cold start measured for the skeleton in S2, with the boot seed in S4, and again in S10; login and query latency in S10. Login page and README say data resets. Open the URL a minute before a demo. If insights miss the latency target, cache their responses in memory and clear the cache on every write. |
| Money bugs (float maths, JPY decimals, FX direction) | Integer minor units, string parsing, one conversion path, tests for 0, 2 and 3 decimal places |
| A very new toolchain (Vite 8, Vitest 5, MUI 9, MUI X 9, TanStack Router) | Exact version pins and a lockfile. The skeleton exercises every tool on day 1. `tsx` is the fallback for type stripping. Node is pinned to 22.22.3, because jsdom 30 needs at least 22.22.2. `skipLibCheck` stays on in `web/`, because MUI X's own type files fail strict checks. |
| Vercel's proxy mishandles cookies or caching | Smoke tests through the Vercel URL: routing and caching in S2, the cookie in S5, query strings in S6. Caching is opted out on `/api`. If a test fails, ship the Render URL alone (the same app, no code change). |
| UI deployed ahead of the API | API changes stay backward-compatible. A numeric `API_VERSION` in `shared/` is bumped only when the UI needs a newer API. In production builds, the UI compares it with `/api/health` and says the server is updating if it is behind. Commit SHAs are not compared, because docs-only merges redeploy Vercel but not Render. |
| AI-written code the candidate can't explain | Tests written first and reviewed as the spec; small diffs; the decision log; CLAUDE.md rules |
| Scope creep | The "deliberately out" list, plus the cut order above |
| Reviewers see different data | Seed is deterministic and runs on every boot, so every reviewer starts from the same data |
| No deadline given (the recruiter's reply didn't set one) | Demoable from slice S6. Submission aimed at the end of day 3 of the build. |
