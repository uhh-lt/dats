#!/bin/bash

set -e

LOG_LEVEL=${LOG_LEVEL:-debug}
CELERY_HEAVY_JOBS_WORKER_CONCURRENCY=${CELERY_HEAVY_JOBS_WORKER_CONCURRENCY:-1}

if [ "$CELERY_IMAGE_WORKER_CONCURRENCY" -le 1 ]; then
  pip install debugpy -t /tmp && python /tmp/debugpy --listen 0.0.0.0:6900 -m celery -A app.docprepro.heavy_jobs.preprocess worker -Q heavy_jobsQ,celery -l "$LOG_LEVEL" -P solo
else
  pip install debugpy -t /tmp && python /tmp/debugpy --listen 0.0.0.0:6900 -m celery -A app.docprepro.heavy_jobs.preprocess worker -Q heavy_jobsQ,celery -l "$LOG_LEVEL" -c "$CELERY_HEAVY_JOBS_WORKER_CONCURRENCY"
fi
