#!/usr/bin/env bash
# Point the DATS environment at the hosted HCDS services on the ltdwise server
# (vLLM LLM, vLLM embeddings, Ray, Docling) instead of running them locally.
#
# Run this AFTER setup-envs.sh has generated the .env files:
#   ./bin/setup/setup-envs.sh --project_name <name> --port_prefix <prefix>
#   ./bin/setup/setup-ltdwise.sh
#
# Ensure that the script is run from the root directory of the project
if [ ! -e ".git" ]; then
	echo "This script must be run from the root directory of the project."
	exit 1
fi

set -euo pipefail

for env_file in backend/.env docker/.env; do
	if [ ! -f "${env_file}" ]; then
		echo "error: ${env_file} not found; run ./bin/setup/setup-envs.sh first" >&2
		exit 1
	fi
done

# LLM provider (HCDS LLM gateway)
sed -i 's|^LLM_PROVIDER_URL=.*|LLM_PROVIDER_URL=https://llm.api.hcds.uni-hamburg.de/v1|' backend/.env docker/.env

# vLLM embedding provider (hosted on ltdwise)
sed -i 's|^EMB_PROVIDER_URL=.*|EMB_PROVIDER_URL=http://ltdwise.informatik.uni-hamburg.de:10137/v1|' backend/.env docker/.env

# Ray (hosted on ltdwise)
sed -i 's/^RAY_HOST=.*/RAY_HOST=ltdwise.informatik.uni-hamburg.de/' backend/.env docker/.env
sed -i 's/^RAY_PORT=.*/RAY_PORT=10130/' backend/.env docker/.env

# Docling (hosted on ltdwise)
sed -i 's/^DOCLING_HOST=.*/DOCLING_HOST=ltdwise.informatik.uni-hamburg.de/' backend/.env docker/.env
sed -i 's/^DOCLING_PORT=.*/DOCLING_PORT=10139/' backend/.env docker/.env

echo "ltdwise environment configured: backend/.env and docker/.env now point at the hosted HCDS services."
