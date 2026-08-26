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

# 1) Start backup process
docker compose -f compose.yml -f compose.production.yml exec -i weaviate sh -c "wget --header='Content-Type: application/json' --post-data='{
     \"id\": \"$BACKUP_NAME\"
    }' -O- http://localhost:8080/v1/backups/filesystem"
echo "Started weaviate data backup with ID: $BACKUP_NAME."

sleep 10

# 2) Check status of the backup operation in a loop
while true; do
	STATUS=$(docker compose -f compose.yml -f compose.production.yml exec -i weaviate sh -c "wget -qO- http://localhost:8080/v1/backups/filesystem/$BACKUP_NAME | grep -o '\"status\":\"[^\"]*\"' | awk -F':' '{print $2}' | tr -d '\"'")
	echo "$STATUS"
	if [ "$STATUS" = "status:SUCCESS" ] || [ "$STATUS" = "status:FAILED" ]; then
		break
	fi
	sleep 10
done
echo "Weaviate backup successful! Backup $BACKUP_NAME completed with $STATUS"
