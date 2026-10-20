# Contributing

How changes reach `main`. The reasoning is in [decision P4](docs/decisions.md#delivery).

## Branches

- **Never commit to `main`.** Branch off the latest `main`.
- **Name** the branch `<type>/<short-topic>` in kebab-case. The type is one of `feat`,
  `fix`, `docs`, `chore`, `ci`, `refactor`, `test`, `build` or `perf`. Examples:
  `feat/s1-walking-skeleton`, `feat/s7-salary-changes`, `fix/same-day-salary-change`,
  `docs/planning`.
- **One branch per slice or fix.** Keep branches short-lived.

## Commits

- **Format.** [Conventional Commits](https://www.conventionalcommits.org/): `feat:`,
  `fix:`, `test:`, `refactor:`, `docs:`, `chore:`, `ci:`, `build:`, `perf:`.
- **Test first for domain and API behaviour, as a red/green pair.**
  - A `test:` commit specifies the behaviour and fails on purpose. Its body says
    "RED: made green in the next commit".
  - The `feat:` commit right after it makes the test pass.
  - Any refactor follows as its own commit.
  - Push the pair together.
- **Size.** Each commit does one thing and leaves `npm run verify` passing. The only
  exception is the deliberate red test.
- **Authorship.** The candidate is the author. Commits written with the AI agent end with
  `Co-Authored-By: Claude …`.

## Pull requests

- **Scope:** one slice or fix per PR. The description says what changed, why, and how it
  was tested.
- **CI must pass:** the `verify` and `docker-smoke` jobs.
- **Merge with "Create a merge commit".** Never squash or rebase, so every red/green
  commit survives and each slice shows up as one unit in the history.
- **After merging,** delete the branch. GitHub can do this automatically.

## How `main` is protected

The repo owner sets this up once in the GitHub UI, **before the first pull request
merges**. Otherwise even that first merge could be squashed.

**Settings → General → Pull Requests:**
- Allow merge commits: **on**. Allow squash merging: **off**. Allow rebase merging:
  **off**.
- Automatically delete head branches: **on**.

**Settings → Rules → Rulesets → New branch ruleset**, named `main`:

| Setting | Value |
|---|---|
| Enforcement status | **Active** (the default is Disabled) |
| Bypass list | **Empty**, so the owner is bound too |
| Target branches | **Include default branch** |
| Restrict deletions | On |
| Block force pushes | On |
| Require a pull request before merging | On. **Required approvals: 0**, because GitHub doesn't let authors approve their own PRs, so 1 would block every merge. Allowed merge methods: **Merge** only. |
| Require status checks to pass | On, with `verify` and `docker-smoke`. Each can only be added after it has run once; see below. Leave "Require branches to be up to date" **off**. |
| Leave off | Restrict updates (with no bypass it would block merging), Require linear history (it forbids merge commits), Require signed commits, Require deployments |

**Required checks are added later.** GitHub only offers a check once it has run in the
repo:
- add `verify` after the first CI pull request (S1);
- add `docker-smoke` while the S2 pull request is open.

The CI workflow must not use `paths` filters, because a skipped workflow leaves required
checks pending forever.

**Check that it works:**
- A direct push to `main` is rejected with "GH013 Repository rule violations".
- A pull request offers only "Create a merge commit".
