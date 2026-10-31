# Reviewer Brief

You review one part of a DATS change: the files in your brief. Find what is really wrong and back every claim with evidence; a short list of real problems beats a long list of guesses.

Stay read-only: do not edit files, commit, switch branches, stash, run formatters, `just lint` (it runs `ruff --fix`) or tests.

## 1. Read the rules

Read `AGENTS.md`, `.github/skills/review-changes/hotspots.md` and every instruction file in your brief, completely. Read no other instruction files: they do not apply to your files.

## 2. Read the change

For each file in your brief:

1. Read its diff with the diff command from your brief, and the commit messages, to see what the change is meant to do.
2. Read the whole file after the change, not only the hunks. If the head is a ref, read files with `git show <head>:<path>` and search with `git grep <pattern> <head>`.
3. Follow the change outward where it matters: callers of a changed function, the CRUD or service an endpoint uses, the DTOs it returns, the frontend code that consumes a changed API, and sibling modules of the same kind (another `*_service.py`, another `*Dialog.tsx`) for how the codebase usually solves the same problem.

For deleted and renamed files, check that nothing still references the old name.

## 3. Look for problems

In this order of importance:

**Correctness.** Bugs, unhandled edge cases (empty lists, `None`, deleted entities, documents of every doc type), wrong transaction or session handling, race conditions in jobs, broken API contracts between backend and frontend, and every hotspot in `hotspots.md`.

**Rule violations.** Deviations from what the instruction files and `AGENTS.md` actually say. Quote the rule and name the file and section.

**Workflow hints.** Confirm or dismiss each hint in your brief by checking the actual change; report only the confirmed ones as findings.

**Reuse and tests.** New code that duplicates an existing CRUD read, helper, hook or component; changed backend behavior without a test that covers it.

Do not report:

- What ruff, ESLint, Prettier and pyright/tsc catch; pre-commit runs them. But do run `lint/check_endpoints.py` or `lint/check_repos.py` when a hint asks for it.
- Problems in code the change did not touch, unless the change makes them worse or depends on them. At most three, under "Noticed in passing".
- Style preferences without a rule or a concrete consequence.

## 4. Report

Return only this report, nothing before it. Write "none" under an empty section.

```md
## Findings

### <stack>-1 · <severity> · `path/to/file.py:42`

**Claim:** <one sentence: what is wrong>
**Evidence:** <the relevant lines, quoted; for a rule violation also the rule, quoted with its instruction file › section>
**Consequence:** <input or situation → what goes wrong; for a rule violation: what the rule protects against>
**Basis:** rule | correctness | judgement (only when neither backs it; keep these few)
**Fix:** <the suggested change, in one or two sentences>

## Instruction gaps

- <a pattern this change introduces that no instruction file covers, or a rule that contradicts the codebase>

## Hotspot candidates

- <finding ID: a DATS-specific failure class behind that finding that hotspots.md does not cover yet, as one general line. Not a generic bug class, not a rule for one file kind (that is an instruction gap)>

## Noticed in passing

- <at most three issues in untouched code>

## Coverage

- Files reviewed: <all, or which ones were only skimmed and why>
- Workflow hints: <each: confirmed → finding ID, or dismissed and why>
- Suggested tests: <`just test backend <path>` commands or manual checks>
```

Severities:

- **blocker**: a bug users will hit, data loss, a security or project-scoping hole, a missing migration, a broken API contract.
- **should-fix**: a written rule violated, or a clear maintainability or performance problem.
- **nit**: small and optional.
- **question**: undecidable without the intent; say what you would need to know.
