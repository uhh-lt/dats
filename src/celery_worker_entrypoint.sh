#!/bin/sh

set -e

mkdir -p /spacy_models

# Flo:
#  We (download and) install the spacy models on start-up of the docker container in the following so that the docker image does
#  not grow too large. To avoid downloading the model everytime, it can be mapped into the container with a volume in
#  the docker-compose

if [ ! -f /spacy_models/de_core_news_lg-3.2.0.tar.gz ]; then
  wget https://github.com/explosion/spacy-models/releases/download/de_core_news_lg-3.2.0/de_core_news_lg-3.2.0.tar.gz
else
  echo "spaCy model 'de_core_news_lg' already downloaded!"
fi
if [ ! -d /usr/local/lib/python3.9/site-packages/de_core_news_lg ]; then
  pip install /spacy_models/de_core_news_lg-3.2.0.tar.gz
fi

if [ ! -f /spacy_models/en_core_web_trf-3.2.0.tar.gz ]; then
  wget https://github.com/explosion/spacy-models/releases/download/en_core_web_trf-3.2.0/en_core_web_trf-3.2.0.tar.gz
else
  echo "spaCy model 'en_core_web_trf' already downloaded!"
fi
if [ ! -d /usr/local/lib/python3.9/site-packages/en_core_web_trf ]; then
  pip install /spacy_models/en_core_web_trf-3.2.0.tar.gz
fi


LOG_LEVEL=${LOG_LEVEL:-debug}

poetry run celery -A app.docprepro.process worker -l "$LOG_LEVEL" -c 1 # TODO Flo: Env vars for parameters
