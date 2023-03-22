#!/bin/bash

set -xv
set -o nounset
set -o errexit
set -o pipefail
set -o noclobber

export IFS=$' \t\n'
export LANG=C.UTF-8
umask u=rwx,g=,o=

tmp_dir="$(mktemp -d)"
readonly tmp_dir

finalize(){
   rm -fr "${tmp_dir}"
}

trap finalize EXIT


export _DOCKER_API_TAG="${TAG:-latest}"
export _DOCKER_API_V1_TAG="${TAG:-latest}"
export _DOCKER_NGINX_TAG="${TAG:-latest}"
export _DOCKER_ENVOY_TAG="${TAG:-latest}"
export _DOCKER_POSTGRES_TAG="${TAG:-latest}"

mkdir -p "${MY_HOST_PGDATA:-./pgdata}" || :

if [[ "${ENV:-prod}" = "prod" ]]; then
   if [[ "${PULL:-yes}" = "yes" ]]; then
      docker compose -f compose.yaml -f "compose.${ENV:-prod}.yaml" pull
   fi
else
   docker compose -f compose.yaml -f "compose.${ENV:-prod}.yaml" build
fi

# Migrate
readonly container_id_path="${tmp_dir}/container_id"
docker compose -f compose.yaml -f "compose.${ENV:-prod}.yaml" run --rm -d postgres > "${container_id_path}"
container_id="$(cat "${container_id_path}")"
readonly container_id
docker container exec -e _POSTGRES_APP_USER_PASSWORD="${_POSTGRES_APP_USER_PASSWORD:?}" -e URL='postgres://postgres@/postgres' "${container_id}" /app/scripts/migrate.sh
docker container rm --force "${container_id}"

# Start
docker compose -f compose.yaml -f "compose.${ENV:-prod}.yaml" up -d
# docker compose -f compose.yaml -f "compose.${ENV:-prod}.yaml" up &
