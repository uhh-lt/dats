#!/usr/bin/env bash
# Create the .env files of a git worktree by cloning those of a source checkout.
#
# Secrets, API keys and the hosted service endpoints (ray, vLLM, docling) are inherited
# unchanged. Only the following are rewritten for the worktree:
#   - COMPOSE_PROJECT_NAME
#   - the local port block (<old prefix>NN -> <new prefix>NN)
#   - AUTH_JWT_SECRET / AUTH_SESSION_SECRET (fresh per worktree, avoids cookie clashes)
#   - SPACY_MODELS_DIR (absolute path)
#
# Usage: setup-worktree-envs.sh --source <dir> --target <dir> --slug <slug> --prefix <prefix>
set -euo pipefail

SOURCE=""
TARGET=""
SLUG=""
PREFIX=""
while [[ "$#" -gt 0 ]]; do
	case $1 in
	--source)
		SOURCE="$2"
		shift
		;;
	--target)
		TARGET="$2"
		shift
		;;
	--slug)
		SLUG="$2"
		shift
		;;
	--prefix)
		PREFIX="$2"
		shift
		;;
	--help)
		sed -n '2,12p' "$0"
		exit 0
		;;
	*)
		echo "Unknown parameter passed: $1" >&2
		exit 1
		;;
	esac
	shift
done

if [ -z "$SOURCE" ] || [ -z "$TARGET" ] || [ -z "$SLUG" ] || [ -z "$PREFIX" ]; then
	echo "--source, --target, --slug and --prefix are required." >&2
	exit 1
fi
if ! [[ "$PREFIX" =~ ^[0-9]{3}$ ]]; then
	echo "error: --prefix must be a 3-digit number, got '${PREFIX}'" >&2
	exit 1
fi

REQUIRED_ENV_FILES=(docker/.env backend/.env frontend/.env)
OPTIONAL_ENV_FILES=(docker/.env.backend ray/.env)
for f in "${REQUIRED_ENV_FILES[@]}"; do
	if [ ! -f "${SOURCE}/${f}" ]; then
		echo "error: ${SOURCE}/${f} not found. Bootstrap the source checkout first (just bootstrap)." >&2
		exit 1
	fi
done
ENV_FILES=("${REQUIRED_ENV_FILES[@]}")
for f in "${OPTIONAL_ENV_FILES[@]}"; do
	if [ -f "${SOURCE}/${f}" ]; then ENV_FILES+=("$f"); fi
done

# The source port prefix is the API port without its last two digits (e.g. 19220 -> 192).
SOURCE_API_PORT=$(sed -n 's/^API_EXPOSED=//p' "${SOURCE}/docker/.env")
if ! [[ "$SOURCE_API_PORT" =~ ^[0-9]{5}$ ]]; then
	echo "error: cannot derive the port prefix from API_EXPOSED='${SOURCE_API_PORT}' in ${SOURCE}/docker/.env" >&2
	exit 1
fi
SOURCE_PREFIX="${SOURCE_API_PORT:0:3}"
if [ "$SOURCE_PREFIX" = "101" ] || [ "$PREFIX" = "101" ]; then
	echo "error: prefix 101 is reserved for the shared hosted services." >&2
	exit 1
fi

SOURCE_PROJECT=$(sed -n 's/^COMPOSE_PROJECT_NAME=//p' "${SOURCE}/docker/.env")
PROJECT_NAME="${SOURCE_PROJECT%%-wt-*}-wt-${SLUG}"

JWT_SECRET=$(openssl rand -hex 24)
SESSION_SECRET=$(openssl rand -hex 24)

for f in "${ENV_FILES[@]}"; do
	mkdir -p "$(dirname "${TARGET}/${f}")"
	cp "${SOURCE}/${f}" "${TARGET}/${f}"

	# Rewrite only local port values: *_EXPOSED=, *_PORT*=, and *_URL= lines.
	# Hosted services use other port ranges (e.g. 101xx), which never match the prefix.
	SOURCE_PREFIX="$SOURCE_PREFIX" PREFIX="$PREFIX" perl -i -pe '
		next unless /^[A-Z0-9_]*(?:_EXPOSED|_PORT[A-Z_]*|_URL)=/;
		s/(?<![0-9])$ENV{SOURCE_PREFIX}([0-9]{2})(?![0-9])/$ENV{PREFIX}$1/g;
	' "${TARGET}/${f}"
done

sed -i "s|^COMPOSE_PROJECT_NAME=.*|COMPOSE_PROJECT_NAME=${PROJECT_NAME}|" "${TARGET}/docker/.env"
for f in docker/.env backend/.env; do
	sed -i "s|^AUTH_JWT_SECRET=.*|AUTH_JWT_SECRET=${JWT_SECRET}|" "${TARGET}/${f}"
	sed -i "s|^AUTH_SESSION_SECRET=.*|AUTH_SESSION_SECRET=${SESSION_SECRET}|" "${TARGET}/${f}"
done
if [ -f "${TARGET}/ray/.env" ]; then
	sed -i "s|^SPACY_MODELS_DIR=.*|SPACY_MODELS_DIR=${TARGET}/docker/ray_cache/spacy_models|" "${TARGET}/ray/.env"
fi

echo "Worktree envs ready: project=${PROJECT_NAME} ports=${PREFIX}00-${PREFIX}99"
