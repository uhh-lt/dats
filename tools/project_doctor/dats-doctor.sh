#!/usr/bin/env bash
# Run the DATS project doctor against a DATS instance.
#
#   tools/project_doctor/dats-doctor.sh [--local] check [--project ID ...] [-o report.json]
#   tools/project_doctor/dats-doctor.sh [--local] heal report.json [--only CHECK ...] [--apply]
#
# Default: runs in a one-off container of the backend image of the docker compose
# deployment in docker/ (like the scripts in bin/prod), with the same env and
# volumes as the API. --local: runs against this checkout's dev stack (backend/.env).
# The doctor imports no DATS code, only the libraries of the backend environment,
# so it works with the DATS version the deployment runs.
# Relative report paths are resolved against the current directory.
set -euo pipefail

DOCTOR_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DATS_ROOT="$(cd "${DOCTOR_DIR}/../.." && pwd)"

if [[ "${1:-}" == "--local" ]]; then
	shift
	export DATS_BACKEND_DIR="${DATS_ROOT}/backend"
	exec uv run --project "${DATS_ROOT}/backend" python "${DOCTOR_DIR}/dats_doctor.py" "$@"
fi

if [[ ! -f "${DATS_ROOT}/docker/.env" ]]; then
	echo "error: ${DATS_ROOT}/docker/.env not found; run this on the host of the DATS deployment" >&2
	exit 1
fi

work_dir="$(pwd)"
cd "${DATS_ROOT}/docker"
# DOCTOR_OWNER hands the report back to the calling user, in case the container
# runs as root. The empty PYTHONPATH keeps the backend code out of reach.
exec docker compose -f compose.yml -f compose.production.yml run --rm --no-deps \
	-v "${DOCTOR_DIR}:/dats/tools/project_doctor:ro" \
	-v "${work_dir}:/work" \
	-w /work \
	-e DOCTOR_OWNER="$(id -u):$(id -g)" \
	-e DATS_BACKEND_DIR=/dats/backend \
	-e PYTHONPATH= \
	dats-backend-api python /dats/tools/project_doctor/dats_doctor.py "$@"
