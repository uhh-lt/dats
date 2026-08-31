# DATS command catalog — single entry point for developers, agents, and CI.
#
# Recipes are ordered the way a developer uses them when setting up DATS:
#
#   1. bootstrap   install deps + generate .env files + create data folders
#   2. docker      start the backing services (postgres, redis, weaviate, elasticsearch)
#   3. dev         run a dev server (backend | worker | frontend | ray)
#   4. test        run a test suite
#   5. lint/format/typecheck/precommit   code quality
#   6. alembic/api-codegen     code generation
#   7. release     cut a new DATS version (maintainers)
#
# Usage:
#   just --list            # show all commands
#   just dev backend       # start the FastAPI dev server
#   just test backend      # run the backend test suite
#
# Debugging: prefix with DEBUG=true to run a server under debugpy for attach:
#   DEBUG=true just dev backend    # then attach VS Code to the debugpy port

set shell := ["bash", "-uc"]

# Default: list available commands.
default:
    @just --list

# --- 1. Bootstrap: install deps, generate .env, create folders -------------

# First-time setup: install backend & frontend deps, generate .env files, create data folders.
# Both arguments are required and must be chosen individually per developer:
# - just bootstrap <project_name> <port_prefix>           e.g.  just bootstrap dats 132
# On the HCDS ltdwise server, append "ltdwise" to also point at the hosted services:
# - just bootstrap <project_name> <port_prefix> ltdwise
bootstrap project_name port_prefix hosted="":
    #!/usr/bin/env bash
    set -euo pipefail
    ./bin/setup/setup-folders.sh --development
    ./bin/setup/setup-envs.sh --project_name {{ project_name }} --port_prefix {{ port_prefix }}
    if [ "{{ hosted }}" = "ltdwise" ]; then
      ./bin/setup/setup-ltdwise.sh
    fi
    just install backend
    just install frontend

# Install a component's dependencies: backend | frontend | ray
install target:
    #!/usr/bin/env bash
    set -euo pipefail
    case "{{ target }}" in
      backend)  cd backend && uv sync ;;
      frontend) cd frontend && npm ci ;;
      ray)      cd ray && uv sync ;;
      *) echo "unknown install target '{{ target }}' (expected: backend|frontend|ray)" >&2; exit 1 ;;
    esac

# --- 2. Docker: backing services -------------------------------------------

# Manage the backing services (postgres, redis, weaviate, elasticsearch): up | down | logs | ps
docker action:
    #!/usr/bin/env bash
    set -euo pipefail
    cd docker
    export COMPOSE_PROFILES=""
    case "{{ action }}" in
      up)   docker compose up -d ;;
      down) docker compose down ;;
      logs) docker compose logs -f ;;
      ps)   docker compose ps ;;
      *) echo "unknown docker action '{{ action }}' (expected: up|down|logs|ps)" >&2; exit 1 ;;
    esac

# --- 3. Development servers -------------------------------------------------

# Start a dev server: backend | worker | frontend | ray
dev target:
    #!/usr/bin/env bash
    set -euo pipefail
    case "{{ target }}" in
      backend)  exec ./bin/dev/backend-api.sh ;;
      worker)   exec ./bin/dev/backend-worker.sh ;;
      frontend) exec ./bin/dev/frontend.sh ;;
      ray)      exec ./bin/dev/ray.sh ;;
      *) echo "unknown dev target '{{ target }}' (expected: backend|worker|frontend|ray)" >&2; exit 1 ;;
    esac

# --- 4. Tests ---------------------------------------------------------------

# Run a test suite: backend. Extra args are forwarded to pytest:
# - just test backend                          # all tests
# - just test backend test/endpoints/search  # one folder
# - just test backend -k memo_info           # by test name
test target *args:
    #!/usr/bin/env bash
    set -euo pipefail
    case "{{ target }}" in
      backend) exec ./bin/dev/backend-test.sh {{ args }} ;;
      *) echo "unknown test target '{{ target }}' (expected: backend)" >&2; exit 1 ;;
    esac

# --- 5. Code quality: lint, format, typecheck ---------------------------------

# Lint a component, optionally restricted to specific files:
# - just lint backend                          # whole component
# - just lint backend backend/src/foo.py ...   # specific files (pre-commit)
lint target *files:
    #!/usr/bin/env bash
    set -euo pipefail
    target="{{ target }}"
    # Strip the "<component>/" prefix from each file (recipes cd into the component,
    # but pre-commit passes repo-root-relative paths).
    rel=()
    for f in {{ files }}; do rel+=("${f#$target/}"); done
    case "$target" in
      backend)
        cd backend
        if [ ${#rel[@]} -eq 0 ]; then uv run ruff check --fix --config=pyproject.toml src test
        else uv run ruff check --fix --config=pyproject.toml "${rel[@]}"; fi ;;
      frontend)
        cd frontend
        if [ ${#rel[@]} -eq 0 ]; then npx eslint . --max-warnings=0 --no-warn-ignored --config=eslint.config.mjs
        else npx eslint --max-warnings=0 --no-warn-ignored --config=eslint.config.mjs "${rel[@]}"; fi ;;
      ray)
        cd ray
        if [ ${#rel[@]} -eq 0 ]; then uv run --no-default-groups --group dev ruff check --fix --config=pyproject.toml src
        else uv run --no-default-groups --group dev ruff check --fix --config=pyproject.toml "${rel[@]}"; fi ;;
      *) echo "unknown lint target '$target' (expected: backend|frontend|ray)" >&2; exit 1 ;;
    esac

# Format a component, optionally restricted to specific files:
# - just format backend                          # ruff over backend/src + test
# - just format frontend                         # prettier over frontend/
# - just format repo                             # prettier over the whole repo
# - just format backend backend/src/foo.py ...   # specific files (pre-commit)
format target *files:
    #!/usr/bin/env bash
    set -euo pipefail
    target="{{ target }}"
    rel=()
    for f in {{ files }}; do rel+=("${f#$target/}"); done
    case "$target" in
      backend)
        cd backend
        if [ ${#rel[@]} -eq 0 ]; then uv run ruff format --config=pyproject.toml src test
        else uv run ruff format --config=pyproject.toml "${rel[@]}"; fi ;;
      ray)
        cd ray
        if [ ${#rel[@]} -eq 0 ]; then uv run --no-default-groups --group dev ruff format --config=pyproject.toml src
        else uv run --no-default-groups --group dev ruff format --config=pyproject.toml "${rel[@]}"; fi ;;
      frontend)
        cd frontend
        if [ ${#rel[@]} -eq 0 ]; then npx prettier --write --ignore-unknown --config ../.prettierrc.yaml --ignore-path ../.prettierignore .
        else npx prettier --write --ignore-unknown --config ../.prettierrc.yaml --ignore-path ../.prettierignore "${rel[@]}"; fi ;;
      repo)
        if [ {{ quote(files) }} = "" ]; then
          git ls-files -z | xargs -0 npx --prefix frontend prettier --write --ignore-unknown --config .prettierrc.yaml --ignore-path .prettierignore
        else
          npx --prefix frontend prettier --write --ignore-unknown --config .prettierrc.yaml --ignore-path .prettierignore {{ files }}
        fi ;;
      *) echo "unknown format target '$target' (expected: backend|frontend|ray|repo)" >&2; exit 1 ;;
    esac

# Typecheck a component (whole-project), with optional extra args passed to the tool:
#   just typecheck backend            # pyright over backend
#   just typecheck frontend           # tsc --noEmit
#   just typecheck frontend --watch   # tsc --noEmit --watch
# just typecheck ray --outputjson   # extra args are forwarded to pyright
typecheck target *args:
    #!/usr/bin/env bash
    set -euo pipefail
    case "{{ target }}" in
      backend)  cd backend && uv run pyright --project . {{ args }} ;;
      frontend) cd frontend && npx tsc --noEmit {{ args }} ;;
      ray)      cd ray && uv run --no-default-groups --group dev pyright --project . {{ args }} ;;
      *) echo "unknown typecheck target '{{ target }}' (expected: backend|frontend|ray)" >&2; exit 1 ;;
    esac

# Run every pre-commit hook (ruff, pyright, eslint, prettier, shfmt, ...) over all files.
precommit:
    #!/usr/bin/env bash
    set -euo pipefail
    pre-commit run --all-files

# --- 6. Code generation ---------------------------------------------------

# Regenerate the frontend API client from the running backend's OpenAPI spec.
update-api:
    #!/usr/bin/env bash
    set -euo pipefail
    cd frontend
    npm run update-api

# Backend alembic: migrate | check | revision "message"
alembic action *args:
    #!/usr/bin/env bash
    set -euo pipefail
    ./bin/dev/backend-alembic.sh {{ action }} {{ args }}

# --- 7. Release ---------------------------------------------------------------

# Cut a new DATS release (maintainers only; run from a clean main branch).
release version:
    #!/usr/bin/env bash
    set -euo pipefail
    ./bin/dev/release.sh {{ version }}
