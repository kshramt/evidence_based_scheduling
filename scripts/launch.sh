#!/bin/bash

set -xv
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

if [[ "${ENV:-prod}" = "prod" ]]; then
   if [[ "${PULL:-yes}" = "yes" ]]; then
      docker compose -f compose.yaml -f "compose.${ENV:-prod}.yaml" pull
   fi
else
   docker compose -f compose.yaml -f "compose.${ENV:-prod}.yaml" build
fi

# Start
docker compose -f compose.yaml -f "compose.${ENV:-prod}.yaml" up -d
