#!/bin/bash

set -e

# Install spaCy models
source install_spacy_models.sh

# generate the ray spec file
python generate_specs.py --set_http_port $RAY_PORT || exit 1

# serve the models
serve run spec.yaml
