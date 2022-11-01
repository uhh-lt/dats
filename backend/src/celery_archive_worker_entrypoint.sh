#!/bin/bash

set -e

LOG_LEVEL=${LOG_LEVEL:-debug}
CELERY_ARCHIVE_WORKER_CONCURRENCY=${CELERY_ARCHIVE_WORKER_CONCURRENCY:-1}

if [ "$CELERY_IMAGE_WORKER_CONCURRENCY" -le 1 ]; then
  celery -A app.docprepro.archive.preprocess worker -Q archiveQ,celery -l "$LOG_LEVEL" -P solo
else
  celery -A app.docprepro.archive.preprocess worker -Q archiveQ,celery -l "$LOG_LEVEL" -c "$CELERY_ARCHIVE_WORKER_CONCURRENCY"
fi
