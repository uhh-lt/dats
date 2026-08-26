#!/usr/bin/env bash
# Backend database migration helpers.
# Usage:
#   backend-alembic.sh migrate            # run migrations
#   backend-alembic.sh check              # verify schema is up-to-date
#   backend-alembic.sh revision "msg"     # autogenerate a new revision
set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/_common.sh"
dats_load_env backend

cd "${DATS_ROOT}/backend"
export PYTHONPATH="${DATS_ROOT}/backend/src"

subcommand="${1:-}"
case "${subcommand}" in
migrate)
	exec uv run python src/migrations/run_migrations.py
	;;
check)
	exec uv run alembic -c src/migrations/alembic.ini check
	;;
revision)
	msg="${2:-new revision}"
	exec uv run alembic -c src/migrations/alembic.ini revision --autogenerate -m "${msg}"
	;;
*)
	echo "Usage: $0 {migrate|check|revision [message]}" >&2
	exit 1
	;;
esac
