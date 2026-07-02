#!/bin/bash

set -e
source .venv/bin/activate

# Install spaCy models
source src/install_spacy_models.sh

# generate the ray spec file
cd src || exit 1
uv run generate_specs.py --spec_out_fp /tmp/spec.yaml || exit 1

# start the ray cluster
ray start --head --dashboard-host '0.0.0.0'

# serve the models
serve run /tmp/spec.yaml
