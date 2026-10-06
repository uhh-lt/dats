---
name: worktree-setup
description: Set up and tear down an isolated DATS dev environment in a git worktree. Use this first whenever you work in a fresh git worktree, before running tests, linting that needs services, dev servers, or migrations.
---

## When to use

You are in a git worktree (a linked checkout, `git rev-parse --git-dir` differs from `git rev-parse --git-common-dir`) and `docker/.env` does not exist yet, or you were asked to work on a feature in its own worktree.

## Set up

Inside the existing worktree:

```bash
just worktree-up
```

From the main checkout, to create a new worktree for a branch:

```bash
just worktree-up <branch> [base]
```

The recipe clones the `.env` files from the main checkout (secrets and hosted ray/vLLM/docling endpoints are inherited), assigns this worktree its own compose project and port block, installs dependencies, and starts and verifies postgres, redis, elasticsearch and weaviate. It exits non-zero if any step fails.

Do not run tests, dev servers or migrations until it has succeeded. If it fails, read the error, fix the cause (for example a missing `.env` in the main checkout means the developer must run `just bootstrap` there first) and rerun. Do not work around it by editing ports by hand or touching other compose projects.

## Rules

- Use `just` recipes only (`just test backend`, `just dev backend`, `just lint ...`).
- Never hardcode ports or hostnames. They are in `docker/.env`, `backend/.env` and `frontend/.env` of this worktree.
- Only touch this worktree's compose project. Never run docker commands against other projects or containers.
- Start dev servers (`just dev backend|worker|frontend`) in the background and check their logs instead of blocking on them.
- `just test backend` resets this worktree's own `datstest` database; that is safe.

## Tear down

```bash
just worktree-down [branch]
```

It stops the worktree's servers and stack, deletes its volumes and removes the worktree. It refuses on uncommitted or unpushed work unless `--force` is given; only use `--force` when the work is intentionally discarded. The branch is kept.

Full documentation: `docs/development/worktrees.md`.
