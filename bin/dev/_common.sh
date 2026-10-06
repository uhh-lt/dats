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

# Shared claims directory for worktree port prefixes. It is writable by every developer on the
# machine (a claim of a removed worktree must be reclaimable by anyone, so no sticky bit).
# Each claim is a file named after the prefix and containing the worktree path.
DATS_CLAIMS_DIR="${DATS_WORKTREE_CLAIMS_DIR:-/var/tmp/dats-worktree-ports}"

# Create the claims directory and its lock file if needed.
dats_claims_init() {
	if [[ ! -d "${DATS_CLAIMS_DIR}" ]]; then
		(umask 000 && mkdir -p "${DATS_CLAIMS_DIR}")
	fi
	if [[ ! -e "${DATS_CLAIMS_DIR}/.lock" ]]; then
		(umask 000 && : >>"${DATS_CLAIMS_DIR}/.lock")
	fi
}

# Remove every claim that belongs to the given worktree path.
# Usage: dats_claims_release <worktree_path>
dats_claims_release() {
	local claim
	for claim in "${DATS_CLAIMS_DIR}"/[0-9][0-9][0-9]; do
		[[ -f "${claim}" ]] || continue
		if [[ "$(cat "${claim}")" == "$1" ]]; then
			rm -f "${claim}"
		fi
	done
}
