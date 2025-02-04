#!/bin/bash

# Ensure that the script is run from the root directory of the project
if [ ! -d ".git" ]; then
    echo "This script must be run from the root directory of the project."
    exit 1
fi

# Ensure that the directory backups/repo exists
if [ ! -d "backups/repo" ]; then
    mkdir -p backups/repo
fi

# Ensure that repo exists
if [ ! -d "docker/backend_repo" ]; then
    echo "The docker/backend_repo directory does not exist. Nothing to backup!"
    exit 1
fi

# Create a tarball of the repo
cd docker || exit
tar -czf "../backups/repo/repo_$(date +%Y_%m_%d_%H_%M).tar.gz" "backend_repo"
echo "Repo backup successful!"
