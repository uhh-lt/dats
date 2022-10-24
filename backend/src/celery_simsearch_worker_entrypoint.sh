#!/bin/bash

set -e

# assert that ES is healthy!
chmod +x ./test_es.sh
bash ./test_es.sh

MODEL_ROOT=/models_cache
export TRANSFORMERS_CACHE="$MODEL_ROOT"
export TORCH_HOME="$MODEL_ROOT"

mkdir -p $MODEL_ROOT

LOG_LEVEL=${LOG_LEVEL:-debug}

# TODO Flo: handle race conditions for celery multi process in FaissIndexService!
CELERY_SIMSERACH_WORKER_CONCURRENCY=1 #${CELERY_SIMSERACH_WORKER_CONCURRENCY:-1}

poetry run celery -A app.docprepro.simsearch.preprocess worker -Q simsearchQ,celery -l "$LOG_LEVEL" -c "$CELERY_SIMSERACH_WORKER_CONCURRENCY" # TODO Flo: Env vars for parameters
