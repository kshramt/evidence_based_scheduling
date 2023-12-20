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
.PHONY: update

# Specific to this project

.PHONY: fmt
fmt:
	set +u
	bazelisk run //:format

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

.PHONY: update_lockfile
update: update_lockfile
update_lockfile: update_crate_index
	: bazelisk mod deps --lockfile_mode=update

.PHONY: update_crate_index
update: update_crate_index
update_crate_index:
	CARGO_BAZEL_REPIN=1 bazelisk build //api_v2

.PHONY: update_api_v2_src_gen_rs
update: update_api_v2_src_gen_rs
update_api_v2_src_gen_rs:
	bazelisk run //api_v2:write_gen_rs
