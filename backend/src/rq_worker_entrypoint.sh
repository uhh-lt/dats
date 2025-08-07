#!/bin/bash

set -e
source .venv/bin/activate

python src/worker.py work
