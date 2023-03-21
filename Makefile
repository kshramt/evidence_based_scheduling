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

check: check_client
check_client:
	pushd client
	node_modules/.bin/tsc --noEmit
	node_modules/.bin/react-scripts test --ci --watchAll false
	node_modules/.bin/eslint --max-warnings 0 src
	node_modules/.bin/prettier --check src
