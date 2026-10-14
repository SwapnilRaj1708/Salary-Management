# CLAUDE.md: Salary Management

Before changing behaviour, read `docs/requirements.md`, `docs/architecture.md` and
`docs/decisions.md`. The working assumptions in `docs/clarifications.md` are fixed. If a
task conflicts with them, stop and ask.

## Commands

- `npm run verify`: lint + typecheck + tests. Must pass before every commit, except a
  RED `test:` commit, where the only allowed failure is the new test.
- `npm test -- <path>` runs one file; `npm test -- --project api` runs one workspace.
- `npm run dev`: API + web with reload.
- `npm run seed -- --reset`: rebuild the local database with 10,000 employees.

## Workflow

- **Test first for domain and API behaviour.** Write or extend the test and run it to see
  it fail. Commit it as `test: …` with the body "RED: made green in the next commit".
  Then write the minimum code to pass and commit it as `feat: …`. Refactor in a separate
  commit. Push each red/green pair together; never push a red head.
- Scaffolding and UI commits include their tests in the same commit.
- Never weaken, skip or delete a test to get green.
- Use Conventional Commits, small and single-purpose.
- No new dependency without saying why and what the alternative was. Pin exact versions.
- Log anything notable (an AI mistake, a surprising library behaviour) in `docs/ai/log.md`.

## Conventions

- **Layout:** npm workspaces `api/`, `web/`, `shared/`. Inside `api/src`, use feature folders
  (`auth/ employees/ insights/ export/`, each with `routes.ts`, `service.ts`,
  `repository.ts`) plus `domain/ db/ http/ seed/`.
- **TypeScript:** strict, erasable syntax only (no `enum`, `namespace` or parameter
  properties; use `as const` plus zod enums). Import types with `import type` or
  `import { type X }`: a plain import of a type crashes Node at boot even though `tsc` and
  Vitest pass. tsconfig sets `erasableSyntaxOnly` and `verbatimModuleSyntax` to enforce
  both. Relative imports end in `.ts`, because Node runs the API's TypeScript directly.
- **Money:** stored and entered money is always an integer in minor units plus an
  ISO 4217 code; never use floats for it. The only floats are derived values (the view's
  `salary_usd`, percentile interpolation), each rounded once in the response mapper.
  Parse with `parseMoney` from a string, and display only with `formatMoney` (both in
  `shared/`).
- **USD conversion happens only in the `employee_salaries` SQL view.** No TypeScript
  `toUsd()`. Countries, currencies and the FX snapshot live only in
  `shared/src/reference.ts`.
- **No `Date.now()`, `new Date()` or `Math.random()`** in domain code, services or the
  seed. Inject `Clock` and `Rng` instead.
- `domain/` and `shared/` are pure: no I/O, no framework imports, no Node or DOM APIs.
- **Validation:** validate at the HTTP edge with the shared zod contracts (`.strict()`
  objects). SQL lives only in repositories and is always parameterised. Sort keys come
  from a whitelist.
- **Never `await` inside `db.transaction()`.**
- **Errors:** throw a typed `DomainError`. The error handler maps it to RFC 9457
  problem+json with a `code`.
- **Vocabulary:** status is `active | left` with `left_on`; there is no delete. Salary
  change reasons are `hire | annual_review | promotion | market_adjustment | correction |
  other`, and `hire` is written only on creation.
- **Insights** always cover active employees only.
- **Tests:**
  - Vitest with explicit imports.
  - Builders from `test/builders.ts`.
  - One behaviour per test, with a sentence-style name.
  - A fresh in-memory database per test, with the real migrations.
  - No network and no sleeps.
- **Web:** use Mantine components. Server state lives only in the hooks in
  `src/api/queries.ts`; never call `fetch` inside components. Filters live in the URL.
- **Migrations:** never edit a committed migration; add a new one.
- **Never commit** the assessment brief or `.docx`, `.db` files, or secrets.
