#!/usr/bin/env bash
# Tear down a git worktree and its DATS dev stack.
#
# Usage: worktree-down.sh [--force] [branch]
#   without branch, tears down the current linked worktree.
#
# Refuses if the worktree has uncommitted changes or commits that exist on no remote
# branch, unless --force is given. The branch itself is never deleted.
set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/_common.sh"

MAIN_CHECKOUT="$(git -C "${DATS_ROOT}" worktree list --porcelain | sed -n '1s/^worktree //p')"

FORCE=0
BRANCH=""
for arg in "$@"; do
	case "$arg" in
	--force) FORCE=1 ;;
	*) BRANCH="$arg" ;;
	esac
done

if [ -n "${BRANCH}" ]; then
	TARGET="$(git -C "${MAIN_CHECKOUT}" worktree list --porcelain |
		awk -v ref="refs/heads/${BRANCH}" '/^worktree /{p=substr($0,10)} $1=="branch" && $2==ref {print p}')"
	if [ -z "${TARGET}" ]; then
		echo "error: no worktree found for branch '${BRANCH}'." >&2
		exit 1
	fi
else
	TARGET="${DATS_ROOT}"
fi

if [ "${TARGET}" = "${MAIN_CHECKOUT}" ]; then
	echo "error: refusing to tear down the main checkout." >&2
	exit 1
fi

if [ "${FORCE}" -eq 0 ]; then
	if [ -n "$(git -C "${TARGET}" status --porcelain)" ]; then
		echo "error: ${TARGET} has uncommitted changes (use --force to discard)." >&2
		exit 1
	fi
	if [ -z "$(git -C "${TARGET}" branch -r --contains HEAD)" ]; then
		echo "error: ${TARGET} has commits that are on no remote branch (push first or use --force)." >&2
		exit 1
	fi
fi

# Stop dev servers (uvicorn, vite, workers) running inside the worktree.
for proc in /proc/[0-9]*; do
	pid="${proc#/proc/}"
	cwd="$(readlink "${proc}/cwd" 2>/dev/null || true)"
	if [ "${pid}" != "$$" ] && [[ "${cwd}" == "${TARGET}" || "${cwd}" == "${TARGET}/"* ]]; then
		kill "${pid}" 2>/dev/null || true
	fi
done

if [ -f "${TARGET}/docker/.env" ]; then
	(
		cd "${TARGET}/docker"
		export COMPOSE_PROFILES=""
		docker compose down -v --remove-orphans
	)
fi

cd "${MAIN_CHECKOUT}"
git worktree remove --force "${TARGET}"
dats_claims_release "${TARGET}"
echo "Removed worktree ${TARGET} (branch kept)."
