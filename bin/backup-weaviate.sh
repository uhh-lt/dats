#!/bin/bash

# Ensure that the script is run from the root directory of the project
if [ ! -d ".git" ]; then
    echo "This script must be run from the root directory of the project."
    exit 1
fi

# Ensure that the directory backups/weaviate exists
if [ ! -d "backups/weaviate" ]; then
    mkdir -p backups/weaviate
fi

cd docker || exit

BACKUP_NAME="backup_$(date +%Y_%m_%d_%H_%M)"
docker compose -f compose.yml -f compose.production.yml exec -i weaviate sh -c "wget --header='Content-Type: application/json' --post-data='{
     \"id\": \"$BACKUP_NAME\"
    }' -O- http://localhost:8080/v1/backups/filesystem"
echo "Weaviate data backup created successfully with ID: $BACKUP_NAME."
