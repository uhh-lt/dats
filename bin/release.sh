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

cd backend
make update_version VERSION="$1"

read -p "Please restart the backend to make sure its OpenAPI spec is up to date. Afterwards, press any key to continue. " -n 1 -r

cd ../frontend
npm run generate

cd ..
git add backend/src/configs/version.yaml frontend/package.json frontend/src/openapi.json
git commit -m "Release v$1"
git tag v"$1"
git push
git push --tags
