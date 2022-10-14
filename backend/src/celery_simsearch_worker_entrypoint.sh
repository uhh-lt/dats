#!/bin/bash

set -e

# assert that ES is healthy!
chmod +x ./test_es.sh
bash ./test_es.sh

LOG_LEVEL=${LOG_LEVEL:-debug}
CELERY_SIMSERACH_WORKER_CONCURRENCY=${CELERY_SIMSERACH_WORKER_CONCURRENCY:-1}

poetry run celery -A app.docprepro.simsearch.preprocess worker -Q simsearchQ,celery -l "$LOG_LEVEL" -c "$CELERY_SIMSERACH_WORKER_CONCURRENCY" # TODO Flo: Env vars for parameters
