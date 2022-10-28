#!/bin/bash

# Flo:
#  We (download and) install the spacy models on start-up of the docker container in the following so that the docker image does
#  not grow too large. To avoid downloading the model everytime, it can be mapped into the container with a volume in
#  the docker-compose.

set -e

# assert that ES is healthy!
./test_es.sh

MODEL_ROOT=/spacy_models

mkdir -p $MODEL_ROOT

# Flo: checksums and model names from https://github.com/explosion/spacy-models/releases/
DE_MODEL_BASE=de_core_news_lg
EN_MODEL_BASE=en_core_web_trf
DE_MODEL="${DE_MODEL_BASE}-3.4.0"
EN_MODEL="${EN_MODEL_BASE}-3.4.1"

DE_MODEL_TGZ="${DE_MODEL}.tar.gz"
EN_MODEL_TGZ="${EN_MODEL}.tar.gz"

CHECKSUM_SHA_256_EN_TGZ=cdb170a2651bfa8f72cd2d281cb1e0a52d4abad372dbbcb11d72531ccef10658
CHECKSUM_SHA_256_DE_TGZ=797b0f5d709e5cbc446c70c15b21a20a5af004f49920c6b21ccf89c3f5501600

if [ ! -d "${MODEL_ROOT}/${DE_MODEL}" ]; then
  wget -q -P ${MODEL_ROOT} "https://github.com/explosion/spacy-models/releases/download/${DE_MODEL}/${DE_MODEL_TGZ}"
  if [ ! "$(sha256sum ${MODEL_ROOT}/${DE_MODEL_TGZ} | awk '{print$1}')" == "${CHECKSUM_SHA_256_DE_TGZ}" ]; then
    echo "spaCy model '${DE_MODEL}' downloaded is corrupt!"
    exit 1
  fi
  tar -xzf ${MODEL_ROOT}/${DE_MODEL_TGZ} -C ${MODEL_ROOT} --strip-components=2 ${DE_MODEL}/${DE_MODEL_BASE}/${DE_MODEL}
  rm ${MODEL_ROOT}/${DE_MODEL_TGZ}
else
  echo "spaCy model '${DE_MODEL}' already installed!"
fi

if [ ! -d "${MODEL_ROOT}/${EN_MODEL}" ]; then
  wget -q -P ${MODEL_ROOT} "https://github.com/explosion/spacy-models/releases/download/${EN_MODEL}/${EN_MODEL_TGZ}"
  if [ ! "$(sha256sum ${MODEL_ROOT}/${EN_MODEL_TGZ} | awk '{print$1}')" == "${CHECKSUM_SHA_256_EN_TGZ}" ]; then
    echo "spaCy model '${EN_MODEL}' downloaded is corrupt!"
    exit 1
  fi
  tar -xzf ${MODEL_ROOT}/${EN_MODEL_TGZ} -C ${MODEL_ROOT} --strip-components=2 ${EN_MODEL}/${EN_MODEL_BASE}/${EN_MODEL}
  rm ${MODEL_ROOT}/${EN_MODEL_TGZ}
else
  echo "spaCy model '${EN_MODEL}' already installed!"
fi

LOG_LEVEL=${LOG_LEVEL:-debug}
CELERY_TEXT_WORKER_CONCURRENCY=${CELERY_TEXT_WORKER_CONCURRENCY:-1}

if [ "$CELERY_TEXT_WORKER_CONCURRENCY" -le 1 ]; then
  celery -A app.docprepro.text.preprocess worker -Q textQ,celery -l "$LOG_LEVEL" -P solo
else
  celery -A app.docprepro.text.preprocess worker -Q textQ,celery -l "$LOG_LEVEL" -c "$CELERY_TEXT_WORKER_CONCURRENCY"
fi
