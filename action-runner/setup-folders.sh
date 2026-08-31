#!/usr/bin/env bash
# setup-folders.sh — create host directories required by the runner fleet.
#
# Each runner's work directory (_work) is bind-mounted from the host so that
# Docker-out-of-Docker bind mounts (docker compose up inside CI) resolve to
# paths that exist on the host daemon.
#
# Usage:
#   ./setup-folders.sh                 # uses RUNNER_WORK_BASE_DIR from .env
#   RUNNER_WORK_BASE_DIR=/data/foo ./setup-folders.sh

set -euo pipefail

cd "$(dirname "$0")"

# Load .env if present (for RUNNER_WORK_BASE_DIR)
if [[ -f .env ]]; then
	# shellcheck disable=SC1091
	set -a && source .env && set +a
fi

BASE_DIR="${RUNNER_WORK_BASE_DIR:?RUNNER_WORK_BASE_DIR is not set. Copy .env.example to .env and configure it.}"

# The runner container executes jobs as uid 1000 (user "runner", see Dockerfile).
# Host directories must be owned by that uid so the runner can write to them.
RUNNER_UID=1000
RUNNER_GID=1000

RUNNERS=(runner-01 runner-02 runner-03 runner-04)

echo "Creating runner work directories under: ${BASE_DIR}"

for runner in "${RUNNERS[@]}"; do
	dir="${BASE_DIR}/${runner}"
	if [[ -d "${dir}" ]]; then
		echo "  exists:  ${dir}"
	else
		mkdir -p "${dir}"
		echo "  created: ${dir}"
	fi
done

echo "Setting ownership to ${RUNNER_UID}:${RUNNER_GID} (container 'runner' user)..."
chown -R "${RUNNER_UID}:${RUNNER_GID}" "${BASE_DIR}"

echo "Done. Directory layout:"
ls -la "${BASE_DIR}"
