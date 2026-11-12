#!/bin/bash

set -o nounset
set -o errexit
set -o pipefail
set -o noclobber

export IFS=$' \t\n'
export LANG=C.UTF-8
umask u=rwx,g=,o=

export _DOCKER_API_TAG="${TAG:-latest}"
export _DOCKER_API_V2_TAG="${TAG:-latest}"
export _DOCKER_NGINX_TAG="${TAG:-latest}"
export _DOCKER_ENVOY_TAG="${TAG:-latest}"
export _DOCKER_POSTGRES_TAG="${TAG:-latest}"
export _DOCKER_POSTGRES_MIGRATION_TAG="${TAG:-latest}"

mkdir -p "${MY_HOST_PGDATA:-./pgdata}"

environment="${ENV:-prod}"
compose=(docker compose "$@" -f compose.yaml -f "compose.${environment}.yaml")

if [[ "${environment}" = "prod" ]]; then
	if [[ "${PULL:-yes}" = "yes" ]]; then
		"${compose[@]}" pull
	fi
else
	"${compose[@]}" build
fi

"${compose[@]}" up -d
