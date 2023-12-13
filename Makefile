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

.PHONY: bazel_update_lockfile
bazel_update_lockfile:
	bazelisk mod deps --lockfile_mode=update

.PHONY: bazel_update_crate_index
bazel_update_crate_index:
	CARGO_BAZEL_REPIN=1 bazelisk sync --only=crate_index

check: check_client
check_client:
	pushd client
	scripts/check.sh
