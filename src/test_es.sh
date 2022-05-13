#!/bin/sh

ES="${ES_HOST}:${ES_PORT}"
ES_MIN_HEALTH=${ES_MIN_HEALTH:-75}

while [ "$(curl -s -o /dev/null -I -w "%{http_code}" "${ES}")" -ne 200 ]; do
  echo "ElasticSearch not reachable at ${ES}!"
  curl -sSI "${ES}"
  echo "Retrying in 1s!"
  sleep 1
done

# check elasticsearch health
while [ "$(curl -s "${ES}"/_cat/health | cut -f3 -d "-" | cut -f1 -d ".")" -lt ${ES_MIN_HEALTH} ]; do
  echo "ElasticSearch ${ES} not healthy: $(curl -sS "${ES}"/_cat/health)"
  echo "Retrying in 1s!"
  sleep 1
done
