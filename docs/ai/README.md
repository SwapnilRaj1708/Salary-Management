# How AI is used on this project

The brief asks candidates to use AI tools deliberately. This page describes how, and
where the human stays in control.

## Tools

- **Claude Code**, run as a cloud session against this repository. It is the coding agent
  and planning partner.
- **Multi-agent workflows** inside Claude Code. For bigger thinking tasks, several agents
  work independently and others then review their work adversarially.

## Principles

1. **The human owns decisions.** The AI drafts, compares options and critiques. The
   candidate chooses, and the choices and reasons are recorded in
   [decisions.md](../decisions.md).
2. **Claims get verified, not trusted.** Wherever possible, technical claims were checked
   by running code against the exact package versions: SQLite behaviour, Express 5
   semantics, scrypt limits, TypeScript 7 compatibility. These are marked *(verified)* in
   the decision log.
3. **Tests are the spec.** For domain and API behaviour, the failing test is written and
   reviewed before any implementation. Small diffs, read in full.
4. **Mistakes are logged, not hidden.** [log.md](log.md) records what AI got wrong and
   what caught it.
5. **AI involvement is visible in git.** Commits made with the agent carry a
   `Co-Authored-By` trailer.

## Planning workflow (14 Oct 2026)

```mermaid
flowchart LR
  B[Brief + assumptions] --> P[Product draft]
  B --> A[Architecture draft]
  B --> D[Delivery draft]
  P & A & D --> C1[Critic: brief compliance<br/>grader's view]
  P & A & D --> C2[Critic: technical<br/>verifies by running code]
  P & A & D --> C3[Critic: consistency<br/>and simplicity]
  C1 & C2 & C3 --> S[Synthesis by the lead agent<br/>reviewed by the candidate]
  S --> R[requirements · architecture<br/>decisions · plan · CLAUDE.md]
```

- **Drafters worked independently,** each through one lens, so their disagreements came to
  the surface instead of being smoothed over. The architecture and delivery drafters ran
  experiments in a scratch folder, e.g. benchmarking 10k-row queries and checking
  package compatibility.
- **Critics were told to refute, not to agree.** The technical critic installed the exact
  package versions and tried each claim.
- **Size:** 6 agents, about 38 minutes, about 760k tokens. The prompts are in
  [prompts/](prompts/).

### What the critique changed

| Before critique | After |
|---|---|
| Three different FX designs: a TS function, a SQL view, a rates table quoted in the opposite direction | One source of rates. Conversion happens only in a SQL view (decision X1). |
| Relocation was a Should in one draft, half-built in another, out of scope in the third | Out of scope in v1, with reasons (X2) |
| Medians in SQL (one draft) vs in TypeScript (two drafts) | SQL for plain aggregates, TypeScript for percentiles, matching Excel (D10) |
| Date CHECKs that silently accept `'banana'` | `IS date(col)`, plus a test (architecture §4) |
| scrypt parameters below OWASP, which also crash with Node's default memory limit | p=3 with an explicit `maxmem` (D9) |
| A Docker build that would fail (`prepare` hook with no `.git`), plus root-owned volumes | `npm ci --ignore-scripts`, an entrypoint that fixes ownership, a CI step that boots the image |
| Layered build order: first demoable result on day 3 | Vertical slices: deployed on day 1, demoable mid day 2 (plan.md) |
| Insights endpoints exposing filters and fields no screen uses | Trimmed to what the UI renders |

## Build loop (from slice S1 onward)

1. Pick the next behaviour from the slice in [plan.md](../plan.md).
2. The agent writes the failing test. The candidate reviews it as the spec.
3. The agent writes the minimum code to pass, then refactors as a separate commit.
4. `npm run verify` must pass before a commit. Red/green pairs are pushed together.
5. Anything surprising or wrong goes into [log.md](log.md).

The conventions the agent follows are in [CLAUDE.md](../../CLAUDE.md).
