#!/bin/bash

set -e

# assert that ES is healthy!
./test_es.sh

export OMP_NUM_THREADS=1
export MKL_NUM_THREADS=1

LOG_LEVEL=${LOG_LEVEL:-debug}
CELERY_BACKGROUND_JOBS_WORKER_CONCURRENCY=${CELERY_BACKGROUND_JOBS_WORKER_CONCURRENCY:-1}

if [ "$CELERY_DEBUG_MODE" -eq 1 ]; then
  echo "Running celery in debug mode!"
  pip install debugpy -t /tmp && python /tmp/debugpy --listen 0.0.0.0:6900 -m celery -A app.celery.background_jobs.tasks worker -Q bgJobsQ,celery -l "$LOG_LEVEL" -P solo
elif [ "$CELERY_BACKGROUND_JOBS_WORKER_CONCURRENCY" -le 1 ]; then
  echo "NEVER USE THIS WORKER FOR GPU JOBS!"
  celery -A app.celery.background_jobs.tasks worker -Q bgJobsQ,celery -l "$LOG_LEVEL" -P solo
else
  celery -A app.celery.background_jobs.tasks worker -Q bgJobsQ,celery -l "$LOG_LEVEL" -c "$CELERY_BACKGROUND_JOBS_WORKER_CONCURRENCY"
fi
