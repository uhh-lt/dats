#!/bin/bash

# Ensure that the script is run from the root directory of the project
if [ ! -d ".git" ]; then
    echo "This script must be run from the root directory of the project."
    exit 1
fi

# Parse command line arguments
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --backup_name) BACKUP_NAME="$2"; shift ;;
        --help)
            echo "Usage: $0 --backup_name <backup_name>"
            exit 0
            ;;
        *)
            echo "Unknown parameter passed: $1"; exit 1;;
    esac
    shift
done

# Ensure that the --backup_name parameter is provided
if [ -z "$BACKUP_NAME" ]; then
    echo "The --backup_name parameter is required."
    exit 1
fi

# Ensure that the backup exists in backups/postgres
if [ ! -f "backups/postgres/$BACKUP_NAME" ]; then
    echo "The backup file $BACKUP_NAME does not exist in backups/postgres."
    exit 1
fi

# Ensure that the docker/.env file exists
if [ ! -f "docker/.env" ]; then
    echo "The docker/.env file does not exist. Please create it by copying the docker/.env.example file."
    exit 1
fi

# Load environment variables from the docker/.env file
set -o allexport
source docker/.env

cd docker || exit

# Restore the database from the backup
# 1) Make sure that only the postgres container is running
echo "Stopping all containers..."
docker compose -f compose.yml -f compose.production.yml down
echo "Starting the postgres container..."
docker compose -f compose.yml -f compose.production.yml up --wait postgres
# 2) Delete the existing database
echo "Dropping the existing database..."
docker compose -f compose.yml -f compose.production.yml exec -T -e PGPASSWORD="$POSTGRES_PASSWORD" postgres dropdb -U "$POSTGRES_USER" "$POSTGRES_DB"
# 3) Create a new database
echo "Creating a new database..."
docker compose -f compose.yml -f compose.production.yml exec -T -e PGPASSWORD="$POSTGRES_PASSWORD" postgres createdb -U "$POSTGRES_USER" "$POSTGRES_DB"
# 4) Restore with the backup
echo "Restoring the database..."
docker compose -f compose.yml -f compose.production.yml exec -T -e PGPASSWORD="$POSTGRES_PASSWORD" postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" < ../backups/postgres/"$BACKUP_NAME"

echo "Done!"
