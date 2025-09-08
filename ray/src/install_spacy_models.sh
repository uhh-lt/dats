#!/bin/bash

set -e

#  We (download and) install the spacy models on start-up of the docker container in the following so that the docker image does
#  not grow too large. To avoid downloading the model everytime, it can be mapped into the container with a volume in
#  the docker-compose.

if [ -z "$SPACY_MODELS_DIR" ]; then
	echo "Error: SPACY_MODELS_DIR environment variable is not set."
	exit 1
fi
MODEL_ROOT=$SPACY_MODELS_DIR
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
			rm "${MODEL_ROOT}/${MODEL_TGZ}"
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
DE_MODEL="${DE_MODEL_BASE}-3.8.0"
DE_CHECKSUM_SHA_256_TGZ=e43749a03cc489fd224392d2ac420c4ddffb8bc9389764f7c4904057fb7596ac

EN_MODEL_BASE=en_core_web_trf
EN_MODEL="${EN_MODEL_BASE}-3.8.0"
EN_CHECKSUM_SHA_256_TGZ=eaed18a77cbd6fad1b0605d2535c2091010d9aaf87b6264c2080042dd394621f

IT_MODEL_BASE=it_core_news_lg
IT_MODEL="${IT_MODEL_BASE}-3.8.0"
IT_CHECKSUM_SHA_256_TGZ=c42d29d2e53c54fa70fc9cece934571c02f2ebe58afba1528d577475513edfe2

download_and_install_spacy_model "$DE_MODEL_BASE" "$DE_MODEL" "$DE_CHECKSUM_SHA_256_TGZ"
download_and_install_spacy_model "$EN_MODEL_BASE" "$EN_MODEL" "$EN_CHECKSUM_SHA_256_TGZ"
download_and_install_spacy_model "$IT_MODEL_BASE" "$IT_MODEL" "$IT_CHECKSUM_SHA_256_TGZ"
