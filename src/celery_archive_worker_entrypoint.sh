#!/bin/bash

set -e

LOG_LEVEL=${LOG_LEVEL:-debug}
CELERY_ARCHIVE_WORKER_CONCURRENCY=${CELERY_ARCHIVE_WORKER_CONCURRENCY:-1}

poetry run celery -A app.docprepro.archive.preprocess worker -Q archiveQ,celery -l "$LOG_LEVEL" -c "$CELERY_ARCHIVE_WORKER_CONCURRENCY" # TODO Flo: Env vars for parameters
