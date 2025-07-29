#!/bin/bash

# Ensure that the script is run from the root directory of the project
if [ ! -d ".git" ]; then
	echo "This script must be run from the root directory of the project."
	exit 1
fi

# Parse command line arguments
while [[ "$#" -gt 0 ]]; do
	case $1 in
	--backup_name)
		BACKUP_NAME="$2"
		shift
		;;
	--help)
		echo "Usage: $0 --backup_name <backup_name>"
		exit 0
		;;
	*)
		echo "Unknown parameter passed: $1"
		exit 1
		;;
	esac
	shift
done

# Ensure that the --backup_name parameter is provided
if [ -z "$BACKUP_NAME" ]; then
	echo "The --backup_name parameter is required."
	exit 1
fi

# Ensure that the backup folder exists in backups/weaviate
if [ ! -d "backups/weaviate/$BACKUP_NAME" ]; then
	echo "The backup folder $BACKUP_NAME does not exist in backups/weaviate."
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
# 1) Make sure that only the weaviate container is running
echo "Stopping all containers..."
docker compose -f compose.yml -f compose.production.yml down
echo "Starting the weaviate container..."
docker compose -f compose.yml -f compose.production.yml up --wait weaviate
# 2) Restore with the backup
echo "Restoring the database..."
# docker-compose -f compose.yml -f compose.production.yml exec weaviate sh -c "apk add --no-cache curl"
docker compose -f compose.yml -f compose.production.yml exec -i weaviate sh -c "wget --header='Content-Type: application/json' --post-data='{
     \"id\": \"$BACKUP_NAME\"
    }' -O- http://localhost:8080/v1/backups/filesystem/$BACKUP_NAME/restore"
# 3) Check status of the restore operation in a loop
while true; do
	STATUS=$(docker compose -f compose.yml -f compose.production.yml exec -i weaviate sh -c "wget -qO- http://localhost:8080/v1/backups/filesystem/$BACKUP_NAME/restore | grep -o '\"status\":\"[^\"]*\"' | awk -F':' '{print $2}' | tr -d '\"'")
	echo "$STATUS"
	if [ "$STATUS" = "status:SUCCESS" ] || [ "$STATUS" = "status:FAILED" ]; then
		break
	fi
	sleep 10
done
echo "Restore operation completed with $STATUS"
