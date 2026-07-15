#!/bin/bash
set -e

python src/setup.py

LOG_LEVEL=${LOG_LEVEL:-info}
API_WORKERS=${API_WORKERS:-10}

uvicorn --log-level "${LOG_LEVEL}" --port 5500 --host "0.0.0.0" --workers " ${API_WORKERS}" main:app
