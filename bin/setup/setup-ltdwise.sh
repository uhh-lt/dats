#!/usr/bin/env bash
# Point the DATS environment at the hosted HCDS services on the ltdwise server
# (vLLM LLM, vLLM embeddings, Ray, Docling) instead of running them locally.
#
# Run this AFTER setup-envs.sh has generated the .env files:
#   ./bin/setup/setup-envs.sh --project_name <name> --port_prefix <prefix>
#   ./bin/setup/setup-ltdwise.sh
#
# Ensure that the script is run from the root directory of the project
if [ ! -d ".git" ]; then
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

# vLLM LLM provider (hosted on hcdsgpu2)
sed -i 's/^LLM_PROVIDER_HOST=.*/LLM_PROVIDER_HOST=hcdsgpu2.informatik.uni-hamburg.de/' backend/.env docker/.env
sed -i 's/^LLM_PROVIDER_PORT=.*/LLM_PROVIDER_PORT=1111/' backend/.env docker/.env

# vLLM embedding provider (hosted on ltdwise)
sed -i 's/^EMB_PROVIDER_HOST=.*/EMB_PROVIDER_HOST=ltdwise.informatik.uni-hamburg.de/' backend/.env docker/.env
sed -i 's/^EMB_PROVIDER_PORT=.*/EMB_PROVIDER_PORT=10137/' backend/.env docker/.env

# Ray (hosted on ltdwise)
sed -i 's/^RAY_HOST=.*/RAY_HOST=ltdwise.informatik.uni-hamburg.de/' backend/.env docker/.env
sed -i 's/^RAY_PORT=.*/RAY_PORT=10130/' backend/.env docker/.env

# Docling (hosted on ltdwise)
sed -i 's/^DOCLING_HOST=.*/DOCLING_HOST=ltdwise.informatik.uni-hamburg.de/' backend/.env docker/.env
sed -i 's/^DOCLING_PORT=.*/DOCLING_PORT=10139/' backend/.env docker/.env

echo "ltdwise environment configured: backend/.env and docker/.env now point at the hosted HCDS services."
