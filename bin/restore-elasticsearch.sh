#!/bin/bash

# Ensure that the script is run from the root directory of the project
if [ ! -d ".git" ]; then
	echo "This script must be run from the root directory of the project."
	exit 1
fi

cd docker || exit

# Ensure that the 'my_repository' repository exists
REPO_STATUS=$(docker compose -f compose.yml -f compose.production.yml exec -T elasticsearch curl -s -o /dev/null -w "%{http_code}" -X POST "http://localhost:9200/_snapshot/my_repository/_verify?pretty")
if [ "$REPO_STATUS" -eq 404 ]; then
	echo "Repository 'my_repository' does not exist. Exiting..."
	exit 1
fi

# Get the list of snapshots
SNAPSHOT_LIST=$(docker compose -f compose.yml -f compose.production.yml exec -T elasticsearch curl -s -X GET "http://localhost:9200/_snapshot/my_repository/*?verbose=false")

# Display the snapshot names to the user
echo "Available snapshots:"
echo "$SNAPSHOT_LIST" | grep -o '"snapshot":"[^"]*"' | awk -F':' '{print $2}' | tr -d '"'

# Prompt the user to select a snapshot
while true; do
	read -p "Enter the name of the snapshot to restore (or type 'exit' to quit): " SNAPSHOT_NAME
	if [ "$SNAPSHOT_NAME" = "exit" ]; then
		echo "Exiting..."
		exit 0
	fi
	if echo "$SNAPSHOT_LIST" | grep -q "\"snapshot\":\"$SNAPSHOT_NAME\""; then
		break
	else
		echo "Invalid snapshot name. Please try again."
	fi
done

# Display all information about the selected snapshot
SNAPSHOT_INFO=$(docker compose -f compose.yml -f compose.production.yml exec -T elasticsearch curl -s -X GET "http://localhost:9200/_snapshot/my_repository/$SNAPSHOT_NAME?verbose=false")
echo "Snapshot information:"
echo "$SNAPSHOT_INFO" | jq .

# Prompt the user to confirm the restoration
while true; do
	read -p "Do you want to continue with the restoration? (yes/no): " CONFIRM
	case $CONFIRM in
	[Yy]*) break ;;
	[Nn]*)
		echo "Restoration aborted."
		exit 0
		;;
	*) echo "Please answer yes or no." ;;
	esac
done

# Restore the selected snapshot
# 1) Delete all indices
docker compose -f compose.yml -f compose.production.yml exec -T elasticsearch curl -s -X DELETE "http://localhost:9200/dats_*"
# 2) Restore the selected snapshot
docker compose -f compose.yml -f compose.production.yml exec -T elasticsearch curl -s -X POST "http://localhost:9200/_snapshot/my_repository/$SNAPSHOT_NAME/_restore" -H 'Content-Type: application/json' -d '{
  "indices": "dats_*"
}'
# 3) Wait for the cluster to be green (healty)
CLUSTER_STATUS=$(docker compose -f compose.yml -f compose.production.yml exec -T elasticsearch curl -s -X GET "http://localhost:9200/_cluster/health" | jq -r '.status')
echo ""
echo "Waiting for the cluster to be green..."
echo "Current cluster status: $CLUSTER_STATUS"
while [ "$CLUSTER_STATUS" != "green" ]; do
	sleep 5
	CLUSTER_STATUS=$(docker compose -f compose.yml -f compose.production.yml exec -T elasticsearch curl -s -X GET "http://localhost:9200/_cluster/health" | jq -r '.status')
	echo "Current cluster status: $CLUSTER_STATUS"
done

echo "Elasticsearch snapshot restored successfully with snapshot name: $SNAPSHOT_NAME."
