#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

# Stop frontend and backend, so that no changes can be made during backup
cd ~/dats_prod/docker || exit
docker compose -f compose.yml -f compose.production.yml stop dats-frontend dats-backend-api

# Create backups
cd ~/dats_prod || exit
./bin/backup-postgres.sh
./bin/backup-repo.sh
./bin/backup-elasticsearch.sh
./bin/backup-weaviate.sh

# Stop all containers
cd ~/dats_prod/docker || exit
docker compose -f compose.yml -f compose.production.yml down
docker compose -f compose.vllm.yml down
docker compose -f compose.ray.yml down

# Pull latest changes
git switch main
git pull

# update .env file
cd ~/dats_prod || exit
./bin/setup-envs.sh --project_name prod-dats --port_prefix 101

# pull & start docker containers
cd ~/dats_prod/docker || exit
docker compose -f compose.vllm.yml pull
docker compose -f compose.vllm.yml up --wait
docker compose -f compose.ray.yml pull
docker compose -f compose.ray.yml up --wait
docker compose -f compose.yml -f compose.production.yml pull
docker compose -f compose.yml -f compose.production.yml up --wait
