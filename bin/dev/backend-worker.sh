#!/usr/bin/env bash
# Start the backend RQ worker pool (dev: CPU + API + GPU).
# Set DEBUG=true to run under debugpy for attach debugging.
set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/_common.sh"
dats_load_env backend

cd "${DATS_ROOT}/backend"
export PYTHONPATH="${DATS_ROOT}/backend/src"
export PATH="${DATS_ROOT}/backend/.venv/bin:${PATH}"
export RQ_WORKERS_CPU="${RQ_WORKERS_CPU:-1}"
export RQ_WORKERS_API="${RQ_WORKERS_API:-1}"
export RQ_WORKERS_GPU="${RQ_WORKERS_GPU:-1}"

dats_maybe_debug "${DEBUGPY_PORT_WORKER:-}" \
	uv run python src/worker.py work dev
