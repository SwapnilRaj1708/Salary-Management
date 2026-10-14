# Salary Management

A web app for ACME's HR manager to manage salaries for 10,000 employees across countries,
and to answer "how do we pay people?". This is a take-home assessment for Incubyte.

> **Status:** planning is complete; the build starts with slice S1 in
> [docs/plan.md](docs/plan.md). The live URL, demo login, video and setup steps will be
> added here as they exist.

## Read this first

| What the brief asks for | Where it is |
|---|---|
| Requirements document (one page) | [docs/requirements.md](docs/requirements.md) |
| Clarifying questions and assumptions | [docs/clarifications.md](docs/clarifications.md) |
| Planning and design notes | [docs/plan.md](docs/plan.md) |
| Architecture diagrams, data model, API | [docs/architecture.md](docs/architecture.md) |
| Trade-offs and decisions | [docs/decisions.md](docs/decisions.md) |
| Performance considerations | [docs/architecture.md §11](docs/architecture.md#11-performance-considerations); measured numbers to come in `docs/performance.md` |
| AI prompts and workflow | [docs/ai/](docs/ai/README.md), [CLAUDE.md](CLAUDE.md) |

## Stack (planned)

- **API:** Node 22, TypeScript, Express 5, SQLite (better-sqlite3).
- **Web:** React 19, Vite, Mantine, TanStack Query.
- **Tests:** Vitest.
- **Hosting:** Docker on Fly.io.

The reasons for each choice are in [docs/decisions.md](docs/decisions.md).
