# Salary Management

A web app for ACME's HR manager to manage salaries for 10,000 employees across countries,
and to answer "how do we pay people?". This is a take-home assessment for Incubyte.

> **Status:** slice S1, the walking skeleton, is built. It has the API health endpoint,
> the app shell and CI. The next slices are in [docs/plan.md](docs/plan.md). The live
> URL, demo login and video will be added here as they exist.

## Run it locally

You need Node 22.22.2 or later on the 22.x line (see `.nvmrc`).

```sh
npm ci
npm run dev      # API on http://localhost:3000, web app on http://localhost:5173
npm run verify   # lint, type-check and every test
```

Other scripts:
- `npm test -- --project web` runs one workspace's tests.
- `npm run build` builds the web app.
- `npm start` runs the API alone.

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

- **API:** Node 22, TypeScript, Express 5, SQLite (better-sqlite3).
- **Web:** React 19, Vite, MUI (Material UI, X Data Grid, X Charts, X Date Pickers),
  TanStack Router and Query.
- **Tests:** Vitest.
- **Hosting:** Vercel (free) serves the UI and proxies the API to a Docker container on
  Render's free tier. Demo data resets to the seed whenever the server sleeps.

Every change goes through its own branch and a pull request into `main`; nobody pushes to
`main` directly. See [CONTRIBUTING.md](CONTRIBUTING.md).

The reasons for each choice are in [docs/decisions.md](docs/decisions.md).
