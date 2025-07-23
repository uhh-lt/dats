#!/bin/bash

set -e
source ../.venv/bin/activate

export OMP_NUM_THREADS=1
export MKL_NUM_THREADS=1

LOG_LEVEL=${LOG_LEVEL:-debug}
CELERY_BACKGROUND_JOBS_WORKER_CONCURRENCY=${CELERY_BACKGROUND_JOBS_WORKER_CONCURRENCY:-1}
CELERY_DEBUG_MODE=${CELERY_DEBUG_MODE:-0}

if [ "$CELERY_DEBUG_MODE" -eq 1 ]; then
  echo "Running celery in debug mode!"
  python -m debugpy --listen 0.0.0.0:6900 -m celery -A core.celery.background_jobs.tasks worker -Q bgJobsQ,celery -l "$LOG_LEVEL" -c 1 --without-gossip --without-mingle --without-heartbeat
else
  celery -A core.celery.background_jobs.tasks worker -Q bgJobsQ,celery -P threads -l "$LOG_LEVEL" -c "$CELERY_BACKGROUND_JOBS_WORKER_CONCURRENCY" --without-gossip --without-mingle --without-heartbeat
fi
