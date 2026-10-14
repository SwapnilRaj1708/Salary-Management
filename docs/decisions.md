# Decision log

These are lightweight architecture decision records. Each one says what we chose, what
else we considered, why, and when to revisit it. They were settled during planning on
14 Oct 2026, and several came out of the adversarial reviews described in
[ai/README.md](ai/README.md).

Claims marked *(verified)* were checked during planning by a review agent. It installed
the pinned package versions and ran small probe scripts, which were not kept. The ones
the design depends on are proved again by tests or CI during the build:
- the `IS date()` CHECK;
- Express 5 async error handling;
- the scrypt `maxmem` setting;
- body-parser error mapping;
- type stripping through the workspace symlink (the Docker smoke test).

## Stack

| # | Decision | Alternatives | Why | Revisit when |
|---|---|---|---|---|
| D1 | **Express 5** | Fastify 5, NestJS | Fewest concepts, and the most widely known Node framework. v5 sends rejected async handlers to the error middleware *(verified)*. Handlers are thin, so the framework stays at the edge. | Schema-driven routes or very high throughput are needed |
| D2 | **Plain SQL + repositories** on better-sqlite3, with numbered `.sql` migrations tracked by `PRAGMA user_version` | Drizzle, Kysely | The queries that matter (the FX view, GROUP BYs) would be raw SQL in any ORM. Drizzle is mid-way to 1.0 (release candidates on npm), which risks churn during the build. Repository tests on in-memory SQLite with the real migrations catch SQL mistakes. | Dynamic queries multiply → Kysely |
| D6 | **Shared workspace package** (`shared/`) imported as TypeScript source | Separate types in each app; OpenAPI codegen | One zod contract validates API input, web forms and URL state, with no build step *(verified through the workspace symlink)*. | Contracts are needed outside this repo |
| D7 | **Mantine 9** (core, form, notifications, charts) | shadcn/ui + Tailwind, MUI | Searchable selects, modals, notifications, tables and Recharts-based charts come built in, and there is no generated component code to own and maintain. Works with React 19 and Recharts 3 *(verified)*. | A custom design system is required |
| D8 | **Biome** (exact version pin) | ESLint + typescript-eslint + Prettier | One tool and one config, sub-second in CI, and not tied to the TypeScript version. Its type-aware promise rule is still experimental, so it is enabled explicitly; Express 5's async error forwarding covers the main runtime risk. | We need type-aware rules Biome lacks |
| D14 | **React Router 8** (`createBrowserRouter`, no loaders) + **TanStack Query** for server state | TanStack Router | About five routes, no code generation, well known. Typed URL state comes from parsing search params with the shared zod schema. | Routes or URL state grow a lot |
| D15 | **TypeScript 6.0.3**, pinned | TS 7.0 (native), TS 5.9 | The TS 7.0 package does not yet ship a JS compiler API or tsserver *(verified)*, so editor and tool integrations lag behind. At this codebase size type-checking takes seconds either way, so TS 7's speed is not worth that risk. Upgrading later is a one-line change. | Editor tooling supports TS 7 |
| T1 | **Run the API as `.ts` with Node 22's type stripping**; `tsc --noEmit` checks types | tsx, a tsc build step | No build step for the API. Constraints: erasable syntax only (no enums or namespaces); type-only imports written as `import type`; `.ts` import extensions; and the shared package must stay a symlink. A plain import of a type crashes Node at boot while `tsc` and Vitest still pass *(verified)*, so tsconfig sets `erasableSyntaxOnly` and `verbatimModuleSyntax` to make `tsc` enforce the first two. Node refuses to strip types under `node_modules` *(verified)*, so CI boots the Docker image to prove the symlink works. | Anything breaks → swap `node` for `tsx` in two scripts |

## Domain and data

| # | Decision | Alternatives | Why | Revisit when |
|---|---|---|---|---|
| D3 | **Money as integer minor units + ISO 4217 currency**, with the decimal places per currency in our own table | Whole major units; decimal strings; floats | Exact, and handles JPY (0 decimals) and KWD (3). STRICT INTEGER columns reject fractions *(verified)*. Input is parsed from strings, never with float maths: `Math.round(1.005*100)` is `100` *(verified)*. | – |
| D4 | **Mark as left** (`status`, `left_on`); **no hard delete** | DELETE; generic `deleted_at` | Leaving is an HR event. Salary history must survive, and metrics filter on `active`. A CHECK keeps status and date consistent. | A legal erasure (GDPR) workflow is needed |
| D5 | **Cached current salary on `employees`** plus **append-only `salary_history`**, written in one transaction | Derive "latest history row" in every query | List sort and every aggregate read one indexed table. Effective dates must fall between the latest change and today, so the cache can never go stale. An invariant test asserts cache = latest row. | Future-dated raises come into scope |
| D12 | **Reference tables** for countries, currencies, departments and job titles; no editing UI in v1 | Free-text columns | Every metric groups by these keys. Free text splits groups ("Sr Engineer" vs "Senior Engineer"), which is the spreadsheet problem we are replacing. | HR needs to manage lists themselves |
| X1 | **One FX source**: rates and decimal places live in `shared/`, are synced into the DB, and USD conversion happens **only in the `employee_salaries` SQL view** | A TypeScript `toUsd()`; a separate rates table | Two conversion paths can silently disagree, or invert the rate. The list's USD sort needs conversion in SQL anyway, so a TypeScript copy would only be a second path to drift. Rates are quoted as units per USD, the usual way (INR 88). | Historical or live rates → extract an `exchange_rates(currency, as_of, rate)` table |
| D10 | **SQL for count/min/max/avg/sum; TypeScript for median, percentiles and histograms** | SQLite `median()`/`percentile_cont()` (present in this build *(verified)*); all in TypeScript | The Excel-matching definition (PERCENTILE.INC) lives in code we can drive with tests. It does not depend on a SQLite compile flag, and it avoids a verified trap where better-sqlite3 binds JS numbers as REAL in bucket maths. Sorting 10k integers per request is cheap. | Around 1M rows → `percentile_cont` in SQL (it matches Excel) or Postgres |
| D11 | **Own seeded PRNG (mulberry32) + curated per-country name lists** | faker | The same seed produces the same data forever; faker only promises that within one version. The seed runs in the production container (seed if empty), so faker would become a production dependency; our own PRNG adds none. Salary realism is custom code either way. | – |
| D13 | **Offset pagination** with total count, whitelisted sort and an `id` tie-breaker | Keyset pagination | HR expects "page 3 of 400", and offset cost is negligible at 10k rows. | Around 1M rows → keyset |
| X2 | **No relocation in v1**: country is fixed after creation | A relocation flow inside salary changes | It changes currency partway through history, % change across currencies is undefined, it is rare, and the assumptions don't cover it. History rows keep a currency snapshot, so relocation can be added later without migrating data. | HR asks for it |
| X3 | **"Today" = the date in a configured time zone (`APP_TIME_ZONE`), from an injected clock** | UTC; "the latest time zone on Earth" (UTC+14) | Easy to explain, deterministic in tests, and it never accepts a date that is tomorrow for the HR user. | Users in several time zones |

## API and security

| # | Decision | Alternatives | Why | Revisit when |
|---|---|---|---|---|
| D9 | **Users + sessions tables**, async scrypt (N=2^15, r=8, p=3), opaque token in an HttpOnly cookie with only its SHA-256 stored | HTTP Basic; one credential from env vars with a signed stateless cookie | Real logout and expiry, and a `changed_by` audit on salary changes, with no dependencies. The scrypt parameters meet OWASP's minimum. Node's default `maxmem` rejects them, so `maxmem` is set explicitly *(verified)*. | SSO or more roles |
| X4 | **RFC 9457 problem+json** errors with a `code` member | A custom error envelope | A standard you can name, and the UI branches on `code`. Body-parser errors are mapped explicitly, otherwise they surface as 500s *(verified)*. | – |
| X5 | **CSV is built in memory, not streamed** | Streaming from a database cursor | While a better-sqlite3 cursor is open, writes on that connection fail *(verified)*, so streaming would block salary changes. 10k rows is about 1.5 MB, which is quick to build in memory. Text cells starting with `= + - @`, tab or CR get a leading `'` (OWASP CSV injection). A UTF-8 BOM makes Excel read non-ASCII names correctly. | Exports above about 100k rows → chunked keyset reads |

## Delivery

| # | Decision | Why |
|---|---|---|
| P1 | **Build in vertical slices** after a walking skeleton deployed on day 1 | Each slice is demoable and deployable, so integration and hosting problems show up early. The history then reads as a product evolving, not as layers stacked up. |
| P2 | **Red/green commit pairs for domain and API behaviour**, pushed together so CI only sees green heads | Makes test-first development visible in history without red builds. |
| P3 | **Fly.io**, one Machine with a volume | SQLite needs a persistent disk and one writer. Railway is the fallback. Render's free tier would wipe reviewers' edits. |

## Considered and deliberately deferred

- **Login rate limiting, an Origin-header check, structured log redaction.** Deferred for
  time. They add little to the public demo, but rate limiting is required before real
  use. When it is added, `trust proxy` must be set, otherwise all clients share the
  proxy's IP *(verified)*.
- **Optimistic locking.** With one HR user, a lost update from two open tabs is accepted.
  Writes are synchronous in one process, so concurrent requests cannot corrupt data.
- **Playwright end-to-end tests as a deploy gate.** They would be slow and flaky as a gate.
  A smoke test against the live URL is planned after v1.
- **Coverage thresholds.** Coverage will be reported, not enforced.
