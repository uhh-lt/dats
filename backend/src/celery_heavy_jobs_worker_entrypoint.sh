#!/bin/bash

set -e

LOG_LEVEL=${LOG_LEVEL:-debug}
CELERY_HEAVY_JOBS_WORKER_CONCURRENCY=${CELERY_HEAVY_JOBS_WORKER_CONCURRENCY:-1}

if [ "$CELERY_IMAGE_WORKER_CONCURRENCY" -le 1 ]; then
  celery -A app.docprepro.heavy_jobs.tasks worker -Q heavyjobsQ,celery -l "$LOG_LEVEL" -P solo
else
  celery -A app.docprepro.heavy_jobs.tasks worker -Q heavyjobsQ,celery -l "$LOG_LEVEL" -c "$CELERY_HEAVY_JOBS_WORKER_CONCURRENCY"
fi
