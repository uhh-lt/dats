#!/bin/bash

set -e

LOG_LEVEL=${LOG_LEVEL:-debug}
CONCURRENCY=${CONCURRENCY:-1}

poetry run celery -A app.docprepro.archive.preprocess worker -Q archiveQ,celery -l "$LOG_LEVEL" -c "$CONCURRENCY" # TODO Flo: Env vars for parameters
