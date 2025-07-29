#!/bin/bash

set -e
source .venv/bin/activate

export OMP_NUM_THREADS=1
export MKL_NUM_THREADS=1

LOG_LEVEL=${LOG_LEVEL:-debug}
CELERY_BACKGROUND_JOBS_WORKER_CONCURRENCY=${CELERY_BACKGROUND_JOBS_WORKER_CONCURRENCY:-1}

celery -A core.celery.background_jobs.tasks worker -Q bgJobsQ,celery -P threads -l "$LOG_LEVEL" -c "$CELERY_BACKGROUND_JOBS_WORKER_CONCURRENCY" --without-gossip --without-mingle --without-heartbeat
