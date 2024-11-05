#!/bin/bash

cd ~/dats_prod/docker || exit

docker compose down

git pull

# update .env file
cp .env.example .env
sed -i 's/COMPOSE_PROJECT_NAME=demo/COMPOSE_PROJECT_NAME=prod-dats/' .env
sed -i 's/CELERY_DEBUG_PORT=45678/CELERY_DEBUG_PORT=10178/' .env
sed -i 's/131/101/g' .env

# pull & start docker containers
docker compose pull
docker compose up -d
