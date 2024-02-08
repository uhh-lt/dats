# This Makefile is intended for development use only!
# It might do unexpected things not suitable for production environments.

# Set some sensible defaults
# See https://tech.davis-hansson.com/p/make/ for more info
SHELL := bash
MAKEFLAGS += --warn-undefined-variables
# Use bash strict mode http://redsymbol.net/articles/unofficial-bash-strict-mode/
.SHELLFLAGS := -euco pipefail
# Use a single shell process for running a whole recipe
.ONESHELL:
# Disable confusing, C-specific builtin rules
MAKEFLAGS += --no-builtin-rules

# Read and export all values in .env
.EXPORT_ALL_VARIABLES:
include .env

.PHONY: run
run:
	ENV_NAME=dwts source _activate_current_env.sh
	cd src
	python main.py

.PHONY: migrate
migrate:
	ENV_NAME=dwts source _activate_current_env.sh
	cd src
	python run_migrations.py

# For running specific tests, use the following style:
# make test pytest_args=test/app/core/data/crud/test_user_crud.py::test_create_delete_user
.PHONY: test
test:
	src/run_tests.sh $(pytest_args)

.PHONY: wipe_database
wipe_all_data:
	ENV_NAME=dwts source _activate_current_env.sh
	cd src
	python wipe_database.py

.PHONY: update_version
update_version:
	ENV_NAME=dwts source _activate_current_env.sh
	python update_version.py --version $(VERSION)
