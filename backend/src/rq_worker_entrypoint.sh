#!/bin/bash

set -e
source .venv/bin/activate

DEVICE=${1:-cpu}
python src/worker.py work "$DEVICE"
