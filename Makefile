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

.PHONY: check
.PHONY: check_client
.PHONY: check_scripts

check: check_client

check_client:
	pushd client
	scripts/check.sh

check_scripts:
	python3 -B -m unittest discover -s tests -p 'test_*.py'
	find scripts db client tests -type d \( -name node_modules -o -name .venv \) -prune -o \
		-type f -name '*.sh' -exec shellcheck {} +
	find scripts db client tests -type d \( -name node_modules -o -name .venv \) -prune -o \
		-type f -name '*.sh' -exec shfmt -d {} +
