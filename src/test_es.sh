#!/bin/sh

set -e

# check elasticsearch health
while ! curl -s "${ES_HOST}:${ES_PORT}"/_cat/health | grep -q "100.0%"; do
  echo "ElasticSearch ${ES_HOST}:${ES_PORT} not healthy: $(curl -sS "${ES_HOST}:${ES_PORT}"/_cat/health)"
  echo "Retrying in 1s!"
  sleep 1
done