#!/bin/bash

set -e
source .venv/bin/activate

export BACKEND_TYPE="worker"

python src/worker.py work
