#!/bin/sh
cd "$(dirname "$0}")" || exit
mkdir -p ../docker/backend_repo
mkdir -p ../docker/celery_cache
mkdir -p ../docker/ollama_cache
mkdir -p ../docker/ray_cache
chmod 777 ../docker/ray_cache

# for production
mkdir -p ../docker/elasticsearch_data
mkdir -p ../docker/pg_data
mkdir -p ../docker/rabbitmq_data
mkdir -p ../docker/redis_data
mkdir -p ../docker/weaviate_data

# for backups
mkdir -p ../backups/weaviate
mkdir -p ../backups/elasticsearch
mkdir -p ../backups/postgres
mkdir -p ../backups/repo
