#!/bin/bash

# Ensure that the script is run from the root directory of the project
if [ ! -d ".git" ]; then
    echo "This script must be run from the root directory of the project."
    exit 1
fi

# Parse command line arguments
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --backup_name) BACKUP_NAME="$2"; shift ;;
        --help)
            echo "Usage: $0 --backup_name <backup_name>"
            exit 0
            ;;
        *)
            echo "Unknown parameter passed: $1"; exit 1;;
    esac
    shift
done

# Ensure that the --backup_name parameter is provided
if [ -z "$BACKUP_NAME" ]; then
    echo "The --backup_name parameter is required."
    exit 1
fi

# Ensure that the backup exists in backups/repo
if [ ! -f "backups/repo/$BACKUP_NAME" ]; then
    echo "The backup file $BACKUP_NAME does not exist in backups/repo."
    exit 1
fi

# Restore the repository from the backup
# 1) Delete the existing repository
echo "Deleting the existing repository..."
rm -rf docker/backend_repo
# 2) Restore with the backup
echo "Restoring the repository..."
tar -xzf "backups/repo/$BACKUP_NAME" -C docker

echo "Done!"
