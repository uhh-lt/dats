#!/bin/bash

# Flo:
#  We (download and) install the spacy models on start-up of the docker container in the following so that the docker image does
#  not grow too large. To avoid downloading the model everytime, it can be mapped into the container with a volume in
#  the docker-compose.

set -e

MODEL_ROOT=/spacy_models

mkdir -p $MODEL_ROOT

# Flo: checksums and model names from https://github.com/explosion/spacy-models/releases/
DE_MODEL=de_core_news_lg-3.2.0
EN_MODEL=en_core_web_trf-3.2.0

DE_MODEL_WHL="${DE_MODEL}-py3-none-any.whl"
EN_MODEL_WHL="${EN_MODEL}-py3-none-any.whl"

CHECKSUM_SHA_256_EN_WHL=c6be2ccfc1c30edb5690f5e2baecf2a0cabd23529c0abb84c67aedcf0dac86a2
CHECKSUM_SHA_256_DE_WHL=90f927a648949d13289ccc3b6b6967d16507b8836a32d2780d20863f26a8fa4e

# Flo: checksum must match or file is corrupt
if [ -f "${MODEL_ROOT}/${DE_MODEL_WHL}" ] && [ ! "$(shasum -a 256 ${MODEL_ROOT}/${DE_MODEL_WHL} | awk '{print$1}')" == "${CHECKSUM_SHA_256_DE_WHL}" ]; then
  echo "spaCy model '${DE_MODEL}' is corrupt! Removing existing model!"
  rm "${MODEL_ROOT}/${DE_MODEL_WHL}"
fi

if [ ! -f "${MODEL_ROOT}/${DE_MODEL_WHL}" ]; then
  wget -P ${MODEL_ROOT} "https://github.com/explosion/spacy-models/releases/download/${DE_MODEL}/${DE_MODEL_WHL}" &
  WGET_DE_PID=$!
else
  echo "spaCy model '${DE_MODEL}' already downloaded!"
fi

# Flo: checksum must match or file is corrupt
if [ -f "${MODEL_ROOT}/${EN_MODEL_WHL}" ] && [ ! "$(shasum -a 256 ${MODEL_ROOT}/${EN_MODEL_WHL} | awk '{print$1}')" == "${CHECKSUM_SHA_256_EN_WHL}" ]; then
  echo "spaCy model '${EN_MODEL}' is corrupt! Removing existing model!"
  rm -f "${MODEL_ROOT}/${EN_MODEL_WHL}"
fi

if [ ! -f ${MODEL_ROOT}/${EN_MODEL_WHL} ]; then
  wget -P ${MODEL_ROOT} "https://github.com/explosion/spacy-models/releases/download/${EN_MODEL}/${EN_MODEL_WHL}" &
  WGET_EN_PID=$!
else
  echo "spaCy model '${EN_MODEL}' already downloaded!"
fi

# Flo: Since we download the models in the background, we have to wait for them
wait $WGET_DE_PID
wait $WGET_EN_PID

# Flo: Now start installing
if [ ! -d /usr/local/lib/python3.9/site-packages/de_core_news_lg ]; then
  pip install "${MODEL_ROOT}/${DE_MODEL_WHL}"
fi
if [ ! -d /usr/local/lib/python3.9/site-packages/en_core_web_trf ]; then
  pip install "${MODEL_ROOT}/${EN_MODEL_WHL}"
fi

LOG_LEVEL=${LOG_LEVEL:-debug}

poetry run celery -A app.docprepro.process worker -l "$LOG_LEVEL" -c 1 # TODO Flo: Env vars for parameters
