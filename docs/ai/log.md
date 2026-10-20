# AI corrections log

Notable cases where AI output was wrong or risky, and what caught it. Routine work is not
logged here; the commit history covers that.

| # | Date | What the AI produced | What was wrong | Caught by | Resolution |
|---|---|---|---|---|---|
| 1 | 14 Oct | `clarifications.md` credited "Ask Questions — Don't Assume" to the brief | The phrase comes from the recruiter's email, not the brief | Compliance critic (it had only the brief) | Fixed in commit `47c2ad9` |
| 2 | 14 Oct | The delivery draft offered `Math.round(12.345 * 100) → 1235` as an example of a float bug | That result is correct: `12.345*100` is exactly `1234.5` | Technical and compliance critics, by running Node | Use real traps instead: `Math.round(1.005*100) → 100`, `Math.floor(0.29*100) → 28` |
| 3 | 14 Oct | The architecture draft used `CHECK (col = date(col))` to validate dates | `date('banana')` is NULL, and a NULL CHECK passes, so garbage dates were accepted | Technical critic, with SQLite 3.53.4 | `CHECK (col IS date(col))` and a repository test |
| 4 | 14 Oct | The drafts defined FX three ways, including rates quoted in opposite directions | Two sources of truth, and a risk of silently inverted USD figures | Consistency and technical critics | One source; SQL view only (decision X1) |
| 5 | 14 Oct | scrypt with N=2^15, r=8, p=1 | Below OWASP's minimum. Node's default `maxmem` also throws at these settings. | Technical critic | p=3 with `maxmem` 64 MiB (D9) |
| 6 | 14 Oct | A root `"prepare": "git config core.hooksPath …"` script | `npm ci` fails in Docker, where there is no `.git` | Consistency critic | `npm ci --ignore-scripts` in the Dockerfile |
| 7 | 14 Oct | Session expiry compared an ISO string against SQLite `datetime('now')` | `'T'` sorts after `' '`, so expired sessions stay valid until midnight | Technical critic | Epoch-ms integers from the injected clock |
| 8 | 14 Oct | The error contract promised 415 for non-JSON bodies | `express.json()` skips non-JSON bodies instead of rejecting them. It raises 415 only for an unsupported charset or encoding. Its errors would surface as 500s unless mapped. | Technical critics in both review rounds, with Express 5.3 (round 2 corrected round 1's "never returns 415") | Body-parser errors keep their own 4xx status (architecture §7) |
| 9 | 14 Oct | A "today" rule based on UTC+14 | It accepts dates that are tomorrow for most users and is hard to explain | Technical and compliance critics | A configured time zone with an injected clock (X3) |
| 10 | 14 Oct | The first requirements draft | It rendered to two pages; the brief asks for one | Compliance critic, then a PDF render check | Trimmed to one page (checked by rendering) |
| 11 | 14 Oct | The plan created the `users` table in slice S5 | The seed in S4 writes `salary_history`, which references `users`. With foreign keys on, every insert fails. | Docs review: consistency critic, by running SQLite | All tables are created in the S4 migration |
| 12 | 14 Oct | The type-stripping constraints listed erasable syntax and `.ts` extensions only | A plain import of a type crashes Node at boot, while `tsc` (without `verbatimModuleSyntax`) and Vitest both pass | Docs review: technical critic, with Node 22.22, TS 6.0.3 and Vitest 5 | `import type` rule plus `verbatimModuleSyntax` (T1, CLAUDE.md) |
| 13 | 14 Oct | Prototype timings presented as measured facts in the docs | The probe code was not kept, so the numbers can't be reproduced | Docs review: grader-lens critic | Removed. Real numbers will come from the final code in `docs/performance.md`. |
