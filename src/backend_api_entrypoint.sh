#!/bin/sh

set -e

LOG_LEVEL=${LOG_LEVEL:-debug}
API_PORT=${API_PORT:-5000}

# assert that ES is healthy!
chmod +x ./test_es.sh
sh ./test_es.sh

poetry run uvicorn --reload --log-level "$LOG_LEVEL" --port "$API_PORT" --host "0.0.0.0" main:app
