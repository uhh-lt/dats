#!/bin/bash

# Ensure that the script is run from the root directory of the project
if [ ! -d ".git" ]; then
    echo "This script must be run from the root directory of the project."
    exit 1
fi

# Ensure that the directory backups/elasticsearch exists
if [ ! -d "backups/elasticsearch" ]; then
    mkdir -p backups/elasticsearch
fi

cd docker || exit

# Create the 'my_repository' repo (if it does not exist)
REPO_STATUS=$(docker compose -f compose.yml -f compose.production.yml exec -T elasticsearch curl -s -o /dev/null -w "%{http_code}" -X POST "http://localhost:9200/_snapshot/my_repository/_verify?pretty")
if [ "$REPO_STATUS" -eq 404 ]; then
    echo "Repository 'my_repository' does not exist. Creating repository..."
    docker compose -f compose.yml -f compose.production.yml exec -T elasticsearch curl -X PUT "http://localhost:9200/_snapshot/my_repository?pretty" -H 'Content-Type: application/json' -d '{
        "type": "fs",
        "settings": {
            "location": "/mount/backups",
            "compress": true
        }
    }'
    echo "Repository 'my_repository' created successfully."
else
    echo "Repository 'my_repository' already exists."
fi

# Create a snapshot of the elasticsearch data
SNAPSHOT_NAME="snapshot_$(date +%Y_%m_%d_%H_%M)"
docker compose -f compose.yml -f compose.production.yml exec -T elasticsearch curl -X PUT "http://localhost:9200/_snapshot/my_repository/$SNAPSHOT_NAME?wait_for_completion=true&pretty"

# Wait for the cluster to be green (healty)
CLUSTER_STATUS=$(docker compose -f compose.yml -f compose.production.yml exec -T elasticsearch curl -s -X GET "http://localhost:9200/_cluster/health" | jq -r '.status')
echo "Waiting for the cluster to be green..."
echo "Current cluster status: $CLUSTER_STATUS"
while [ "$CLUSTER_STATUS" != "green" ]; do
    sleep 5
    CLUSTER_STATUS=$(docker compose -f compose.yml -f compose.production.yml exec -T elasticsearch curl -s -X GET "http://localhost:9200/_cluster/health" | jq -r '.status')
    echo "Current cluster status: $CLUSTER_STATUS"
done

echo "Elasticsearch snapshot created successfully with snapshot name: $SNAPSHOT_NAME."
