#!/bin/bash
#
# pg_max_pool_sanity_check.sh
#
# Validates that the configured Postgres connection pools can never exceed
# POSTGRES_MAX_CONNECTIONS. Run this BEFORE `docker compose up`.
#
# The math:
#   NUM_CONNECTIONS_API     = API_WORKERS * (POSTGRES_POOL_SIZE + POSTGRES_MAX_OVERFLOW)
#   NUM_CONNECTIONS_WORKERS = (RQ_WORKERS_CPU + RQ_WORKERS_API + RQ_WORKERS_GPU)
#                             * (RQ_POOL_SIZE + RQ_MAX_OVERFLOW)
#   NUM_CONNECTIONS_API + NUM_CONNECTIONS_WORKERS <= POSTGRES_MAX_CONNECTIONS
#
# Every value is read from the real deployed configs -- NO defaults are assumed.
# If any value is missing, this script FAILS and tells you to set it:
#   docker/.env          -> API_WORKERS, RQ_WORKERS_CPU/API/GPU, POSTGRES_MAX_CONNECTIONS
#   docker/.env.backend  -> POSTGRES_POOL_SIZE, POSTGRES_MAX_OVERFLOW  (API pool)
#   docker/compose.yml   -> POSTGRES_POOL_SIZE, POSTGRES_MAX_OVERFLOW  (RQ worker override)

set -euo pipefail

# Ensure that the script is run from the root directory of the project
if [ ! -d ".git" ]; then
	echo "ERROR: This script must be run from the root directory of the project."
	exit 1
fi

ENV_FILE="docker/.env"
ENV_BACKEND_FILE="docker/.env.backend"
COMPOSE_FILE="docker/compose.yml"

for f in "$ENV_FILE" "$ENV_BACKEND_FILE" "$COMPOSE_FILE"; do
	if [ ! -f "$f" ]; then
		echo "ERROR: $f does not exist."
		exit 1
	fi
done

# --- helpers ---------------------------------------------------------------

# Read KEY=value from a dotenv file without executing it. Prints the raw value
# or empty string if unset. Never fails (grep no-match returns empty).
env_get() {
	local key="$1" file="$2"
	grep -E "^${key}=" "$file" 2>/dev/null | tail -n1 | cut -d= -f2- | tr -d '"'"'"' ' || true
}

# require_var NAME VALUE SOURCE -- fail if VALUE is empty.
require_var() {
	local name="$1" value="$2" source="$3"
	if [ -z "$value" ]; then
		echo "ERROR: $name is not set in $source."
		echo "       Set it explicitly -- this script makes NO assumptions."
		exit 1
	fi
}

# --- read API + worker counts + max_connections (from .env) ----------------

API_WORKERS="$(env_get API_WORKERS "$ENV_FILE")"
RQ_WORKERS_CPU="$(env_get RQ_WORKERS_CPU "$ENV_FILE")"
RQ_WORKERS_API="$(env_get RQ_WORKERS_API "$ENV_FILE")"
RQ_WORKERS_GPU="$(env_get RQ_WORKERS_GPU "$ENV_FILE")"
MAX_CONNECTIONS="$(env_get POSTGRES_MAX_CONNECTIONS "$ENV_FILE")"

require_var API_WORKERS "$API_WORKERS" "$ENV_FILE"
require_var RQ_WORKERS_CPU "$RQ_WORKERS_CPU" "$ENV_FILE"
require_var RQ_WORKERS_API "$RQ_WORKERS_API" "$ENV_FILE"
require_var RQ_WORKERS_GPU "$RQ_WORKERS_GPU" "$ENV_FILE"
require_var POSTGRES_MAX_CONNECTIONS "$MAX_CONNECTIONS" "$ENV_FILE"

# --- read API pool (from .env.backend) --------------------------------------

API_POOL_SIZE="$(env_get POSTGRES_POOL_SIZE "$ENV_BACKEND_FILE")"
API_MAX_OVERFLOW="$(env_get POSTGRES_MAX_OVERFLOW "$ENV_BACKEND_FILE")"

require_var POSTGRES_POOL_SIZE "$API_POOL_SIZE" "$ENV_BACKEND_FILE"
require_var POSTGRES_MAX_OVERFLOW "$API_MAX_OVERFLOW" "$ENV_BACKEND_FILE"

# --- read RQ worker pool cap (from compose.yml) -----------------------------
# The RQ worker services override POSTGRES_POOL_SIZE / POSTGRES_MAX_OVERFLOW.
# Parse the values from the RQ worker service blocks and make sure they all
# agree (no drift between services).

rq_pool_values() {
	local key="$1"
	# match e.g. `POSTGRES_POOL_SIZE: 1` in the RQ worker service blocks
	grep -E "^[[:space:]]+${key}:" "$COMPOSE_FILE" 2>/dev/null | sed -E "s/.*${key}:[[:space:]]*//" | tr -d '"'"'"' ' || true
}

RQ_POOL_SIZES="$(rq_pool_values POSTGRES_POOL_SIZE)"
RQ_OVERFLOWS="$(rq_pool_values POSTGRES_MAX_OVERFLOW)"

if [ -z "$RQ_POOL_SIZES" ] || [ -z "$RQ_OVERFLOWS" ]; then
	echo "ERROR: could not find POSTGRES_POOL_SIZE / POSTGRES_MAX_OVERFLOW overrides"
	echo "       for the RQ worker services in $COMPOSE_FILE."
	exit 1
fi

# All RQ worker services must use the SAME pool settings, otherwise the budget
# is ambiguous.
if [ "$(echo "$RQ_POOL_SIZES" | sort -u | wc -l)" -ne 1 ]; then
	echo "ERROR: RQ worker services disagree on POSTGRES_POOL_SIZE in $COMPOSE_FILE:"
	echo "$RQ_POOL_SIZES" | sed 's/^/       /'
	exit 1
fi
if [ "$(echo "$RQ_OVERFLOWS" | sort -u | wc -l)" -ne 1 ]; then
	echo "ERROR: RQ worker services disagree on POSTGRES_MAX_OVERFLOW in $COMPOSE_FILE:"
	echo "$RQ_OVERFLOWS" | sed 's/^/       /'
	exit 1
fi

RQ_POOL_SIZE="$(echo "$RQ_POOL_SIZES" | sort -u)"
RQ_MAX_OVERFLOW="$(echo "$RQ_OVERFLOWS" | sort -u)"

# --- compute ---------------------------------------------------------------

API_PER_WORKER=$((API_POOL_SIZE + API_MAX_OVERFLOW))
NUM_CONNECTIONS_API=$((API_WORKERS * API_PER_WORKER))

RQ_POOL_PER_WORKER=$((RQ_POOL_SIZE + RQ_MAX_OVERFLOW))
RQ_WORKER_COUNT=$((RQ_WORKERS_CPU + RQ_WORKERS_API + RQ_WORKERS_GPU))
NUM_CONNECTIONS_WORKERS=$((RQ_WORKER_COUNT * RQ_POOL_PER_WORKER))

WORST_CASE=$((NUM_CONNECTIONS_API + NUM_CONNECTIONS_WORKERS))

# --- report ----------------------------------------------------------------

echo "Postgres connection budget"
echo "=========================="
printf "%-34s %6s %6s %8s\n" "service" "procs" "pool" "max"
printf "%-34s %6s %6s %8s\n" "-------" "-----" "----" "---"
printf "%-34s %6s %6s %8s\n" "API (uvicorn workers)" "$API_WORKERS" "$API_PER_WORKER" "$NUM_CONNECTIONS_API"
printf "%-34s %6s %6s %8s\n" "RQ cpu workers" "$RQ_WORKERS_CPU" "$RQ_POOL_PER_WORKER" "$((RQ_WORKERS_CPU * RQ_POOL_PER_WORKER))"
printf "%-34s %6s %6s %8s\n" "RQ api workers" "$RQ_WORKERS_API" "$RQ_POOL_PER_WORKER" "$((RQ_WORKERS_API * RQ_POOL_PER_WORKER))"
printf "%-34s %6s %6s %8s\n" "RQ gpu workers" "$RQ_WORKERS_GPU" "$RQ_POOL_PER_WORKER" "$((RQ_WORKERS_GPU * RQ_POOL_PER_WORKER))"
echo "--------------------------------------------------"
printf "%-34s %6s %6s %8s\n" "NUM_CONNECTIONS_API" "" "" "$NUM_CONNECTIONS_API"
printf "%-34s %6s %6s %8s\n" "NUM_CONNECTIONS_WORKERS" "" "" "$NUM_CONNECTIONS_WORKERS"
printf "%-34s %6s %6s %8s\n" "TOTAL worst-case" "" "" "$WORST_CASE"
printf "%-34s %6s %6s %8s\n" "POSTGRES_MAX_CONNECTIONS" "" "" "$MAX_CONNECTIONS"
echo ""

# --- verdict ---------------------------------------------------------------

HEADROOM_PCT=80
THRESHOLD=$((MAX_CONNECTIONS * HEADROOM_PCT / 100))

if [ "$WORST_CASE" -gt "$MAX_CONNECTIONS" ]; then
	echo "FAIL: worst-case connections ($WORST_CASE) exceed POSTGRES_MAX_CONNECTIONS ($MAX_CONNECTIONS)."
	echo "      Lower API_WORKERS, POSTGRES_POOL_SIZE/POSTGRES_MAX_OVERFLOW, or RQ_WORKERS_*;"
	echo "      or raise POSTGRES_MAX_CONNECTIONS."
	exit 1
elif [ "$WORST_CASE" -gt "$THRESHOLD" ]; then
	echo "WARN: worst-case connections ($WORST_CASE) are above ${HEADROOM_PCT}% of the limit ($MAX_CONNECTIONS)."
	echo "      Consider leaving more headroom for superuser/other clients."
	exit 0
else
	echo "OK: worst-case connections ($WORST_CASE) fit within POSTGRES_MAX_CONNECTIONS ($MAX_CONNECTIONS)."
	exit 0
fi
