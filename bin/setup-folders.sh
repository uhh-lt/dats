#!/bin/sh
cd "$(dirname "$0}")" || exit
mkdir -p ../docker/backend_repo
mkdir -p ../docker/models_cache
mkdir -p ../docker/spacy_models
mkdir -p ../docker/numba_cache
mkdir -p ../docker/ollama_cache
mkdir -p ../backups/weaviate
mkdir -p ../backups/elasticsearch
