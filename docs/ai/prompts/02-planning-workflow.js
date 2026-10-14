export const meta = {
  name: 'salary-mgmt-planning',
  description: 'Draft product, architecture and delivery plans for the salary assessment, then critique them from three angles',
  phases: [
    { title: 'Draft', detail: 'product, architecture, delivery drafts in parallel' },
    { title: 'Critique', detail: 'compliance, technical-correctness, consistency critics over all drafts' },
  ],
}

const CTX = args.contextPath
const BRIEF = args.briefPath
const SCRATCH = args.scratchDir

const COMMON = `You are helping plan a take-home engineering assessment. FIRST read these two files fully:
- ${CTX} (candidate, role, assumptions already sent to the recruiter, proposed direction, environment facts)
- ${BRIEF} (the full assessment brief)
Do NOT create or modify anything under /home/user/Salary-Management (the real repo). If you need to experiment, use a fresh subfolder of ${SCRATCH}.
The 5 assumptions in context.md are FIXED (already communicated to the recruiter) — design within them, never contradict them.
Optimise for good engineering judgment and pragmatism (Incubyte: "not the most complex system, but good engineering judgment"), fast delivery, and things the candidate can defend in an interview. Your final message IS your deliverable (markdown), returned verbatim to the lead engineer who will synthesize — be concrete and specific, no filler.`

const DECISIONS = `Contested decisions to give a recommendation + one-line reason on (where in your lens):
D1 Express 5 vs Fastify 5 | D2 Drizzle vs Kysely vs plain SQL+repositories (better-sqlite3) | D3 money representation: integer minor units + currency exponent vs integer whole major units vs decimal/text | D4 removing an employee: hard delete vs soft delete/status | D5 current salary: denormalized column on employees + append-only history table vs derived from history | D6 shared workspace package for zod schemas/types vs none | D7 Mantine vs shadcn/ui | D8 ESLint+Prettier vs Biome | D9 auth: users table + scrypt hash + httpOnly session cookie vs env-configured single credential vs HTTP Basic | D10 percentiles/median: TypeScript pure functions vs SQL window functions | D11 seed: faker with fixed seed vs own seeded PRNG + word lists | D12 department/job title: free text vs reference tables | D13 pagination: offset vs keyset | D14 React Router vs TanStack Router | D15 TypeScript 7 (native) vs TypeScript 5.9 given tooling compatibility (typescript-eslint, vite, vitest).`

phase('Draft')
const DRAFTERS = [
  {
    key: 'product',
    prompt: `${COMMON}

YOUR LENS: PRODUCT (persona: HR manager of ACME, 10,000 employees, multiple countries, currently in Excel).
Produce:
1. Jobs-to-be-done for the HR manager, and the concrete questions they want answered about "how the org pays people" — map each question to a metric/screen. Precisely define each metric, including how currencies are handled (assumption 1) — e.g. what "average by job title" means when a title exists in several countries; when to show local currency vs USD.
2. Employee data fields (name each field, type, required?, validation rule). Keep to what the persona needs; justify any sensitive field you include or exclude (e.g. gender — pay-equity analysis).
3. Feature list in MoSCoW (Must/Should/Could/Won't) with a one-line justification each. Respect assumption 5 (CSV export Must, import stretch) and 4 (single HR role, basic auth).
4. "Deliberately left out" list with the reasoning for each (this goes straight into the requirements doc).
5. Business rules & edge cases (salary changes: effective date rules, reason required?, back-dated/future-dated changes, currency tied to country?, duplicate emails, deleting an employee, employees changing country).
6. Screens / UX flows list (what's on each screen, primary actions), designed for 10k rows.
7. v1 success criteria (measurable where possible).
8. A DRAFT of the one-page requirements document (hard limit ~600 words, markdown): goal, persona & problem, scope & features, deliberately out + why, assumptions, success criteria.
${DECISIONS} (answer D4, D5, D12 from a product angle.)`,
  },
  {
    key: 'architecture',
    prompt: `${COMMON}

YOUR LENS: ARCHITECTURE & DATA (Node + TypeScript API, React SPA, SQLite).
Produce:
1. System architecture: components, request flow, layering inside the API (e.g. routes -> handlers -> services -> repositories, pure domain functions), where validation lives, error-handling contract (error JSON shape, status codes). Include a mermaid component diagram.
2. Data model as SQLite DDL (tables, columns, types, constraints, FKs, indexes) covering employees, salary history, countries/currencies/exchange rates, users/sessions as needed. Include a mermaid ER diagram. Explain money representation and FX conversion precisely (assumption 1), including rounding and where conversion happens (SQL vs TS).
3. REST API: every endpoint with method, path, query params, request body, response shape, status codes. Include list endpoint with search/filter/sort/pagination (sort-field whitelisting), insights endpoints for each metric in assumption 3, salary-change + history endpoints, CSV export (streaming? filters?), auth endpoints, filter-options endpoint.
4. Insights query strategy: SQL sketches for each metric; how median/percentiles/distribution buckets are computed with SQLite (check whether better-sqlite3's bundled SQLite exposes median()/percentile() — if unsure say so); expected latency at 10k rows; what would change at 1M rows.
5. Auth design for single HR role (assumption 4): password hashing, session mechanism, cookie flags, CSRF stance, login rate limiting, how the demo credential is provisioned on deploy.
6. Security & correctness hot spots: SQL injection via sort/filter, CSV formula injection in export, input validation, PII exposure.
7. Deployment topology: single container serving SPA + API, SQLite file on persistent volume, migrations + seed-on-empty at startup, health check, config/env vars; compare Fly.io vs Railway vs Render-free (ephemeral) briefly.
8. Performance considerations section (10k now; growth path).
${DECISIONS} (answer ALL of D1–D15 from an architecture angle.)`,
  },
  {
    key: 'delivery',
    prompt: `${COMMON}

YOUR LENS: DELIVERY, QUALITY & AI WORKFLOW.
Produce:
1. Repo layout (folder tree) and tooling (package manager, workspaces, TS config strategy, lint/format, scripts: dev/test/build/seed/start).
2. Test strategy: what is unit-tested (pure domain: money/FX, stats, validation, CSV escaping), what is API-tested against in-memory SQLite, what is component-tested in the web app, whether a single Playwright smoke test is worth it. How tests stay fast & deterministic (fixed clocks, seeded data, no network). Name the first ~15 tests to write in TDD order.
3. A concrete ORDERED COMMIT PLAN for the whole build (aim ~35–50 commits) grouped into phases, each with a Conventional-Commit message. Show red/green/refactor where it matters. Phase 0 must be docs (requirements doc first, before any code). Note how to keep CI green on pushed heads while committing red tests.
4. CI pipeline (GitHub Actions jobs and steps).
5. Seed script design: deterministic, realistic salary distributions per country & job title & level, which countries/currencies (include at least one zero-decimal currency like JPY to exercise money handling?), department/job-title catalogue, salary history rows per employee, insertion performance (single transaction, prepared statements), target runtime.
6. Deployment checklist and a 3–5 minute video demo script outline (what to show, in what order) aimed at an HR-manager story.
7. AI workflow: contents of a CLAUDE.md (conventions the coding agent must follow), how prompts/decisions are logged in docs/ai/, how the human stays in control (review tests first, etc.), what to show interviewers.
8. Risk register (top risks + mitigations) and a time plan for ~3–4 focused days with an explicit cut-line (what gets dropped first if time is short).
${DECISIONS} (answer D6, D7, D8, D11, D14, D15 from a delivery/tooling angle; verify tool compatibility facts with \`npm view <pkg> peerDependencies\` where it matters.)`,
  },
]

const drafts = await parallel(DRAFTERS.map(d => () =>
  agent(d.prompt, { label: `draft:${d.key}`, phase: 'Draft' }).then(text => ({ key: d.key, text }))
))
const okDrafts = drafts.filter(Boolean).filter(d => d.text)
log(`${okDrafts.length}/3 drafts completed`)

const bundle = okDrafts.map(d => `===== DRAFT: ${d.key.toUpperCase()} =====\n${d.text}`).join('\n\n')

const ISSUES_SCHEMA = {
  type: 'object',
  properties: {
    issues: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          severity: { type: 'string', enum: ['blocker', 'major', 'minor'] },
          area: { type: 'string' },
          problem: { type: 'string' },
          recommendation: { type: 'string' },
          evidence: { type: 'string', description: 'command output, doc reference or reasoning that supports the claim' },
        },
        required: ['severity', 'area', 'problem', 'recommendation'],
      },
    },
    decisions: {
      type: 'array',
      items: {
        type: 'object',
        properties: { id: { type: 'string' }, choice: { type: 'string' }, reason: { type: 'string' } },
        required: ['id', 'choice', 'reason'],
      },
    },
    missing: { type: 'array', items: { type: 'string' } },
    cuts: { type: 'array', items: { type: 'string' }, description: 'things in the drafts that should be cut or simplified' },
  },
  required: ['issues', 'decisions', 'missing', 'cuts'],
}

phase('Critique')
const CRITICS = [
  {
    key: 'compliance',
    prompt: `${COMMON}

You are an adversarial reviewer playing a senior Incubyte software craftsperson who will grade this submission. Below are three independent planning drafts. Check them against EVERY line of the brief (requirements doc before code, one page, scope & features, deliberately-out + reasoning, backend+UI, component library, seed 10k, deployed, video demo, fast deterministic unit tests, incremental commits, all artifact types: requirements, design notes, architecture diagrams, AI prompts, trade-offs, performance) and against the 5 fixed assumptions. Flag: anything missing, anything contradicting an assumption, over-engineering that a grader would see as poor judgment, under-delivery, and anything the candidate would struggle to defend in interview. Vote on D1–D15.
${DECISIONS}

${bundle}`,
  },
  {
    key: 'technical',
    prompt: `${COMMON}

You are an adversarial TECHNICAL verifier. Below are three planning drafts. Find factual and technical errors and verify claims empirically where possible (use Bash in a fresh subfolder of ${SCRATCH}: \`npm view\`, small npm installs, tiny node scripts). In particular verify:
- whether better-sqlite3 (latest) bundled SQLite supports median()/percentile()/percentile_cont() and window functions (install it in scratch and run a query);
- typescript 7 compatibility with typescript-eslint / vite / vitest (peerDependencies), and whether TS 5.9 is the safer choice;
- vitest 5 + vite 8 compatibility, @vitejs/plugin-react version, Mantine 9 peer deps with React 19, drizzle-orm + better-sqlite3 13 compatibility;
- Express 5 async error handling claims; supertest with Express 5;
- money/FX correctness (integer storage, rounding, zero-decimal currencies), and auth security (hashing params, cookie flags, CSRF, session fixation), SQL injection via sort params, CSV formula injection.
Report each wrong or risky claim as an issue with evidence (command + output). Vote on D1–D15 based on evidence.
${DECISIONS}

${bundle}`,
  },
  {
    key: 'consistency',
    prompt: `${COMMON}

You are an adversarial CONSISTENCY & SIMPLICITY reviewer. Below are three independent planning drafts written without seeing each other. Find contradictions between them (field names, endpoints, metric definitions, decisions, phase ordering, test tooling), gaps where one draft assumes something another omits, and scope that does not serve the HR-manager persona. Identify the critical path to a deployed, demoable v1 in the least time and what should be cut or deferred. Propose the single coherent set of decisions (vote D1–D15).
${DECISIONS}

${bundle}`,
  },
]

const critiques = await parallel(CRITICS.map(c => () =>
  agent(c.prompt, { label: `critic:${c.key}`, phase: 'Critique', schema: ISSUES_SCHEMA }).then(r => ({ key: c.key, ...r }))
))

return { drafts: okDrafts, critiques: critiques.filter(Boolean) }
