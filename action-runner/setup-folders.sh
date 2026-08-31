#!/usr/bin/env bash
# setup-folders.sh — create host directories required by the runner fleet.
#
# 1. Each runner's work directory (_work) is bind-mounted from the host so that
#    Docker-out-of-Docker bind mounts (docker compose up inside CI) resolve to
#    paths that exist on the host daemon.
# 2. A shared Ray model cache, mounted into all runners at /ray_cache and
#    reused by sibling Ray containers spawned by CI jobs.
# 3. A shared uv cache, mounted into all runners at /home/runner/.cache/uv so
#    Python dependencies are downloaded/built once and reused by all runners.
#
# Usage:
#   ./setup-folders.sh                 # uses RUNNER_WORK_BASE_DIR / RAY_CACHE_HOST_DIR / UV_CACHE_HOST_DIR from .env
#   ./setup-folders.sh --recreate      # delete all managed directories first, then recreate them

set -euo pipefail

cd "$(dirname "$0")"

# Parse arguments
RECREATE=0
for arg in "$@"; do
	if [[ "$arg" == "--recreate" ]]; then
		RECREATE=1
	fi
done

# Load .env if present (for RUNNER_WORK_BASE_DIR, RAY_CACHE_HOST_DIR, UV_CACHE_HOST_DIR)
if [[ -f .env ]]; then
	# shellcheck disable=SC1091
	set -a && source .env && set +a
fi

BASE_DIR="${RUNNER_WORK_BASE_DIR:?RUNNER_WORK_BASE_DIR is not set. Copy .env.example to .env and configure it.}"
RAY_CACHE="${RAY_CACHE_HOST_DIR:?RAY_CACHE_HOST_DIR is not set. Copy .env.example to .env and configure it.}"
UV_CACHE="${UV_CACHE_HOST_DIR:?UV_CACHE_HOST_DIR is not set. Copy .env.example to .env and configure it.}"

if [[ "${RECREATE}" -eq 1 ]]; then
	echo "Recreating directories — deleting existing content..."
	for dir in "${BASE_DIR}" "${RAY_CACHE}" "${UV_CACHE}"; do
		if [[ -d "${dir}" ]]; then
			echo "  removing: ${dir}"
			rm -rf "${dir}"
		fi
	done
fi

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

echo "Creating shared Ray cache: ${RAY_CACHE}"
if [[ -d "${RAY_CACHE}" ]]; then
	echo "  exists:  ${RAY_CACHE}"
else
	mkdir -p "${RAY_CACHE}"
	echo "  created: ${RAY_CACHE}"
fi
chown -R "${RUNNER_UID}:${RUNNER_GID}" "${RAY_CACHE}"

echo "Creating shared uv cache: ${UV_CACHE}"
if [[ -d "${UV_CACHE}" ]]; then
	echo "  exists:  ${UV_CACHE}"
else
	mkdir -p "${UV_CACHE}"
	echo "  created: ${UV_CACHE}"
fi
chown -R "${RUNNER_UID}:${RUNNER_GID}" "${UV_CACHE}"

echo "Done. Directory layout:"
echo "Worker directories:"
ls -la "${BASE_DIR}"
echo "Ray cache:"
ls -la "${RAY_CACHE}"
echo "uv cache:"
ls -la "${UV_CACHE}"
