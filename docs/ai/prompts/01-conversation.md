# 01: Conversation with the coding agent (Claude Code)

A condensed record of the human prompts that steered planning, and what the agent did
with each. The recruiter's email and the assessment document are paraphrased here, not
copied. Quotes are lightly edited for typos.

## Prompt 1, 13 Oct 2026: start

> *Swapnil:* "I received an email from Incubyte for an engineering assessment … I am
> providing you the email as well as the downloaded file of the link, and together we will
> start to plan our way forward from here."

What the agent did:
- **Read the brief** and listed the deliverables. Each was mapped to a concrete artifact:
  requirements first, backend and UI, 10k seed, deployment, video, tests, incremental
  commits, supporting artifacts.
- **Drafted clarifying questions.** The recruiter's email explicitly invites questions, so
  the agent wrote seven, each with a default assumption so work would not block on the
  reply.
- **Proposed a starting stack:** Node/TypeScript API, React, SQLite, and a single
  container.
- **Flagged git hygiene risks:** never squash-merge, and keep the assessment document out
  of the repo.

The human then edited the email: dropped the tech/hosting question as already answered by
the brief, and sent it. The result is in [clarifications.md](../../clarifications.md).

## Prompt 2, 14 Oct 2026: proceed on assumptions

> *Swapnil:* "Following is the email I sent to the recruiter … I removed the sixth tech and
> hosting question because the tech stack part was mentioned clearly … It has been a full
> 24 hours and I have not received any reply yet, so let's move ahead with these
> assumptions and start our planning."

What the agent did:
1. **Recorded the questions and assumptions** in `docs/clarifications.md`.
2. **Ran a multi-agent planning workflow.** The prompts are in
   [02-planning-workflow.js](02-planning-workflow.js), and the shared context in
   [02-planning-context.md](02-planning-context.md).
   - Three drafters worked independently, one per lens: product, architecture, and
     delivery/quality.
   - Three adversarial critics then reviewed the drafts: one checked compliance with the
     brief from a grader's point of view, one verified technical claims by running code,
     and one checked consistency and simplicity.
3. **Merged the drafts and critiques** into requirements, architecture, decisions, plan
   and CLAUDE.md. Every disagreement between drafts was settled explicitly in
   [decisions.md](../../decisions.md).
4. **Checked the one-page constraint** by rendering the requirements doc to PDF, and
   trimmed it until it fit.
5. **Ran a second review round on the written docs.** Three critics looked for
   contradictions, technical errors (by running code and rendering the diagrams) and how
   a grader would read them. Fixes went in as a separate commit.

## Prompt 3, 19 Oct 2026: the recruiter's reply

> *Swapnil:* "Before I comment anything, I want to inform you that I got an email today
> from them …" The recruiter confirmed all five assumptions, and asked that the docs
> explain why these metrics were chosen.

What the agent did:
- **Recorded the reply** in [clarifications.md](../../clarifications.md), with each
  answer next to its question.
- **Updated the requirements** from "unanswered" to "confirmed".
- **Added "why these metrics"** to [architecture.md §6](../../architecture.md#6-metrics-why-these-and-how-they-are-defined).
  It maps each HR question to its metric and explains each refinement.

No design decision changed.

## Prompt 4, 20 Oct 2026: the candidate's review of the plan

> *Swapnil:* "1. In decisions.md, D7: use shadcn + Tailwind + MUI. D14: use TanStack
> Router. 2. Yes, make me the author of the commits. 3. No direct pushing to main by
> anyone; we will maintain separate branches for features, bug fixes, etc. 4. Free
> hosting only."

The candidate changed D7 and D14, required free hosting (which replaced P3's Fly.io) and
a branch-per-change policy (the new P4), and left the other decisions as proposed.

What the agent did:
1. **D7.** Proposed a split to keep two styling systems manageable: shadcn/ui + Tailwind
   for the app, and MUI only for the directory's Data Grid. It checked that MUI supports
   CSS cascade layers and that the Data Grid's MIT page-size cap (100) matches the API.
2. **D14.** Switched to TanStack Router, with a code-based route tree. It checked that the
   router accepts zod 4 schemas directly for search params.
3. **Hosting.** Researched current free tiers, then moved hosting from Fly.io to Render's
   free tier (P3). The costs are recorded: data resets on sleep, cold starts, 0.1 CPU.
4. **Branching.** Recorded the policy as P4, and in the plan and CLAUDE.md.
5. **Authorship.** Re-authored the 9 planning commits to the candidate, keeping dates,
   contents and the `Co-Authored-By` trailers. It force-pushed the feature branch with a
   lease check and set the repo's git identity for future commits.
6. **Review round on these changes.** Two critics checked the edits. They found that:
   - MUI's theme rejects shadcn's CSS variables unless `nativeColor` is on;
   - the CSS layers need an explicit order;
   - TanStack Router JSON-parses search params;
   - Render deploys without waiting for CI by default;
   - P4 was not enforced by anything.

   All were fixed; see [log.md](../log.md) rows 14–17.

## Prompt 5, 20 Oct 2026: MUI everywhere, motion, branches, hosting

> *Swapnil:* "Let's go with MUI everywhere, and use shadcn only where it does something
> better than MUI and it won't be a big deal to replace it … Look up some animations and
> transitions to see if we can add those to our design system … For branch naming, yes,
> use relevant naming conventions. For the main rule setup, tell me how I should set it
> up. And yes, you can use a Render free account and Vercel if required."

What the agent did:
1. **Ran four research agents in parallel,** on MUI coverage, motion, hosting topology,
   and GitHub rulesets. Each checked package behaviour against the real npm packages.
   - The official doc sites were blocked from the sandbox.
   - So doc claims came from the docs' GitHub source (rulesets), the packages' own
     changelogs and type files (MUI), or web-search extracts of the official pages
     (Vercel, Render).
2. **D7 → MUI everywhere.**
   - MUI's free packages cover every screen.
   - No shadcn component qualified, because each one needs Tailwind. So Tailwind was
     dropped, along with the CSS-layer work it required.
   - The likeliest future exception, a ⌘K palette, can use headless `cmdk` inside an MUI
     dialog.
3. **D16 motion system.** MUI theme tokens plus two Material 3 easings; reduced motion
   switched on (MUI's default ignores it); View Transitions for path changes only; no
   animation library. Written up in the new [design-system.md](../../design-system.md),
   which also has the component map, theme tokens and UI states.
4. **P3 → Vercel in front of Render.** Vercel serves the SPA instantly and proxies
   `/api/*` to Render, so cold starts show our own "waking" screen and cookies stay
   same-origin. A day-1 smoke test checks the parts Vercel doesn't document.
5. **P4 enforcement.** The new [CONTRIBUTING.md](../../../CONTRIBUTING.md) has the branch
   naming rules and the exact `main` ruleset settings. Required approvals are 0, because
   authors can't approve their own PRs.
6. **Ran a final review round.** Two critics checked these changes. Their main finds
   (log rows 18–22) were:
   - a version check that would have shown "server updating" after every docs-only merge;
   - a smoke test scheduled before the endpoints it tested existed;
   - three MUI API details;
   - the need to set up the ruleset before the first merge.
7. **Moved the planning work** to `docs/planning` and opened the first pull request into
   `main` from it.
