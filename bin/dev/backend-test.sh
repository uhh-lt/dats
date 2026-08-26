#!/usr/bin/env bash
# Run the backend pytest suite.
set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/_common.sh"
dats_load_env backend

cd "${DATS_ROOT}/backend"
export PYTHONPATH="${DATS_ROOT}/backend/src"
export RESET_DATABASE_FOR_TESTING="${RESET_DATABASE_FOR_TESTING:-1}"

exec uv run pytest "$@"
