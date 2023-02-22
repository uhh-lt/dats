#!/bin/bash

set -e

# assert that ES is healthy!
./test_es.sh

MODEL_ROOT=/models_cache
export TRANSFORMERS_CACHE="$MODEL_ROOT"
export TORCH_HOME="$MODEL_ROOT"

mkdir -p $MODEL_ROOT

LOG_LEVEL=${LOG_LEVEL:-debug}
CELERY_VIDEO_WORKER_CONCURRENCY=${CELERY_VIDEO_WORKER_CONCURRENCY:-1}

if [ "$CELERY_VIDEO_WORKER_CONCURRENCY" -le 1 ]; then
  celery -A app.docprepro.video.preprocess worker -Q videoQ,celery -l "$LOG_LEVEL" -P solo
else
  celery -A app.docprepro.video.preprocess worker -Q videoQ,celery -l "$LOG_LEVEL" -c "$CELERY_VIDEO_WORKER_CONCURRENCY"
fi
