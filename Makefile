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

# Specific to this project

.PHONY: bazel_update_lockfile
bazel_update_lockfile:
	bazelisk mod deps --lockfile_mode=update

.PHONY: fmt
fmt:
	set +u
	bazelisk run //:format

.PHONY: bazel_update_crate_index
bazel_update_crate_index:
	CARGO_BAZEL_REPIN=1 bazelisk build //api_v2

.PHONY: bazel_install_pnpm
bazel_install_pnpm:
	bazelisk run -- @pnpm//:pnpm --dir "${PWD}" install

.PHONY: check_client
check: check_client
check_client:
	pushd client
	scripts/check.sh

.PHONY: check_fmt
check: check_fmt
check_fmt:
	bazelisk run //:format -- --mode check

.PHONY: check_lint
check: check_lint
check_lint:
	bazelisk lint //...
