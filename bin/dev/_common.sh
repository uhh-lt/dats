#!/usr/bin/env bash
# Shared helpers for bin/dev scripts.
# Sourced by other scripts; not meant to be run directly.

# Resolve the repository root (two levels up from bin/dev/_common.sh).
DATS_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# Load a component .env file into the environment, if present.
# Usage: dats_load_env backend   # loads $DATS_ROOT/backend/.env
dats_load_env() {
	local component="$1"
	local env_file="${DATS_ROOT}/${component}/.env"
	if [[ -f "${env_file}" ]]; then
		set -o allexport
		# shellcheck disable=SC1090
		source "${env_file}"
		set +o allexport
	else
		echo "warning: ${env_file} not found; run ./bin/setup/setup-envs.sh first" >&2
	fi
}

# Run a command under debugpy if DEBUG=true and a port is provided.
# Usage: dats_maybe_debug <port> <cmd...>
# If DEBUG!=true or port is empty, runs the command directly.
dats_maybe_debug() {
	local port="$1"
	shift
	if [[ "${DEBUG:-false}" == "true" && -n "${port}" ]]; then
		echo "debugpy listening on 0.0.0.0:${port} (attach your debugger)" >&2
		exec uv run python -m debugpy --listen "0.0.0.0:${port}" "$@"
	else
		exec "$@"
	fi
}
