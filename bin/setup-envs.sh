#!/bin/bash

# Ensure that the script is run from the root directory of the project
if [ ! -d ".git" ]; then
	echo "This script must be run from the root directory of the project."
	exit 1
fi

# Parse command line arguments
while [[ "$#" -gt 0 ]]; do
	case $1 in
	--project_name)
		PROJECT_NAME="$2"
		shift
		;;
	--port_prefix)
		PORT_PREFIX="$2"
		shift
		;;
	--help)
		echo "Usage: $0 --project_name <name> --port_prefix <prefix>"
		echo "  --project_name  The name of the project."
		echo "  --port_prefix   The port prefix to use."
		echo "  --help          Display this help message."
		exit 0
		;;
	*)
		echo "Unknown parameter passed: $1"
		exit 1
		;;
	esac
	shift
done

# Ensure that the --project_name and --port_prefix parameters are provided
if [ -z "$PROJECT_NAME" ] || [ -z "$PORT_PREFIX" ]; then
	echo "--project_name and --port_prefix parameters are required."
	exit 1
fi

JWT_SECRET=$(pwgen 32 1)
SESSION_SECRET=$(pwgen 32 1)
UUID_NAMESPACE=$(uv run python -c "import uuid; print(uuid.uuid4())")
SHARED_FILESYSTEM_ROOT="$(pwd)/docker/backend_repo"

cp docker/.env.example docker/.env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# setup docker .env file
sed -i "s/COMPOSE_PROJECT_NAME=demo/COMPOSE_PROJECT_NAME=${PROJECT_NAME}/" docker/.env
sed -i "s/131/${PORT_PREFIX}/g" docker/.env
sed -i "s/JWT_SECRET=/JWT_SECRET=${JWT_SECRET}/" docker/.env
sed -i "s/SESSION_SECRET=/SESSION_SECRET=${SESSION_SECRET}/" docker/.env
sed -i "s/UUID_NAMESPACE=/UUID_NAMESPACE=${UUID_NAMESPACE}/" docker/.env
sed -i "s/DOCKER_UID=121/DOCKER_UID=$(id -u)/" docker/.env
sed -i "s/DOCKER_GID=126/DOCKER_GID=$(id -g)/" docker/.env

# setup backend .env file
sed -i "s/131/${PORT_PREFIX}/g" backend/.env
sed -i "s/JWT_SECRET=/JWT_SECRET=${JWT_SECRET}/" backend/.env
sed -i "s/SESSION_SECRET=/SESSION_SECRET=${SESSION_SECRET}/" backend/.env
sed -i "s/UUID_NAMESPACE=/UUID_NAMESPACE=${UUID_NAMESPACE}/" backend/.env
sed -i "s|SHARED_FILESYSTEM_ROOT=/insert_path_to_dats_repo/docker/backend_repo|SHARED_FILESYSTEM_ROOT=${SHARED_FILESYSTEM_ROOT}|" backend/.env

# setup frontend .env file
sed -i "s/131/${PORT_PREFIX}/g" frontend/.env
