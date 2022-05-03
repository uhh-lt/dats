#!/bin/bash

set -e

MODEL_ROOT=/image_models

mkdir -p $MODEL_ROOT

LOG_LEVEL=${LOG_LEVEL:-debug}
CONCURRENCY=${CONCURRENCY:-1}

poetry run celery -A app.docprepro.image.preprocess worker -Q imageQ,celery -l "$LOG_LEVEL" -c "$CONCURRENCY" # TODO Flo: Env vars for parameters
