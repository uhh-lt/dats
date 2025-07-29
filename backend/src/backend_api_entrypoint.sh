#!/bin/bash

set -e
source .venv/bin/activate

LOG_LEVEL=${LOG_LEVEL:-debug}
API_PORT=${API_PORT:-5500}
API_WORKERS=${API_WORKERS:-10}

uvicorn --log-level "${LOG_LEVEL}" --port "${API_PORT}" --host "0.0.0.0" --workers " ${API_WORKERS}" main:app
