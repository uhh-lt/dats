#!/bin/sh

cd "$(dirname "$0")" || exit

# Parse arguments
DEVELOPMENT=0
for arg in "$@"; do
	if [ "$arg" = "--development" ]; then
		DEVELOPMENT=1
	fi
done

# repo stores all user-uploaded files
mkdir -p ../docker/backend_repo

# cache directories
mkdir -p ../docker/airflow_cache
mkdir -p ../docker/api_cache
mkdir -p ../docker/rq_cache
mkdir -p ../docker/ollama_cache
mkdir -p ../docker/ray_cache
chmod 777 ../docker/ray_cache

# backup directories
mkdir -p ../backups/weaviate
mkdir -p ../backups/elasticsearch
mkdir -p ../backups/postgres
mkdir -p ../backups/repo

# Do not create production folders in development mode
if [ "$DEVELOPMENT" -eq 0 ]; then
	# in production we use filesystem instead of docker managed volumes
	mkdir -p ../docker/elasticsearch_data
	mkdir -p ../docker/pg_data
	mkdir -p ../docker/rabbitmq_data
	mkdir -p ../docker/redis_data
	mkdir -p ../docker/weaviate_data

	# for production monitoring (kuma)
	mkdir -p ../docker/mariadb_data
	mkdir -p ../docker/kuma_data
	chmod 777 ../docker/kuma_data
fi
