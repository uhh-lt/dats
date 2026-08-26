#!/usr/bin/env bash
# Start the Ray Serve dev stack (installs spacy models, generates spec, serves).
# Set DEBUG=true to run under debugpy for attach debugging.
set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/_common.sh"
dats_load_env ray

cd "${DATS_ROOT}/ray/src"
export PYTHONPATH="${DATS_ROOT}/ray/src"

dats_maybe_debug "${DEBUGPY_PORT_RAY:-}" \
	./ray_entrypoint_dev.sh
