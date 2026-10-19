# Delivery plan

How v1 gets built, tested and shipped. The scope is in [requirements.md](requirements.md),
the design in [architecture.md](architecture.md), and the choices in
[decisions.md](decisions.md).

## Approach

1. **Walking skeleton first, deployed on day 1.** An empty app goes all the way through
   CI, Docker and Fly before any feature work. Hosting problems surface on day 1, not
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
| **S0 Planning** ✅ | Clarifications, requirements, architecture, decisions, this plan, CLAUDE.md, AI log | – | done |
| **S1 Skeleton** | npm workspaces, TS 6, Biome, Vitest; `buildApp()` with `/api/health` importing `shared/`; Mantine app shell; CI `verify` job | Health returns version; app shell renders | 2 h |
| **S2 Deploy** | Dockerfile, `fly.toml`, CI Docker smoke test (build → run → curl health) and deploy job (needs a Fly account and a `FLY_API_TOKEN` repo secret; Railway is the fallback); live URL | Docker smoke in CI | 1.5 h |
| **S3 Money** | `parseMoney` / `formatMoney` in `shared/` | Decimal places 0/2/3, rejects extra decimals, zero, negatives and non-numbers, Indian digit grouping, JPY formatting | 1.5 h |
| **S4 Data + seed** | Schema migration with every table, including `users` and `sessions` (salary history references users), migration runner, reference sync, FX view, deterministic generator, seed CLI, seed-if-empty at boot | Bad dates rejected by CHECK; view converts JPY and INR correctly; same seed gives the same org; seed invariants (10,000 rows, every row passes the contract, cached salary = latest history row) | 2.5 h |
| **S5 Auth** | HR-user provisioning, scrypt, login/logout/me, `requireAuth`, login page and route guard | 401 without a session; cookie flags; same error for wrong email or password; logout and expiry (fixed clock) | 2 h |
| **S6 Directory** ⭐ | Query builder, list endpoint, employees table with URL-state filters, search, sort and paging. **First demoable deploy.** | LIKE wildcards escaped; unknown sort → 400; USD sort orders mixed currencies; stable pages; default status = active | 3 h |
| **S7 Records** | Detail with history, create, edit, salary change, mark as left (API and UI) | Each rule in architecture §8; salary change is atomic; leavers read-only; duplicate email → 409 | 3.5 h |
| **S8 Insights** | `percentile` and `histogram` (pure), 4 endpoints, Insights page (tables + distribution chart) | Excel fixtures (`[1,2,10]` → P90 = 8.4; median of an even count); nice bucket widths with empty bins kept; exact numbers on a hand-built fixture; leavers excluded | 3 h |
| **S9 Export** | CSV escaping and the export endpoint and button | Quoting, formula-injection prefix, numbers left raw, BOM, filters respected | 1 h |
| **S10 Ship** | README, performance numbers measured on the deployed app, AI log, demo video, tag `v1.0.0` | – | 2.5 h |

**Total: about 22 hours.** That is about three focused days, with submission at the end of
day 3.

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
| Web components | Login error, money formatting (JPY), form validation without network, salary-change dialog, redirect to login on 401 | Vitest, jsdom, Testing Library, `createMemoryRouter` | 4–6 tests |
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

- **Format:** Conventional Commits (`feat:`, `test:`, `fix:`, `refactor:`, `docs:`,
  `chore:`, `ci:`, `build:`).
- **Red/green pairs.** A `test:` commit specifies behaviour and fails on purpose. Its body
  says "RED: made green in the next commit". The `feat:` commit right after makes it
  pass, and refactors follow as their own commits. Each pair is pushed together, and CI
  runs on the pushed head, so CI never sees a red build.
- **Small commits.** Each commit does one thing and keeps the build passing (except a
  deliberate red test).
- **Merging.** History must reach `main` intact: fast-forward or rebase-merge, never
  squash.

## CI

GitHub Actions, on push and pull request:
1. **verify:** `npm ci` → `biome ci` → `npm run typecheck` → `npm test` (with coverage) →
   `npm run build`
2. **docker-smoke:** build the image → run it on a temporary volume → `curl /api/health`.
   This catches the type-stripping symlink and volume-permission failures before Fly does.
3. **deploy** (`main` only, after 1 and 2): `flyctl deploy`, then check that `/api/health`
   reports the new git SHA.

## Risks

| Risk | Mitigation |
|---|---|
| Hosting surprises (account, payment card, volume permissions, cookies behind a proxy) | Deploy the skeleton on day 1 and boot the image in CI |
| Money bugs (float maths, JPY decimals, FX direction) | Integer minor units, string parsing, one conversion path, tests for 0, 2 and 3 decimal places |
| A very new toolchain (Vite 8, Vitest 5, React Router 8, Mantine 9) | Exact version pins and a lockfile. The skeleton exercises every tool on day 1. `tsx` is the fallback for type stripping. |
| AI-written code the candidate can't explain | Tests written first and reviewed as the spec; small diffs; the decision log; CLAUDE.md rules |
| Scope creep | The "deliberately out" list, plus the cut order above |
| Reviewers edit demo data before the interview | Seed is deterministic; the reset command is in the README |
| No deadline given (the recruiter's reply didn't set one) | Demoable from slice S6. Submission aimed at the end of day 3 of the build. |
