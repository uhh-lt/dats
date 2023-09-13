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

# Flo: checksums and model names from https://github.com/explosion/spacy-models/releases/
DE_MODEL_BASE=de_core_news_lg
DE_MODEL="${DE_MODEL_BASE}-3.6.0"
DE_CHECKSUM_SHA_256_TGZ=f3922b6d56a5a896d8e3455a77d72b4996cfaf35036081fef09e7545991db35b

EN_MODEL_BASE=en_core_web_trf
EN_MODEL="${EN_MODEL_BASE}-3.6.1"
EN_CHECKSUM_SHA_256_TGZ=1e79622f0d3df5606d874e38062358dfb777eb21c6c589131c7bc7ed10459e40

IT_MODEL_BASE=it_core_news_lg
IT_MODEL="${IT_MODEL_BASE}-3.6.0"
IT_CHECKSUM_SHA_256_TGZ=8029a0f891776a9c0566fa9a076a9381ac07eba63a11e280dea0ec711ea0ae00

download_and_install_spacy_model "$DE_MODEL_BASE" "$DE_MODEL" "$DE_CHECKSUM_SHA_256_TGZ"
download_and_install_spacy_model "$EN_MODEL_BASE" "$EN_MODEL" "$EN_CHECKSUM_SHA_256_TGZ"
download_and_install_spacy_model "$IT_MODEL_BASE" "$IT_MODEL" "$IT_CHECKSUM_SHA_256_TGZ"

export OMP_NUM_THREADS=1
export MKL_NUM_THREADS=1

# generate the ray spec file
python generate_ray_model_specs.py

# start the ray cluster
ray start --head --dashboard-host '0.0.0.0'

# serve the models
serve run spec.yaml
