# Git Worktrees

Git worktrees let you (or coding agents) work on several branches at the same time, each in its own directory. A DATS worktree gets its **own isolated dev stack**: its own Docker Compose project, port block, and databases. Parallel worktrees therefore never conflict, and `just test backend` in one worktree cannot reset the database of another.

Ray, vLLM and Docling are shared hosted services (see the `ltdwise` option in [Getting Started](getting-started.md)). They are never started per worktree.

## Prerequisites

Bootstrap your main checkout once as described in [Getting Started](getting-started.md), including the secrets. Worktrees clone their configuration from it.

## Create a worktree

From the main checkout:

```bash
just worktree-up <branch> [base]
```

This creates the worktree in `../<repo>.worktrees/<branch-slug>` (reusing the branch if it exists, otherwise creating it from `base`, default `HEAD`), then:

1. Clones the `.env` files from the main checkout. Secrets, API keys and the hosted service endpoints are inherited unchanged.
2. Rewrites only what must differ: the `COMPOSE_PROJECT_NAME` (`<main-project>-wt-<slug>`), the local port block, fresh `AUTH_JWT_SECRET` / `AUTH_SESSION_SECRET`, and absolute paths.
3. Creates the data folders and installs the backend and frontend dependencies.
4. Starts PostgreSQL, Redis, Elasticsearch, Weaviate and the content server, waits until they are healthy, and runs the database setup once. The script fails if any step fails, so a finished `worktree-up` means a working stack.

If a tool created the worktree for you (for example a coding agent harness), run `just worktree-up` without arguments inside it to set it up in place.

When it finishes it prints the project name and the backend and frontend URLs. Start the servers with the usual `just dev backend`, `just dev worker` and `just dev frontend`; every `just` recipe uses the worktree's own configuration.

## Ports

Each worktree gets a free three-digit port prefix `NNN`, so its services run on `NNN00`-`NNN99` (for example `20022` for PostgreSQL). Prefixes are allocated from `200-299` by default; prefixes already used by sibling worktrees or with listening ports are skipped. Allocation is locked, so creating several worktrees in parallel is safe. The prefix `101` is reserved for the hosted services.

| Variable                   | Default       | Purpose                                              |
| -------------------------- | ------------- | ---------------------------------------------------- |
| `DATS_ENV_SOURCE`          | main checkout | Checkout whose `.env` files are cloned               |
| `DATS_WORKTREE_PORT_RANGE` | `200-299`     | Range of port prefixes (keep them at or below `327`) |

Never hardcode ports; read them from the worktree's `docker/.env`, `backend/.env` and `frontend/.env`.

## Remove a worktree

```bash
just worktree-down [branch] [--force]
```

This stops dev servers running in the worktree, runs `docker compose down -v` (deleting its volumes), and removes the worktree directory. The branch is kept. Without `--force` it refuses if there are uncommitted changes or commits that exist on no remote branch. Omit `branch` to remove the worktree you are currently in.

## Resource usage

Every worktree runs its own Elasticsearch and Weaviate, which take a few GB of RAM each. Plan for a handful of parallel worktrees and remove the ones you no longer need. Linting, type checking and frontend work do not need a running stack.

## Working with coding agents

[`AGENTS.md`](https://github.com/uhh-lt/dats/blob/main/AGENTS.md) instructs agents to run `just worktree-up` before anything else in a fresh worktree, to use `just` recipes only, and to touch only their own compose project.
