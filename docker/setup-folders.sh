#!/bin/sh
cd "$(dirname "$0}")"
mkdir -p backend_repo
mkdir -p models_cache
mkdir -p spacy_models
mkdir -p numba_cache
mkdir -p ollama_cache
mkdir -p ../backups/weaviate
mkdir -p ../backups/elasticsearch
