#!/usr/bin/env bash
# Start the Ray Serve dev stack (installs spacy models, generates spec, serves).
# Set DEBUG=true to run under debugpy for attach debugging.
set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/_common.sh"
dats_load_env ray

cd "${DATS_ROOT}/ray/src"
export PYTHONPATH="${DATS_ROOT}/ray/src"

if [[ "${DEBUG:-false}" == "true" && -n "${DEBUGPY_PORT_RAY:-}" ]]; then
	echo "debugpy listening on 0.0.0.0:${DEBUGPY_PORT_RAY} (attach your debugger)" >&2
	exec uv run python -m debugpy --listen "0.0.0.0:${DEBUGPY_PORT_RAY}" \
		ray_entrypoint_dev.sh
else
	exec ./ray_entrypoint_dev.sh
fi
