#!/bin/bash

# Creates and pushes a version-bump commit. GitHub Actions performs every remaining
# release step automatically; this script does not create or push the release tag.
#
# Release workflow:
#
# release.sh
#     ↓
# Push release commit to main
#     ↓
# Existing four checks run once (.github/workflows/backend_checks.yml, .github/workflows/frontend_checks.yml, .github/workflows/precommit_checks.yml, .github/workflows/ray_checks.yml)
#     ↓
# Automatic gate observes their results (.github/workflows/release_gate.yml)
#     ↓
# All green? Create tag automatically
# Any failure? Stop—no tag, images, or release
#     ↓
# Build images and create GitHub Release (.github/workflows/release.yml)
#
# Tag Restrictions:
# The active "Validated Release Tags" GitHub ruleset protects tags matching v*:
# - A release tag may only be created when backend-checks, frontend-checks,
#   precommit-checks, and ray-checks succeeded for the tagged commit.
# - Tag updates and deletions are restricted so published releases remain immutable.
# - Do not create release tags manually; .github/workflows/release_gate.yml creates
#   the tag automatically after verifying the corresponding main-branch workflows.

set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/_common.sh"

if [ "${1:-}" = "" ]; then
	echo "Please provide a version parameter, e.g. release.sh 0.0.3"
	exit 1
fi

if [[ ! "$1" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
	echo "Invalid version '$1'. Please use semantic version format, e.g. 1.2.3."
	exit 1
fi

# Works in any worktree: the checkout only has to be the latest origin/main, e.g. after 'git switch --detach origin/main'
git fetch origin main
if [ "$(git rev-parse HEAD)" != "$(git rev-parse origin/main)" ]; then
	echo "Please run this script on the latest origin/main, e.g. after 'git switch --detach origin/main'."
	exit 1
fi

if [ "$(git status --porcelain --untracked-files=no)" ]; then
	echo "There are uncommitted changes. Please run this script in a clean working directory."
	exit 1
fi

# Update .env.example file with the new version
cd docker
sed -i "s/DATS_BACKEND_DOCKER_VERSION=.*/DATS_BACKEND_DOCKER_VERSION=$1/" .env.example
sed -i "s/DATS_RAY_DOCKER_VERSION=.*/DATS_RAY_DOCKER_VERSION=$1/" .env.example
sed -i "s/DATS_FRONTEND_DOCKER_VERSION=.*/DATS_FRONTEND_DOCKER_VERSION=$1/" .env.example

# update backend version
cd ../backend
uv run update_version.py --version $1

# update-api downloads the OpenAPI spec from the running backend, so wait until it serves the new version.
# uvicorn --reload does not watch configs/version.yaml, so the backend has to be restarted.
dats_load_env frontend
: "${FRONTEND_API_URL:?FRONTEND_API_URL is not set in frontend/.env}"
echo "Please restart the backend now. Waiting until ${FRONTEND_API_URL}/openapi.json serves version $1 ..."
served_version=""
for _ in $(seq 1 120); do
	served_version=$(curl -sf --max-time 10 "${FRONTEND_API_URL}/openapi.json" | jq -r '.info.version' || true)
	if [ "$served_version" = "$1" ]; then
		break
	fi
	sleep 5
done
if [ "$served_version" != "$1" ]; then
	echo "The backend did not serve version $1 within 10 minutes (last seen: ${served_version:-none}). Nothing was committed or pushed."
	exit 1
fi
echo "The backend serves version $1."

# update ray version
cd ../ray
uv run update_version.py --version $1

# update frontend version
cd ../frontend
npm run update-api
npm run update-version

cd ..
git add backend/configs/version.yaml backend/pyproject.toml backend/uv.lock ray/pyproject.toml ray/uv.lock docker/.env.example frontend/package.json frontend/package-lock.json frontend/src/openapi.json frontend/src/api/core/OpenAPI.ts
git commit -m "Release v$1"
git push origin HEAD:main

echo "Release commit pushed. The v$1 tag will be created automatically after all required checks succeed."
