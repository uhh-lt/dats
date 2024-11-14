#!/bin/bash

# Ensure that the script is run from the root directory of the project
if [ ! -d ".git" ]; then
    echo "This script must be run from the root directory of the project."
    exit 1
fi

# Ensure that the docker/.env file exists
if [ ! -f "docker/.env" ]; then
    echo "The docker/.env file does not exist. Please create it by copying the docker/.env.example file."
    exit 1
fi

# Ensure that the directory backups/postgres exists
if [ ! -d "backups/postgres" ]; then
    mkdir -p backups/postgres
fi

# Load environment variables from the docker/.env file
set -o allexport
source docker/.env

# Create a dump of the database
docker compose -f compose.yml -f compose.production.yml exec -e PGPASSWORD="$POSTGRES_PASSWORD" -T postgres pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" > "backups/postgres/dump_$(date +%Y_%m_%d_%H_%M).sql"
echo "Database dump created successfully."
