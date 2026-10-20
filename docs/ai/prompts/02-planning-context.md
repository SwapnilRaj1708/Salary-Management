# Planning context (shared with all planning agents)

> Committed as-is. This is the context file every planning agent read first. The
> `brief.md` it mentions was the full assessment text, converted from the recruiter's
> .docx. It is deliberately not committed, because it is the recruiter's material.
> Its content is paraphrased in [requirements.md](../../requirements.md).

## The candidate and role
- Candidate: Swapnil Raj, applying for "Software Craftsperson / Node / React / TypeScript – II/III" at Incubyte.
- Incubyte is a software-craftsmanship / XP consultancy: TDD, clean code, small incremental commits, pragmatic design.
- The candidate will be interviewed on: design decisions, architecture, AI workflows, trade-offs, possible improvements. Everything must be defensible and explainable by the candidate.
- Recruiter note: "If you submit the assignment in the least possible time, we will be able to prioritize your application." Speed matters, but judgment > complexity ("We are not looking for the most complex system, but for good engineering judgment").

## The brief
See brief.md in the same folder (full text of the assessment). Key points: one-page requirements doc BEFORE building; end-to-end backend + UI; backend in role's stack (Node/TypeScript) with relational DB (SQLite suggested); React or Next.js UI with a component library; seed script with 10,000 employees; fully functional deployed software + video demo; meaningful, fast, deterministic unit tests; incremental commits; artifacts (requirements, design notes, architecture diagrams, AI prompts, trade-offs, performance considerations).

## Clarifying questions sent to the recruiter (13 Oct 2026). No reply after 24h, so we proceed with these assumptions:
1. Currency: Local currency storage with static exchange rates, converting to USD for org-wide metrics.
2. Salary scope & history: Annual gross base pay only, with historical tracking for salary updates (date and reason).
3. Core metrics: Min/max/average by country, average by job title, payroll cost by department, plus salary distribution by country.
4. Roles & access: A single HR role with basic authentication (no complex RBAC).
5. Data import/export: CSV export is in scope; CSV import as a stretch goal.
(Also asked: submission deadline — unanswered.)
The candidate deliberately did NOT ask about tech/hosting: Node + TypeScript backend, React frontend, SQLite are taken as given.

## Already-proposed direction (open to challenge, but needs strong reasons to change)
- One repo, npm workspaces: api/ (Node + TypeScript, Express or Fastify — undecided), web/ (React + Vite + TS), possibly shared/ (zod schemas/types).
- SQLite via better-sqlite3; ORM/query-builder undecided (Drizzle vs Kysely vs plain SQL + repositories).
- Web: TanStack Query, TanStack Table, a component library (Mantine or shadcn/ui), Recharts.
- Tests: Vitest everywhere; API tests against in-memory SQLite.
- Deploy: single Docker container (API serves built SPA), SQLite on a persistent volume (Fly.io or Railway). Render free tier has no persistent disk. Hosting account not yet chosen by the candidate.
- Test-first development visible in commit history; Conventional Commits; GitHub Actions CI.
- Do not commit the assessment .docx itself (recruiter's material); paraphrase it.

## Environment facts (checked 14 Oct 2026)
- Node v22.22.0, npm 10.9.4, pnpm 10.28.0 available, Docker available.
- Latest npm versions: express 5.3.0, fastify 5.12.7, better-sqlite3 13.0.3, drizzle-orm 0.45.4, drizzle-kit 0.31.11, zod 4.6.7, react 19.3.1, vite 8.3.4, vitest 5.0.4, @mantine/core 9.7.2, @tanstack/react-query 5.104.2, recharts 3.10.1, typescript 7.0.2.
