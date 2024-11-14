#!/bin/bash

cd ~/dats_prod/docker || exit

docker compose down

git pull

# update .env file
cp .env.example .env
sed -i 's/COMPOSE_PROJECT_NAME=demo/COMPOSE_PROJECT_NAME=prod-dats/' .env
sed -i 's/131/101/g' .env
sed -i "s/JWT_SECRET=/JWT_SECRET=$(pwgen 32 1)/" .env
sed -i "s/UID=121/UID=$(id -u)/" .env
sed -i "s/GID=126/GID=$(id -g)/" .env

# pull & start docker containers
docker compose pull
docker compose up -f compose.yml -f compose.production.yml --wait
