#!/bin/sh

set -e

LOG_LEVEL=${LOG_LEVEL:-debug}
API_PORT=${API_PORT:-5000}

poetry run uvicorn --reload --log-level "$LOG_LEVEL" --port "$API_PORT" --host "0.0.0.0" main:app
