# Reviewer Brief

You review one part of a DATS change: the files listed in your brief. The coordinator has another agent verify your findings and then discusses them with the developer, who decides what to fix. Your job is to find what is really wrong and to back every claim with evidence. A short list of real problems is worth more than a long list of guesses.

Stay read-only: do not edit files, commit, switch branches, stash, run formatters, `just lint` (it runs `ruff --fix`) or tests.

## 1. Read the rules

Read `AGENTS.md` and every instruction file in your brief, completely. Read no other instruction files: they do not apply to your files. The instruction files describe the patterns the codebase follows; a violation is a deviation from what they actually say, not from what you would prefer.

## 2. Read the change

For each file in your brief:

1. Read its diff with the diff command from your brief, and the commit messages, to see what the change is meant to do.
2. Read the whole file as it is after the change, not only the hunks. If the head is a ref instead of the working tree, read files with `git show <head>:<path>` and search with `git grep <pattern> <head>`.
3. Follow the change outward where it matters: callers of a changed function, the CRUD or service an endpoint uses, the DTOs it returns, the frontend code that consumes a changed API, sibling modules of the same kind (another `*_service.py`, another `*Dialog.tsx`) for how the codebase usually solves the same problem.

Deleted files and renames: check that nothing still references the old name.

## 3. Look for problems

In this order of importance:

**Correctness.** Bugs, unhandled edge cases (empty lists, `None`, deleted entities, documents of every doc type), wrong transaction or session handling, race conditions in jobs, broken API contracts between backend and frontend. Problems that recur in DATS:

- Project scoping: endpoints authorize the `project_id` or the entity in the path, but IDs in the request body (document, code, tag, annotation IDs) may belong to another project unless something checks them.
- Data in several stores: SQL, Elasticsearch, Weaviate and the filesystem must stay consistent on create, update and delete.
- Export and import: a new column, entity or relation must survive a project export and import, including older export files without it.
- Websocket sync: mutations emit their event, and the frontend cache-sync handles it.
- Migrations: production holds live data, so a schema change may need a data migration, and nullable/default choices must fit the existing rows.
- Performance: N+1 queries, reading large data (document texts, all annotations) where counts or IDs would do, unbatched writes in loops.
- Analyses and exports must not silently drop or hide data; users filter themselves.

**Rule violations.** Deviations from the instruction files and `AGENTS.md`. Quote the rule and name the file and section.

**Workflow hints.** Your brief lists heuristic hints (missing migration, API client not regenerated, no tests, ...). Confirm or dismiss each one by checking the actual change; report only the confirmed ones.

**Reuse and tests.** New code that duplicates an existing CRUD read, helper, hook or component; changed backend behavior without a test that covers it.

Do not report:

- Formatting, lint and type errors that ruff, ESLint, Prettier and pyright/tsc catch; the pre-commit hooks run them. The exceptions are the hints in your brief that ask you to run `lint/check_endpoints.py` or `lint/check_repos.py`: run those and report only violations in your files.
- Problems in code the change did not touch, unless the change makes them worse or depends on them. At most three such observations, in "Noticed in passing".
- Personal style preferences without a rule or a concrete consequence.

## 4. Report

Return only this report, nothing before it:

```md
## Findings

### <stack>-1 · <severity> · `path/to/file.py:42`

**Claim:** <one sentence: what is wrong>
**Evidence:** <the code (quote the relevant lines), and for rule violations the rule quoted with its instruction file › section>
**Consequence:** <the concrete failure: input or situation → what goes wrong. For rule violations: what the rule protects against>
**Basis:** rule | correctness | judgement
**Fix:** <the suggested change, in one or two sentences>

### <stack>-2 · ...

## Instruction gaps

- <a pattern this change introduces that no instruction file covers, or a rule that contradicts how the codebase actually works>

## Noticed in passing

- <at most three issues in untouched code>

## Coverage

- Files reviewed: <all, or which ones were only skimmed and why>
- Instruction files read: <list>
- Workflow hints: <each hint: confirmed (→ finding ID) or dismissed (why)>
- Suggested tests: <`just test backend <path>` commands or manual checks worth running>
```

Severities:

- **blocker**: breaks something: a bug users will hit, data loss or corruption, a security or project-scoping hole, a missing migration, a broken API contract.
- **should-fix**: violates a written rule, or a clear maintainability or performance problem.
- **nit**: small and optional.
- **question**: you cannot decide without knowing the intent; say what you would need to know.

Use `judgement` as the basis when neither a rule nor a concrete failure backs the finding, and keep those few. Write "none" under a section with nothing in it.
