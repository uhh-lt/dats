#!/bin/bash

set -euo pipefail

if [ "${1:-}" = "" ]; then
	echo "Please provide a version parameter, e.g. release.sh 0.0.3"
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
git add backend/configs/version.yaml backend/pyproject.toml backend/uv.lock docker/.env.example frontend/package.json frontend/package-lock.json frontend/src/openapi.json frontend/src/api/openapi/core/OpenAPI.ts
git commit -m "Release v$1"
git tag v"$1"
git push
git push --tags
