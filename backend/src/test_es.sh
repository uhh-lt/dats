#!/bin/bash

ES_HOST=${ES_HOST:-elasticsearch}
ES_PORT=${ES_PORT:-9200}
ES="${ES_HOST}:${ES_PORT}"
ES_MIN_HEALTH=${ES_MIN_HEALTH:-75}

echo "Trying to reach ElasticSearch via: ${ES}"
echo "Minimum Health Requirement: ${ES_MIN_HEALTH}"

while [[ "$(curl -s -o /dev/null -I -w "%{http_code}" "${ES}")" -ne 200 ]]; do
  curl -sSI "${ES}"
  echo "Retrying in 2s!"
  sleep 2
done

CURRENT_HEALTH="$(curl -s "${ES}"/_cat/health | tail -c 7 | cut -f1 -d "." | xargs)"

# check elasticsearch health
while [[ "$CURRENT_HEALTH" -le "$ES_MIN_HEALTH" ]]; do
  echo "ElasticSearch ${ES} not healthy! Current Health Status: $(curl -sS "${ES}"/_cat/health)"
  echo "Retrying in 2s!"
  sleep 2
  CURRENT_HEALTH="$(curl -s "${ES}"/_cat/health | tail -c 7 | cut -f1 -d "." | xargs)"
done
