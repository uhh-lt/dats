# Getting Started with DATS Development

This guide gets you from a fresh machine to a running DATS development environment. DATS is a client-server application: the **backend** (Python/FastAPI), **frontend** (React/TypeScript), and **Ray** (ML models) run as local dev servers, while the backing services (PostgreSQL, Redis, Elasticsearch, Weaviate) run in Docker.

All developer commands go through **[just](https://just.systems/)**, our command runner. The `justfile` in the repo root is the single source of truth — it delegates to scripts in `bin/`. You'll use `just` for everything: setup, running servers, tests, linting, and more.

## Prerequisites

You need a **Linux** machine (other operating systems are not supported) with:

- **[Docker](https://www.docker.com/)** with the Compose plugin — for the backing services. Optimally with the [NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html) for GPU support.
- **[uv](https://docs.astral.sh/uv/)** — Python dependency manager:
  ```bash
  curl -LsSf https://astral.sh/uv/install.sh | sh
  ```
- **[just](https://just.systems/man/en/)** — the command runner. Install with:
  ```bash
  cargo install just
  ```
  (or see the [installation docs](https://just.systems/man/en/installation.html) for other methods).
- **[nvm](https://github.com/nvm-sh/nvm)** — Node.js version manager:
  ```bash
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
  ```
- **pwgen** — used by the setup script to generate secrets (install via your package manager, e.g. `sudo apt install pwgen`).
- **VS Code** (recommended) — the repo ships recommended extensions and settings.

Restart your terminal after installing uv and nvm so the new commands are recognized.

## Setup

### 1. Clone the repository

```bash
git clone git@github.com:uhh-lt/dats.git
cd dats
```

### 2. Install the toolchain

```bash
# Python 3.11 (required by the backend)
uv python install 3.11

# Node.js (see the version used in CI, e.g. 24)
nvm install 24
```

### 3. Bootstrap the environment

The `bootstrap` recipe does everything in one step: creates the required folders, generates the `.env` files from the templates, and installs backend + frontend dependencies.

```bash
just bootstrap <project_name> <port_prefix>
```

- `<project_name>` — a name for your local instance (e.g. your username: `tim-dats`). Used as the Docker Compose project name.
- `<port_prefix>` — a 3-digit prefix for all ports (e.g. `132`). Every DATS port starts with this prefix, so pick one that doesn't collide with other services on your machine. The default templates use `131`.

```bash
just bootstrap tim-dats 132
```

!!! tip "On the HCDS ltdwise server"
If you're developing on the HCDS `ltdwise` server, append `ltdwise` to also point at the hosted services (vLLM, Ray, Docling) instead of running them locally:
`bash
    just bootstrap tim-dats 132 ltdwise
    `

### 4. Fill in secrets

The setup script prints a warning about placeholder values you still need to fill in. Edit the generated `.env` files:

- `docker/.env` — `HF_HUB_TOKEN`, `LLM_PROVIDER_API_KEY`, `EMB_PROVIDER_API_KEY`
- `backend/.env` — `API_HF_HUB_TOKEN`, `LLM_PROVIDER_API_KEY`, `EMB_PROVIDER_API_KEY`

### 5. Install pre-commit hooks

We use [pre-commit](https://pre-commit.com/) to run linting and formatting automatically on every commit:

```bash
uv tool install pre-commit
pre-commit install
```

### 6. Start the backing services

```bash
just docker up
```

This starts PostgreSQL, Redis, Elasticsearch, and Weaviate in Docker. On first start this takes a while as images are pulled. Check status with `just docker ps`, view logs with `just docker logs`.

## Running the dev servers

Each server runs in its own terminal:

```bash
just dev backend     # FastAPI backend (uvicorn --reload)
just dev worker      # background job worker
just dev frontend    # React frontend (Vite)
just dev ray         # Ray ML models (optional, needs GPU)
```

The backend runs setup/migrations automatically on start, so the database schema is always up to date.

Visit the frontend at `http://localhost:<port_prefix>00` (e.g. `http://localhost:13200` if your prefix is `132`).

## Everyday commands

Run `just` (or `just --list`) to see all available commands. The most common:

| Command                                             | What it does                                                |
| --------------------------------------------------- | ----------------------------------------------------------- |
| `just test backend`                                 | Run the backend test suite                                  |
| `just lint backend` / `frontend` / `ray`            | Lint (ruff / eslint)                                        |
| `just format backend` / `frontend` / `ray` / `repo` | Format (ruff / prettier)                                    |
| `just typecheck backend` / `frontend` / `ray`       | Typecheck (pyright / tsc)                                   |
| `just precommit`                                    | Run all pre-commit hooks over all files                     |
| `just update-api`                                   | Regenerate the frontend API client from the running backend |
| `just alembic migrate` / `check` / `revision "msg"` | Database migrations                                         |
| `just docker up` / `down` / `logs` / `ps`           | Manage backing services                                     |

### Debugging

Prefix any `dev` command with `DEBUG=true` to run the server under [debugpy](https://github.com/microsoft/debugpy) for attach debugging:

```bash
DEBUG=true just dev backend
```

Then attach your debugger to the debugpy port (printed on startup, configured via `DEBUGPY_PORT_*` in the `.env` files).

## Updating your environment

After pulling a new version of DATS:

```bash
just docker down                       # stop the backing services
just bootstrap <project_name> <port_prefix>   # regenerate .env files + reinstall deps
just docker up                         # restart the backing services
```

Re-running `bootstrap` regenerates the `.env` files from the templates (your manual edits are overwritten — re-apply secrets afterwards) and updates all dependencies.
