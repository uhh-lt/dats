#!/bin/bash

set -e

source ../.venv/bin/activate

LOG_LEVEL=${LOG_LEVEL:-debug}
API_PORT=${API_PORT:-5500}
API_PRODUCTION_MODE=${API_PRODUCTION_MODE:--1}
API_WORKERS=${API_WORKERS:-10}

if [ "${API_PRODUCTION_MODE}" -ge 1 ]; then
  # start api in production mode without hot reload and only X worker
  uvicorn --log-level "${LOG_LEVEL}" --port "${API_PORT}" --host "0.0.0.0" --workers "${API_WORKERS}" main:app
else
  # start api in dev mode with hot reload and only 1 worker
  uvicorn --reload --log-level "${LOG_LEVEL}" --port "${API_PORT}" --host "0.0.0.0" main:app
fi
