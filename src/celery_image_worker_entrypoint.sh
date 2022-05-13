#!/bin/bash

set -e

# assert that ES is healthy!
chmod +x ./test_es.sh
bash ./test_es.sh

MODEL_ROOT=/image_models

mkdir -p $MODEL_ROOT

LOG_LEVEL=${LOG_LEVEL:-debug}
CONCURRENCY=${CONCURRENCY:-1}

poetry run celery -A app.docprepro.image.preprocess worker -Q imageQ,celery -l "$LOG_LEVEL" -c "$CONCURRENCY" # TODO Flo: Env vars for parameters
