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

if [ "${1:-}" = "" ]; then
	echo "Please provide a version parameter, e.g. release.sh 0.0.3"
	exit 1
fi

if [[ ! "$1" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
	echo "Invalid version '$1'. Please use semantic version format, e.g. 1.2.3."
	exit 1
fi

if [ "$(git branch --show-current)" != "main" ]; then
	echo "Please run this script from the main branch."
	exit 1
fi

if [ "$(git diff-index --cached HEAD --)" ]; then
	echo "There are staged changes. Please run this script in a clean working directory."
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
read -p "Please restart the backend to make sure its OpenAPI spec is up to date. Afterwards, press any key to continue. " -n 1 -r

# update frontend version
cd ../frontend
npm run update-api && npm run generate-api && npm run update-version

cd ..
git add backend/configs/version.yaml backend/pyproject.toml backend/uv.lock docker/.env.example frontend/package.json frontend/package-lock.json frontend/src/openapi.json frontend/src/api/core/OpenAPI.ts
git commit -m "Release v$1"
git push

echo "Release commit pushed. The v$1 tag will be created automatically after all required checks succeed."
