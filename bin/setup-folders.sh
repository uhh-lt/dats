#!/bin/sh
cd "$(dirname "$0}")" || exit
mkdir -p ../docker/backend_repo
mkdir -p ../docker/api_cache
mkdir -p ../docker/rq_cache
mkdir -p ../docker/ollama_cache
mkdir -p ../docker/ray_cache
chmod 777 ../docker/ray_cache

# for production
mkdir -p ../docker/elasticsearch_data
mkdir -p ../docker/pg_data
mkdir -p ../docker/rabbitmq_data
mkdir -p ../docker/redis_data
mkdir -p ../docker/weaviate_data

# for production monitoring (kuma)
mkdir -p ../docker/mariadb_data
mkdir -p ../docker/kuma_data
chmod 777 ../docker/kuma_data

# for backups
mkdir -p ../backups/weaviate
mkdir -p ../backups/elasticsearch
mkdir -p ../backups/postgres
mkdir -p ../backups/repo
