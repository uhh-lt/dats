#!/bin/bash

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

# Pull latest changes
git pull

# update .env file
cd ~/dats_prod || exit
./bin/setup-envs.sh --project_name prod-dats --port_prefix 101

# pull & start docker containers
cd ~/dats_prod/docker || exit
docker compose pull
docker compose -f compose.yml -f compose.production.yml up --wait
