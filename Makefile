# Configurations
.SUFFIXES:
.DELETE_ON_ERROR:
.SECONDARY:
.ONESHELL:
export SHELL := /bin/bash
export SHELLOPTS := pipefail:errexit:nounset:noclobber

# Tasks
.PHONY: all
.DEFAULT_GOAL := all

# Specific to this project

.PHONY: run_api
run_api:
	pushd api
	~/py311/bin/python3 -m poetry run python3 -m uvicorn api.main:app --host 0.0.0.0 --reload --reload-exclude '*/**/*_test.py' --reload-exclude '*/**/conftest.py' --log-config log-config.json

.PHONY: check
.PHONY: check_api
check: check_api
check_api:
	pushd api
	~/py311/bin/python3 -m poetry run python3 -m pyflakes api
	~/py311/bin/python3 -m poetry run python3 -m mypy --check-untyped-defs api
	~/py311/bin/python3 -m poetry run python3 -m black --check api
	~/py311/bin/python3 -m poetry run python3 -m isort --check-only api
	~/py311/bin/python3 -m poetry run python3 -m pytest

check: check_client
check_client:
	pushd client
	node_modules/.bin/tsc --noEmit
	node_modules/.bin/react-scripts test --ci --watchAll false
	node_modules/.bin/eslint --max-warnings 0 src
	node_modules/.bin/prettier --check src
