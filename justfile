# DATS command catalog — the single entry point for developers, agents, and CI.

set minimum-version := "1.55.0"
set default-list
set positional-arguments
set default-script
set script-interpreter := ["bash", "-eu", "-o", "pipefail"]

# --- 1. Bootstrap: install deps, generate .env, create folders -------------

[arg("project_name", help="Docker Compose project name, e.g. dats")]
[arg("hosted", pattern="ltdwise|", help="Optional hosted environment: ltdwise")]
[arg("port_prefix", pattern="[0-9]+", help="Development port prefix, e.g. 132")]
[doc("Bootstrap: just bootstrap <project_name> <port_prefix> [ltdwise]")]
[group("1. Setup")]
bootstrap project_name port_prefix hosted="":
    project_name="$1"
    port_prefix="$2"
    hosted="${3:-}"
    ./bin/setup/setup-folders.sh --development
    ./bin/setup/setup-envs.sh --project_name "$project_name" --port_prefix "$port_prefix"
    if [ "$hosted" = "ltdwise" ]; then
      ./bin/setup/setup-ltdwise.sh
    fi
    just install backend
    just install frontend
    just install ray

[arg("target", pattern="backend|frontend|ray", help="Component to install")]
[doc("Install dependencies (target: backend|frontend|ray)")]
[group("1. Setup")]
install target:
    case "$1" in
      backend)  cd backend && uv sync ;;
      frontend) cd frontend && npm ci ;;
      ray)      cd ray && uv sync ;;
    esac

# --- 2. Docker: backing services -------------------------------------------

[arg("action", pattern="up|down|logs|ps", help="Docker Compose action")]
[doc("Manage backing services (action: up|down|logs|ps)")]
[group("2. Services")]
docker action:
    cd docker
    export COMPOSE_PROFILES=""
    case "$1" in
      up)   docker compose up -d ;;
      down) docker compose down ;;
      logs) docker compose logs -f ;;
      ps)   docker compose ps ;;
    esac

# --- 3. Development servers -------------------------------------------------

[arg("target", pattern="backend|worker|frontend|ray", help="Server to start; prefix with DEBUG=true for debugpy")]
[doc("Start a server (target: backend|worker|frontend|ray; DEBUG=true to debug)")]
[group("3. Development")]
dev target:
    case "$1" in
      backend)  exec ./bin/dev/backend-api.sh ;;
      worker)   exec ./bin/dev/backend-worker.sh ;;
      frontend) exec ./bin/dev/frontend.sh ;;
      ray)      exec ./bin/dev/ray.sh ;;
    esac

# --- 4. Tests ---------------------------------------------------------------

[arg("args", help="Arguments forwarded to pytest, e.g. test/endpoints/search or -k memo_info")]
[arg("target", pattern="backend", help="Component to test (currently backend)")]
[doc("Run tests (target: backend; extra arguments go to pytest)")]
[group("4. Testing")]
test target *args:
    shift
    exec ./bin/dev/backend-test.sh "$@"

# --- 5. Code quality: lint, format, typecheck ---------------------------------

[arg("files", help="Optional repo-relative files, e.g. backend/src/foo.py")]
[arg("target", pattern="backend|frontend|ray", help="Component to lint")]
[doc("Lint code (target: backend|frontend|ray; optionally pass files)")]
[group("5. Quality")]
lint target *files:
    target="$1"; shift
    # Strip the "<component>/" prefix from each file (recipes cd into the component,
    # but pre-commit passes repo-root-relative paths).
    rel=()
    for f in "$@"; do rel+=("${f#$target/}"); done
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
        if [ ${#rel[@]} -eq 0 ]; then uv run ruff check --fix --config=pyproject.toml src
        else uv run ruff check --fix --config=pyproject.toml "${rel[@]}"; fi ;;
    esac

[arg("files", help="Optional repo-relative files, e.g. frontend/src/App.tsx")]
[arg("target", pattern="backend|frontend|ray|repo", help="Component to format")]
[doc("Format code (target: backend|frontend|ray|repo; optionally pass files)")]
[group("5. Quality")]
format target *files:
    target="$1"; shift
    rel=()
    for f in "$@"; do rel+=("${f#$target/}"); done
    case "$target" in
      backend)
        cd backend
        if [ ${#rel[@]} -eq 0 ]; then uv run ruff format --config=pyproject.toml src test
        else uv run ruff format --config=pyproject.toml "${rel[@]}"; fi ;;
      ray)
        cd ray
        if [ ${#rel[@]} -eq 0 ]; then uv run ruff format --config=pyproject.toml src
        else uv run ruff format --config=pyproject.toml "${rel[@]}"; fi ;;
      frontend)
        cd frontend
        if [ ${#rel[@]} -eq 0 ]; then npx prettier --write --no-color --ignore-unknown --config ../.prettierrc.yaml --ignore-path ../.prettierignore . | sed '/ (unchanged)$/d'
        else npx prettier --write --no-color --ignore-unknown --config ../.prettierrc.yaml --ignore-path ../.prettierignore "${rel[@]}" | sed '/ (unchanged)$/d'; fi ;;
      repo)
        if [ ${#rel[@]} -eq 0 ]; then
          git ls-files -z | xargs -0 npx --prefix frontend prettier --write --no-color --ignore-unknown --config .prettierrc.yaml --ignore-path .prettierignore | sed '/ (unchanged)$/d'
        else
          npx --prefix frontend prettier --write --no-color --ignore-unknown --config .prettierrc.yaml --ignore-path .prettierignore "${rel[@]}" | sed '/ (unchanged)$/d'
        fi ;;
    esac

[arg("args", help="Arguments forwarded to pyright or tsc, e.g. --watch or --outputjson")]
[arg("target", pattern="backend|frontend|ray", help="Component to typecheck")]
[doc("Typecheck code (target: backend|frontend|ray; extra arguments forwarded)")]
[group("5. Quality")]
typecheck target *args:
    target="$1"; shift
    case "$target" in
      backend)  cd backend && uv run pyright --project . "$@" ;;
      frontend) cd frontend && npx tsc --noEmit "$@" ;;
      ray)      cd ray && uv run pyright --project . "$@" ;;
    esac

[doc("Run all format, lint, typecheck, and hygiene hooks over all files")]
[group("5. Quality")]
precommit:
    pre-commit run --all-files

# --- 6. Code generation ---------------------------------------------------

[doc("Regenerate the frontend API client (requires the backend server)")]
[group("6. Code generation")]
[working-directory("frontend")]
update-api:
    npm run update-api

[arg("args", help="Optional action arguments, e.g. the message for revision")]
[arg("action", pattern="migrate|check|revision", help="Alembic action")]
[doc("Manage database migrations (action: migrate|check|revision)")]
[group("6. Code generation")]
alembic action *args:
    ./bin/dev/backend-alembic.sh "$@"

# --- 7. Release ---------------------------------------------------------------

[arg("version", pattern="[0-9]+\\.[0-9]+\\.[0-9]+", help="Semantic version without a v prefix")]
[doc("Cut a release from a clean main branch (version: MAJOR.MINOR.PATCH)")]
[group("7. Release")]
release version:
    ./bin/dev/release.sh "$1"
