# Salary Management

A web app for ACME's HR manager to manage salaries for 10,000 employees across countries,
and to answer "how do we pay people?". This is a take-home assessment for Incubyte.

> **Live:** https://salary-management-topaz.vercel.app. Demo login: `admin@acme.example` /
> `Password@123`, published on purpose for reviewers. Changes are saved and shared by
> everyone using the demo, and re-running the seed restores the starting data.
>
> **Status:** slices S1–S6 are done: the walking skeleton, the Vercel deployment, money
> handling, the database with its 10,000-employee seed, sign-in, and the employee
> directory with search, filters, sorting and paging. The next slices are in
> [docs/plan.md](docs/plan.md). The demo login and video will be added here as they exist.

## Run it locally

You need Node 22.22.2 or later on the 22.x line (see `.nvmrc`).

```sh
npm ci
npm run dev      # API on http://localhost:3000, web app on http://localhost:5173
npm run verify   # lint, type-check and every test
```

Locally, sign in as `admin@acme.example` with the password `local-demo-password`, a
local-only default. Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` to use your own.

Other scripts:
- `npm test -- --project web` runs one workspace's tests.
- `npm run build` builds the web app.
- `npm start` runs the API alone.
- `node scripts/deploy-smoke.mjs` builds the repo with Vercel's CLI and boots the result,
  as CI does.

## Read this first

| What the brief asks for | Where it is |
|---|---|
| Requirements document (one page) | [docs/requirements.md](docs/requirements.md) |
| Clarifying questions and assumptions | [docs/clarifications.md](docs/clarifications.md) |
| Planning and design notes | [docs/plan.md](docs/plan.md) |
| Architecture diagrams, data model, API | [docs/architecture.md](docs/architecture.md) |
| Design system (components, tokens, motion) | [docs/design-system.md](docs/design-system.md) |
| How changes reach `main` | [CONTRIBUTING.md](CONTRIBUTING.md) |
| Trade-offs and decisions | [docs/decisions.md](docs/decisions.md) |
| Performance considerations | [docs/architecture.md §11](docs/architecture.md#11-performance-considerations); measured numbers to come in `docs/performance.md` |
| AI prompts and workflow | [docs/ai/](docs/ai/README.md), [CLAUDE.md](CLAUDE.md) |

## Stack (planned)

- **API:** Node 22, TypeScript, Express 5, SQLite through libSQL (`@libsql/client`).
- **Web:** React 19, Vite, MUI (Material UI, X Data Grid, X Charts, X Date Pickers),
  TanStack Router and Query.
- **Tests:** Vitest.
- **Hosting:** one Vercel project on the free Hobby plan, with two services
  ([vercel.json](vercel.json)): the web app on `/` and the API on `/api`. Data lives in
  Turso's free hosted SQLite, so it persists.

## Deploy it

The owner does this once. The reasons are in [architecture §10](docs/architecture.md#10-deployment).

1. **Vercel:** import the GitHub repo as a new project. Leave the root directory at the
   repository root. The framework preset should read "Services", detected from
   `vercel.json`.
2. **Turso** (needed from slice S4): create two databases in `aws-us-east-1`, next to
   Vercel's default function region, one for production and one for previews. Create a
   token for each.
3. **Vercel → Settings → Environment Variables:** set `TURSO_DATABASE_URL` and
   `TURSO_AUTH_TOKEN` for Production (production database) and for Preview (preview
   database), and `ADMIN_EMAIL` and `ADMIN_PASSWORD` for both: the HR login. A deployment
   without them refuses to start.
4. **GitHub → Settings → Secrets and variables → Actions:** add four repository secrets,
   `TURSO_PREVIEW_DATABASE_URL`, `TURSO_PREVIEW_AUTH_TOKEN`,
   `TURSO_PRODUCTION_DATABASE_URL` and `TURSO_PRODUCTION_AUTH_TOKEN`.
5. **Actions → Database → Run workflow:** run `check`, then `seed`, once for each database.
   `seed` replaces all employees with the 10,000 seeded ones, so it also resets the demo.

Every change goes through its own branch and a pull request into `main`; nobody pushes to
`main` directly. See [CONTRIBUTING.md](CONTRIBUTING.md).

The reasons for each choice are in [docs/decisions.md](docs/decisions.md).
