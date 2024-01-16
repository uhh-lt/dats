#!/bin/bash

set -euxo pipefail

# No matter what, before this script stops,
# always remove any docker containers it created to prevent
# them from lying around unused.
function cleanup() {
	docker stop "dwts-weaviate-testing-$TEST_CONTAINER_ID" >/dev/null
	docker stop "dwts-elasticsearch-testing-$TEST_CONTAINER_ID" >/dev/null
}
trap "cleanup" EXIT

# Read test-specific environment variables from configuration
set -o allexport; [[ -f .env.testing ]] && source .env.testing

# Find the absolute path for the elasticsearch config as that
# is the only thing docker will accept
ELASTICSEARCH_CONFIG=$(realpath -e "$(dirname "${BASH_SOURCE[0]}")/../../docker/elasticsearch.yml")

TEST_CONTAINER_ID=$(date +%s)

# Start a temporary elasticsearch database for testing
docker run --detach \
    --name "dwts-elasticsearch-testing-$TEST_CONTAINER_ID" \
    --publish "$ELASTICSEARCH_TEST_PORT:9200" \
    --mount type=bind,source="$ELASTICSEARCH_CONFIG",destination=/usr/share/elasticsearch/config/elasticsearch.yml \
    --tmpfs /usr/share/elasticsearch/data \
    --env "xpack.security.enabled=false" \
    --env "discovery.type=single-node" \
    --env "ES_JAVA_OPTS=-Xms512m -Xmx512m" \
    docker.elastic.co/elasticsearch/elasticsearch:8.11.1

# Start a temporary weaviate database for testing
docker run --detach \
    --name "dwts-weaviate-testing-$TEST_CONTAINER_ID" \
    --publish "$WEAVIATE_TEST_PORT:8080" \
    --tmpfs /var/lib/weaviate \
    --env "QUERY_DEFAULTS_LIMIT=25" \
    --env "AUTHENTICATION_ANONYMOUS_ACCESS_ENABLED=true" \
    --env "PERSISTENCE_DATA_PATH=/var/lib/weaviate" \
    --env "DEFAULT_VECTORIZER_MODULE=none" \
    --env "CLUSTER_HOSTNAME=node1" \
    --env "LOG_LEVEL=info" \
    semitechnologies/weaviate:1.21.3 \
    --host 0.0.0.0 --port 8080 --scheme http

# Override backend connection ports for the new containers
export WEAVIATE_PORT=$WEAVIATE_TEST_PORT
export ES_PORT=$ELASTICSEARCH_TEST_PORT

# Activate the conda environment for testing
ENV_NAME=dwts source _activate_current_env.sh

# Tests will wipe all data; use a temporary repo root
# to protect our development files
REPO_ROOT=$(mktemp -d)
export REPO_ROOT

export PYTHONPATH=.

cd src

# Wait for elasticsearch to start
./test_es.sh

pytest
