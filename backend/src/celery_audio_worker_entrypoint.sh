#!/bin/bash

set -e

# assert that ES is healthy!
./test_es.sh

MODEL_ROOT=/models_cache
export TRANSFORMERS_CACHE="$MODEL_ROOT"
export TORCH_HOME="$MODEL_ROOT"

mkdir -p $MODEL_ROOT

LOG_LEVEL=${LOG_LEVEL:-debug}
CELERY_AUDIO_WORKER_CONCURRENCY=${CELERY_AUDIO_WORKER_CONCURRENCY:-1}

if [ "$CELERY_AUDIO_WORKER_CONCURRENCY" -le 1 ]; then
  celery -A app.docprepro.audio.preprocess worker -Q audioQ,celery -l "$LOG_LEVEL" -P solo
else
  celery -A app.docprepro.audio.preprocess worker -Q audioQ,celery -l "$LOG_LEVEL" -c "$CELERY_AUDIO_WORKER_CONCURRENCY"
fi
