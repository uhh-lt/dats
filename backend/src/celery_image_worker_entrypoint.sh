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
CELERY_IMAGE_WORKER_CONCURRENCY=${CELERY_IMAGE_WORKER_CONCURRENCY:-1}

if [ "$CELERY_IMAGE_WORKER_CONCURRENCY" -le 1 ]; then
  celery -A app.docprepro.image.preprocess worker -Q imageQ,celery -l "$LOG_LEVEL" -P solo
else
  celery -A app.docprepro.image.preprocess worker -Q imageQ,celery -l "$LOG_LEVEL" -c "$CELERY_IMAGE_WORKER_CONCURRENCY"
fi
