#!/usr/bin/env bash
# Start the backend FastAPI dev server (uvicorn --reload).
# Mirrors the production entrypoint: setup.py runs first so the database schema
# is always up to date, then uvicorn launches.
# Set DEBUG=true to run under debugpy for attach debugging.
set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/_common.sh"
dats_load_env backend

cd "${DATS_ROOT}/backend"
export PYTHONPATH="${DATS_ROOT}/backend/src"

# Pre-flight: ensure DB schema and application state are up to date (runs every start).
uv run python src/setup.py

dats_maybe_debug "${DEBUGPY_PORT_API:-}" \
	uv run uvicorn main:app --reload --host 0.0.0.0 --app-dir src
