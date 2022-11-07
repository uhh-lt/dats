#!/bin/bash

set -e

#  We (download and) install the spacy models on start-up of the docker container in the following so that the docker image does
#  not grow too large. To avoid downloading the model everytime, it can be mapped into the container with a volume in
#  the docker-compose.

MODEL_ROOT=/spacy_models
mkdir -p $MODEL_ROOT

function download_and_install_spacy_model() {
  if [ $# -ne 3 ]; then
    echo "Wrong number of arguments for $0 !"
  fi

  MODEL_BASE=$1
  MODEL=$2
  MODEL_TGZ="${MODEL}.tar.gz"
  CHECKSUM_SHA_256_TGZ=$3

  if [ ! -d "${MODEL_ROOT}/${MODEL}" ]; then
    echo "Downloading spaCy model '${MODEL}' ..."
    wget -q -P "${MODEL_ROOT}" "https://github.com/explosion/spacy-models/releases/download/${MODEL}/${MODEL_TGZ}"
    if [ ! "$(sha256sum ${MODEL_ROOT}/"${MODEL_TGZ}" | awk '{print$1}')" == "${CHECKSUM_SHA_256_TGZ}" ]; then
      echo "spaCy model '${MODEL}' downloaded is corrupt!"
      exit 1
    fi
    echo "Installing spaCy model '${MODEL}' ..."
    tar -xzf "${MODEL_ROOT}/${MODEL_TGZ}" -C "${MODEL_ROOT}" --strip-components=2 "${MODEL}/${MODEL_BASE}/${MODEL}"
    rm "${MODEL_ROOT}/${MODEL_TGZ}"
  else
    echo "spaCy model '${MODEL}' already installed!"
  fi
}

# assert that ES is healthy!
./test_es.sh

# Flo: checksums and model names from https://github.com/explosion/spacy-models/releases/
DE_MODEL_BASE=de_core_news_lg
DE_MODEL="${DE_MODEL_BASE}-3.4.0"
DE_CHECKSUM_SHA_256_TGZ=797b0f5d709e5cbc446c70c15b21a20a5af004f49920c6b21ccf89c3f5501600

EN_MODEL_BASE=en_core_web_trf
EN_MODEL="${EN_MODEL_BASE}-3.4.1"
EN_CHECKSUM_SHA_256_TGZ=cdb170a2651bfa8f72cd2d281cb1e0a52d4abad372dbbcb11d72531ccef10658

IT_MODEL_BASE=it_core_news_lg
IT_MODEL="${IT_MODEL_BASE}-3.4.0"
IT_CHECKSUM_SHA_256_TGZ=037a545fbcaf5fa5045ed7624fc7341b9b26bf53be0a7bf713b9834ee82e4667

download_and_install_spacy_model "$DE_MODEL_BASE" "$DE_MODEL" "$DE_CHECKSUM_SHA_256_TGZ"
download_and_install_spacy_model "$EN_MODEL_BASE" "$EN_MODEL" "$EN_CHECKSUM_SHA_256_TGZ"
download_and_install_spacy_model "$IT_MODEL_BASE" "$IT_MODEL" "$IT_CHECKSUM_SHA_256_TGZ"

export OMP_NUM_THREADS=1
export MKL_NUM_THREADS=1

LOG_LEVEL=${LOG_LEVEL:-debug}
CELERY_TEXT_WORKER_CONCURRENCY=${CELERY_TEXT_WORKER_CONCURRENCY:-1}

if [ "$CELERY_TEXT_WORKER_CONCURRENCY" -le 1 ]; then
  celery -A app.docprepro.text.preprocess worker -Q textQ,celery -l "$LOG_LEVEL" -P solo
else
  celery -A app.docprepro.text.preprocess worker -Q textQ,celery -l "$LOG_LEVEL" -c "$CELERY_TEXT_WORKER_CONCURRENCY"
fi
