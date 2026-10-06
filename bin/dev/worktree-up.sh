#!/usr/bin/env bash
# Create (or prepare) a git worktree with its own isolated DATS dev stack.
#
# Usage:
#   worktree-up.sh <branch> [base]   create ../<repo>.worktrees/<slug> on <branch>, then set it up
#   worktree-up.sh                   set up the current, already existing linked worktree
#
# Steps: env files cloned from the main checkout (own compose project + port block),
# folders, dependencies, then the backing services (postgres, redis, elasticsearch,
# weaviate, lighttpd) are started and verified. Fails loudly if any step fails.
#
# Environment:
#   DATS_ENV_SOURCE              checkout to clone env files from (default: main checkout)
#   DATS_WORKTREE_PORT_RANGE     "<first>-<last>" 3-digit port prefixes (default: 200-299)
#   DATS_WORKTREE_CLAIMS_DIR     shared directory where developers on this machine claim
#                                port prefixes (default: /var/tmp/dats-worktree-ports)
set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/_common.sh"

# The main checkout is always the first entry of the worktree list.
MAIN_CHECKOUT="$(git -C "${DATS_ROOT}" worktree list --porcelain | sed -n '1s/^worktree //p')"
SOURCE="${DATS_ENV_SOURCE:-${MAIN_CHECKOUT}}"
PORT_RANGE="${DATS_WORKTREE_PORT_RANGE:-200-299}"

slugify() {
	local slug
	slug="$(echo "$1" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g; s/^-+|-+$//g')"
	echo "${slug:0:30}"
}

# Print the first port prefix whose whole block is unclaimed, unused by sibling worktrees and
# not listened on by the host. Claims of worktrees that no longer exist are reclaimed.
allocate_prefix() {
	local first="${PORT_RANGE%-*}" last="${PORT_RANGE#*-}"
	local used_prefixes listening candidate claim port busy
	used_prefixes="$(
		git -C "${MAIN_CHECKOUT}" worktree list --porcelain | sed -n 's/^worktree //p' |
			while read -r wt; do
				sed -n 's/^API_EXPOSED=\([0-9]\{3\}\)[0-9]\{2\}$/\1/p' "${wt}/docker/.env" 2>/dev/null || true
			done
	)"
	listening="$(ss -ltnH | awk '{n=split($4, a, ":"); print a[n]}')"
	for ((candidate = first; candidate <= last; candidate++)); do
		if grep -qx "${candidate}" <<<"${used_prefixes}"; then continue; fi
		claim="${DATS_CLAIMS_DIR}/${candidate}"
		if [[ -f "${claim}" ]]; then
			if [[ -d "$(cat "${claim}")" ]]; then continue; fi
			rm -f "${claim}"
		fi
		busy=0
		for port in $(seq "${candidate}00" "${candidate}99"); do
			if grep -qx "${port}" <<<"${listening}"; then
				busy=1
				break
			fi
		done
		if [ "${busy}" -eq 0 ]; then
			echo "${candidate}"
			return 0
		fi
	done
	echo "error: no free port prefix in range ${PORT_RANGE}" >&2
	return 1
}

# Allocation, env creation and claiming happen under one machine-wide lock, so parallel runs
# (also of different developers) cannot pick the same prefix.
dats_claims_init
exec 9>"${DATS_CLAIMS_DIR}/.lock"
flock 9

if [ "$#" -ge 1 ]; then
	BRANCH="$1"
	BASE="${2:-HEAD}"
	SLUG="$(slugify "${BRANCH}")"
	TARGET="$(dirname "${MAIN_CHECKOUT}")/$(basename "${MAIN_CHECKOUT}").worktrees/${SLUG}"
	if [ -e "${TARGET}" ]; then
		echo "error: ${TARGET} already exists." >&2
		exit 1
	fi
	if git -C "${MAIN_CHECKOUT}" show-ref --verify --quiet "refs/heads/${BRANCH}"; then
		git -C "${MAIN_CHECKOUT}" worktree add "${TARGET}" "${BRANCH}"
	else
		git -C "${MAIN_CHECKOUT}" worktree add -b "${BRANCH}" "${TARGET}" "${BASE}"
	fi
else
	TARGET="${DATS_ROOT}"
	if [ "${TARGET}" = "${MAIN_CHECKOUT}" ]; then
		echo "error: run this inside a linked worktree, or pass a branch name." >&2
		exit 1
	fi
	if [ -f "${TARGET}/docker/.env" ]; then
		echo "error: ${TARGET}/docker/.env already exists; this worktree is already set up." >&2
		exit 1
	fi
	SLUG="$(slugify "$(basename "${TARGET}")")"
fi

PREFIX="$(allocate_prefix)"
"${DATS_ROOT}/bin/setup/setup-worktree-envs.sh" \
	--source "${SOURCE}" --target "${TARGET}" --slug "${SLUG}" --prefix "${PREFIX}"
(umask 000 && printf '%s\n' "${TARGET}" >"${DATS_CLAIMS_DIR}/${PREFIX}")
exec 9>&-

cd "${TARGET}"
./bin/setup/setup-folders.sh --development
(cd backend && uv sync)
(cd frontend && npm ci)

# Backing services only; ray, vLLM and docling are shared hosted services.
(
	cd docker
	export COMPOSE_PROFILES=""
	docker compose up -d --wait postgres redis elasticsearch weaviate lighttpd
)

# Migrate and seed once so a broken stack fails here instead of in the first test.
(
	DATS_ROOT="${TARGET}"
	dats_load_env backend
	cd "${TARGET}/backend"
	export PYTHONPATH="${TARGET}/backend/src"
	uv run python src/setup.py
)

echo
echo "Worktree ready: ${TARGET}"
echo "  project:  $(sed -n 's/^COMPOSE_PROJECT_NAME=//p' docker/.env)"
echo "  backend:  http://localhost:${PREFIX}20   frontend: https://localhost:${PREFIX}00"
echo "  start servers with: just dev backend | just dev worker | just dev frontend"
