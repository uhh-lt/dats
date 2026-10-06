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

Each worktree gets a free three-digit port prefix `NNN`, so its services run on `NNN00`-`NNN99` (for example `20022` for PostgreSQL). Prefixes are allocated from `200-299` by default. The prefix `101` is reserved for the hosted services, and your main checkout keeps the prefix chosen during `just bootstrap`.

### How port claims work

Several developers share one machine, and a stopped stack no longer listens on its ports. Checking for listening ports alone could therefore hand the same prefix to two developers. To prevent this, every worktree **claims** its prefix in a directory shared by everyone on the machine, `/var/tmp/dats-worktree-ports/`:

- A claim is a file named after the prefix (for example `201`) that contains the path of the worktree that owns it.
- `just worktree-up` takes the first prefix in the range that is not claimed, is not used by a sibling worktree's `docker/.env`, and has no listening port in its block. It writes its claim only after the worktree's `.env` files were created.
- Allocation runs under a machine-wide lock (`.lock` in the same directory), so parallel runs, also of different developers, get different prefixes.
- `just worktree-down` releases the claim. A claim whose worktree directory no longer exists (for example after `rm -rf` instead of `worktree-down`) is stale and is reclaimed automatically by the next allocation.
- The directory and its files are writable by every user, deliberately without a sticky bit, so anyone can reclaim a stale claim. Trust between developers is assumed. To look at the current claims, run `head /var/tmp/dats-worktree-ports/*`.

| Variable                   | Default                        | Purpose                                              |
| -------------------------- | ------------------------------ | ---------------------------------------------------- |
| `DATS_ENV_SOURCE`          | main checkout                  | Checkout whose `.env` files are cloned               |
| `DATS_WORKTREE_PORT_RANGE` | `200-299`                      | Range of port prefixes (keep them at or below `327`) |
| `DATS_WORKTREE_CLAIMS_DIR` | `/var/tmp/dats-worktree-ports` | Shared directory for port prefix claims              |

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
